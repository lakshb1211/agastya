import path from 'node:path';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import { MAX_PDF_PAGES } from './config.js';
import { HttpError } from './errors.js';

export const STOP_WORDS = new Set([
  'about', 'after', 'again', 'also', 'among', 'because', 'before', 'being',
  'between', 'could', 'during', 'every', 'first', 'from', 'have', 'into',
  'itself', 'more', 'most', 'other', 'over', 'same', 'some', 'such', 'than',
  'that', 'their', 'there', 'these', 'they', 'this', 'those', 'through',
  'under', 'using', 'very', 'were', 'what', 'when', 'where', 'which', 'while',
  'with', 'would', 'your', 'the', 'and', 'for', 'are', 'was', 'but', 'not',
  'you', 'can', 'has', 'had', 'its', 'our', 'out', 'all', 'any', 'one',
  'two', 'use', 'used', 'how', 'why', 'who', 'will', 'may', 'does', 'did',
  'been', 'each', 'both', 'per', 'via', 'then', 'them', 'his', 'her',
  'का', 'की', 'के', 'है', 'हैं', 'में', 'से', 'और', 'को', 'पर', 'यह', 'वह', 'एक', 'नहीं',
]);

// A word of 4+ letters (Latin or Devanagari), bounded by non-word characters
export const WORD_RE = () =>
  /(?<![\p{L}\p{N}_])[A-Za-zऀ-ॿ][A-Za-zऀ-ॿ'-]{2,}[A-Za-zऀ-ॿ](?![\p{L}\p{N}_])/gu;
// Alphanumeric runs used for topic/term matching
export const TERM_RE = () => /[A-Za-z0-9ऀ-ॿ]+/g;

export const sentenceSplit = (text) => text.replace(/\n/g, ' ').split(/(?<=[.!?।])\s+/);

export function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

export function titleCase(s) {
  return s.toLowerCase().replace(/(^|[^\p{L}])(\p{L})/gu, (_, a, b) => a + b.toUpperCase());
}

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;' }[c]));
}

const countOf = (haystack, needle) => (needle ? haystack.split(needle).length - 1 : 0);

export function splitPassages(text) {
  const paragraphs = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const sections = [];
  let n = 1;
  for (const paragraph of paragraphs) {
    if (paragraph.length <= 1800) {
      sections.push({ id: `S${n}`, citation: `Passage ${n}`, text: paragraph });
      n++;
    } else {
      for (let start = 0; start < paragraph.length; start += 1600) {
        sections.push({ id: `S${n}`, citation: `Passage ${n}`, text: paragraph.slice(start, start + 1600) });
        n++;
      }
    }
  }
  return sections;
}

export async function extractUpload(filename, content) {
  const suffix = path.extname(filename || '').toLowerCase();

  if (suffix === '.pdf') {
    const pages = [];
    let info;
    try {
      info = await pdfParse(content, {
        max: MAX_PDF_PAGES + 1,
        // Collect text per page so citations can point at page numbers
        pagerender: (page) =>
          page.getTextContent().then((tc) => {
            const text = tc.items.map((i) => i.str).join(' ').trim();
            pages[page.pageIndex] = text;
            return text;
          }),
      });
    } catch {
      throw new HttpError(422, 'The uploaded PDF file could not be read.');
    }
    if (info.numpages > MAX_PDF_PAGES) {
      throw new HttpError(413, `PDFs may contain at most ${MAX_PDF_PAGES} pages.`);
    }
    const sections = [];
    pages.forEach((text, i) => {
      if (text) sections.push({ id: `S${sections.length + 1}`, citation: `Page ${i + 1}`, text });
    });
    if (!sections.length) {
      throw new HttpError(422, 'No readable text found in the PDF. If it is a scanned image, paste the text instead.');
    }
    return sections;
  }

  if (['.png', '.jpg', '.jpeg', '.webp', '.bmp', '.tif', '.tiff'].includes(suffix)) {
    throw new HttpError(415, 'Image uploads are not supported. Please upload a PDF or paste the text.');
  }

  throw new HttpError(415, 'Unsupported file format. Please upload a PDF.');
}

export const allText = (sections) => sections.map((s) => s.text).join('\n');

const isUpper = (s) => s === s.toUpperCase() && s !== s.toLowerCase();

