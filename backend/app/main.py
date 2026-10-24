import json
import logging
import os
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import Depends, FastAPI, File, Form, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .ai_service import (
    chat_tutor,
    explain_question,
    generate_notes_ai,
    normalize_language,
)
from .config import (
    CORS_ORIGINS,
    LANGUAGES,
    MAX_UPLOAD_BYTES,
)
from .db import get_db, init_db
from .extractor import (
    build_study_plan,
    extract_topics,
    extract_upload,
    split_passages,
)
from .models import (
    AuthResponse,
    ChatRequest,
    ExplanationRequest,
    LoginRequest,
    NotesRequest,
    QuizRequest,
    QuizSubmission,
    RegisterRequest,
    StreakResponse,
    UserProfile,
)
from .quiz_service import (
    evaluate_submission,
    generate_questions,
    now_iso,
    progress_for,
    public_questions,
)
from .security import (
    create_access_token,
    get_current_user_optional,
    get_current_user_required,
    hash_password,
    verify_password,
)

logger = logging.getLogger("agastya_app")

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    logger.info("Agastya Learning Universe backend initialized.")
    yield

app = FastAPI(
    title="Agastya Learning Universe API",
    description="High-performance backend API for Agastya — AI study companion, grounded materials extractor, diagnostic quizzes & progress tracking.",
    version="2.0.0",
    lifespan=lifespan,
)

# Enable CORS for frontend Vite dev & preview servers
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------- Helper functions ----------------
def load_material_record(material_id: str) -> Dict[str, Any]:
    with get_db() as conn:
        row = conn.execute(
            "SELECT id, user_id, title, sections_json, topics_json, plan_json, notes_json, created_at FROM materials WHERE id = ?",
            (material_id,),
        ).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Study material was not found.")
    return dict(row)

# ---------------- Health & Meta ----------------
@app.get("/")
@app.get("/api/health")
def health_check() -> Dict[str, Any]:
    return {
        "service": "Agastya Learning Universe API",
        "status": "healthy",
        "timestamp": now_iso(),
        "version": "2.0.0",
    }

# ---------------- Auth Endpoints ----------------
@app.post("/api/auth/register", response_model=AuthResponse, status_code=201)
def register(req: RegisterRequest) -> Dict[str, Any]:
    email = req.email.lower().strip()
    with get_db() as conn:
        existing = conn.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this email address already exists.",
            )
        user_id = str(uuid.uuid4())
        created_at = now_iso()
        pw_hash = hash_password(req.password)
        conn.execute(
            "INSERT INTO users (id, email, password_hash, name, grade, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (user_id, email, pw_hash, req.name.strip(), req.grade.strip(), created_at),
        )
        # Initialize streak
        conn.execute(
            "INSERT INTO streaks (user_id, streak_count, last_active_date, updated_at) VALUES (?, ?, ?, ?)",
            (user_id, 1, datetime.now(timezone.utc).strftime("%Y-%m-%d"), created_at),
        )

    token = create_access_token(user_id, email, req.name)
    user = UserProfile(
        id=user_id,
        email=email,
        name=req.name.strip(),
        grade=req.grade.strip(),
        created_at=created_at,
    )
    return {"token": token, "user": user}

@app.post("/api/auth/login", response_model=AuthResponse)
def login(req: LoginRequest) -> Dict[str, Any]:
    email = req.email.lower().strip()
    with get_db() as conn:
        row = conn.execute(
            "SELECT id, email, password_hash, name, grade, created_at FROM users WHERE email = ?",
            (email,),
        ).fetchone()
    if not row or not verify_password(row["password_hash"], req.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
        )

    token = create_access_token(row["id"], row["email"], row["name"])
    user = UserProfile(
        id=row["id"],
        email=row["email"],
        name=row["name"],
        grade=row["grade"],
        created_at=row["created_at"],
    )
    return {"token": token, "user": user}

@app.get("/api/auth/me", response_model=UserProfile)
def get_me(current_user: Dict[str, Any] = Depends(get_current_user_required)) -> Dict[str, Any]:
    return current_user

# ---------------- Streak Endpoints ----------------
@app.get("/api/streak", response_model=StreakResponse)
def get_streak(current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)) -> Dict[str, Any]:
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    if not current_user:
        return {"streak_count": 0, "last_active_date": None, "is_active_today": False}

    with get_db() as conn:
        row = conn.execute(
            "SELECT streak_count, last_active_date FROM streaks WHERE user_id = ?",
            (current_user["id"],),
        ).fetchone()

    if not row:
        return {"streak_count": 0, "last_active_date": None, "is_active_today": False}

    last_active = row["last_active_date"]
    streak_count = row["streak_count"]

    if last_active:
        last_dt = datetime.strptime(last_active, "%Y-%m-%d").date()
        today_dt = datetime.now(timezone.utc).date()
        diff = (today_dt - last_dt).days
        if diff > 1:
            streak_count = 0

    return {
        "streak_count": streak_count,
        "last_active_date": last_active,
        "is_active_today": last_active == today,
    }

