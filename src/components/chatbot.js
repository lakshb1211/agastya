import { currentLang, tr } from '../services/i18n.js';
import { recordChatMessage } from '../services/storage.js';
import { getCurrentUser } from '../services/auth.js';
import { apiChat } from '../services/api.js';
import { getBackendMaterialId } from '../services/studio.js';

export function initChatbot() {
  const cb = document.getElementById('cb');
  const cm = document.getElementById('cm');
  const ci = document.getElementById('ci');
  const cbf = document.getElementById('cbf');
  const cbx = document.getElementById('cbx');
  const cs = document.getElementById('cs');

  if (!cb || !cbf) return;

  const hist = [];
  let busy = false;
  let smp = null;

  cbf.onclick = () => {
    cb.hidden = !cb.hidden;
    if (!cb.hidden && ci) ci.focus();
  };

  if (cbx) cbx.onclick = () => (cb.hidden = true);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') cb.hidden = true;
  });

  function add(c, t) {
    const d = document.createElement('div');
    d.className = 'm ' + c;
    d.textContent = t;
    cm.appendChild(d);
    cm.scrollTop = cm.scrollHeight;
    return d;
  }

  // Smart local fallback assistant if external Claude API isn't present
  function generateStudyHelp(q) {
    const qLower = q.toLowerCase();
    if (qLower.includes('how to learn') || qLower.includes('study plan') || qLower.includes('habit')) {
      return `✦ Study Tip: Break your learning into 25-minute focused blocks. After uploading your study material in the "Learn" tab, take a diagnostic quiz to pinpoint exactly what to revise first!`;
    }
    if (qLower.includes('quiz') || qLower.includes('score')) {
      return `✦ You can generate practice quizzes directly from your notes or PDF in the "Learn" tab under "Quiz". Your progress will be saved and tracked in the Progress dashboard!`;
    }
    if (qLower.includes('supabase') || qLower.includes('account') || qLower.includes('save')) {
      return `✦ Agastya automatically syncs your quiz scores, streaks, and materials to Supabase when you log in. If running locally, everything is safely saved in your browser!`;
    }
    return `✦ Great question about "${q}"! To get the most accurate explanation based on your specific curriculum, paste your chapter notes or upload your textbook PDF in the Study Studio (Learn tab) and click "Explain" for step-by-step breakdown.`;
  }

  async function send() {
    const q = ci.value.trim();
    if (!q || busy) return;
    ci.value = '';

    add('u', q);
    const out = add('b', 'Thinking…');
    busy = true;

    try {
      let replied = false;

      // 1. Try Agastya Backend API Tutor
      try {
        const matId = getBackendMaterialId ? getBackendMaterialId() : null;
        const res = await apiChat(q, hist, matId, currentLang);
        if (res && res.reply) {
          out.textContent = res.reply;
          hist.push({ role: 'user', content: q });
          hist.push({ role: 'assistant', content: res.reply });
          replied = true;
        }
      } catch (err) {
        console.warn('Backend chat API offline, attempting client fallbacks:', err);
      }

      // 2. Try window.claude if present and backend wasn't reached
      if (!replied && !smp && window.claude && window.claude.use) {
        smp = await window.claude.use('sample');
      }

      if (!replied && smp) {
        hist.push({ role: 'user', content: q });
        const h = hist.slice(-10);
        if (h[0].role !== 'user') h.shift();
        h[0] = {
          role: 'user',
          content:
            'You are Agastya Assistant, a friendly study helper for students. Answer any question or doubt in any subject clearly, with simple steps or examples, and keep replies concise. Reply in the language the student writes in.\n\nStudent: ' +
            h[0].content,
        };
        const r = await smp(h, {
          cache: false,
          onText: (e) => {
            out.textContent = e.text;
            cm.scrollTop = cm.scrollHeight;
          },
        });
        out.textContent = r.text;
        hist.push({ role: 'assistant', content: r.text });
        replied = true;
      }

      // 3. Fallback intelligent study helper
      if (!replied) {
        await new Promise((res) => setTimeout(res, 350));
        const reply = generateStudyHelp(q);
        out.textContent = reply;
        hist.push({ role: 'user', content: q });
        hist.push({ role: 'assistant', content: reply });
      }

      // Record doubt / message to Supabase / local storage
      const user = getCurrentUser();
      recordChatMessage(q, out.textContent, currentLang, user);
    } catch (e) {
      hist.pop();
      out.textContent =
        e && e.code === 'rate_limited'
          ? 'Too many questions right now. Please wait a moment and try again.'
          : e && e.code === 'not_granted'
          ? 'Chat needs permission to run. Please allow it when asked.'
          : 'Sorry, something went wrong. Please try again.';
    } finally {
      busy = false;
      cm.scrollTop = cm.scrollHeight;
    }
  }

  if (cs) cs.onclick = send;
  if (ci) {
    ci.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') send();
    });
  }
}
