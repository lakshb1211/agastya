import json
import logging
import re
import urllib.error
import urllib.request
from typing import Any, Dict, List, Optional
from fastapi import HTTPException

from .config import (
    OPENAI_API_KEY,
    OPENAI_BASE_URL,
    OPENAI_MODEL,
    GEMINI_API_KEY,
    GEMINI_MODEL,
    GEMINI_FALLBACK_MODELS,
    LANGUAGES,
    LANG_ALIASES,
)
from .extractor import (
    STOP_WORDS,
    available_citations,
    build_local_notes,
    diagram_svg,
    extract_topics,
    selected_sections,
    source_prompt,
)

logger = logging.getLogger("agastya_ai")

def normalize_language(lang: str) -> str:
    lang = (lang or "english").strip().lower()
    if lang in LANG_ALIASES:
        return LANG_ALIASES[lang]
    if lang in LANGUAGES:
        return lang
    return "english"

def _gemini_output_text(data: Dict[str, Any]) -> Optional[str]:
    # Interactions API: text lives in the "model_output" step, after any "thought" steps
    for step in data.get("steps", []):
        if step.get("type") == "model_output":
            texts = [c.get("text", "") for c in step.get("content", []) if c.get("type") == "text"]
            text = "".join(texts).strip()
            if text:
                return text
    return None

def ask_gemini_raw(prompt: str, system_prompt: Optional[str] = None) -> Optional[str]:
    if not GEMINI_API_KEY:
        return None
    url = "https://generativelanguage.googleapis.com/v1beta/interactions"

    for model in [GEMINI_MODEL] + [m for m in GEMINI_FALLBACK_MODELS if m != GEMINI_MODEL]:
        payload: Dict[str, Any] = {"model": model, "input": prompt}
        if system_prompt:
            payload["system_instruction"] = system_prompt
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json", "x-goog-api-key": GEMINI_API_KEY},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=45) as resp:
                data = json.loads(resp.read().decode("utf-8"))
            text = _gemini_output_text(data)
            if text:
                return text
            logger.warning(f"Gemini ({model}) returned no text output.")
        except urllib.error.HTTPError as exc:
            logger.warning(f"Gemini API request failed ({model}): {exc}")
            if exc.code == 503:
                continue  # overloaded: try the next model
        except Exception as exc:
            logger.warning(f"Gemini API request failed ({model}): {exc}")
        return None
    return None

def ask_openai_raw(prompt: str, system_prompt: Optional[str] = None) -> Optional[str]:
    if not OPENAI_API_KEY:
        return None
    endpoint = f"{OPENAI_BASE_URL}/chat/completions"
    sys_msg = system_prompt or (
        "You are an expert learning tutor. Use only the supplied study material. "
        "Never invent facts or citations. If it does not contain the answer, say so explicitly. "
        "Return valid JSON only when requested."
    )
    payload = {
        "model": OPENAI_MODEL,
        "temperature": 0.2,
        "messages": [
            {"role": "system", "content": sys_msg},
            {"role": "user", "content": prompt},
        ],
    }
    req = urllib.request.Request(
        endpoint,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {OPENAI_API_KEY}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=40) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        return data["choices"][0]["message"]["content"].strip()
    except Exception as exc:
        logger.warning(f"OpenAI API request failed: {exc}")
    return None

def ask_ai_text(prompt: str, system_prompt: Optional[str] = None) -> Optional[str]:
    # Try Gemini first if key is present, then OpenAI
    if GEMINI_API_KEY:
        out = ask_gemini_raw(prompt, system_prompt)
        if out:
            return out
    if OPENAI_API_KEY:
        out = ask_openai_raw(prompt, system_prompt)
        if out:
            return out
    return None

