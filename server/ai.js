import {
  OPENAI_API_KEY,
  OPENAI_BASE_URL,
  OPENAI_MODEL,
  GEMINI_API_KEY,
  GEMINI_MODEL,
  GEMINI_FALLBACK_MODELS,
  LANGUAGES,
  LANG_ALIASES,
} from './config.js';
import {
  STOP_WORDS,
  TERM_RE,
  availableCitations,
  buildLocalNotes,
  diagramSvg,
  extractTopics,
  selectedSections,
  sourcePrompt,
} from './extractor.js';

export function normalizeLanguage(lang) {
  lang = (lang || 'english').trim().toLowerCase();
  if (LANG_ALIASES[lang]) return LANG_ALIASES[lang];
  if (LANGUAGES[lang]) return lang;
  return 'english';
}

const langName = (lang) => LANGUAGES[normalizeLanguage(lang)] || 'English';

// Interactions API: text lives in the "model_output" step, after any "thought" steps
function geminiOutputText(data) {
  for (const step of data.steps || []) {
    if (step.type === 'model_output') {
      const text = (step.content || [])
        .filter((c) => c.type === 'text')
        .map((c) => c.text || '')
        .join('')
        .trim();
      if (text) return text;
    }
  }
  return null;
}

async function askGeminiRaw(prompt, systemPrompt = null) {
  if (!GEMINI_API_KEY) return null;
  const models = [GEMINI_MODEL, ...GEMINI_FALLBACK_MODELS.filter((m) => m !== GEMINI_MODEL)];

  for (const model of models) {
    const payload = { model, input: prompt };
    if (systemPrompt) payload.system_instruction = systemPrompt;
    try {
      const res = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_API_KEY },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(45_000),
      });
      if (!res.ok) {
        console.warn(`Gemini API request failed (${model}): HTTP ${res.status}`);
        // Overloaded or rate-limited: each model has its own capacity/quota, so try the next
        if (res.status === 503 || res.status === 429) continue;
        return null;
      }
      const text = geminiOutputText(await res.json());
      if (text) return text;
      console.warn(`Gemini (${model}) returned no text output.`);
    } catch (err) {
      console.warn(`Gemini API request failed (${model}): ${err.message}`);
    }
    return null;
  }
  return null;
}

async function askOpenaiRaw(prompt, systemPrompt = null) {
  if (!OPENAI_API_KEY) return null;
  const sysMsg =
    systemPrompt ||
    'You are an expert learning tutor. Use only the supplied study material. ' +
      'Never invent facts or citations. If it does not contain the answer, say so explicitly. ' +
      'Return valid JSON only when requested.';
  try {
    const res = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        temperature: 0.2,
        messages: [
          { role: 'system', content: sysMsg },
          { role: 'user', content: prompt },
        ],
      }),
      signal: AbortSignal.timeout(40_000),
    });
    if (!res.ok) {
      console.warn(`OpenAI API request failed: HTTP ${res.status}`);
      return null;
    }
    const data = await res.json();
    return data.choices[0].message.content.trim();
  } catch (err) {
    console.warn(`OpenAI API request failed: ${err.message}`);
  }
  return null;
}

// Try Gemini first if key is present, then OpenAI
export async function askAiText(prompt, systemPrompt = null) {
  if (GEMINI_API_KEY) {
    const out = await askGeminiRaw(prompt, systemPrompt);
    if (out) return out;
  }
  if (OPENAI_API_KEY) {
    const out = await askOpenaiRaw(prompt, systemPrompt);
    if (out) return out;
  }
  return null;
}

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

export async function askAiJson(prompt, systemPrompt = null) {
  const text = await askAiText(prompt, systemPrompt);
  if (!text) return null;
  // Strip markdown code fences if present
  const cleaned = text.trim().replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
  try {
    const parsed = JSON.parse(cleaned);
    if (isPlainObject(parsed)) return parsed;
  } catch {
    // Try finding a JSON object inside the text
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        const parsed = JSON.parse(match[0]);
        if (isPlainObject(parsed)) return parsed;
      } catch {}
    }
  }
  return null;
}

export async function generateNotesAi(sections, title, language = 'english', topic = null) {
  const lang = langName(language);
  const topics = extractTopics(sections);

  let contextSections;
  if (topic) {
    contextSections = selectedSections(sections, [topic]);
  } else if (sections.length <= 12) {
    contextSections = sections;
  } else {
    const indices = new Set();
    for (let i = 0; i < 12; i++) indices.add(Math.round((i * (sections.length - 1)) / 11));
    contextSections = [...indices].sort((a, b) => a - b).map((i) => sections[i]);
  }

  const aiPrompt =
    `Create clear, structured revision notes in ${lang}. ` +
    `Topic focus: ${topic || 'all core topics'}.\n` +
    'Return a JSON object with:\n' +
    '- title: string\n' +
    '- overview: 1-2 sentence high level summary\n' +
    '- topics: array of 4-6 key concepts\n' +
    '- key_points: array of objects with {text: string, source_ids: array of source_ids}.\n' +
    'Every single key point MUST be supported by one or more supplied source IDs from the material.\n\n' +
    `Study Material: ${sourcePrompt(contextSections)}`;

  const aiData = await askAiJson(
    aiPrompt,
    'You are a strict learning tutor. You ONLY cite facts directly mentioned in the supplied material. Return JSON only.'
  );

  const visual = { format: 'image/svg+xml', svg: diagramSvg(title, topics) };

  if (aiData) {
    const validPoints = [];
    for (const point of Array.isArray(aiData.key_points) ? aiData.key_points : []) {
      if (isPlainObject(point) && typeof point.text === 'string') {
        const cits = availableCitations(point.source_ids, contextSections);
        if (cits.length) validPoints.push({ text: point.text, citations: cits });
      }
    }
    if (validPoints.length) {
      const aiTopics = Array.isArray(aiData.topics) ? aiData.topics : topics;
      return {
        title: String(aiData.title || title),
        overview: String(aiData.overview || 'Key takeaways from your uploaded material.'),
        key_points: validPoints,
        topics: aiTopics.filter((t) => typeof t === 'string').slice(0, 8),
        language: lang,
        visual,
      };
    }
  }

  // Deterministic local fallback
  return { ...buildLocalNotes(contextSections, title, topics), language: lang, visual };
}

