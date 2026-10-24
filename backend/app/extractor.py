import html
import json
import re
from collections import Counter
from io import BytesIO
from pathlib import Path
from typing import Any, Dict, List, Optional
from fastapi import HTTPException
from PIL import Image, UnidentifiedImageError

from .config import MAX_PDF_PAGES, LANGUAGES, LANG_ALIASES

STOP_WORDS = {
    "about", "after", "again", "also", "among", "because", "before", "being",
    "between", "could", "during", "every", "first", "from", "have", "into",
    "itself", "more", "most", "other", "over", "same", "some", "such", "than",
    "that", "their", "there", "these", "they", "this", "those", "through",
    "under", "using", "very", "were", "what", "when", "where", "which", "while",
    "with", "would", "your", "the", "and", "for", "are", "was", "but", "not",
    "you", "can", "has", "had", "its", "our", "out", "all", "any", "one",
    "two", "use", "used", "how", "why", "who", "will", "may", "does", "did",
    "been", "being", "each", "both", "per", "via", "then", "them", "his", "her",
    "का", "की", "के", "है", "हैं", "में", "से", "और", "को", "पर", "यह", "वह", "एक", "नहीं"
}

def split_passages(text: str) -> List[Dict[str, Any]]:
    paragraphs = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
    sections: List[Dict[str, Any]] = []
    passage_num = 1
    for paragraph in paragraphs:
        if len(paragraph) <= 1800:
            sections.append({
                "id": f"S{passage_num}",
                "citation": f"Passage {passage_num}",
                "text": paragraph,
            })
            passage_num += 1
        else:
            for start in range(0, len(paragraph), 1600):
                sections.append({
                    "id": f"S{passage_num}",
                    "citation": f"Passage {passage_num}",
                    "text": paragraph[start : start + 1600],
                })
                passage_num += 1
    return sections

def extract_image_text(image: Image.Image) -> str:
    try:
        import pytesseract
        return pytesseract.image_to_string(image).strip()
    except Exception:
        return ""

