import React from 'react';
import { useApp } from '../context/AppContext';
import { SupportedLang } from '../types';

export const Navbar: React.FC = () => {
  const { view, go, lang, setLang, t, user, authStatus, logout } = useApp();

  return (
    <header className="navbar container">
      <a
        href="#home"
        onClick={(e) => {
          e.preventDefault();
          go('home');
        }}
        className="brand"
        aria-label="Agastya home"
      >
        <span className="logo" role="img" aria-label="Agastya, Canopus the guiding star" />
      </a>

      <nav className="nav-links" aria-label="Main">
        <a
          href="#home"
          className={view === 'home' ? 'on' : ''}
          onClick={(e) => {
            e.preventDefault();
            go('home');
          }}
        >
          {t('Home')}
        </a>
        <a
          href="#learn"
          className={view === 'learn' ? 'on' : ''}
          onClick={(e) => {
            e.preventDefault();
            go('learn');
          }}
        >
          {t('Learn')}
        </a>
        <a
          href="#progress"
          className={view === 'progress' ? 'on' : ''}
          onClick={(e) => {
            e.preventDefault();
            go('progress');
          }}
        >
          {t('Progress')}
        </a>
        <a
          href="#journey"
          className={view === 'journey' ? 'on' : ''}
          onClick={(e) => {
            e.preventDefault();
            go('journey');
          }}
        >
          {t('Your journey')}
        </a>
      </nav>

      <div className="nav-right">
        {authStatus && (
          <span
            className={`sb-badge ${authStatus.connected ? 'connected' : 'local'}`}
            title={authStatus.message}
          >
            {authStatus.isApi
              ? '⚡ API Connected'
              : authStatus.connected
              ? '☁ Supabase'
              : '💾 Local Mode'}
          </span>
        )}

        <div className="lang">
          <label className="lang-label" htmlFor="lang-select">
            {t('SELECT LANGUAGE')}
          </label>
          <div className="sel">
            <select
              id="lang-select"
              aria-label="Select language"
              value={lang}
              onChange={(e) => setLang(e.target.value as SupportedLang)}
            >
              <option value="en">English</option>
              <option value="hi">हिन्दी</option>
              <option value="es">Español</option>
              <option value="fr">Français</option>
            </select>
          </div>
        </div>

        {user ? (
          <div className="sb-user-pill">
            <span className="sb-dot" />
            <span className="sb-name">{user.name}</span>
            <button
              className="sb-logout-btn"
              title="Sign out"
              onClick={() => logout()}
            >
              Log out
            </button>
          </div>
        ) : (
          <a
            href="#account"
            className="nav-cta"
            onClick={(e) => {
              e.preventDefault();
              go('account');
            }}
          >
            {t('Get started')} <span>↗</span>
          </a>
        )}
      </div>
    </header>
  );
};
