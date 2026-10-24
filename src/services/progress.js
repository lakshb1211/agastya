import { fetchAttempts, fetchStreak } from './storage.js';
import { getCurrentUser } from './auth.js';
import { h, cap, switchTab, startQuiz, getStudioDoc } from './studio.js';
import { applyLanguage, tr } from './i18n.js';

const $ = (i) => document.getElementById(i);

function pc(x) {
  return Math.round((x.s / x.t) * 100);
}

function col(p) {
  return p >= 70 ? '#a9e8c0' : p >= 50 ? '#f5cd78' : '#ff9a9a';
}

function trendSvg(r) {
  const W = 560;
  const H = 200;
  const l = 34;
  const b = 24;
  const t = 12;
  const rt = 12;
  const n = r.length;

  const X = (i) => (n < 2 ? l + (W - l - rt) / 2 : l + (i * (W - l - rt)) / (n - 1));
  const Y = (v) => t + ((100 - v) * (H - t - b)) / 100;
  let g = '';

  [0, 25, 50, 75, 100].forEach((v) => {
    g += `<line x1="${l}" x2="${W - rt}" y1="${Y(v)}" y2="${Y(
      v
    )}" stroke="rgba(255,255,255,.08)"/><text x="${l - 6}" y="${
      Y(v) + 4
    }" fill="#a3abc5" font-size="10" text-anchor="end">${v}</text>`;
  });

  g += `<line x1="${l}" x2="${W - rt}" y1="${Y(70)}" y2="${Y(
    70
  )}" stroke="#f5cd78" stroke-dasharray="5 4"/><text x="${W - rt}" y="${
    Y(70) - 4
  }" fill="#f5cd78" font-size="10" text-anchor="end">${tr('Goal 70%') || 'Goal 70%'}</text>`;

  const d = r.map((x, i) => (i ? 'L' : 'M') + X(i) + ' ' + Y(pc(x))).join(' ');
  g += `<path d="${d}" fill="none" stroke="#ad91ff" stroke-width="2.5"/>`;

  r.forEach((x, i) => {
    g += `<circle cx="${X(i)}" cy="${Y(pc(x))}" r="4" fill="${col(pc(x))}"/><text x="${X(
      i
    )}" y="${H - 8}" fill="#a3abc5" font-size="10" text-anchor="middle">#${i + 1}</text>`;
  });

  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Score trend chart" style="width:100%;height:auto">${g}</svg>`;
}