def extract_upload(filename: str, content: bytes) -> List[Dict[str, Any]]:
    suffix = Path(filename).suffix.lower()
    sections: List[Dict[str, Any]] = []

    if suffix == ".pdf":
        try:
            import pymupdf as fitz
        except ImportError:
            try:
                import fitz
            except ImportError:
                raise HTTPException(status_code=500, detail="PyMuPDF library is not installed.")

        try:
            doc = fitz.open(stream=content, filetype="pdf")
        except Exception as exc:
            raise HTTPException(status_code=422, detail="The uploaded PDF file could not be read.") from exc

        if doc.page_count > MAX_PDF_PAGES:
            raise HTTPException(
                status_code=413,
                detail=f"PDFs may contain at most {MAX_PDF_PAGES} pages."
            )

        for page_num, page in enumerate(doc, start=1):
            page_text = page.get_text("text").strip()
            if not page_text:
                try:
                    pix = page.get_pixmap(matrix=fitz.Matrix(1.5, 1.5), alpha=False)
                    img = Image.open(BytesIO(pix.tobytes("png")))
                    page_text = extract_image_text(img)
                except Exception:
                    pass
            if page_text:
                sections.append({
                    "id": f"S{len(sections) + 1}",
                    "citation": f"Page {page_num}",
                    "text": page_text,
                })

        if not sections:
            raise HTTPException(status_code=422, detail="No readable text found in the PDF.")
        return sections

    if suffix in {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tif", ".tiff"}:
        try:
            img = Image.open(BytesIO(content))
            extracted_text = extract_image_text(img)
        except UnidentifiedImageError as exc:
            raise HTTPException(status_code=422, detail="Image file could not be parsed.") from exc
        if not extracted_text:
            raise HTTPException(status_code=422, detail="No readable text detected in the image.")
        return split_passages(extracted_text)

    raise HTTPException(status_code=415, detail="Unsupported file format. Please upload a PDF or image.")

def all_text(sections: List[Dict[str, Any]]) -> str:
    return "\n".join(section["text"] for section in sections)

def extract_topics(sections: List[Dict[str, Any]], limit: int = 8) -> List[str]:
    lines = [line.strip(" #\t:-") for line in all_text(sections).splitlines()]
    heading_pattern = re.compile(
        r"^(?:chapter|unit|module|lesson|topic|section)\s+[\w.:-]+[.)]?\s*[:.-]?\s*(.+)$",
        re.IGNORECASE,
    )
    headings: List[str] = []
    for line in lines:
        match = heading_pattern.match(line)
        candidate = match.group(1) if match else line
        if (
            2 <= len(candidate.split()) <= 7
            and len(candidate) <= 80
            and (match or (candidate.isupper() and len(candidate) > 3))
        ):
            if candidate.lower() not in {item.lower() for item in headings}:
                headings.append(candidate.title())

    if headings:
        return headings[:limit]

    words = re.findall(r"\b[A-Za-z\u0900-\u097F][A-Za-z\u0900-\u097F'-]{3,}\b", all_text(sections).lower())
    common = [word for word, _ in Counter(
        word for word in words if word not in STOP_WORDS
    ).most_common(limit)]
    return [word.capitalize() for word in common] or ["Core Concepts", "Key Principles"]

def selected_sections(
    sections: List[Dict[str, Any]],
    topics: Optional[List[str]] = None,
    maximum: int = 12
) -> List[Dict[str, Any]]:
    if not topics:
        return sections[:maximum]
    terms = {w.lower() for t in topics for w in re.findall(r"[A-Za-z0-9\u0900-\u097F]+", t) if len(w) > 2}
    ranked = sorted(
        sections,
        key=lambda s: sum(s["text"].lower().count(term) for term in terms),
        reverse=True,
    )
    return [s for s in ranked[:maximum] if s]

def diagram_svg(title: str, topics: List[str]) -> str:
    labels = topics[:5] or ["Core Concept", "Key Application"]
    width = 760
    box_width = 210
    gap = 18
    total_width = len(labels) * box_width + (len(labels) - 1) * gap
    start_x = max(25, (width - total_width) // 2)
    escaped_title = html.escape(title[:80])
    boxes: List[str] = []

    for index, label in enumerate(labels):
        x = start_x + index * (box_width + gap)
        escaped_label = html.escape(label[:30])
        boxes.append(
            f'<rect x="{x}" y="100" width="{box_width}" height="76" rx="14" '
            'fill="#141a38" stroke="#6366f1" stroke-width="2"/>'
            f'<text x="{x + box_width // 2}" y="145" text-anchor="middle" '
            f'font-size="15" font-weight="600" font-family="Inter,Arial,sans-serif" fill="#f5cd78">{escaped_label}</text>'
        )
        if index < len(labels) - 1:
            next_x = x + box_width + gap
            boxes.append(
                f'<path d="M {x + box_width} 138 L {next_x - 8} 138" '
                'stroke="#818cf8" stroke-width="2.5" marker-end="url(#arrow)"/>'
            )

    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" role="img" '
        f'aria-label="{escaped_title} concept map" viewBox="0 0 {width} 220">'
        '<defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="8" '
        'refY="3" orient="auto"><path d="M0,0 L0,6 L9,3 z" fill="#818cf8"/></marker></defs>'
        f'<rect width="{width}" height="220" rx="18" fill="#0d1127" stroke="rgba(255,255,255,0.08)"/>'
        f'<text x="{width // 2}" y="55" text-anchor="middle" font-size="20" '
        f'font-weight="bold" font-family="Inter,Arial,sans-serif" fill="#ffffff">✦ {escaped_title}</text>'
        f'{"".join(boxes)}</svg>'
    )

def build_study_plan(sections: List[Dict[str, Any]], title: str) -> Dict[str, Any]:
    topics = extract_topics(sections)
    days = 3
    t_len = len(topics)
    day1_topics = topics[:max(1, t_len // 3)]
    day2_topics = topics[max(1, t_len // 3):max(2, 2 * t_len // 3)]
    day3_topics = topics[max(2, 2 * t_len // 3):] or topics[:1]

    schedule = [
        {
            "day": 1,
            "theme": "Foundation & Diagnostic Review",
            "topics": day1_topics,
            "steps": [
                "Read the foundational sections and highlight key definitions.",
                "Take a 5-question diagnostic quiz to establish your baseline.",
                "Review the auto-generated concept map for a high-level view.",
            ],
            "sources": [s["citation"] for s in selected_sections(sections, day1_topics, maximum=2)],
        },
        {
            "day": 2,
            "theme": "Deep Dive & Targeted Practice",
            "topics": day2_topics,
            "steps": [
                "Engage with the Grounded Q&A to resolve doubts on difficult sections.",
                "Take a Weak-Topic quiz focusing on areas scored below 70%.",
                "Summarize key formulas or core arguments without looking at the text.",
            ],
            "sources": [s["citation"] for s in selected_sections(sections, day2_topics, maximum=2)],
        },
        {
            "day": 3,
            "theme": "Synthesis & Mastery Check",
            "topics": day3_topics,
            "steps": [
                "Review the consolidated notes and vocabulary list.",
                "Complete a comprehensive final quiz covering all topics.",
                "Verify your progress chart shows consistent scores above 70%.",
            ],
            "sources": [s["citation"] for s in selected_sections(sections, day3_topics, maximum=2)],
        },
    ]

    return {
        "title": title,
        "estimated_days": days,
        "daily_study_minutes": 25,
        "schedule": schedule,
        "study_method": (
            "Break your study time into 25-minute Pomodoro sessions. After each session, "
            "test your recall with a quiz before moving to the next topic."
        ),
    }

def build_local_notes(
    sections: List[Dict[str, Any]],
    title: str,
    topics: List[str]
) -> Dict[str, Any]:
    points: List[Dict[str, Any]] = []
    seen: set[str] = set()

    for section in sections:
        sentences = re.split(r"(?<=[.!?।])\s+", section["text"].replace("\n", " "))
        for sentence in sentences:
            sentence = sentence.strip()
            if 35 <= len(sentence) <= 260 and sentence.lower() not in seen:
                points.append({
                    "text": sentence,
                    "citations": [section["citation"]],
                })
                seen.add(sentence.lower())
                if len(points) >= 8:
                    break
        if len(points) >= 8:
            break

    if not points:
        points = [
            {"text": section["text"][:240] + "…", "citations": [section["citation"]]}
            for section in sections[:4]
        ]

    return {
        "title": title,
        "overview": "Carefully review these core principles extracted directly from your study material.",
        "key_points": points,
        "topics": topics,
    }

def source_prompt(sections: List[Dict[str, Any]], maximum: int = 12) -> str:
    records = [
        {
            "source_id": section["id"],
            "citation": section["citation"],
            "text": section["text"][:1800],
        }
        for section in sections[:maximum]
    ]
    return json.dumps(records, ensure_ascii=False)

def available_citations(source_ids: Any, sections: List[Dict[str, Any]]) -> List[str]:
    allowed = {section["id"]: section["citation"] for section in sections}
    if not isinstance(source_ids, list):
        return []
    return list(dict.fromkeys(allowed[sid] for sid in source_ids if sid in allowed))
