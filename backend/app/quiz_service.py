import json
import random
import re
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from fastapi import HTTPException

from .ai_service import ask_ai_json
from .db import get_db
from .extractor import (
    STOP_WORDS,
    available_citations,
    extract_topics,
    selected_sections,
    source_prompt,
)

def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

def make_local_questions(
    sections: List[Dict[str, Any]],
    count: int,
    topics: Optional[List[str]] = None,
) -> List[Dict[str, Any]]:
    eligible_sections = selected_sections(sections, topics, maximum=len(sections))
    facts: List[tuple[str, Dict[str, Any]]] = []

    for section in eligible_sections:
        sentences = re.split(r"(?<=[.!?।])\s+", section["text"].replace("\n", " "))
        for sentence in sentences:
            sentence = sentence.strip()
            if len(sentence.split()) >= 6:
                facts.append((sentence, section))

    questions: List[Dict[str, Any]] = []
    rng = random.SystemRandom()

    for sentence, section in facts:
        words = re.findall(r"\b[A-Za-z\u0900-\u097F][A-Za-z\u0900-\u097F'-]{3,}\b", sentence)
        candidates = [w for w in words if w.lower() not in STOP_WORDS]
        if not candidates:
            continue

        answer = max(candidates, key=len)
        distractors: List[str] = []

        # Collect distractors from other sentences
        for candidate_sentence, _ in facts:
            for w in re.findall(r"\b[A-Za-z\u0900-\u097F][A-Za-z\u0900-\u097F'-]{3,}\b", candidate_sentence):
                if (
                    w.lower() not in STOP_WORDS
                    and w.lower() != answer.lower()
                    and w.lower() not in {d.lower() for d in distractors}
                ):
                    distractors.append(w)
                    if len(distractors) == 3:
                        break
            if len(distractors) == 3:
                break

        choices = [answer, *distractors[:3]]
        fallback_counter = 1
        while len(choices) < 4:
            choices.append(f"Concept option {fallback_counter}")
            fallback_counter += 1

        choices = choices[:4]
        rng.shuffle(choices)
        answer_index = choices.index(answer)

        if topics:
            topic = max(
                topics,
                key=lambda item: sum(
                    section["text"].lower().count(term.lower())
                    for term in re.findall(r"[A-Za-z0-9\u0900-\u097F]+", item)
                    if len(term) > 2
                ),
            )
        else:
            cand_topics = extract_topics([section], limit=1)
            topic = cand_topics[0] if cand_topics else "Core Concept"

        masked_sentence = re.sub(re.escape(answer), "_____", sentence, count=1, flags=re.IGNORECASE)
        questions.append(
            {
                "id": f"Q{len(questions) + 1}",
                "question": f"Complete the statement from your material: “{masked_sentence}”",
                "options": choices,
                "correct_index": answer_index,
                "topic": topic,
                "explanation": f"Source passage states: “{sentence}”",
                "source_ids": [section["id"]],
            }
        )
        if len(questions) >= count:
            break

    if not questions:
        raise HTTPException(
            status_code=422,
            detail="There is not enough readable text in the material to construct quiz questions.",
        )
    return questions