export function extractTopics(sections, limit = 8) {
  const lines = allText(sections)
    .split(/\r?\n/)
    .map((l) => l.replace(/^[ #\t:-]+|[ #\t:-]+$/g, ''));
  const headingPattern = /^(?:chapter|unit|module|lesson|topic|section)\s+[\w.:-]+[.)]?\s*[:.-]?\s*(.+)$/i;
  const headings = [];
  for (const line of lines) {
    const match = line.match(headingPattern);
    const candidate = match ? match[1] : line;
    const words = candidate.split(/\s+/).filter(Boolean).length;
    if (
      words >= 2 && words <= 7 &&
      candidate.length <= 80 &&
      (match || (isUpper(candidate) && candidate.length > 3)) &&
      !headings.some((hd) => hd.toLowerCase() === candidate.toLowerCase())
    ) {
      headings.push(titleCase(candidate));
    }
  }
  if (headings.length) return headings.slice(0, limit);

  const counts = new Map();
  for (const w of allText(sections).toLowerCase().match(WORD_RE()) || []) {
    if (!STOP_WORDS.has(w)) counts.set(w, (counts.get(w) || 0) + 1);
  }
  // Stable sort keeps first-seen order for ties, like Counter.most_common
  const common = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([w]) => capitalize(w));
  return common.length ? common : ['Core Concepts', 'Key Principles'];
}

export function selectedSections(sections, topics = null, maximum = 12) {
  if (!topics || !topics.length) return sections.slice(0, maximum);
  const terms = new Set();
  topics.forEach((t) => (t.match(TERM_RE()) || []).forEach((w) => w.length > 2 && terms.add(w.toLowerCase())));
  const score = (s) => {
    const lower = s.text.toLowerCase();
    let n = 0;
    terms.forEach((term) => (n += countOf(lower, term)));
    return n;
  };
  return sections
    .map((s) => ({ s, n: score(s) }))
    .sort((a, b) => b.n - a.n)
    .slice(0, maximum)
    .map((x) => x.s);
}

export function diagramSvg(title, topics) {
  const labels = topics.slice(0, 5).length ? topics.slice(0, 5) : ['Core Concept', 'Key Application'];
  const width = 760;
  const boxWidth = 210;
  const gap = 18;
  const totalWidth = labels.length * boxWidth + (labels.length - 1) * gap;
  const startX = Math.max(25, Math.floor((width - totalWidth) / 2));
  const escapedTitle = escapeHtml(title.slice(0, 80));
  const boxes = [];

  labels.forEach((label, index) => {
    const x = startX + index * (boxWidth + gap);
    boxes.push(
      `<rect x="${x}" y="100" width="${boxWidth}" height="76" rx="14" fill="#141a38" stroke="#6366f1" stroke-width="2"/>` +
        `<text x="${x + boxWidth / 2}" y="145" text-anchor="middle" font-size="15" font-weight="600" font-family="Inter,Arial,sans-serif" fill="#f5cd78">${escapeHtml(label.slice(0, 30))}</text>`
    );
    if (index < labels.length - 1) {
      const nextX = x + boxWidth + gap;
      boxes.push(
        `<path d="M ${x + boxWidth} 138 L ${nextX - 8} 138" stroke="#818cf8" stroke-width="2.5" marker-end="url(#arrow)"/>`
      );
    }
  });

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${escapedTitle} concept map" viewBox="0 0 ${width} 220">` +
    '<defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0,0 L0,6 L9,3 z" fill="#818cf8"/></marker></defs>' +
    `<rect width="${width}" height="220" rx="18" fill="#0d1127" stroke="rgba(255,255,255,0.08)"/>` +
    `<text x="${width / 2}" y="55" text-anchor="middle" font-size="20" font-weight="bold" font-family="Inter,Arial,sans-serif" fill="#ffffff">✦ ${escapedTitle}</text>` +
    `${boxes.join('')}</svg>`
  );
}

export function buildStudyPlan(sections, title) {
  const topics = extractTopics(sections);
  const t = topics.length;
  const day1 = topics.slice(0, Math.max(1, Math.floor(t / 3)));
  const day2 = topics.slice(Math.max(1, Math.floor(t / 3)), Math.max(2, Math.floor((2 * t) / 3)));
  const day3Raw = topics.slice(Math.max(2, Math.floor((2 * t) / 3)));
  const day3 = day3Raw.length ? day3Raw : topics.slice(0, 1);
  const sources = (ts) => selectedSections(sections, ts, 2).map((s) => s.citation);

  return {
    title,
    estimated_days: 3,
    daily_study_minutes: 25,
    schedule: [
      {
        day: 1,
        theme: 'Foundation & Diagnostic Review',
        topics: day1,
        steps: [
          'Read the foundational sections and highlight key definitions.',
          'Take a 5-question diagnostic quiz to establish your baseline.',
          'Review the auto-generated concept map for a high-level view.',
        ],
        sources: sources(day1),
      },
      {
        day: 2,
        theme: 'Deep Dive & Targeted Practice',
        topics: day2,
        steps: [
          'Engage with the Grounded Q&A to resolve doubts on difficult sections.',
          'Take a Weak-Topic quiz focusing on areas scored below 70%.',
          'Summarize key formulas or core arguments without looking at the text.',
        ],
        sources: sources(day2),
      },
      {
        day: 3,
        theme: 'Synthesis & Mastery Check',
        topics: day3,
        steps: [
          'Review the consolidated notes and vocabulary list.',
          'Complete a comprehensive final quiz covering all topics.',
          'Verify your progress chart shows consistent scores above 70%.',
        ],
        sources: sources(day3),
      },
    ],
    study_method:
      'Break your study time into 25-minute Pomodoro sessions. After each session, ' +
      'test your recall with a quiz before moving to the next topic.',
  };
}

export function buildLocalNotes(sections, title, topics) {
  let points = [];
  const seen = new Set();
  outer: for (const section of sections) {
    for (let sentence of sentenceSplit(section.text)) {
      sentence = sentence.trim();
      if (sentence.length >= 35 && sentence.length <= 260 && !seen.has(sentence.toLowerCase())) {
        points.push({ text: sentence, citations: [section.citation] });
        seen.add(sentence.toLowerCase());
        if (points.length >= 8) break outer;
      }
    }
  }
  if (!points.length) {
    points = sections.slice(0, 4).map((s) => ({ text: s.text.slice(0, 240) + '…', citations: [s.citation] }));
  }
  return {
    title,
    overview: 'Carefully review these core principles extracted directly from your study material.',
    key_points: points,
    topics,
  };
}

export function sourcePrompt(sections, maximum = 12) {
  return JSON.stringify(
    sections.slice(0, maximum).map((s) => ({ source_id: s.id, citation: s.citation, text: s.text.slice(0, 1800) }))
  );
}

export function availableCitations(sourceIds, sections) {
  if (!Array.isArray(sourceIds)) return [];
  const allowed = new Map(sections.map((s) => [s.id, s.citation]));
  return [...new Set(sourceIds.filter((id) => allowed.has(id)).map((id) => allowed.get(id)))];
}
