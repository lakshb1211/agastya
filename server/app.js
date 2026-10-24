import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import multer from 'multer';
import { chatTutor, explainQuestion, generateNotesAi } from './ai.js';
import { CORS_ORIGINS, DIST_DIR, MAX_UPLOAD_BYTES } from './config.js';
import { findAll, findOne, insert, update } from './db.js';
import { HttpError } from './errors.js';
import { buildStudyPlan, extractTopics, extractUpload, splitPassages } from './extractor.js';
import { evaluateSubmission, generateQuestions, nowIso, progressFor, publicQuestions } from './quiz.js';
import {
  createAccessToken,
  currentUserOptional,
  currentUserRequired,
  hashPassword,
  publicUser,
  verifyPassword,
} from './security.js';

const VERSION = '3.0.0';
const todayUtc = () => new Date().toISOString().slice(0, 10);
const daysBetween = (fromYmd, toYmd) => Math.round((Date.parse(toYmd) - Date.parse(fromYmd)) / 864e5);

// ---------------- Validation helpers ----------------
function str(body, key, { min = 0, max = Infinity, optional = false, fallback } = {}) {
  let v = body?.[key];
  if (v === undefined || v === null) {
    if (fallback !== undefined) return fallback;
    if (optional) return null;
    throw new HttpError(422, `Field '${key}' is required.`);
  }
  if (typeof v !== 'string') throw new HttpError(422, `Field '${key}' must be a string.`);
  if (v.length < min) throw new HttpError(422, `Field '${key}' must be at least ${min} characters.`);
  if (v.length > max) throw new HttpError(422, `Field '${key}' must be at most ${max} characters.`);
  return v;
}

function int(body, key, { min, max, fallback }) {
  const v = body?.[key] ?? fallback;
  if (!Number.isInteger(v) || v < min || v > max) {
    throw new HttpError(422, `Field '${key}' must be an integer between ${min} and ${max}.`);
  }
  return v;
}

// Async route wrapper so thrown HttpErrors reach the error handler
const h = (fn) => (req, res, next) => Promise.resolve(fn(req, res)).then((out) => {
  if (out !== undefined && !res.headersSent) res.json(out);
}, next);

function loadMaterial(id) {
  const m = findOne('materials', (x) => x.id === id);
  if (!m) throw new HttpError(404, 'Study material was not found.');
  return m;
}

function loadQuiz(id) {
  const q = findOne('quizzes', (x) => x.id === id);
  if (!q) throw new HttpError(404, 'Quiz not found.');
  return q;
}

function streakFor(userId) {
  return findOne('streaks', (s) => s.user_id === userId);
}

