import { tr, applyLanguage, currentLang } from './i18n.js';
import {
  fetchStreak,
  syncActiveStreak,
  fetchAttempts,
  recordAttempt,
  clearAllAttempts,
  recordStudyMaterial,
} from './storage.js';
import { getCurrentUser } from './auth.js';
import {
  apiCreateMaterial,
  apiExplain,
  apiCreateQuiz,
  apiSubmitQuiz,
  apiGetStudyPlan,
  apiGetNotes,
} from './api.js';

let doc = null;
let quiz = null;
let last = null;
let backendMaterialId = null;
let backendQuizId = null;
let backendPlan = null;
let backendNotes = null;

export const SAMPLE_STUDY_MATERIAL = `Cellular respiration is a series of chemical reactions that break down glucose to produce ATP, the primary energy currency of cells.
The process consists of three main stages: glycolysis, the citric acid cycle (Krebs cycle), and oxidative phosphorylation.
Glycolysis takes place in the cytoplasm and breaks down one glucose molecule into two pyruvate molecules, generating a net gain of 2 ATP and 2 NADH.
The citric acid cycle occurs inside the mitochondrial matrix, processing acetyl-CoA to produce high-energy electron carriers (NADH and FADH2) along with carbon dioxide.
Oxidative phosphorylation takes place across the inner mitochondrial membrane, where the electron transport chain uses electrons from NADH and FADH2 to create a proton gradient that drives ATP synthesis.
Photosynthesis, on the other hand, converts light energy into chemical energy stored in glucose within chloroplasts.`;

export function loadSampleNotes() {
  const pasteEl = document.getElementById('paste');
  if (pasteEl) pasteEl.value = SAMPLE_STUDY_MATERIAL;
  setDoc(chunk(SAMPLE_STUDY_MATERIAL), false, SAMPLE_STUDY_MATERIAL, 'Cellular Respiration & Energy');
}

export function getBackendMaterialId() {
  return backendMaterialId;
}

const $ = (i) => document.getElementById(i);

export function h(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
  }[c]));
}