def generate_questions(
    sections: List[Dict[str, Any]],
    count: int,
    topics: Optional[List[str]] = None,
) -> List[Dict[str, Any]]:
    context_sections = selected_sections(sections, topics)
    ai_prompt = (
        f"Create exactly {count} four-option multiple-choice questions using ONLY this course material.\n"
        f"Target topics: {topics or 'all key topics'}.\n"
        "Return JSON: {\"questions\": [{\"question\": string, \"options\": [4 strings], "
        "\"correct_index\": integer 0-3, \"topic\": string, \"explanation\": string, \"source_ids\": [valid IDs]}]}.\n"
        "Rules:\n"
        "1. Every question MUST have exactly 4 choices.\n"
        "2. correct_index must be 0, 1, 2, or 3.\n"
        "3. source_ids must refer to matching IDs from the supplied material.\n\n"
        f"Study Material: {source_prompt(context_sections)}"
    )

    ai_result = ask_ai_json(
        ai_prompt,
        system_prompt="You are a rigorous exam creator. All questions, distractors, and answers must be strictly grounded in the material.",
    )

    if ai_result and isinstance(ai_result.get("questions"), list):
        questions: List[Dict[str, Any]] = []
        for item in ai_result["questions"][:count]:
            if not isinstance(item, dict):
                continue
            opts = item.get("options")
            c_idx = item.get("correct_index")
            cits = available_citations(item.get("source_ids"), context_sections)
            if (
                isinstance(item.get("question"), str)
                and isinstance(opts, list)
                and len(opts) == 4
                and all(isinstance(o, str) for o in opts)
                and isinstance(c_idx, int)
                and 0 <= c_idx < 4
                and cits
            ):
                q_sections = [s for s in context_sections if s["citation"] in cits]
                s_ids = [s["id"] for s in q_sections] or item.get("source_ids")
                questions.append(
                    {
                        "id": f"Q{len(questions) + 1}",
                        "question": item["question"],
                        "options": opts,
                        "correct_index": c_idx,
                        "topic": str(item.get("topic") or (topics or extract_topics(sections))[0]),
                        "explanation": str(item.get("explanation") or f"Supported by {', '.join(cits)}"),
                        "source_ids": s_ids,
                    }
                )
        if len(questions) >= max(1, count // 2):
            return questions

    # Local fallback
    return make_local_questions(sections, count, topics)

def public_questions(
    questions: List[Dict[str, Any]],
    sections: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    return [
        {
            "id": q["id"],
            "question": q["question"],
            "options": q["options"],
            "topic": q["topic"],
            "sources": available_citations(q.get("source_ids", []), sections),
        }
        for q in questions
    ]

def progress_for(
    material_id: str,
    sections: List[Dict[str, Any]],
    user_id: Optional[str] = None,
) -> Dict[str, Any]:
    with get_db() as conn:
        if user_id:
            rows = conn.execute(
                """
                SELECT attempts.id, attempts.quiz_id, attempts.score, attempts.total,
                       attempts.confidence, attempts.created_at, attempts.answers_json,
                       quizzes.kind, quizzes.questions_json
                FROM attempts
                JOIN quizzes ON quizzes.id = attempts.quiz_id
                WHERE quizzes.material_id = ? AND (attempts.user_id = ? OR attempts.user_id IS NULL)
                ORDER BY attempts.created_at ASC
                """,
                (material_id, user_id),
            ).fetchall()
        else:
            rows = conn.execute(
                """
                SELECT attempts.id, attempts.quiz_id, attempts.score, attempts.total,
                       attempts.confidence, attempts.created_at, attempts.answers_json,
                       quizzes.kind, quizzes.questions_json
                FROM attempts
                JOIN quizzes ON quizzes.id = attempts.quiz_id
                WHERE quizzes.material_id = ?
                ORDER BY attempts.created_at ASC
                """,
                (material_id,),
            ).fetchall()

    topic_stats: Dict[str, List[int]] = {}  # topic: [correct, total]
    attempt_summaries: List[Dict[str, Any]] = []

    for row in rows:
        questions = json.loads(row["questions_json"])
        answers = json.loads(row["answers_json"])
        attempt_summaries.append(
            {
                "attempt_id": row["id"],
                "quiz_id": row["quiz_id"],
                "kind": row["kind"],
                "score": row["score"],
                "total": row["total"],
                "confidence": row["confidence"],
                "created_at": row["created_at"],
            }
        )
        for q in questions:
            t = q.get("topic", "General")
            stats = topic_stats.setdefault(t, [0, 0])
            stats[1] += 1
            if answers.get(q["id"]) == q["correct_index"]:
                stats[0] += 1

    weak_areas = [
        topic for topic, (correct, total) in topic_stats.items()
        if total and (correct / total) < 0.7
    ]

    total_score = sum(r["score"] for r in rows)
    total_questions = sum(r["total"] for r in rows)
    overall_accuracy = round((total_score / total_questions) * 100) if total_questions else 0

    return {
        "material_id": material_id,
        "attempt_count": len(rows),
        "overall_accuracy_percent": overall_accuracy,
        "weak_areas": weak_areas,
        "topic_accuracy": {
            t: round((c / tot) * 100) if tot else 0
            for t, (c, tot) in topic_stats.items()
        },
        "attempts": attempt_summaries,
        "next_step": (
            "Take a focused quiz on your weak topics."
            if weak_areas
            else "Take another diagnostic quiz or explore the next topic."
        ),
    }

def evaluate_submission(
    quiz_row: Dict[str, Any],
    answers: Dict[str, int],
    confidence: int,
    sections: List[Dict[str, Any]],
    user_id: Optional[str] = None,
) -> Dict[str, Any]:
    questions = json.loads(quiz_row["questions_json"])
    q_dict = {q["id"]: q for q in questions}

    invalid_ids = set(answers.keys()) - set(q_dict.keys())
    if invalid_ids:
        raise HTTPException(
            status_code=422,
            detail=f"Unknown question IDs in submission: {', '.join(sorted(invalid_ids))}",
        )

    score = 0
    review: List[Dict[str, Any]] = []
    weak_areas: List[str] = []

    for q in questions:
        qid = q["id"]
        selected = answers.get(qid)
        is_correct = selected == q["correct_index"]
        if is_correct:
            score += 1
        else:
            if q["topic"] not in weak_areas:
                weak_areas.append(q["topic"])

        review.append(
            {
                "question_id": qid,
                "question": q["question"],
                "selected_option": q["options"][selected] if selected is not None and 0 <= selected < len(q["options"]) else None,
                "correct_option": q["options"][q["correct_index"]],
                "is_correct": is_correct,
                "topic": q["topic"],
                "explanation": q["explanation"],
                "sources": available_citations(q.get("source_ids", []), sections),
            }
        )

    attempt_id = str(uuid.uuid4())
    created_at = now_iso()

    with get_db() as conn:
        conn.execute(
            """
            INSERT INTO attempts (id, quiz_id, user_id, answers_json, score, total, confidence, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                attempt_id,
                quiz_row["id"],
                user_id,
                json.dumps(answers),
                score,
                len(questions),
                confidence,
                created_at,
            ),
        )

    acc = round((score / len(questions)) * 100) if questions else 0

    return {
        "attempt_id": attempt_id,
        "quiz_id": quiz_row["id"],
        "material_id": quiz_row["material_id"],
        "score": score,
        "total": len(questions),
        "accuracy_percent": acc,
        "review": review,
        "weak_areas": weak_areas,
        "confidence": confidence,
        "confidence_check_in": "How do you feel about these concepts after this quiz?",
        "ask_about_weak_topic_quiz": bool(weak_areas),
        "weak_topic_quiz_prompt": (
            "Would you like a focused quiz targeting your weak topics to solidify them?"
            if weak_areas
            else "Outstanding! You mastered all topics in this quiz. Ready for the next challenge?"
        ),
        "progress": progress_for(quiz_row["material_id"], sections, user_id),
    }
