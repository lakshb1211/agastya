import crypto from 'node:crypto';
import { askAiJson } from './ai.js';
import { findAll, insert } from './db.js';
import { HttpError } from './errors.js';
import {
  STOP_WORDS,
  TERM_RE,
  WORD_RE,
  availableCitations,
  extractTopics,
  selectedSections,
  sentenceSplit,
  sourcePrompt,
} from './extractor.js';

export const nowIso = () => new Date().toISOString();

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function makeLocalQuestions(sections, count, topics = null) {
  const eligible = selectedSections(sections, topics, sections.length);
  const facts = [];
  for (const section of eligible) {
    for (let sentence of sentenceSplit(section.text)) {
      sentence = sentence.trim();
      if (sentence.split(/\s+/).filter(Boolean).length >= 6) facts.push([sentence, section]);
    }
  }

  const questions = [];
  for (const [sentence, section] of facts) {
    const candidates = (sentence.match(WORD_RE()) || []).filter((w) => !STOP_WORDS.has(w.toLowerCase()));
    if (!candidates.length) continue;

    // Longest word is the answer (first one wins ties, like Python's max)
    const answer = candidates.reduce((best, w) => (w.length > best.length ? w : best));
    const distractors = [];
    outer: for (const [other] of facts) {
      for (const w of other.match(WORD_RE()) || []) {
        const lw = w.toLowerCase();
        if (!STOP_WORDS.has(lw) && lw !== answer.toLowerCase() && !distractors.some((d) => d.toLowerCase() === lw)) {
          distractors.push(w);
          if (distractors.length === 3) break outer;
        }
      }
    }

    let choices = [answer, ...distractors.slice(0, 3)];
    for (let n = 1; choices.length < 4; n++) choices.push(`Concept option ${n}`);
    choices = shuffle(choices.slice(0, 4));
    const answerIndex = choices.indexOf(answer);

    let topic;
    if (topics && topics.length) {
      const lower = section.text.toLowerCase();
      const relevance = (item) =>
        (item.match(TERM_RE()) || [])
          .filter((t) => t.length > 2)
          .reduce((n, t) => n + (lower.split(t.toLowerCase()).length - 1), 0);
      topic = topics.reduce((best, t) => (relevance(t) > relevance(best) ? t : best));
    } else {
      topic = extractTopics([section], 1)[0] || 'Core Concept';
    }

    const masked = sentence.replace(new RegExp(escapeRe(answer), 'i'), '_____');
    questions.push({
      id: `Q${questions.length + 1}`,
      question: `Complete the statement from your material: “${masked}”`,
      options: choices,
      correct_index: answerIndex,
      topic,
      explanation: `Source passage states: “${sentence}”`,
      source_ids: [section.id],
    });
    if (questions.length >= count) break;
  }

  if (!questions.length) {
    throw new HttpError(422, 'There is not enough readable text in the material to construct quiz questions.');
  }
  return questions;
}

export async function generateQuestions(sections, count, topics = null) {
  const contextSections = selectedSections(sections, topics);
  const aiPrompt =
    `Create exactly ${count} four-option multiple-choice questions using ONLY this course material.\n` +
    `Target topics: ${topics && topics.length ? JSON.stringify(topics) : 'all key topics'}.\n` +
    'Return JSON: {"questions": [{"question": string, "options": [4 strings], ' +
    '"correct_index": integer 0-3, "topic": string, "explanation": string, "source_ids": [valid IDs]}]}.\n' +
    'Rules:\n' +
    '1. Every question MUST have exactly 4 choices.\n' +
    '2. correct_index must be 0, 1, 2, or 3.\n' +
    '3. source_ids must refer to matching IDs from the supplied material.\n\n' +
    `Study Material: ${sourcePrompt(contextSections)}`;

  const aiResult = await askAiJson(
    aiPrompt,
    'You are a rigorous exam creator. All questions, distractors, and answers must be strictly grounded in the material.'
  );

  if (aiResult && Array.isArray(aiResult.questions)) {
    const questions = [];
    for (const item of aiResult.questions.slice(0, count)) {
      if (!item || typeof item !== 'object') continue;
      const opts = item.options;
      const cIdx = item.correct_index;
      const cits = availableCitations(item.source_ids, contextSections);
      if (
        typeof item.question === 'string' &&
        Array.isArray(opts) &&
        opts.length === 4 &&
        opts.every((o) => typeof o === 'string') &&
        Number.isInteger(cIdx) &&
        cIdx >= 0 &&
        cIdx < 4 &&
        cits.length
      ) {
        const sIds = contextSections.filter((s) => cits.includes(s.citation)).map((s) => s.id);
        questions.push({
          id: `Q${questions.length + 1}`,
          question: item.question,
          options: opts,
          correct_index: cIdx,
          topic: String(item.topic || (topics && topics.length ? topics : extractTopics(sections))[0]),
          explanation: String(item.explanation || `Supported by ${cits.join(', ')}`),
          source_ids: sIds.length ? sIds : item.source_ids,
        });
      }
    }
    if (questions.length >= Math.max(1, Math.floor(count / 2))) return questions;
  }

  // Local fallback
  return makeLocalQuestions(sections, count, topics);
}

