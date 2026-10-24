# Agastya — Your Learning Universe (Frontend & Backend)

A modern, offline-first study companion web application built with a **Vite + Vanilla JS** cosmic frontend and a **Node.js (Express)** backend, featuring grounded material ingestion (PDF/Images/Text), cited study plans, dynamic diagnostic quizzes, streak tracking, and AI-powered doubt solving.

---

## 🚀 Quick Start

Requires Node.js 20 or newer.

```bash
npm install
cp .env.example .env      # then add GEMINI_API_KEY and AGASTYA_SECRET_KEY
```
Generate a signing key with `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`. The `.env` file is local-only and must not be committed.

### Development (two terminals)
```bash
npm run server   # API on http://127.0.0.1:8000 (restarts on file changes)
npm run dev      # frontend on http://localhost:3000, proxies /api to the server
```

### Production (one process)
```bash
npm run build    # builds the frontend into dist/
npm start        # serves dist/ and the API on $PORT (default 8000)
```

### Tests
```bash
npm test                     # every API endpoint, AI disabled
AGASTYA_TEST_AI=1 npm test   # same, using your real AI keys
```

---

## 🧠 Backend Architecture & Endpoints

The backend lives in [`server/`](./server/):
- [`server/app.js`](./server/app.js): Express app, routes, validation, static frontend hosting.
- [`server/extractor.js`](./server/extractor.js): PDF text extraction (pdf-parse), passage splitting, topic analysis, SVG concept map, study plan builder.
- [`server/ai.js`](./server/ai.js): Gemini (Interactions API, with overload fallback models) then OpenAI, with a deterministic local fallback when no key works.
- [`server/quiz.js`](./server/quiz.js): Cited multiple-choice quiz generation, grading, weak-topic progress.
- [`server/security.js`](./server/security.js): PBKDF2 password hashing and HMAC-SHA256 JWT authentication.
- [`server/db.js`](./server/db.js): JSON-file datastore (`data/agastya.json`) for users, streaks, materials, quizzes, attempts and chats. No native modules, so it runs on any Node host.

### Key Endpoints:
- `GET /api/health` — Service health & version status.
- `POST /api/auth/register` & `POST /api/auth/login` — Student authentication with JWT.
- `GET /api/streak` & `POST /api/streak/ping` — Daily learning streak tracker.
- `POST /api/materials` — Upload a PDF or paste text; extracts topics, generates a 3-day study plan, revision notes, and SVG concept map.
- `GET /api/materials/{material_id}/study-plan` — Retrieve personalized 3-day revision plan.
- `POST /api/materials/{material_id}/notes` — Multilingual revision notes with citations (English, Hindi, Spanish, French, Chinese).
- `POST /api/materials/{material_id}/explain` — Strict grounded Q&A with passage/page citations and anti-hallucination guardrail.
- `POST /api/materials/{material_id}/quizzes` — Create 4-choice diagnostic or weak-topic quizzes.
- `POST /api/quizzes/{quiz_id}/submit` — Grade answers, identify weak topics (<70%), and log attempt.
- `POST /api/chat` — Doubt-solving conversational AI tutor grounded in uploaded materials.
- `GET /api/progress/summary` — Student mastery and attempt statistics.

### Deploying
- **Google AI Studio:** Build → Add files (+) → Import from GitHub, then add `GEMINI_API_KEY` (and `AGASTYA_SECRET_KEY`) in the Secrets panel and deploy.
- **Cloud Run:** `gcloud run deploy agastya --source . --region us-central1 --allow-unauthenticated --set-env-vars GEMINI_API_KEY=...,AGASTYA_SECRET_KEY=...` (uses the included `Dockerfile`).

Note: the datastore is a file on the container's disk. On Cloud Run it resets when the container restarts; point `AGASTYA_DATA_DIR` at a mounted volume to keep data.

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
├── Dockerfile                   # One-container build for Cloud Run / AI Studio
├── server/                      # Node.js (Express) API + static hosting
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