export function rx(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function cap(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function shuf(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = a[i];
    a[i] = a[j];
    a[j] = t;
  }
  return a;
}

function out(el, html) {
  if (!el) return;
  el.innerHTML = html;
  applyLanguage();
}

function msg(el, k, c) {
  out(el, `<div class="ans${c || ''}"><span>${k}</span></div>`);
}

function sT(n) {
  if (currentLang === 'hi') return `${n} दिन की स्ट्रीक`;
  if (currentLang === 'es') return `Racha de ${n}${n === 1 ? ' día' : ' días'}`;
  if (currentLang === 'fr') return `Série de ${n}${n > 1 ? ' jours' : ' jour'}`;
  return `${n} day streak`;
}

export async function renderDyn() {
  const user = getCurrentUser();
  const streak = await fetchStreak(user);
  const attempts = await fetchAttempts(user);

  const streakTxt = $('streakTxt');
  if (streakTxt) streakTxt.textContent = sT(streak.n);

  const p = attempts.length
    ? Math.round((attempts[attempts.length - 1].s / attempts[attempts.length - 1].t) * 100)
    : 0;

  const pctBig = $('pctBig');
  const pctRing = $('pctRing');
  if (pctBig) pctBig.textContent = `${p}%`;
  if (pctRing) pctRing.textContent = `${p}%`;

  const progCard = document.querySelector('.prog');
  if (progCard) progCard.style.setProperty('--p', `${p}%`);
}

// ---------------- Text & PDF Processing ----------------
const SW = new Set(
  'the and for that with this from are was were have has had not but you your can will they their them which what when where who how why does did its into than then also such been being more most other some any all one two use used using about over under between each per del las los una uno con por para que como mas pero sus este esta estos les des une est sont pour dans qui par pas plus aux sur cette ces का की के है हैं में से और को पर यह वह एक नहीं'.split(' ')
);

function tok(s) {
  return (s.toLowerCase().match(/[\p{L}\p{M}\p{N}]+/gu) || []).filter(
    (w) => w.length > 3 && !SW.has(w) && !/^\d+$/.test(w)
  );
}

function sents(t) {
  return (t.replace(/\s+/g, ' ').match(/[^.!?।]+[.!?।]*\s*/g) || []).map((x) => x.trim());
}

function chunk(t) {
  const o = [];
  let c = '';
  let n = 1;
  sents(t).forEach((s) => {
    c += (c ? ' ' : '') + s;
    if (c.length > 1000) {
      o.push({ n: n++, text: c });
      c = '';
    }
  });
  if (c) o.push({ n, text: c });
  return o;
}

function analyse(pages) {
  const S = [];
  const df = {};
  const tf = {};

  pages.forEach((p) => {
    sents(p.text).forEach((t) => {
      if (t.length > 25) {
        const w = tok(t);
        const st = new Set(w);
        S.push({ t, p: p.n, w, set: st });
        st.forEach((x) => {
          df[x] = (df[x] || 0) + 1;
        });
        w.forEach((x) => {
          tf[x] = (tf[x] || 0) + 1;
        });
      }
    });
  });

  const N = S.length;
  const idf = (x) => Math.log(1 + N / (df[x] || 1));
  const kw = Object.keys(tf)
    .filter((x) => tf[x] >= 2 && df[x] < N * 0.8)
    .sort((a, b) => tf[b] * idf(b) - tf[a] * idf(a));

  const topics = kw.slice(0, 6);
  S.forEach((s) => {
    s.topic = topics.filter((t) => s.set.has(t))[0];
  });

  return { S, N, idf, topics, kw: kw.slice(0, 14), used: new Set() };
}

export function setDoc(pages, pdf, rawContent = null, title = null) {
  const a = analyse(pages);
  const mstat = $('mstat');

  if (a.N < 4 || a.topics.length < 2) {
    doc = null;
    msg(mstat, tr('Add more material: at least a few full sentences are needed.'));
    return;
  }

  a.unit = pdf ? tr('Page') : tr('Passage');
  a.title = title || (pdf ? 'Uploaded PDF Document' : 'Pasted Study Notes');
  a.textSample = pages.map((p) => p.text).join('\n').slice(0, 500);

  doc = a;
  quiz = null;
  last = null;
  backendMaterialId = null;
  backendQuizId = null;
  backendPlan = null;
  backendNotes = null;

  const user = getCurrentUser();
  syncActiveStreak(user).then(renderDyn);
  recordStudyMaterial(a, user);

  out(
    mstat,
    `<span>${tr('Material loaded.')}</span> <b>${a.N}</b> <span>${tr('sentences')}</span> · <b>${
      a.topics.length
    }</b> <span>${tr('key topics')}</span><div>${a.topics
      .map((t) => `<i class="chip dyn">${h(cap(t))}</i>`)
      .join('')}</div>`
  );

  // Sync to Agastya Backend API asynchronously
  if (rawContent) {
    apiCreateMaterial(rawContent, a.title)
      .then((res) => {
        backendMaterialId = res.id;
        backendPlan = res.study_plan;
        backendNotes = res.short_notes;

        let extraVisual = '';
        if (res.short_notes && res.short_notes.visual && res.short_notes.visual.svg) {
          extraVisual += `<div class="concept-map-wrap" style="margin-top:14px;border-radius:14px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);background:#0d1127;">${res.short_notes.visual.svg}</div>`;
        }
        if (res.short_notes && res.short_notes.key_points && res.short_notes.key_points.length) {
          extraVisual += `<div class="keypoints-wrap" style="margin-top:12px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:12px 16px;"><b style="color:var(--gold);font-size:12px;letter-spacing:1px;text-transform:uppercase;">✦ ${tr('Core Principles')}</b><ul style="margin:8px 0 0 18px;font-size:12px;line-height:1.6;color:var(--muted);">${res.short_notes.key_points.slice(0, 4).map(p => `<li>${h(p.text)} <i style="color:var(--gold);font-size:10px;">(${p.citations.join(', ')})</i></li>`).join('')}</ul></div>`;
        }

        out(
          mstat,
          `<span>${tr('Material loaded.')}</span> <b>${a.N}</b> <span>${tr('sentences')}</span> · <b>${
            res.topics ? res.topics.length : a.topics.length
          }</b> <span>${tr('key topics')}</span><div>${(res.topics || a.topics)
            .map((t) => `<i class="chip dyn">${h(cap(t))}</i>`)
            .join('')}</div>${extraVisual}`
        );
      })
      .catch((err) => {
        console.warn('Backend material sync notice (running local mode):', err);
      });
  }
}

function ensurePdf(ok, bad) {
  if (window.pdfjsLib) return ok();
  const B = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/';
  const s = document.createElement('script');
  s.src = B + 'pdf.min.js';
  s.onerror = bad;
  s.onload = () => {
    const w = document.createElement('script');
    w.src = B + 'pdf.worker.min.js';
    w.onerror = bad;
    w.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = w.src;
      ok();
    };
    document.head.appendChild(w);
  };
  document.head.appendChild(s);
}