const NOT_FOUND = 'I could not find the answer to this in the uploaded study material.';

export async function explainQuestion(question, sections, language = 'english') {
  const lang = langName(language);
  const matching = selectedSections(sections, [question], 8);

  const aiPrompt =
    `Explain this question in simple ${lang}: ${JSON.stringify(question)}.\n` +
    'Return JSON with {answer: string, source_ids: array of valid source IDs}.\n' +
    'Cite only source IDs that directly state or support the answer.\n' +
    'CRITICAL: If the supplied material does not answer the question, return an empty source_ids array ' +
    `and answer: '${NOT_FOUND}'\n\n` +
    `Study Material: ${sourcePrompt(matching)}`;

  const aiRes = await askAiJson(
    aiPrompt,
    'You are a strict, grounded AI tutor. You never hallucinate facts not found in the material.'
  );

  if (aiRes) {
    const cits = availableCitations(aiRes.source_ids, matching);
    if (!cits.length) return { answer: NOT_FOUND, sources: [], available_in_material: false };
    return { answer: String(aiRes.answer || '').trim(), sources: cits, available_in_material: true };
  }

  // Local keyword fallback
  const terms = new Set(
    (question.match(TERM_RE()) || [])
      .map((w) => w.toLowerCase())
      .filter((w) => w.length > 3 && !STOP_WORDS.has(w))
  );
  const needed = terms.size > 1 ? Math.max(1, Math.floor(terms.size / 2)) : 1;
  const grounded = matching.filter((s) => {
    if (!terms.size) return false;
    const lower = s.text.toLowerCase();
    let hits = 0;
    terms.forEach((t) => lower.includes(t) && hits++);
    return hits >= needed;
  });
  if (!grounded.length) return { answer: NOT_FOUND, sources: [], available_in_material: false };

  const snippets = grounded
    .slice(0, 2)
    .map((s) => s.text.slice(0, 350).trim() + (s.text.length > 350 ? '…' : ''));
  return {
    answer: `Based on your material: ${snippets.join(' ')}`,
    sources: grounded.slice(0, 2).map((s) => s.citation),
    available_in_material: true,
    note: 'Configuring OPENAI_API_KEY or GEMINI_API_KEY provides full conversational rephrasing.',
  };
}

export async function chatTutor(query, history, sections = null, language = 'en') {
  const lang = langName(language);

  let contextStr = '';
  if (sections) {
    const matching = selectedSections(sections, [query], 4);
    if (matching.length) contextStr = `\nRelevant study passages:\n${sourcePrompt(matching)}\n`;
  }

  const systemPrompt =
    'You are Agastya Assistant, an empathetic, encouraging learning mentor for students. ' +
    `Reply warmly in ${lang}. Explain concepts simply with clear step-by-step points or examples. ` +
    'Keep responses concise (2 to 4 paragraphs or bullet points). If study material is provided, ground your answer in it.';

  const conv = history
    .slice(-6)
    .map((m) => `${m.role === 'user' ? 'Student' : 'Assistant'}: ${m.content}\n`)
    .join('');
  const out = await askAiText(`${conv}Student: ${query}\n${contextStr}\nAssistant:`, systemPrompt);
  if (out) return out;

  // Local fallback assistant
  const q = query.toLowerCase();
  const has = (keys) => keys.some((k) => q.includes(k));
  if (has(['how to learn', 'study plan', 'habit', 'schedule', 'routine'])) {
    return (
      '✦ Study Tip: Use the Pomodoro Technique — 25 minutes of deep focus followed by a 5-minute break. ' +
      'In your Agastya Study Studio, upload your notes or textbook, generate a diagnostic quiz to find your weak topics, ' +
      'and follow the personalized 3-Day Revision Plan!'
    );
  }
  if (has(['quiz', 'score', 'test', 'practice'])) {
    return (
      '✦ Agastya quizzes are generated directly from your uploaded materials! Take a Diagnostic Quiz to pinpoint ' +
      'weaker areas (<70% score). Once identified, take a Weak-Topic quiz to build mastery, and watch your progress trend line rise.'
    );
  }
  if (has(['streak', 'save', 'sync', 'cloud', 'offline'])) {
    return (
      '✦ Agastya tracks your daily learning streak automatically. You can log in to sync your progress securely across devices, ' +
      'or continue learning offline in local mode where everything is saved right on your device.'
    );
  }
  return (
    `✦ Great question about '${query}'! To explore this thoroughly based on your exact syllabus, ` +
    "upload your notes or textbook chapter in the Study Studio (Learn tab) and click 'Explain' or ask here anytime. " +
    'Remember to break big concepts into smaller bite-sized steps!'
  );
}
