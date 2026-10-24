// End-to-end check of every API endpoint against a throwaway datastore.
// Run: npm test   (set AGASTYA_TEST_AI=1 to also exercise the real AI providers)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'agastya-test-'));
process.env.AGASTYA_DATA_DIR = tmp;
process.env.AGASTYA_SECRET_KEY ||= 'test-secret';
if (!process.env.AGASTYA_TEST_AI) {
  process.env.GEMINI_API_KEY = '';
  process.env.OPENAI_API_KEY = '';
}

const { createApp } = await import('./app.js');
const { initDb, flushDb } = await import('./db.js');
initDb();
const server = createApp().listen(0);
const base = `http://127.0.0.1:${server.address().port}`;

let token = null;
async function call(method, url, body, { form } = {}) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  let payload;
  if (form) payload = form;
  else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const res = await fetch(base + url, { method, headers, body: payload });
  return { status: res.status, body: await res.json() };
}

const step = (n, msg) => console.log(`${n}. ${msg}`);
const MATERIAL = `Cellular respiration is a series of chemical reactions that break down glucose to produce ATP, the energy currency of cells.

Glycolysis takes place in the cytoplasm and breaks down one glucose molecule into two pyruvate molecules, generating a net gain of 2 ATP.

The citric acid cycle occurs inside the mitochondrial matrix, processing acetyl-CoA to produce NADH and FADH2 along with carbon dioxide.

Oxidative phosphorylation takes place across the inner mitochondrial membrane, where the electron transport chain drives ATP synthesis.`;

try {
  step(1, 'Health check');
  let r = await call('GET', '/api/health');
  assert.equal(r.body.status, 'healthy');

  step(2, 'Register, login, me');
  const email = `student_${Date.now()}@agastya.universe`;
  r = await call('POST', '/api/auth/register', { email, password: 'studyPassword123!', name: 'Laksh', grade: 'High School' });
  assert.equal(r.status, 201);
  token = r.body.token;
  r = await call('POST', '/api/auth/register', { email, password: 'studyPassword123!', name: 'Laksh' });
  assert.equal(r.status, 409, 'duplicate email rejected');
  r = await call('POST', '/api/auth/login', { email, password: 'wrong-password' });
  assert.equal(r.status, 401, 'wrong password rejected');
  r = await call('POST', '/api/auth/login', { email, password: 'studyPassword123!' });
  assert.ok(r.body.token);
  token = r.body.token;
  r = await call('GET', '/api/auth/me');
  assert.equal(r.body.email, email);

  step(3, 'Streak');
  r = await call('POST', '/api/streak/ping');
  assert.equal(r.body.streak_count, 1);
  r = await call('GET', '/api/streak');
  assert.equal(r.body.is_active_today, true);

  step(4, 'Create material from pasted text');
  const form = new FormData();
  form.append('pasted_text', MATERIAL);
  form.append('title', 'Cellular Energy');
  r = await call('POST', '/api/materials', undefined, { form });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  const materialId = r.body.id;
  assert.equal(r.body.section_count, 4);
  assert.ok(r.body.topics.length > 0);
  assert.ok(r.body.short_notes.visual.svg.startsWith('<svg'));
  r = await call('POST', '/api/materials', undefined, { form: new FormData() });
  assert.equal(r.status, 400, 'empty material rejected');

  step(5, 'Material, study plan, notes');
  r = await call('GET', `/api/materials/${materialId}`);
  assert.equal(r.body.sections.length, 4);
  r = await call('GET', `/api/materials/${materialId}/study-plan`);
  assert.equal(r.body.schedule.length, 3);
  r = await call('POST', `/api/materials/${materialId}/notes`, { language: 'hi' });
  assert.equal(r.body.language, 'Hindi');
  assert.ok(r.body.key_points.length > 0);

  step(6, 'Grounded explain + anti-hallucination');
  r = await call('POST', `/api/materials/${materialId}/explain`, { question: 'Where does glycolysis take place?' });
  assert.equal(r.body.available_in_material, true, JSON.stringify(r.body));
  r = await call('POST', `/api/materials/${materialId}/explain`, { question: 'Who won the football world cup?' });
  assert.equal(r.body.available_in_material, false);

  step(7, 'Quiz create, fetch, submit');
  r = await call('POST', `/api/materials/${materialId}/quizzes`, { kind: 'weak-topic' });
  assert.equal(r.status, 400, 'weak-topic quiz needs a prior attempt');
  r = await call('POST', `/api/materials/${materialId}/quizzes`, { kind: 'diagnostic', question_count: 3 });
  assert.equal(r.status, 201);
  const quiz = r.body;
  assert.ok(quiz.questions.length >= 1);
  assert.ok(quiz.questions.every((q) => q.options.length === 4 && !('correct_index' in q)), 'answers not leaked');
  r = await call('GET', `/api/quizzes/${quiz.quiz_id}`);
  assert.equal(r.body.questions.length, quiz.questions.length);
  r = await call('POST', `/api/quizzes/${quiz.quiz_id}/submit`, { answers: { Q999: 0 } });
  assert.equal(r.status, 422, 'unknown question rejected');
  const answers = Object.fromEntries(quiz.questions.map((q) => [q.id, 0]));
  r = await call('POST', `/api/quizzes/${quiz.quiz_id}/submit`, { answers, confidence: 4 });
  assert.equal(r.body.total, quiz.questions.length);
  assert.equal(r.body.review.length, quiz.questions.length);
  console.log(`   score ${r.body.score}/${r.body.total}, weak: ${JSON.stringify(r.body.weak_areas)}`);

  step(8, 'Material progress');
  r = await call('GET', `/api/materials/${materialId}/progress`);
  assert.equal(r.body.attempt_count, 1);

  step(9, 'Chat tutor + history');
  r = await call('POST', '/api/chat', { query: 'Why is ATP called the energy currency?', history: [], material_id: materialId, language: 'en' });
  assert.ok(r.body.reply);
  r = await call('GET', '/api/chat/history');
  assert.equal(r.body.length, 1);

  step(10, 'Progress summary');
  r = await call('GET', '/api/progress/summary');
  assert.equal(r.body.total_quizzes, 1);
  assert.equal(r.body.streak_count, 1);

  step(11, 'Validation + 404s');
  r = await call('POST', '/api/auth/register', { email: 'bad', password: '1', name: '' });
  assert.equal(r.status, 422);
  r = await call('GET', '/api/materials/does-not-exist');
  assert.equal(r.status, 404);
  r = await call('GET', '/api/nope');
  assert.equal(r.status, 404);

  console.log('\n🎉 All API checks passed.');
} catch (err) {
  console.error('\n❌', err.message);
  process.exitCode = 1;
} finally {
  server.close();
  flushDb();
  fs.rmSync(tmp, { recursive: true, force: true });
}