function pingStreak(user) {
  const today = todayUtc();
  if (!user) return { streak_count: 1, last_active_date: today, is_active_today: true };

  const row = streakFor(user.id);
  let count = 1;
  if (!row) {
    insert('streaks', { user_id: user.id, streak_count: 1, last_active_date: today, updated_at: nowIso() });
  } else {
    count = row.streak_count;
    if (row.last_active_date !== today) {
      count = row.last_active_date && daysBetween(row.last_active_date, today) === 1 ? count + 1 : 1;
      update('streaks', (s) => s.user_id === user.id, {
        streak_count: count,
        last_active_date: today,
        updated_at: nowIso(),
      });
    }
  }
  return { streak_count: count, last_active_date: today, is_active_today: true };
}

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '2mb' }));

  // CORS for the Vite dev server (production serves frontend and API from one origin)
  app.use((req, res, next) => {
    const origin = req.get('origin');
    if (origin && CORS_ORIGINS.includes(origin)) {
      res.set({
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': req.get('access-control-request-headers') || '*',
        Vary: 'Origin',
      });
      if (req.method === 'OPTIONS') return res.sendStatus(204);
    }
    next();
  });

  app.use(currentUserOptional);

  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_UPLOAD_BYTES } });

  // ---------------- Health ----------------
  app.get('/api/health', (_req, res) => {
    res.json({ service: 'Agastya Learning Universe API', status: 'healthy', timestamp: nowIso(), version: VERSION });
  });

  // ---------------- Auth ----------------
  app.post('/api/auth/register', h((req, res) => {
    const email = str(req.body, 'email', { min: 5, max: 255 }).trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new HttpError(422, 'Invalid email format.');
    const password = str(req.body, 'password', { min: 6, max: 128 });
    const name = str(req.body, 'name', { min: 1, max: 100 }).trim();
    const grade = str(req.body, 'grade', { max: 50, fallback: 'School' }).trim();

    if (findOne('users', (u) => u.email === email)) {
      throw new HttpError(409, 'An account with this email address already exists.');
    }
    const user = insert('users', {
      id: crypto.randomUUID(),
      email,
      password_hash: hashPassword(password),
      name,
      grade,
      created_at: nowIso(),
    });
    insert('streaks', { user_id: user.id, streak_count: 1, last_active_date: todayUtc(), updated_at: user.created_at });
    res.status(201);
    return { token: createAccessToken(user.id, email, name), user: publicUser(user) };
  }));

  app.post('/api/auth/login', h((req) => {
    const email = str(req.body, 'email', { min: 3, max: 255 }).trim().toLowerCase();
    const password = str(req.body, 'password', { min: 1, max: 128 });
    const user = findOne('users', (u) => u.email === email);
    if (!user || !verifyPassword(user.password_hash, password)) {
      throw new HttpError(401, 'Incorrect email or password.');
    }
    return { token: createAccessToken(user.id, user.email, user.name), user: publicUser(user) };
  }));

  app.get('/api/auth/me', currentUserRequired, (req, res) => res.json(req.user));

  // ---------------- Streaks ----------------
  app.get('/api/streak', (req, res) => {
    const row = req.user && streakFor(req.user.id);
    if (!row) return res.json({ streak_count: 0, last_active_date: null, is_active_today: false });
    const today = todayUtc();
    const lapsed = row.last_active_date && daysBetween(row.last_active_date, today) > 1;
    res.json({
      streak_count: lapsed ? 0 : row.streak_count,
      last_active_date: row.last_active_date,
      is_active_today: row.last_active_date === today,
    });
  });

  app.post('/api/streak/ping', (req, res) => res.json(pingStreak(req.user)));

  // ---------------- Materials ----------------
  app.post(['/api/materials', '/materials'], upload.single('file'), h(async (req, res) => {
    const file = req.file;
    const pasted = typeof req.body?.pasted_text === 'string' ? req.body.pasted_text : '';
    const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
    const hasText = !!pasted.trim();

    if (!!file === hasText) {
      throw new HttpError(400, 'Provide either an uploaded file (PDF) OR pasted_text, not both or none.');
    }

    let sections;
    let materialTitle;
    if (file) {
      sections = await extractUpload(file.originalname || 'upload', file.buffer);
      materialTitle = title || path.parse(file.originalname || 'Study Material').name;
    } else {
      if (Buffer.byteLength(pasted, 'utf8') > MAX_UPLOAD_BYTES) {
        throw new HttpError(413, 'Pasted text exceeds 15 MB limit.');
      }
      sections = splitPassages(pasted);
      materialTitle = title || 'Pasted Study Notes';
    }
    if (!sections.length) throw new HttpError(422, 'No readable text passages could be extracted.');

    const topics = extractTopics(sections);
    const plan = buildStudyPlan(sections, materialTitle);
    const notes = await generateNotesAi(sections, materialTitle, 'english');

    const material = insert('materials', {
      id: crypto.randomUUID(),
      user_id: req.user ? req.user.id : null,
      title: materialTitle,
      sections,
      topics,
      plan,
      notes,
      created_at: nowIso(),
    });

    res.status(201);
    return {
      id: material.id,
      title: materialTitle,
      created_at: material.created_at,
      section_count: sections.length,
      topics,
      sources: sections.map((s) => s.citation),
      study_plan: plan,
      short_notes: notes,
      next_step: 'Study the key points above, then start a 5-question diagnostic quiz.',
    };
  }));

  app.get('/api/materials', (req, res) => {
    const rows = findAll('materials', (m) => !req.user || m.user_id === req.user.id)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, req.user ? 20 : 10);
    res.json(rows.map((m) => ({ id: m.id, title: m.title, topics: m.topics, created_at: m.created_at })));
  });

  app.get(['/api/materials/:id', '/materials/:id'], h((req) => {
    const m = loadMaterial(req.params.id);
    return {
      id: m.id,
      title: m.title,
      created_at: m.created_at,
      section_count: m.sections.length,
      topics: m.topics,
      sections: m.sections.map((s) => ({ source: s.citation, text: s.text })),
    };
  }));

  app.get(['/api/materials/:id/study-plan', '/materials/:id/study-plan'], h((req) => {
    const m = loadMaterial(req.params.id);
    return m.plan || buildStudyPlan(m.sections, m.title);
  }));

  app.post(['/api/materials/:id/notes', '/materials/:id/notes'], h((req) => {
    const m = loadMaterial(req.params.id);
    const language = str(req.body, 'language', { max: 30, fallback: 'english' });
    const topic = str(req.body, 'topic', { max: 200, optional: true });
    return generateNotesAi(m.sections, m.title, language, topic);
  }));

  app.post(['/api/materials/:id/explain', '/materials/:id/explain'], h((req) => {
    const m = loadMaterial(req.params.id);
    const question = str(req.body, 'question', { min: 2, max: 600 });
    const language = str(req.body, 'language', { max: 30, fallback: 'english' });
    return explainQuestion(question, m.sections, language);
  }));

  // ---------------- Quizzes ----------------
  app.post(['/api/materials/:id/quizzes', '/materials/:id/quizzes'], h(async (req, res) => {
    const m = loadMaterial(req.params.id);
    const kind = req.body?.kind ?? 'diagnostic';
    if (!['diagnostic', 'weak-topic', 'follow-up'].includes(kind)) {
      throw new HttpError(422, "Field 'kind' must be one of: diagnostic, weak-topic, follow-up.");
    }
    const count = int(req.body, 'question_count', { min: 1, max: 15, fallback: 5 });
    const rawTopics = req.body?.topics ?? [];
    if (!Array.isArray(rawTopics) || rawTopics.length > 15 || rawTopics.some((t) => typeof t !== 'string')) {
      throw new HttpError(422, "Field 'topics' must be a list of at most 15 strings.");
    }
    let topics = [...new Set(rawTopics.map((t) => t.trim()).filter(Boolean))];

    if (kind === 'weak-topic' && !topics.length) {
      topics = progressFor(m.id, req.user ? req.user.id : null).weak_areas;
      if (!topics.length) {
        throw new HttpError(400, 'No weak topics recorded yet for this material. Take a diagnostic quiz first!');
      }
    }

    const questions = await generateQuestions(m.sections, count, topics.length ? topics : null);
    const quiz = insert('quizzes', {
      id: crypto.randomUUID(),
      material_id: m.id,
      kind,
      questions,
      created_at: nowIso(),
    });

    res.status(201);
    return {
      quiz_id: quiz.id,
      material_id: m.id,
      kind,
      questions: publicQuestions(questions, m.sections),
      submission_instructions:
        'Submit answers as {question_id: selected_index (0-3)} along with your confidence rating (1-5).',
    };
  }));

  app.get(['/api/quizzes/:id', '/quizzes/:id'], h((req) => {
    const quiz = loadQuiz(req.params.id);
    const m = loadMaterial(quiz.material_id);
    return {
      quiz_id: quiz.id,
      material_id: quiz.material_id,
      kind: quiz.kind,
      questions: publicQuestions(quiz.questions, m.sections),
    };
  }));

  app.post(['/api/quizzes/:id/submit', '/quizzes/:id/submit'], h((req) => {
    const quiz = loadQuiz(req.params.id);
    const answers = req.body?.answers;
    if (!answers || typeof answers !== 'object' || Array.isArray(answers) || Object.values(answers).some((v) => !Number.isInteger(v))) {
      throw new HttpError(422, "Field 'answers' must map question IDs to option indexes.");
    }
    const confidence = int(req.body, 'confidence', { min: 1, max: 5, fallback: 3 });
    const m = loadMaterial(quiz.material_id);

    // Quiz completion counts as activity for the streak
    if (req.user) pingStreak(req.user);
    return evaluateSubmission(quiz, answers, confidence, m.sections, req.user ? req.user.id : null);
  }));

  app.get(['/api/materials/:id/progress', '/materials/:id/progress'], h((req) => {
    const m = loadMaterial(req.params.id);
    return progressFor(m.id, req.user ? req.user.id : null);
  }));

  // ---------------- Doubt-Solving Chatbot ----------------
  app.post('/api/chat', h(async (req) => {
    const query = str(req.body, 'query', { min: 1, max: 2000 });
    const language = str(req.body, 'language', { max: 30, fallback: 'en' });
    const materialId = str(req.body, 'material_id', { optional: true });
    const history = req.body?.history ?? [];
    if (
      !Array.isArray(history) ||
      history.some((m) => !m || !['user', 'assistant', 'system'].includes(m.role) || typeof m.content !== 'string')
    ) {
      throw new HttpError(422, "Field 'history' must be a list of {role, content} messages.");
    }

    const material = materialId ? findOne('materials', (x) => x.id === materialId) : null;
    const reply = await chatTutor(query, history, material ? material.sections : null, language);

    const chat = insert('chats', {
      id: crypto.randomUUID(),
      user_id: req.user ? req.user.id : null,
      query,
      reply,
      language,
      created_at: nowIso(),
    });
    return { id: chat.id, query, reply, language, created_at: chat.created_at };
  }));

  app.get('/api/chat/history', currentUserRequired, (req, res) => {
    const rows = findAll('chats', (c) => c.user_id === req.user.id)
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .slice(0, 50)
      .map(({ id, query, reply, language, created_at }) => ({ id, query, reply, language, created_at }));
    res.json(rows);
  });

  // ---------------- Progress Summary ----------------
  app.get('/api/progress/summary', (req, res) => {
    if (!req.user) {
      return res.json({ total_quizzes: 0, overall_accuracy_percent: 0, streak_count: 0, weak_topics: [], recent_attempts: [] });
    }
    const attempts = findAll('attempts', (a) => a.user_id === req.user.id)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, 20);
    const totalScore = attempts.reduce((n, a) => n + a.score, 0);
    const totalQuestions = attempts.reduce((n, a) => n + a.total, 0);

    const topicStats = {};
    const kinds = {};
    for (const a of attempts) {
      const quiz = findOne('quizzes', (q) => q.id === a.quiz_id);
      if (!quiz) continue;
      kinds[a.id] = quiz.kind;
      for (const q of quiz.questions) {
        const s = (topicStats[q.topic || 'General'] ||= [0, 0]);
        s[1]++;
        if (a.answers[q.id] === q.correct_index) s[0]++;
      }
    }

    res.json({
      total_quizzes: attempts.length,
      overall_accuracy_percent: totalQuestions ? Math.round((totalScore / totalQuestions) * 100) : 0,
      streak_count: streakFor(req.user.id)?.streak_count ?? 0,
      weak_topics: Object.entries(topicStats)
        .filter(([, [c, t]]) => t >= 2 && c / t < 0.7)
        .map(([t]) => t),
      recent_attempts: attempts.slice(0, 5).map((a) => ({
        id: a.id,
        score: a.score,
        total: a.total,
        kind: kinds[a.id],
        created_at: a.created_at,
      })),
    });
  });

  app.use('/api', (_req, _res, next) => next(new HttpError(404, 'Not Found')));

  // ---------------- Frontend (built by `vite build`) ----------------
  if (fs.existsSync(DIST_DIR)) {
    app.use(express.static(DIST_DIR));
    app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile(path.join(DIST_DIR, 'index.html')));
  }

  // ---------------- Errors: { detail } like FastAPI ----------------
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ detail: 'Uploads are limited to 15 MB.' });
    }
    if (err.type === 'entity.parse.failed') return res.status(400).json({ detail: 'Request body is not valid JSON.' });
    if (err instanceof HttpError) return res.status(err.status).json({ detail: err.detail });
    console.error(err);
    res.status(500).json({ detail: 'Internal server error.' });
  });

  return app;
}