def ask_ai_json(prompt: str, system_prompt: Optional[str] = None) -> Optional[Dict[str, Any]]:
    text = ask_ai_text(prompt, system_prompt)
    if not text:
        return None
    # Strip markdown code blocks if present
    cleaned = re.sub(r"^```(?:json)?\s*", "", text.strip())
    cleaned = re.sub(r"\s*```$", "", cleaned)
    try:
        parsed = json.loads(cleaned)
        if isinstance(parsed, dict):
            return parsed
    except json.JSONDecodeError:
        # Try finding json object inside
        match = re.search(r"\{.*\}", cleaned, re.DOTALL)
        if match:
            try:
                parsed = json.loads(match.group(0))
                if isinstance(parsed, dict):
                    return parsed
            except Exception:
                pass
    return None

def generate_notes_ai(
    sections: List[Dict[str, Any]],
    title: str,
    language: str = "english",
    topic: Optional[str] = None,
) -> Dict[str, Any]:
    norm_lang = normalize_language(language)
    lang_name = LANGUAGES.get(norm_lang, "English")
    topics = extract_topics(sections)

    if topic:
        context_sections = selected_sections(sections, [topic])
    elif len(sections) <= 12:
        context_sections = sections
    else:
        indices = {round(i * (len(sections) - 1) / 11) for i in range(12)}
        context_sections = [sections[i] for i in sorted(indices)]

    ai_prompt = (
        f"Create clear, structured revision notes in {lang_name}. "
        f"Topic focus: {topic or 'all core topics'}.\n"
        "Return a JSON object with:\n"
        "- title: string\n"
        "- overview: 1-2 sentence high level summary\n"
        "- topics: array of 4-6 key concepts\n"
        "- key_points: array of objects with {text: string, source_ids: array of source_ids}.\n"
        "Every single key point MUST be supported by one or more supplied source IDs from the material.\n\n"
        f"Study Material: {source_prompt(context_sections)}"
    )

    ai_data = ask_ai_json(
        ai_prompt,
        system_prompt="You are a strict learning tutor. You ONLY cite facts directly mentioned in the supplied material. Return JSON only.",
    )

    if ai_data is not None:
        valid_points = []
        for point in ai_data.get("key_points", []):
            if isinstance(point, dict) and isinstance(point.get("text"), str):
                cits = available_citations(point.get("source_ids"), context_sections)
                if cits:
                    valid_points.append({"text": point["text"], "citations": cits})
        if valid_points:
            notes = {
                "title": str(ai_data.get("title") or title),
                "overview": str(ai_data.get("overview") or "Key takeaways from your uploaded material."),
                "key_points": valid_points,
                "topics": [str(t) for t in ai_data.get("topics", topics) if isinstance(t, str)][:8],
                "language": lang_name,
                "visual": {
                    "format": "image/svg+xml",
                    "svg": diagram_svg(title, topics),
                },
            }
            return notes

    # Deterministic local fallback
    notes = build_local_notes(context_sections, title, topics)
    notes["language"] = lang_name
    notes["visual"] = {
        "format": "image/svg+xml",
        "svg": diagram_svg(title, topics),
    }
    return notes