// ---------------- Grounded Q&A ----------------
function simple(t) {
  t = t.replace(/\s*\([^)]*\)/g, '');
  if (t.length > 150) {
    const c = t.slice(0, 150);
    const i = Math.max(c.lastIndexOf(', '), c.lastIndexOf('; '));
    t = (i > 60 ? c.slice(0, i) : c.replace(/\s+\S*$/, '')) + '…';
  }
  return t;
}

export async function askQuestion() {
  const o = $('aout');
  const qEl = $('q');
  if (!qEl) return;
  const q = qEl.value.trim();
  if (!q) {
    return msg(o, tr('Please type your question or doubt above first!'), ' no');
  }

  const user = getCurrentUser();
  syncActiveStreak(user).then(renderDyn);

  if (!doc) {
    out(
      o,
      `<div class="ans no"><span>${tr('Add your study material first.')} </span><div style="margin-top:8px;"><button class="b2 ghost" id="ask-load-sample" style="padding:4px 10px;font-size:12px;">✦ ${tr('Load Sample Notes & Explain')}</button></div></div>`
    );
    const b = $('ask-load-sample');
    if (b) {
      b.onclick = () => {
        loadSampleNotes();
        setTimeout(askQuestion, 350);
      };
    }
    return;
  }

  // Attempt grounded Q&A via Agastya Backend API first
  if (backendMaterialId) {
    msg(o, 'Consulting study material…');
    try {
      const res = await apiExplain(backendMaterialId, q, currentLang);
      if (res.available_in_material && res.sources && res.sources.length) {
        return out(
          o,
          `<div class="ans"><b>${tr('In simple words')}</b><ul><li><span class="dyn">${h(
            res.answer
          )}</span><span class="ref"><i>Source</i> ${res.sources.join(', ')}</span></li></ul></div>`
        );
      } else {
        return msg(
          o,
          tr(
            'Not in your material. This question can’t be answered from what you uploaded, so I won’t guess. Try different words or add the relevant pages.'
          ),
          ' no'
        );
      }
    } catch (e) {
      console.warn('Backend explain error, falling back to local TF-IDF:', e);
    }
  }

  const qt = tok(q);
  const need = Math.max(1, Math.ceil(qt.length / 2));

  const sc = doc.S.map((s) => {
    let m = 0;
    let v = 0;
    qt.forEach((x) => {
      const hit =
        s.set.has(x) ||
        (x.length > 4 && s.w.some((y) => y.length > 4 && y.indexOf(x.slice(0, 5)) === 0));
      if (hit) {
        m++;
        v += doc.idf(x);
      }
    });
    return { s, m, v };
  })
    .filter((r) => r.m)
    .sort((a, b) => b.v - a.v);

  if (!qt.length || !sc.length || sc[0].m < need) {
    return msg(
      o,
      tr(
        'Not in your material. This question can’t be answered from what you uploaded, so I won’t guess. Try different words or add the relevant pages.'
      ),
      ' no'
    );
  }

  const top = sc.filter((r) => r.m >= need && r.v >= sc[0].v * 0.45).slice(0, 3);

  out(
    o,
    `<div class="ans"><b>${tr('In simple words')}</b><ul>${top
      .map((r) => {
        const s = r.s;
        const sm = simple(s.t);
        return `<li><span class="dyn">${h(sm)}</span><span class="ref"><i>${doc.unit}</i> ${
          s.p
        }</span>${
          sm !== s.t
            ? `<details><summary>${tr('Original passage')}</summary><span class="dyn">${h(
                s.t
              )}</span></details>`
            : ''
        }</li>`;
      })
      .join('')}</ul></div>`
  );
}

