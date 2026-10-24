# Agastya — Your Learning Universe (Frontend & Backend)

A modern, offline-first study companion web application built with a **Vite + Vanilla JS** cosmic frontend and a high-performance **FastAPI (Python)** backend, featuring grounded material ingestion (PDF/Images/Text), cited study plans, dynamic diagnostic quizzes, streak tracking, and AI-powered doubt solving.

---

## 🚀 Quick Start

### 1. Start the FastAPI Backend
Set a unique backend signing key before starting the server. Copy `.env.example` to `.env`, then generate a key with:
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```
Set the resulting value as `AGASTYA_SECRET_KEY` in `.env`. The `.env` file is local-only and must not be committed.

```bash
# Using npm shortcut:
npm run backend

# Or directly in the backend folder:
cd backend
.venv/bin/python run.py
```
Interactive API docs (Swagger): [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
Health Check: [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health)

### 2. Start the Frontend
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser. The Vite dev server proxies `/api`, `/materials`, and `/quizzes` requests to the backend server.

### 3. Run Automated Backend Test Suite
```bash
npm run test:backend
```
Executes automated end-to-end tests across all 11 backend endpoints.

---

## 🧠 Backend Architecture & Endpoints

The backend is located in [`backend/`](./backend/) with modular architecture:
- [`backend/app/main.py`](./backend/app/main.py): FastAPI app, CORS middleware, lifespan events, and route definitions.
- [`backend/app/extractor.py`](./backend/app/extractor.py): PDF parsing via PyMuPDF, image OCR extraction via Tesseract, topic analysis, SVG concept map generation, and study plan builder.
- [`backend/app/ai_service.py`](./backend/app/ai_service.py): AI integration (OpenAI / Gemini) with high-quality local deterministic fallback if no API key is provided.
- [`backend/app/quiz_service.py`](./backend/app/quiz_service.py): Diagnostic & weak-topic multiple choice question generation with citations, scoring, and progress calculations.
- [`backend/app/security.py`](./backend/app/security.py): PBKDF2 password hashing and HMAC-SHA256 JWT authentication.
- [`backend/app/db.py`](./backend/app/db.py): SQLite with WAL mode, foreign keys, and indexes for `users`, `streaks`, `materials`, `quizzes`, `attempts`, and `chats`.

### Key Endpoints:
- `GET /api/health` — Service health & version status.
- `POST /api/auth/register` & `POST /api/auth/login` — Student authentication with JWT.
- `GET /api/streak` & `POST /api/streak/ping` — Daily learning streak tracker.
- `POST /api/materials` (or `POST /materials`) — Upload PDF/image or paste text; extracts topics, generates 3-day study plan, revision notes, and SVG concept map.
- `GET /api/materials/{material_id}/study-plan` — Retrieve personalized 3-day revision plan.
- `POST /api/materials/{material_id}/notes` — Multilingual revision notes with citations (English, Hindi, Spanish, French, Chinese).
- `POST /api/materials/{material_id}/explain` — Strict grounded Q&A with direct passage/page citations and anti-hallucination guardrail.
- `POST /api/materials/{material_id}/quizzes` — Create 4-choice diagnostic or weak-topic quizzes.
- `POST /api/quizzes/{quiz_id}/submit` — Grade answers, identify weak topics (<70%), and log attempt.
- `POST /api/chat` — Doubt-solving conversational AI tutor grounded in uploaded materials.
- `GET /api/progress/summary` — Student mastery and attempt statistics.

---

## ⚡ Supabase Setup (Optional Cloud Sync)

Agastya includes seamless cloud persistence with automatic fallback to local offline mode if Supabase credentials are not provided.

### Step 1: Create a Supabase Project
1. Go to [supabase.com](https://supabase.com) and create a new project.
2. Under **Project Settings** -> **API**, copy your **Project URL** and **anon public key**.

### Step 2: Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Update `.env` with your project credentials:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-actual-anon-key
```

### Step 3: Run Database Schema
1. In the Supabase Dashboard, open the **SQL Editor**.
2. Open [`supabase/schema.sql`](./supabase/schema.sql), copy its contents, and click **Run**.
3. This creates:
   - `profiles`: User profile with automatic signup trigger.
   - `user_streaks`: Daily learning streaks.
   - `study_materials`: Stored notes and extracted topics.
   - `quiz_attempts`: Diagnostic & practice quiz histories.
   - `chat_messages`: Doubts asked to the AI assistant.
   - Row Level Security (RLS) policies protecting each user's private data.

---

## 📂 Project Architecture

```
agastya-learning-universe/
├── index.html                   # HTML entry point with cosmic elements & 3D loader
├── vite.config.js               # Vite build & dev server configuration
├── package.json                 # Project dependencies & scripts
├── .env.example                 # Supabase environment variables template
├── .env                         # Local-only environment settings (not committed)
├── supabase/
│   └── schema.sql               # PostgreSQL schema, triggers & RLS policies
└── src/
    ├── main.js                  # Application bootstrap & auth UI wiring
    ├── lib/
    │   └── supabase.js          # Supabase client & connection detector
    ├── services/
    │   ├── auth.js              # Supabase Auth + local fallback
    │   ├── storage.js           # Cloud/local sync for streaks, quizzes, notes
    │   ├── studio.js            # PDF parser, TF-IDF topic analysis, Q&A, quiz engine
    │   ├── progress.js          # SVG score trends, weekly charts, SPA router
    │   └── i18n.js              # Multilingual translation engine (EN, HI, ES, FR)
    ├── components/
    │   ├── stars.js             # Canvas starfield & Milky Way animations
    │   ├── loadingScreen.js     # 3D cosmic comet & planet loading transition
    │   └── chatbot.js           # Doubt-solving chat assistant with cloud logging
    └── styles/
        └── style.css            # Cosmic dark theme, 3D CSS keyframes, responsive UI
```

---

## 🌟 Key Features

1. **Study Studio**:
   - Ingests pasted notes or uploaded PDFs using client-side `pdf.js`.
   - TF-IDF extraction detects key concepts and builds cloze deletion quizzes.
   - Strict Grounded Q&A only answers from your material to prevent AI hallucination.
2. **Dynamic 3-Day Revision Planner**:
   - Generates personalized schedules targeting weak areas ($< 70\%$ accuracy).
3. **Progress Analytics**:
   - Dynamic SVG trend chart with a $70\%$ goal line.
   - Weekly study consistency histogram and topic accuracy breakdowns.
4. **Supabase Cloud Sync**:
   - Secure authentication via Supabase Auth.
   - Instant cloud synchronization of streaks, quiz scores, materials, and questions.
   - Graceful offline mode preserves functionality when disconnected.
5. **Cosmic UI & 3D Loader**:
   - Celestial 3D shooting star transition between glowing planets.
   - Parallax planetary orbits around star Canopus.
   - Interactive starfield with twinkling particles and shooting stars.
6. **Multilingual Support**:
   - Native toggle between English, हिन्दी (Hindi), Español (Spanish), and Français (French).
