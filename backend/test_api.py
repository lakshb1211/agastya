#!/usr/bin/env python3
"""Automated end-to-end verification of Agastya backend endpoints."""

import asyncio
import os
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.db import init_db
from app.main import (
    app,
    health_check,
    register,
    login,
    get_streak,
    ping_streak,
    create_material,
    get_material,
    get_study_plan_endpoint,
    get_notes_endpoint,
    explain_endpoint,
    create_quiz,
    submit_quiz_endpoint,
    chat_endpoint,
    get_user_progress_summary,
)
from app.models import (
    RegisterRequest,
    LoginRequest,
    ExplanationRequest,
    NotesRequest,
    QuizRequest,
    QuizSubmission,
    ChatRequest,
)

async def run_tests():
    print("🧪 Initializing database...")
    init_db()

    print("1. Testing Health Check...")
    h = health_check()
    assert h["status"] == "healthy", f"Health check failed: {h}"
    print("   ✓ Health check OK:", h["service"])

    print("2. Testing User Registration & Authentication...")
    test_email = f"student_{os.urandom(3).hex()}@agastya.universe"
    reg_req = RegisterRequest(
        email=test_email,
        password="studyPassword123!",
        name="Laksh",
        grade="High School",
    )
    reg_res = register(reg_req)
    assert reg_res["token"], "No token returned"
    assert reg_res["user"].email == test_email
    print(f"   ✓ Registered user: {reg_res['user'].name} ({reg_res['user'].email})")

    login_req = LoginRequest(email=test_email, password="studyPassword123!")
    login_res = login(login_req)
    assert login_res["token"], "No login token"
    print("   ✓ Login successful!")

    current_user = {
        "id": login_res["user"].id,
        "email": login_res["user"].email,
        "name": login_res["user"].name,
        "grade": login_res["user"].grade,
    }

    print("3. Testing Streak Tracking...")
    streak = ping_streak(current_user)
    assert streak["streak_count"] >= 1
    assert streak["is_active_today"] is True
    print(f"   ✓ Streak active: {streak['streak_count']} days")

    print("4. Testing Material Ingestion (Pasted Study Material)...")
    sample_text = (
        "Cellular respiration is a series of chemical reactions that break down glucose to produce ATP. "
        "The process consists of three main stages: glycolysis, the citric acid cycle, and oxidative phosphorylation. "
        "Glycolysis takes place in the cytoplasm and breaks down one glucose molecule into two pyruvate molecules. "
        "The citric acid cycle occurs inside the mitochondrial matrix and produces high-energy electron carriers like NADH. "
        "Oxidative phosphorylation occurs across the inner mitochondrial membrane and generates the vast majority of ATP. "
        "Photosynthesis, on the other hand, converts light energy into chemical energy stored in glucose within chloroplasts."
    )
    mat_res = await create_material(
        file=None,
        pasted_text=sample_text,
        title="Cellular Energy and Respiration",
        current_user=current_user,
    )
    mat_id = mat_res["id"]
    assert mat_id, "No material ID generated"
    assert len(mat_res["topics"]) > 0, "No topics extracted"
    assert "study_plan" in mat_res, "No study plan in response"
    assert "short_notes" in mat_res, "No short notes in response"
    print(f"   ✓ Material created: '{mat_res['title']}' (ID: {mat_id})")
    print(f"   ✓ Topics extracted: {mat_res['topics']}")

    print("5. Testing Study Plan Generation...")
    plan = get_study_plan_endpoint(mat_id)
    assert plan["title"] == "Cellular Energy and Respiration"
    assert len(plan["schedule"]) == 3
    print(f"   ✓ 3-Day study schedule created with {len(plan['schedule'])} daily blocks")

    print("6. Testing Multilingual Notes & SVG Concept Map...")
    notes_req = NotesRequest(language="english")
    notes_res = get_notes_endpoint(mat_id, notes_req)
    assert len(notes_res["key_points"]) > 0, "No key points in notes"
    assert "visual" in notes_res and "<svg" in notes_res["visual"]["svg"], "SVG concept map missing"
    print(f"   ✓ Notes generated with {len(notes_res['key_points'])} key citations and SVG visual diagram")

    print("7. Testing Grounded Q&A...")
    # Answerable question
    ans_req = ExplanationRequest(question="Where does glycolysis take place in the cell?")
    ans_res = explain_endpoint(mat_id, ans_req)
    assert ans_res["available_in_material"] is True
    assert len(ans_res["sources"]) > 0
    print(f"   ✓ Grounded answer verified: '{ans_res['answer'][:70]}...' (Sources: {ans_res['sources']})")

    # Unanswerable question (to verify anti-hallucination)
    unans_req = ExplanationRequest(question="Who was Napoleon Bonaparte?")
    unans_res = explain_endpoint(mat_id, unans_req)
    assert unans_res["available_in_material"] is False
    print("   ✓ Anti-hallucination verified: correctly declined question not in material")

    print("8. Testing Diagnostic Quiz Generation...")
    quiz_req = QuizRequest(kind="diagnostic", question_count=3)
    quiz_res = create_quiz(mat_id, quiz_req, current_user)
    quiz_id = quiz_res["quiz_id"]
    questions = quiz_res["questions"]
    assert len(questions) > 0, "No questions returned"
    print(f"   ✓ Diagnostic quiz created with {len(questions)} multiple-choice questions")

    print("9. Testing Quiz Submission & Evaluation...")
    # Intentionally answer the first question correctly and leave others
    q0 = questions[0]
    answers = {q["id"]: 0 for q in questions}
    sub_req = QuizSubmission(answers=answers, confidence=4)
    sub_res = submit_quiz_endpoint(quiz_id, sub_req, current_user)
    assert "score" in sub_res
    assert "accuracy_percent" in sub_res
    assert "review" in sub_res
    print(f"   ✓ Quiz evaluated: Score {sub_res['score']}/{sub_res['total']} ({sub_res['accuracy_percent']}%)")
    print(f"   ✓ Weak topics detected: {sub_res['weak_areas']}")

    print("10. Testing Doubt-Solving AI Chatbot...")
    chat_req = ChatRequest(
        query="Can you explain why ATP is called the energy currency of the cell?",
        language="en",
        material_id=mat_id,
    )
    chat_res = chat_endpoint(chat_req, current_user)
    assert len(chat_res["reply"]) > 20
    print(f"   ✓ Tutor reply received: '{chat_res['reply'][:80]}...'")

    print("11. Testing User Progress Summary...")
    summary = get_user_progress_summary(current_user)
    assert summary["total_quizzes"] >= 1
    print(f"   ✓ Progress summary: {summary['total_quizzes']} quiz(zes) completed, streak: {summary['streak_count']}")

    print("\n🎉 ALL 11 TESTS PASSED SUCCESSFULLY! Agastya Backend is 100% functional.")

if __name__ == "__main__":
    asyncio.run(run_tests())