// ---------------- Diagnostic Quiz ----------------
function build(s) {
  const re = new RegExp(`(^|[^\\p{L}\\p{N}])(${rx(s.topic)})(?![\\p{L}\\p{N}])`, 'iu');
  if (!re.test(s.t)) return null;

  const ds = shuf(doc.kw.filter((k) => k !== s.topic && !s.set.has(k))).slice(0, 3);
  if (ds.length < 3) return null;

  return {
    text: s.t.replace(re, '$1_____'),
    ans: s.topic,
    o: shuf(ds.concat([s.topic])),
    topic: s.topic,
    p: s.p,
    s,
  };
}

function gen(n, only) {
  const by = {};
  doc.S.forEach((s) => {
    if (
      s.topic &&
      s.t.length >= 40 &&
      s.t.length <= 260 &&
      (!only || only.indexOf(s.topic) > -1)
    ) {
      (by[s.topic] = by[s.topic] || []).push(s);
    }
  });

  const ts = shuf(Object.keys(by));
  const qs = [];
  let i = 0;
  let g = 0;

  if (!ts.length) return qs;

  ts.forEach((k) => {
    shuf(by[k]).sort((a, b) => (doc.used.has(a) ? 1 : 0) - (doc.used.has(b) ? 1 : 0));
  });

  while (qs.length < n && g++ < 300) {
    const s = by[ts[i++ % ts.length]].shift();
    if (!s) continue;
    const q = build(s);
    if (q) {
      qs.push(q);
      doc.used.add(s);
    }
  }
  return qs;
}

export async function startQuiz(kind = 'd', only = null) {
  const st = $('qstage');
  if (!doc) return msg(st, tr('Add your material first.'), ' no');

  // Try creating an advanced cited quiz via Backend API if connected
  if (backendMaterialId) {
    msg(st, 'Generating quiz questions from your material…');
    try {
      const qKind = kind === 'd' ? 'diagnostic' : 'weak-topic';
      const topics = only || (last && last.weak) || [];
      const res = await apiCreateQuiz(backendMaterialId, qKind, 5, topics);

      if (res.questions && res.questions.length >= 2) {
        backendQuizId = res.quiz_id;
        quiz = { k: kind, qs: res.questions, isBackend: true };

        return out(
          st,
          `<p class="note"><span>${tr('Choose the best option for each question based on your material.')}</span></p>${res.questions
            .map(
              (q, idx) =>
                `<div class="qq" id="qq${idx}"><div><b>${idx + 1}.</b> <span class="dyn">${h(
                  q.question
                )}</span> <span class="chip dyn" style="font-size:10px;vertical-align:middle;margin-left:6px;">${h(
                  q.topic
                )}</span></div>${q.options
                  .map(
                    (o, optIdx) =>
                      `<label><input type="radio" name="r${idx}" value="${optIdx}"> <span class="dyn">${h(
                        o
                      )}</span></label>`
                  )
                  .join('')}</div>`
            )
            .join('')}<div class="row"><button class="b2" data-act="submit">${tr(
            'Submit answers'
          )}</button></div><div id="qres"></div>`
        );
      }
    } catch (e) {
      console.warn('Backend quiz creation failed, falling back to local generator:', e);
    }
  }

  let qs = gen(kind === 'd' ? 8 : 5, only);
  if (qs.length < 3 && only) qs = gen(5);
  if (qs.length < 2) {
    return msg(st, tr('Add more material: at least a few full sentences are needed.'), ' no');
  }

  quiz = { k: kind, qs, isBackend: false };

  out(
    st,
    `<p class="note"><span>${tr('Choose the word that completes each passage.')}</span></p>${qs
      .map(
        (q, idx) =>
          `<div class="qq" id="qq${idx}"><div><b>${idx + 1}.</b> <span class="dyn">${h(
            q.text
          )}</span></div>${q.o
            .map(
              (o) =>
                `<label><input type="radio" name="r${idx}" value="${h(
                  o
                )}"> <span class="dyn">${h(cap(o))}</span></label>`
            )
            .join('')}</div>`
      )
      .join('')}<div class="row"><button class="b2" data-act="submit">${tr(
      'Submit answers'
    )}</button></div><div id="qres"></div>`
  );
}