def explain_question(
    question: str,
    sections: List[Dict[str, Any]],
    language: str = "english",
) -> Dict[str, Any]:
    norm_lang = normalize_language(language)
    lang_name = LANGUAGES.get(norm_lang, "English")
    matching = selected_sections(sections, [question], maximum=8)
    mat_prompt = source_prompt(matching)

    ai_prompt = (
        f"Explain this question in simple {lang_name}: {question!r}.\n"
        "Return JSON with {answer: string, source_ids: array of valid source IDs}.\n"
        "Cite only source IDs that directly state or support the answer.\n"
        "CRITICAL: If the supplied material does not answer the question, return an empty source_ids array "
        "and answer: 'I could not find the answer to this in the uploaded study material.'\n\n"
        f"Study Material: {mat_prompt}"
    )

    ai_res = ask_ai_json(
        ai_prompt,
        system_prompt="You are a strict, grounded AI tutor. You never hallucinate facts not found in the material.",
    )

    if ai_res is not None:
        cits = available_citations(ai_res.get("source_ids"), matching)
        ans = str(ai_res.get("answer") or "").strip()
        if not cits:
            return {
                "answer": "I could not find the answer to this in the uploaded study material.",
                "sources": [],
                "available_in_material": False,
            }
        return {
            "answer": ans,
            "sources": cits,
            "available_in_material": True,
        }

    # High quality local keyword/TF-IDF fallback
    terms = {
        w.lower()
        for w in re.findall(r"[A-Za-z0-9\u0900-\u097F]+", question)
        if len(w) > 3 and w.lower() not in STOP_WORDS
    }
    needed = max(1, len(terms) // 2) if len(terms) > 1 else 1
    grounded = [
        s for s in matching
        if terms and sum(1 for term in terms if term in s["text"].lower()) >= needed
    ]
    if not grounded:
        return {
            "answer": "I could not find the answer to this in the uploaded study material.",
            "sources": [],
            "available_in_material": False,
        }

    best_snippets = [s["text"][:350].strip() + ("…" if len(s["text"]) > 350 else "") for s in grounded[:2]]
    citations = [s["citation"] for s in grounded[:2]]
    return {
        "answer": f"Based on your material: {' '.join(best_snippets)}",
        "sources": citations,
        "available_in_material": True,
        "note": "Configuring OPENAI_API_KEY or GEMINI_API_KEY provides full conversational rephrasing.",
    }

def chat_tutor(
    query: str,
    history: List[Dict[str, str]],
    sections: Optional[List[Dict[str, Any]]] = None,
    language: str = "en",
) -> str:
    norm_lang = normalize_language(language)
    lang_name = LANGUAGES.get(norm_lang, "English")

    context_str = ""
    if sections:
        matching = selected_sections(sections, [query], maximum=4)
        if matching:
            context_str = f"\nRelevant study passages:\n{source_prompt(matching)}\n"

    system_prompt = (
        f"You are Agastya Assistant, an empathetic, encouraging learning mentor for students. "
        f"Reply warmly in {lang_name}. Explain concepts simply with clear step-by-step points or examples. "
        "Keep responses concise (2 to 4 paragraphs or bullet points). If study material is provided, ground your answer in it."
    )

    conv_history = ""
    for msg in history[-6:]:
        role = "Student" if msg.get("role") == "user" else "Assistant"
        conv_history += f"{role}: {msg.get('content')}\n"

    prompt = f"{conv_history}Student: {query}\n{context_str}\nAssistant:"

    out = ask_ai_text(prompt, system_prompt=system_prompt)
    if out:
        return out

    # Smart local fallback assistant
    q_lower = query.lower()
    if any(k in q_lower for k in ["how to learn", "study plan", "habit", "schedule", "routine"]):
        return (
            "✦ Study Tip: Use the Pomodoro Technique — 25 minutes of deep focus followed by a 5-minute break. "
            "In your Agastya Study Studio, upload your notes or textbook, generate a diagnostic quiz to find your weak topics, "
            "and follow the personalized 3-Day Revision Plan!"
        )
    if any(k in q_lower for k in ["quiz", "score", "test", "practice"]):
        return (
            "✦ Agastya quizzes are generated directly from your uploaded materials! Take a Diagnostic Quiz to pinpoint "
            "weaker areas (<70% score). Once identified, take a Weak-Topic quiz to build mastery, and watch your progress trend line rise."
        )
    if any(k in q_lower for k in ["streak", "save", "sync", "cloud", "offline"]):
        return (
            "✦ Agastya tracks your daily learning streak automatically. You can log in to sync your progress securely across devices, "
            "or continue learning offline in local mode where everything is saved right on your device."
        )
    return (
        f"✦ Great question about '{query}'! To explore this thoroughly based on your exact syllabus, "
        "upload your notes or textbook chapter in the Study Studio (Learn tab) and click 'Explain' or ask here anytime. "
        "Remember to break big concepts into smaller bite-sized steps!"
    )