@app.post("/api/streak/ping", response_model=StreakResponse)
def ping_streak(current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)) -> Dict[str, Any]:
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    if not current_user:
        return {"streak_count": 1, "last_active_date": today, "is_active_today": True}

    user_id = current_user["id"]
    with get_db() as conn:
        row = conn.execute(
            "SELECT streak_count, last_active_date FROM streaks WHERE user_id = ?",
            (user_id,),
        ).fetchone()

        if not row:
            streak_count = 1
            conn.execute(
                "INSERT INTO streaks (user_id, streak_count, last_active_date, updated_at) VALUES (?, ?, ?, ?)",
                (user_id, streak_count, today, now_iso()),
            )
        else:
            last_active = row["last_active_date"]
            streak_count = row["streak_count"]
            if last_active != today:
                if last_active:
                    last_dt = datetime.strptime(last_active, "%Y-%m-%d").date()
                    today_dt = datetime.now(timezone.utc).date()
                    diff = (today_dt - last_dt).days
                    streak_count = streak_count + 1 if diff == 1 else 1
                else:
                    streak_count = 1
                conn.execute(
                    "UPDATE streaks SET streak_count = ?, last_active_date = ?, updated_at = ? WHERE user_id = ?",
                    (streak_count, today, now_iso(), user_id),
                )

    return {
        "streak_count": streak_count,
        "last_active_date": today,
        "is_active_today": True,
    }