export async function renderDashboard() {
  const user = getCurrentUser();
  const a = await fetchAttempts(user);
  const streak = await fetchStreak(user);
  const b = $('dbody');
  if (!b) return;

  if (!a.length) {
    b.innerHTML = `
      <div class="dc">
        <h3>No quiz data yet</h3>
        <p class="s">Take a diagnostic quiz and this page will show your score trend, weak areas, and actionable advice to improve.</p>
        <button class="b2" id="dgo">Take a quiz</button>
      </div>`;
    const dgo = $('dgo');
    if (dgo) {
      dgo.onclick = () => {
        switchTab('quiz');
        window.go('learn');
      };
    }
    return;
  }

  const sc = a.map(pc);
  const avg = Math.round(sc.reduce((x, y) => x + y, 0) / sc.length);
  const chg = sc[sc.length - 1] - sc[0];
  const T = {};

  a.forEach((x) => {
    Object.keys(x.tp || {}).forEach((k) => {
      const o = (T[k] = T[k] || { c: 0, t: 0, h: [] });
      o.c += x.tp[k][0];
      o.t += x.tp[k][1];
      o.h.push(Math.round((x.tp[k][0] / x.tp[k][1]) * 100));
    });
  });

  const tp = Object.keys(T)
    .map((k) => ({
      k,
      p: Math.round((T[k].c / T[k].t) * 100),
      h: T[k].h,
    }))
    .sort((x, y) => x.p - y.p);

  const weak = tp.filter((x) => x.p < 70);

  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push({
      l: d.toLocaleDateString(undefined, { weekday: 'short' }),
      y: d.toDateString(),
      n: 0,
    });
  }

  a.forEach((x) => {
    const y = new Date(x.d).toDateString();
    days.forEach((q) => {
      if (q.y === y) q.n += x.t;
    });
  });

  const mx = Math.max.apply(
    null,
    days.map((q) => q.n).concat([1])
  );
  const act = days.filter((q) => q.n).length;
  const im = [];

  weak.slice(0, 4).forEach((w) => {
    im.push(
      `<em style="color:#ff9a9a">Weak area</em><b>${h(cap(w.k))}</b> is at ${w.p}%. You need about +${
        70 - w.p
      } points to reach the 70% goal. Re-read it, then retake a practice quiz on it.`
    );
  });

  if (a.length > 1) {
    im.push(
      chg >= 0
        ? `<em style="color:#a9e8c0">Improving</em>Your score is up ${chg}% since your first attempt. Keep the same routine.`
        : `<em style="color:#ff9a9a">Dropping</em>Your score is down ${Math.abs(
            chg
          )}% since your first attempt. Slow down and revisit the passages you missed.`
    );
  } else {
    im.push('<em>Need more data</em>Take at least 3 quizzes so trends become reliable.');
  }

  tp.forEach((x) => {
    if (x.h.length > 1 && x.h[x.h.length - 1] < x.h[0]) {
      im.push(
        `<em style="color:#f5cd78">Forgetting</em>${h(cap(x.k))} fell from ${x.h[0]}% to ${
          x.h[x.h.length - 1]
        }%. Review it again soon.`
      );
    }
  });

  if (act < 4) {
    im.push(
      `<em style="color:#f5cd78">Consistency</em>You studied on ${act} of the last 7 days. Aim for at least 4 days a week.`
    );
  }

  if (!weak.length) {
    im.push(
      '<em style="color:#a9e8c0">Strong</em>All topics are at or above 70%. Try longer quizzes or new material.'
    );
  }

  b.innerHTML = `
    <div class="kp">
      <div><strong>${sc[sc.length - 1]}%</strong><span>Latest score</span></div>
      <div><strong>${avg}%</strong><span>Average score</span></div>
      <div><strong>${chg > 0 ? '+' : ''}${chg}%</strong><span>Change since first</span></div>
      <div><strong>${streak.n}</strong><span>Day streak</span></div>
      <div><strong>${a.length}</strong><span>Quizzes taken</span></div>
    </div>
    <div class="dc">
      <h3>Score trend</h3>
      <p class="s">Last ${Math.min(10, a.length)} attempts. The dashed line is the 70% goal.</p>
      ${trendSvg(a.slice(-10))}
    </div>
    <div class="dc">
      <h3>Accuracy by topic</h3>
      <p class="s">Red under 50%, gold under 70%, green 70% or more. Weakest first.</p>
      ${tp
        .map(
          (x) =>
            `<div class="tb"><span>${h(cap(x.k))}</span><i><b style="width:${x.p}%;background:${col(
              x.p
            )}"></b></i><span>${x.p}%</span></div>`
        )
        .join('')}
    </div>
    <div class="dc">
      <h3>Questions answered, last 7 days</h3>
      <div class="wk">${days
        .map(
          (q) =>
            `<div>${q.n || ''}<b style="height:${Math.round((q.n / mx) * 80)}%"></b>${q.l}</div>`
        )
        .join('')}</div>
    </div>
    <div class="dc">
      <h3>What to improve</h3>
      <ul class="im">${im.map((x) => `<li>${x}</li>`).join('')}</ul>
      ${weak.length ? '<button class="b2" id="dpr">Practise weak topics</button>' : ''}
    </div>
  `;

  const pr = $('dpr');
  if (pr) {
    pr.onclick = () => {
      switchTab('quiz');
      if (getStudioDoc()) {
        startQuiz(
          'p',
          weak.map((w) => w.k)
        );
      }
      window.go('learn');
    };
  }
}

let curView = null;

export function showView(v) {
  if (!document.querySelector(`[data-view="${v}"]`)) v = 'home';
  curView = v;

  if (v === 'progress') renderDashboard();

  document.querySelectorAll('.view').forEach((e) => {
    e.hidden = e.dataset.view !== v;
  });

  document.querySelectorAll('.nav-links a').forEach((a) => {
    const on = a.dataset.go === v;
    a.classList.toggle('on', on);
    if (on) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });

  window.scrollTo(0, 0);
  applyLanguage();
  window.dispatchEvent(new Event('resize'));
}

export function initRouter() {
  window.go = (v) => {
    try {
      location.hash = v;
    } catch {}
    if (curView !== v) showView(v);
  };

  window.openDash = () => {
    window.go('progress');
  };

  window.addEventListener('hashchange', () => {
    const v = location.hash.slice(1) || 'home';
    if (v !== curView) showView(v);
  });

  document.addEventListener('click', (e) => {
    const a = e.target.closest('[data-go]');
    if (!a) return;
    e.preventDefault();
    window.go(a.dataset.go);
  });

  const dclose = $('dclose');
  if (dclose) {
    dclose.onclick = () => window.go('home');
  }

  // Visual orbit parallax
  const vis = document.querySelector('.visual');
  const par = vis && vis.querySelector('.par');
  if (par) {
    window.addEventListener('pointermove', (e) => {
      const r = vis.getBoundingClientRect();
      const clamp = (v) => Math.max(-1, Math.min(1, v));
      par.style.setProperty('--mx', clamp(((e.clientX - r.left) / r.width - 0.5) * 2));
      par.style.setProperty('--my', clamp(((e.clientY - r.top) / r.height - 0.5) * 2));
    });
  }

  showView(location.hash.slice(1) || 'home');
}