export function publicQuestions(questions, sections) {
  return questions.map((q) => ({
    id: q.id,
    question: q.question,
    options: q.options,
    topic: q.topic,
    sources: availableCitations(q.source_ids || [], sections),
  }));
}

export function progressFor(materialId, userId = null) {
  const quizzes = new Map(findAll('quizzes', (q) => q.material_id === materialId).map((q) => [q.id, q]));
  const rows = findAll(
    'attempts',
    (a) => quizzes.has(a.quiz_id) && (!userId || a.user_id === userId || a.user_id === null)
  ).sort((a, b) => a.created_at.localeCompare(b.created_at));

  const topicStats = {}; // topic: [correct, total]
  const summaries = rows.map((row) => {
    const quiz = quizzes.get(row.quiz_id);
    for (const q of quiz.questions) {
      const s = (topicStats[q.topic || 'General'] ||= [0, 0]);
      s[1]++;
      if (row.answers[q.id] === q.correct_index) s[0]++;
    }
    return {
      attempt_id: row.id,
      quiz_id: row.quiz_id,
      kind: quiz.kind,
      score: row.score,
      total: row.total,
      confidence: row.confidence,
      created_at: row.created_at,
    };
  });

  const weakAreas = Object.entries(topicStats)
    .filter(([, [c, t]]) => t && c / t < 0.7)
    .map(([topic]) => topic);
  const totalScore = rows.reduce((n, r) => n + r.score, 0);
  const totalQuestions = rows.reduce((n, r) => n + r.total, 0);

  return {
    material_id: materialId,
    attempt_count: rows.length,
    overall_accuracy_percent: totalQuestions ? Math.round((totalScore / totalQuestions) * 100) : 0,
    weak_areas: weakAreas,
    topic_accuracy: Object.fromEntries(
      Object.entries(topicStats).map(([t, [c, tot]]) => [t, tot ? Math.round((c / tot) * 100) : 0])
    ),
    attempts: summaries,
    next_step: weakAreas.length
      ? 'Take a focused quiz on your weak topics.'
      : 'Take another diagnostic quiz or explore the next topic.',
  };
}

export function evaluateSubmission(quiz, answers, confidence, sections, userId = null) {
  const ids = new Set(quiz.questions.map((q) => q.id));
  const invalid = Object.keys(answers).filter((k) => !ids.has(k)).sort();
  if (invalid.length) {
    throw new HttpError(422, `Unknown question IDs in submission: ${invalid.join(', ')}`);
  }

  let score = 0;
  const weakAreas = [];
  const review = quiz.questions.map((q) => {
    const selected = answers[q.id];
    const isCorrect = selected === q.correct_index;
    if (isCorrect) score++;
    else if (!weakAreas.includes(q.topic)) weakAreas.push(q.topic);
    return {
      question_id: q.id,
      question: q.question,
      selected_option:
        selected !== undefined && selected >= 0 && selected < q.options.length ? q.options[selected] : null,
      correct_option: q.options[q.correct_index],
      is_correct: isCorrect,
      topic: q.topic,
      explanation: q.explanation,
      sources: availableCitations(q.source_ids || [], sections),
    };
  });

  const attempt = insert('attempts', {
    id: crypto.randomUUID(),
    quiz_id: quiz.id,
    user_id: userId,
    answers,
    score,
    total: quiz.questions.length,
    confidence,
    created_at: nowIso(),
  });

  return {
    attempt_id: attempt.id,
    quiz_id: quiz.id,
    material_id: quiz.material_id,
    score,
    total: quiz.questions.length,
    accuracy_percent: quiz.questions.length ? Math.round((score / quiz.questions.length) * 100) : 0,
    review,
    weak_areas: weakAreas,
    confidence,
    confidence_check_in: 'How do you feel about these concepts after this quiz?',
    ask_about_weak_topic_quiz: weakAreas.length > 0,
    weak_topic_quiz_prompt: weakAreas.length
      ? 'Would you like a focused quiz targeting your weak topics to solidify them?'
      : 'Outstanding! You mastered all topics in this quiz. Ready for the next challenge?',
    progress: progressFor(quiz.material_id, userId),
  };
}

