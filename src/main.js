import './styles/style.css';
import { initStars } from './components/stars.js';
import { initI18n, tr } from './services/i18n.js';
import { initStudio, renderDyn } from './services/studio.js';
import { initRouter, renderDashboard } from './services/progress.js';
import { initAuth, signIn, signUp, signOut, subscribeAuth } from './services/auth.js';
import { checkApiHealth } from './services/api.js';
import { initChatbot } from './components/chatbot.js';
import { initLoadingScreen } from './components/loadingScreen.js';

const $ = (id) => document.getElementById(id);

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Initialize Loading Screen
  initLoadingScreen();

  // 2. Initialize Canvas Stars & Toast
  initStars();

  // 3. Initialize Internationalization (i18n)
  initI18n();

  // 4. Initialize Study Studio (PDF, TF-IDF, Q&A, Quizzes)
  initStudio();

  // 5. Initialize SPA Router & Progress Dashboard
  initRouter();

  // 6. Initialize AI Chatbot
  initChatbot();

  // 7. Initialize Auth & Supabase Sync
  await initAuth();

  setupAuthUI();
});

function setupAuthUI() {
  let mode = 'login';
  const af = $('af');
  const asub = $('asub');
  const apw = $('apw');
  const amsg = $('amsg');
  const navContainer = document.querySelector('.navbar .nav-right') || document.querySelector('.navbar');

  function setMode(m) {
    mode = m;
    document.querySelectorAll('.ao').forEach((b) => {
      b.classList.toggle('on', b.dataset.auth === m);
    });

    document.querySelectorAll('#af [data-m]').forEach((e) => {
      e.hidden = e.dataset.m.split(' ').indexOf(m) < 0;
    });

    if (asub) {
      asub.textContent = {
        login: 'Log in',
        signup: 'Sign up',
        create: 'Create account',
      }[m];
    }

    if (apw) {
      apw.autocomplete = m === 'login' ? 'current-password' : 'new-password';
    }

    if (amsg) amsg.textContent = '';
  }

  document.querySelectorAll('.ao').forEach((b) => {
    b.addEventListener('click', () => setMode(b.dataset.auth));
  });

  function showMsg(text, isOk) {
    if (!amsg) return;
    amsg.textContent = text;
    amsg.className = 'note ' + (isOk ? 'okm' : 'erm');
  }

  if (af) {
    af.addEventListener('submit', async (e) => {
      e.preventDefault();

      const em = ($('aem')?.value || '').trim().toLowerCase();
      const pw = $('apw')?.value || '';
      const nm = ($('anm')?.value || '').trim();
      const gr = $('agr')?.value || 'School';

      if (!/^\S+@\S+\.\S+$/.test(em)) {
        return showMsg('Enter a valid email address.');
      }
      if (pw.length < 6) {
        return showMsg('Password must be at least 6 characters.');
      }
      if (mode === 'create' && !nm) {
        return showMsg('Please enter your full name.');
      }

      showMsg('Authenticating…', true);

      if (mode === 'login') {
        const res = await signIn(em, pw);
        if (!res.success) {
          return showMsg(res.message);
        }
        showMsg(`Welcome back, ${res.user.name}!`, true);
        setTimeout(() => {
          af.reset();
          window.go('learn');
          renderDyn();
        }, 800);
      } else {
        const res = await signUp(em, pw, nm, gr);
        if (!res.success) {
          return showMsg(res.message);
        }
        showMsg(
          res.needsConfirmation
            ? 'Account created! Please check your email to confirm.'
            : `Welcome, ${res.user.name}!`,
          true
        );
        setTimeout(() => {
          af.reset();
          window.go('learn');
          renderDyn();
        }, 900);
      }
    });
  }

  // Subscribe to auth state updates to update navbar and badges
  subscribeAuth((user, status) => {
    updateNavbarAuth(user, status);
  });
}

function updateNavbarAuth(user, status) {
  let navRight = document.querySelector('.navbar .nav-right');
  if (!navRight) {
    navRight = document.createElement('div');
    navRight.className = 'nav-right';
    const langDiv = document.querySelector('.navbar .lang');
    if (langDiv) {
      langDiv.parentNode.insertBefore(navRight, langDiv.nextSibling);
    }
  }

  const existingBadge = document.querySelector('.sb-badge');
  if (existingBadge) existingBadge.remove();

  const badge = document.createElement('span');
  badge.className = `sb-badge ${status.connected ? 'connected' : 'local'}`;
  badge.title = status.message;
  badge.innerHTML = status.connected ? '☁ Supabase' : '💾 Local Mode';
  navRight.prepend(badge);

  // Check if Agastya FastAPI backend is live
  checkApiHealth().then((apiStatus) => {
    if (apiStatus && apiStatus.connected) {
      badge.className = 'sb-badge connected';
      badge.title = 'Agastya FastAPI Backend running at 127.0.0.1:8000';
      badge.innerHTML = '⚡ API Connected';
    }
  });

  const existingPill = document.querySelector('.sb-user-pill');
  if (existingPill) existingPill.remove();

  const ctaBtn = document.querySelector('.nav-cta');

  if (user) {
    if (ctaBtn) ctaBtn.style.display = 'none';

    const pill = document.createElement('div');
    pill.className = 'sb-user-pill';
    pill.innerHTML = `
      <span class="sb-dot"></span>
      <span class="sb-name">${user.name}</span>
      <button class="sb-logout-btn" title="Sign out">Log out</button>
    `;

    pill.querySelector('.sb-logout-btn').onclick = async () => {
      await signOut();
      renderDyn();
    };

    navRight.appendChild(pill);
  } else {
    if (ctaBtn) {
      ctaBtn.style.display = 'inline-flex';
      ctaBtn.textContent = 'Get started ↗';
    }
  }
}