# ---------------- Materials Endpoints ----------------
@app.post("/materials", status_code=201)
@app.post("/api/materials", status_code=201)
async def create_material(
    file: Optional[UploadFile] = File(default=None),
    pasted_text: Optional[str] = Form(default=None),
    title: Optional[str] = Form(default=None),
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional),
) -> Dict[str, Any]:
    has_file = file is not None
    has_text = bool(pasted_text and pasted_text.strip())

    if has_file == has_text:
        raise HTTPException(
            status_code=400,
            detail="Provide either an uploaded file (PDF/image) OR pasted_text, not both or none.",
        )

    if file is not None:
        content = await file.read(MAX_UPLOAD_BYTES + 1)
        if len(content) > MAX_UPLOAD_BYTES:
            raise HTTPException(status_code=413, detail="Uploads are limited to 15 MB.")
        sections = extract_upload(file.filename or "upload", content)
        material_title = (title or "").strip() or Path(file.filename or "Study Material").stem
    else:
        text_bytes = (pasted_text or "").encode("utf-8")
        if len(text_bytes) > MAX_UPLOAD_BYTES:
            raise HTTPException(status_code=413, detail="Pasted text exceeds 15 MB limit.")
        sections = split_passages(pasted_text or "")
        material_title = (title or "").strip() or "Pasted Study Notes"

    if not sections:
        raise HTTPException(status_code=422, detail="No readable text passages could be extracted.")

    material_id = str(uuid.uuid4())
    created_at = now_iso()
    topics = extract_topics(sections)
    study_plan = build_study_plan(sections, material_title)
    short_notes = generate_notes_ai(sections, material_title, language="english")

    user_id = current_user["id"] if current_user else None

    with get_db() as conn:
        conn.execute(
            """
            INSERT INTO materials (id, user_id, title, sections_json, topics_json, plan_json, notes_json, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                material_id,
                user_id,
                material_title,
                json.dumps(sections, ensure_ascii=False),
                json.dumps(topics, ensure_ascii=False),
                json.dumps(study_plan, ensure_ascii=False),
                json.dumps(short_notes, ensure_ascii=False),
                created_at,
            ),
        )

    return {
        "id": material_id,
        "title": material_title,
        "created_at": created_at,
        "section_count": len(sections),
        "topics": topics,
        "sources": [s["citation"] for s in sections],
        "study_plan": study_plan,
        "short_notes": short_notes,
        "next_step": "Study the key points above, then start a 5-question diagnostic quiz.",
    }

@app.get("/api/materials")
def list_materials(current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)) -> List[Dict[str, Any]]:
    with get_db() as conn:
        if current_user:
            rows = conn.execute(
                "SELECT id, title, topics_json, created_at FROM materials WHERE user_id = ? ORDER BY created_at DESC LIMIT 20",
                (current_user["id"],),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT id, title, topics_json, created_at FROM materials ORDER BY created_at DESC LIMIT 10"
            ).fetchall()

    return [
        {
            "id": row["id"],
            "title": row["title"],
            "topics": json.loads(row["topics_json"]),
            "created_at": row["created_at"],
        }
        for row in rows
    ]

@app.get("/materials/{material_id}")
@app.get("/api/materials/{material_id}")
def get_material(material_id: str) -> Dict[str, Any]:
    row = load_material_record(material_id)
    sections = json.loads(row["sections_json"])
    return {
        "id": row["id"],
        "title": row["title"],
        "created_at": row["created_at"],
        "section_count": len(sections),
        "topics": json.loads(row["topics_json"]),
        "sections": [{"source": s["citation"], "text": s["text"]} for s in sections],
    }

@app.get("/materials/{material_id}/study-plan")
@app.get("/api/materials/{material_id}/study-plan")
def get_study_plan_endpoint(material_id: str) -> Dict[str, Any]:
    row = load_material_record(material_id)
    if row.get("plan_json"):
        return json.loads(row["plan_json"])
    sections = json.loads(row["sections_json"])
    return build_study_plan(sections, row["title"])

@app.post("/materials/{material_id}/notes")
@app.post("/api/materials/{material_id}/notes")
def get_notes_endpoint(material_id: str, req: NotesRequest) -> Dict[str, Any]:
    row = load_material_record(material_id)
    sections = json.loads(row["sections_json"])
    return generate_notes_ai(sections, row["title"], req.language, req.topic)

@app.post("/materials/{material_id}/explain")
@app.post("/api/materials/{material_id}/explain")
def explain_endpoint(material_id: str, req: ExplanationRequest) -> Dict[str, Any]:
    row = load_material_record(material_id)
    sections = json.loads(row["sections_json"])
    return explain_question(req.question, sections, req.language)

# ---------------- Quizzes Endpoints ----------------
@app.post("/materials/{material_id}/quizzes", status_code=201)
@app.post("/api/materials/{material_id}/quizzes", status_code=201)
def create_quiz(
    material_id: str,
    req: QuizRequest,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional),
) -> Dict[str, Any]:
    row = load_material_record(material_id)
    sections = json.loads(row["sections_json"])
    topics = list(dict.fromkeys(t.strip() for t in req.topics if t.strip()))

    if req.kind == "weak-topic" and not topics:
        user_id = current_user["id"] if current_user else None
        prog = progress_for(material_id, sections, user_id)
        topics = prog.get("weak_areas", [])
        if not topics:
            raise HTTPException(
                status_code=400,
                detail="No weak topics recorded yet for this material. Take a diagnostic quiz first!",
            )

    questions = generate_questions(sections, req.question_count, topics or None)
    quiz_id = str(uuid.uuid4())
    created_at = now_iso()

    with get_db() as conn:
        conn.execute(
            "INSERT INTO quizzes (id, material_id, kind, questions_json, created_at) VALUES (?, ?, ?, ?, ?)",
            (quiz_id, material_id, req.kind, json.dumps(questions, ensure_ascii=False), created_at),
        )

    return {
        "quiz_id": quiz_id,
        "material_id": material_id,
        "kind": req.kind,
        "questions": public_questions(questions, sections),
        "submission_instructions": "Submit answers as {question_id: selected_index (0-3)} along with your confidence rating (1-5).",
    }

@app.get("/quizzes/{quiz_id}")
@app.get("/api/quizzes/{quiz_id}")
def get_quiz_endpoint(quiz_id: str) -> Dict[str, Any]:
    with get_db() as conn:
        q_row = conn.execute(
            "SELECT id, material_id, kind, questions_json, created_at FROM quizzes WHERE id = ?",
            (quiz_id,),
        ).fetchone()
    if not q_row:
        raise HTTPException(status_code=404, detail="Quiz not found.")
    m_row = load_material_record(q_row["material_id"])
    sections = json.loads(m_row["sections_json"])
    questions = json.loads(q_row["questions_json"])

    return {
        "quiz_id": q_row["id"],
        "material_id": q_row["material_id"],
        "kind": q_row["kind"],
        "questions": public_questions(questions, sections),
    }

@app.post("/quizzes/{quiz_id}/submit")
@app.post("/api/quizzes/{quiz_id}/submit")
def submit_quiz_endpoint(
    quiz_id: str,
    submission: QuizSubmission,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional),
) -> Dict[str, Any]:
    with get_db() as conn:
        quiz_row = conn.execute(
            "SELECT id, material_id, kind, questions_json, created_at FROM quizzes WHERE id = ?",
            (quiz_id,),
        ).fetchone()
    if not quiz_row:
        raise HTTPException(status_code=404, detail="Quiz not found.")

    mat_row = load_material_record(quiz_row["material_id"])
    sections = json.loads(mat_row["sections_json"])
    user_id = current_user["id"] if current_user else None

    # Automatically ping streak on quiz completion
    if current_user:
        ping_streak(current_user)

    return evaluate_submission(
        dict(quiz_row),
        submission.answers,
        submission.confidence,
        sections,
        user_id,
    )

@app.get("/materials/{material_id}/progress")
@app.get("/api/materials/{material_id}/progress")
def get_material_progress(
    material_id: str,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional),
) -> Dict[str, Any]:
    row = load_material_record(material_id)
    sections = json.loads(row["sections_json"])
    user_id = current_user["id"] if current_user else None
    return progress_for(material_id, sections, user_id)

# ---------------- Doubt-Solving Chatbot ----------------
@app.post("/api/chat")
def chat_endpoint(
    req: ChatRequest,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional),
) -> Dict[str, Any]:
    sections = None
    if req.material_id:
        try:
            m_row = load_material_record(req.material_id)
            sections = json.loads(m_row["sections_json"])
        except Exception:
            pass

    history_dicts = [{"role": m.role, "content": m.content} for m in req.history]
    reply = chat_tutor(req.query, history_dicts, sections, req.language)

    user_id = current_user["id"] if current_user else None
    chat_id = str(uuid.uuid4())
    created_at = now_iso()

    with get_db() as conn:
        conn.execute(
            "INSERT INTO chats (id, user_id, query, reply, language, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (chat_id, user_id, req.query, reply, req.language, created_at),
        )

    return {
        "id": chat_id,
        "query": req.query,
        "reply": reply,
        "language": req.language,
        "created_at": created_at,
    }

@app.get("/api/chat/history")
def get_chat_history(
    current_user: Dict[str, Any] = Depends(get_current_user_required),
) -> List[Dict[str, Any]]:
    with get_db() as conn:
        rows = conn.execute(
            "SELECT id, query, reply, language, created_at FROM chats WHERE user_id = ? ORDER BY created_at ASC LIMIT 50",
            (current_user["id"],),
        ).fetchall()
    return [dict(r) for r in rows]

# ---------------- Progress Summary ----------------
@app.get("/api/progress/summary")
def get_user_progress_summary(
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional),
) -> Dict[str, Any]:
    if not current_user:
        return {
            "total_quizzes": 0,
            "overall_accuracy_percent": 0,
            "streak_count": 0,
            "weak_topics": [],
            "recent_attempts": [],
        }

    user_id = current_user["id"]
    with get_db() as conn:
        attempts = conn.execute(
            """
            SELECT attempts.id, attempts.score, attempts.total, attempts.confidence,
                   attempts.created_at, quizzes.kind, quizzes.questions_json, attempts.answers_json
            FROM attempts
            JOIN quizzes ON quizzes.id = attempts.quiz_id
            WHERE attempts.user_id = ?
            ORDER BY attempts.created_at DESC
            LIMIT 20
            """,
            (user_id,),
        ).fetchall()

        streak_row = conn.execute(
            "SELECT streak_count FROM streaks WHERE user_id = ?",
            (user_id,),
        ).fetchone()

    streak_count = streak_row["streak_count"] if streak_row else 0
    total_quizzes = len(attempts)
    total_score = sum(a["score"] for a in attempts)
    total_questions = sum(a["total"] for a in attempts)
    overall_acc = round((total_score / total_questions) * 100) if total_questions else 0

    topic_stats: Dict[str, List[int]] = {}
    for a in attempts:
        questions = json.loads(a["questions_json"])
        answers = json.loads(a["answers_json"])
        for q in questions:
            t = q.get("topic", "General")
            s = topic_stats.setdefault(t, [0, 0])
            s[1] += 1
            if answers.get(q["id"]) == q["correct_index"]:
                s[0] += 1

    weak_topics = [
        t for t, (c, tot) in topic_stats.items()
        if tot >= 2 and (c / tot) < 0.7
    ]

    return {
        "total_quizzes": total_quizzes,
        "overall_accuracy_percent": overall_acc,
        "streak_count": streak_count,
        "weak_topics": weak_topics,
        "recent_attempts": [
            {
                "id": a["id"],
                "score": a["score"],
                "total": a["total"],
                "kind": a["kind"],
                "created_at": a["created_at"],
            }
            for a in attempts[:5]
        ],
    }