export async function submitQuiz() {
  if (!quiz) return;

  // Handle Backend API quiz submission
  if (quiz.isBackend && backendQuizId) {
    const answers = {};
    quiz.qs.forEach((q, i) => {
      const c = document.querySelector(`input[name=r${i}]:checked`);
      if (c) {
        answers[q.id] = parseInt(c.value, 10);
      }
    });

    try {
      const res = await apiSubmitQuiz(backendQuizId, answers, 4);

      quiz.qs.forEach((q, i) => {
        const itemReview = res.review.find((r) => r.question_id === q.id);
        const ok = itemReview ? itemReview.is_correct : false;
        const b = $('qq' + i);
        if (b) {
          b.className = 'qq ' + (ok ? 'ok' : 'bad');
          if (!ok && itemReview) {
            b.insertAdjacentHTML(
              'beforeend',
              `<div class="note"><b>${tr('Correct answer')}</b>: <span class="dyn">${h(
                itemReview.correct_option
              )}</span>${itemReview.sources && itemReview.sources.length ? `<span class="ref"><i>Source</i> ${itemReview.sources.join(', ')}</span>` : ''}</div>`
            );
          }
        }
      });

      document.querySelectorAll('#qstage input').forEach((x) => (x.disabled = true));
      const sb = document.querySelector('[data-act=submit]');
      if (sb) sb.remove();

      const user = getCurrentUser();
      const attempt = {
        d: Date.now(),
        k: quiz.k,
        s: res.score,
        t: res.total,
        tp: {},
      };
      res.review.forEach((r) => {
        const t = (attempt.tp[r.topic] = attempt.tp[r.topic] || [0, 0]);
        t[1]++;
        if (r.is_correct) t[0]++;
      });

      await recordAttempt(attempt, user);
      await syncActiveStreak(user);

      last = { weak: res.weak_areas || [] };
      quiz = null;

      out(
        $('qres'),
        `<div class="ans"><b>${tr('Score')}</b>: <span class="dyn">${res.score} / ${
          res.total
        } (${res.accuracy_percent}%)</span><br><b>${tr('Weak topics')}</b>: ${
          res.weak_areas && res.weak_areas.length
            ? res.weak_areas.map((t) => `<i class="chip dyn">${h(cap(t))}</i>`).join('')
            : `<span>${tr('No weak topics. Great work!')}</span>`
        }<div class="row"><button class="b2" data-act="plan">${tr(
          'See revision plan'
        )}</button></div></div>`
      );

      renderDyn();
      const qres = $('qres');
      if (qres) qres.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      return;
    } catch (e) {
      console.warn('Backend quiz submit error, falling back to local grading:', e);
    }
  }

  // Local fallback quiz grading
  let r = 0;
  const tp = {};

  quiz.qs.forEach((q, i) => {
    const c = document.querySelector(`input[name=r${i}]:checked`);
    const ok = !!c && c.value === q.ans;
    const t = (tp[q.topic] = tp[q.topic] || [0, 0]);
    t[1]++;
    if (ok) {
      r++;
      t[0]++;
    }

    const b = $('qq' + i);
    if (b) {
      b.className = 'qq ' + (ok ? 'ok' : 'bad');
      if (!ok) {
        b.insertAdjacentHTML(
          'beforeend',
          `<div class="note"><b>${tr('Correct answer')}</b>: <span class="dyn">${h(
            cap(q.ans)
          )}</span><span class="ref"><i>${doc.unit}</i> ${q.p}</span></div>`
        );
      }
    }
  });

  document.querySelectorAll('#qstage input').forEach((x) => (x.disabled = true));
  const sb = document.querySelector('[data-act=submit]');
  if (sb) sb.remove();

  const user = getCurrentUser();
  const attempt = {
    d: Date.now(),
    k: quiz.k,
    s: r,
    t: quiz.qs.length,
    tp,
  };

  await recordAttempt(attempt, user);
  await syncActiveStreak(user);

  const weak = Object.keys(tp).filter((k) => tp[k][0] / tp[k][1] < 0.7);
  last = { weak };
  quiz = null;

  out(
    $('qres'),
    `<div class="ans"><b>${tr('Score')}</b>: <span class="dyn">${r} / ${
      attempt.t
    }</span><br><b>${tr('Weak topics')}</b>: ${
      weak.length
        ? weak.map((t) => `<i class="chip dyn">${h(cap(t))}</i>`).join('')
        : `<span>${tr('No weak topics. Great work!')}</span>`
    }<div class="row"><button class="b2" data-act="plan">${tr(
      'See revision plan'
    )}</button></div></div>`
  );

  renderDyn();
  const qres = $('qres');
  if (qres) qres.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ---------------- Revision Plan & Progress ----------------
export function renderPlan() {
  const el = $('pout');
  if (!el) return;

  // Use rich personalized backend plan if available
  if (backendPlan && backendPlan.schedule && backendPlan.schedule.length) {
    return out(
      el,
      `<h3>${tr('Your revision plan')} — ${h(backendPlan.title || 'Study Plan')}</h3>
       <p class="note" style="margin-bottom:14px;">${h(backendPlan.study_method || 'Follow this structured schedule.')}</p>
       ${backendPlan.schedule
         .map(
           (d) => `<div class="stp"><b class="dyn">Day ${d.day}: ${h(d.theme || d.topic || 'Revision')}</b>
           <div style="margin:4px 0;"><b>${tr('Topics')}:</b> ${(d.topics || [d.topic]).map((t) => `<i class="chip dyn">${h(cap(t))}</i>`).join(' ')}</div>
           ${d.steps ? `<ul style="margin:6px 0 0 16px;font-size:12px;color:var(--muted);line-height:1.6;">${d.steps.map((st) => `<li>${h(st)}</li>`).join('')}</ul>` : ''}
           ${d.sources && d.sources.length ? `<div style="margin-top:4px;"><span class="ref"><i>Source</i> ${d.sources.join(', ')}</span></div>` : ''}
           </div>`
         )
         .join('')}
       <div class="row"><button class="b2" data-act="practice">${tr(
         'Practise weak topics'
       )}</button></div>`
    );
  }

  if (!doc || !last) {
    return out(
      el,
      `<p class="note"><span>${tr(
        'Take the diagnostic quiz first. Your plan is built from your weak topics.'
      )}</span></p>`
    );
  }

  if (!last.weak.length) {
    return msg(el, tr('No weak topics. Great work!'));
  }

  out(
    el,
    `<h3>${tr('Your revision plan')}</h3>${last.weak
      .map((t) => {
        const pg = [];
        doc.S.forEach((s) => {
          if (s.topic === t && pg.indexOf(s.p) < 0) pg.push(s.p);
        });
        pg.sort((a, b) => a - b);

        return `<div class="stp"><b class="dyn">${h(cap(t))}</b><div><span>${tr(
          'Day 1'
        )}</span> · <span>${tr('Re-read')}</span><span class="ref"><i>${doc.unit}</i> ${pg
          .slice(0, 6)
          .join(', ')}</span></div><div><span>${tr('Day 2')}</span> · <span>${tr(
          'Answer practice questions'
        )}</span></div><div><span>${tr('Day 3')}</span> · <span>${tr(
          'Retake the quiz'
        )}</span></div></div>`;
      })
      .join('')}<div class="row"><button class="b2" data-act="practice">${tr(
      'Practise weak topics'
    )}</button></div>`
  );
}

export async function renderProgress() {
  const el = $('gout');
  if (!el) return;

  const user = getCurrentUser();
  const a = await fetchAttempts(user);

  if (!a.length) {
    return out(
      el,
      `<p class="note"><span>${tr('No attempts yet. Take a quiz to see your progress.')}</span></p>`
    );
  }

  const pc = (x) => Math.round((x.s / x.t) * 100);
  const rows = a.slice(-10);
  const base = a.length - rows.length;

  out(
    el,
    rows
      .map((x, i) => {
        const p = pc(x);
        const w = Object.keys(x.tp || {}).filter((k) => x.tp[k][0] / x.tp[k][1] < 0.7);
        return `<div class="hist"><b><span>${tr('Attempt')}</span> ${
          base + i + 1
        }</b><div class="bar"><span style="width:${p}%"></span></div><span class="dyn">${x.s}/${
          x.t
        } · ${p}%</span><span>${x.k === 'd' ? tr('Diagnostic') : tr('Practice')}</span></div>${
          w.length
            ? `<div><b>${tr('Weak topics')}</b>: ${w
                .map((t) => `<i class="chip dyn">${h(cap(t))}</i>`)
                .join('')}</div>`
            : ''
        }`;
      })
      .join('') +
      (a.length > 1
        ? (() => {
            const d = pc(a[a.length - 1]) - pc(a[0]);
            return `<p class="note"><b>${tr('Change since first attempt')}</b>: <span class="dyn">${
              d > 0 ? '+' : ''
            }${d}%</span></p>`;
          })()
        : '') +
      `<div class="row"><button class="b2 ghost" data-act="clear">${tr(
        'Clear history'
      )}</button></div>`
  );
}

export function switchTab(t) {
  document.querySelectorAll('.tabs button').forEach((b) => {
    b.classList.toggle('on', b.dataset.t === t);
  });
  document.querySelectorAll('.pn').forEach((p) => {
    p.classList.toggle('on', p.id === 'p-' + t);
  });

  if (t === 'plan') renderPlan();
  if (t === 'progress') renderProgress();
}

export function initStudio() {
  const useBtn = $('use');
  if (useBtn) {
    useBtn.addEventListener('click', () => {
      const pasteEl = $('paste');
      const t = pasteEl ? pasteEl.value.trim() : '';
      if (t) setDoc(chunk(t), false, t, 'Pasted Study Notes');
    });
  }

  const pdfInput = $('pdf');
  if (pdfInput) {
    pdfInput.addEventListener('change', (e) => {
      const f = e.target.files[0];
      if (!f) return;
      msg($('mstat'), tr('Reading your PDF…'));

      const bad = () =>
        msg(
          $('mstat'),
          tr('Couldn’t read text from this PDF. If it is a scanned image, paste the text instead.')
        );

      const r = new FileReader();
      r.onerror = bad;
      r.onload = () => {
        ensurePdf(() => {
          window.pdfjsLib
            .getDocument({ data: new Uint8Array(r.result) })
            .promise.then((d) => {
              const ps = [];
              let i = 1;
              function next() {
                if (i > d.numPages) {
                  return ps.some((p) => p.text.trim().length > 30)
                    ? setDoc(ps, true, f, f.name.replace(/\.[^/.]+$/, ''))
                    : bad();
                }
                d.getPage(i)
                  .then((p) => p.getTextContent())
                  .then((c) => {
                    ps.push({ n: i, text: c.items.map((x) => x.str).join(' ') });
                    i++;
                    next();
                  })
                  .catch(bad);
              }
              next();
            })
            .catch(bad);
        }, bad);
      };
      r.readAsArrayBuffer(f);
    });
  }

  const askBtn = $('askb');
  if (askBtn) askBtn.addEventListener('click', askQuestion);

  const qInput = $('q');
  if (qInput) {
    qInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') askQuestion();
    });
  }

  const startqBtn = $('startq');
  if (startqBtn) {
    startqBtn.addEventListener('click', () => startQuiz('d'));
  }

  document.querySelectorAll('.tabs button').forEach((b) => {
    b.addEventListener('click', () => switchTab(b.dataset.t));
  });

  const studioEl = $('studio');
  if (studioEl) {
    studioEl.addEventListener('click', (e) => {
      const a = e.target.closest('[data-act]');
      if (!a) return;
      const k = a.dataset.act;

      if (k === 'submit') {
        submitQuiz();
      } else if (k === 'plan') {
        switchTab('plan');
      } else if (k === 'practice') {
        switchTab('quiz');
        startQuiz('p', last && last.weak);
      } else if (k === 'clear') {
        const user = getCurrentUser();
        clearAllAttempts(user).then(() => {
          renderProgress();
          renderDyn();
        });
      }
    });
  }

  window.renderDyn = renderDyn;
  renderDyn();
}

export function getStudioDoc() {
  return doc;
}
