import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

export const AccountView: React.FC = () => {
  const { go, goToStep, t, login, register } = useApp();
  const [mode, setMode] = useState<'login' | 'signup' | 'create'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [grade, setGrade] = useState('School');
  const [message, setMessage] = useState<{ text: string; isOk: boolean } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const em = email.trim().toLowerCase();
    const pw = password.trim();
    const nm = name.trim();

    if (!/^\S+@\S+\.\S+$/.test(em)) {
      setMessage({ text: 'Enter a valid email address.', isOk: false });
      return;
    }
    if (pw.length < 6) {
      setMessage({ text: 'Password must be at least 6 characters.', isOk: false });
      return;
    }
    if (mode === 'create' && !nm) {
      setMessage({ text: 'Please enter your full name.', isOk: false });
      return;
    }

    setLoading(true);
    setMessage({ text: 'Authenticating…', isOk: true });

    if (mode === 'login') {
      const res = await login(em, pw);
      setLoading(false);
      if (!res.success) {
        setMessage({ text: res.message || 'Incorrect email or password.', isOk: false });
        return;
      }
      setMessage({ text: 'Welcome back!', isOk: true });
      setTimeout(() => {
        goToStep('material');
      }, 700);
    } else {
      const res = await register(em, pw, nm || em.split('@')[0], grade);
      setLoading(false);
      if (!res.success) {
        setMessage({ text: res.message || 'Registration failed.', isOk: false });
        return;
      }
      setMessage({
        text: res.needsConfirmation
          ? 'Account created! Please check your email to confirm.'
          : 'Welcome to Agastya!',
        isOk: true
      });
      setTimeout(() => {
        goToStep('material');
      }, 800);
    }
  };

  return (
    <div className="view" data-view="account">
      <section className="container auth">
        <div className="head">
          <span className="eyebrow">{t('GET STARTED')}</span>
          <h2>
            {t('Join your')} <span className="grad">{t('learning universe.')}</span>
          </h2>
          <p>{t('Choose how you would like to continue.')}</p>
        </div>

        <div className="aopts" role="group" aria-label="Account options">
          <button
            type="button"
            className={`ao ${mode === 'login' ? 'on' : ''}`}
            onClick={() => {
              setMode('login');
              setMessage(null);
            }}
          >
            <i className="c-g">→</i>
            <div>
              <b>{t('Log in')}</b>
              <span>I already have an account</span>
            </div>
          </button>

          <button
            type="button"
            className={`ao ${mode === 'signup' ? 'on' : ''}`}
            onClick={() => {
              setMode('signup');
              setMessage(null);
            }}
          >
            <i className="c-v">✧</i>
            <div>
              <b>{t('Sign up')}</b>
              <span>Quick start with email</span>
            </div>
          </button>

          <div className="or" aria-hidden="true">
            <span>or</span>
          </div>

          <button
            type="button"
            className={`ao ${mode === 'create' ? 'on' : ''}`}
            onClick={() => {
              setMode('create');
              setMessage(null);
            }}
          >
            <i className="c-b">✦</i>
            <div>
              <b>{t('Create an account')}</b>
              <span>Set up your full profile</span>
            </div>
          </button>
        </div>

        <form className="stu afm" onSubmit={handleSubmit} noValidate>
          {mode === 'create' && (
            <div>
              <label htmlFor="anm">{t('Full name')}</label>
              <input
                className="in"
                id="anm"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
              />
            </div>
          )}

          <div>
            <label htmlFor="aem">{t('Email')}</label>
            <input
              className="in"
              id="aem"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="apw">{t('Password')}</label>
            <input
              className="in"
              id="apw"
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {mode === 'create' && (
            <div>
              <label htmlFor="agr">{t('I am studying in')}</label>
              <select
                className="in"
                id="agr"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
              >
                <option value="School">School</option>
                <option value="College">College</option>
                <option value="Competitive exams">Competitive exams</option>
                <option value="Self-learning">Self-learning</option>
              </select>
            </div>
          )}

          <div className="row" style={{ marginTop: '16px' }}>
            <button className="b2" type="submit" disabled={loading}>
              {loading
                ? 'Processing…'
                : mode === 'login'
                ? t('Log in')
                : mode === 'signup'
                ? t('Sign up')
                : t('Create an account')}
            </button>
          </div>

          {message && (
            <p className={`note ${message.isOk ? 'okm' : 'erm'}`} role="status">
              {message.text}
            </p>
          )}

          <p className="note" style={{ marginTop: '14px' }}>
            Accounts are synchronized with Supabase cloud (with offline local backup).
          </p>
        </form>
      </section>
    </div>
  );
};
