import React from 'react';
import { useApp } from '../context/AppContext';
import { formatStreak } from '../services/i18n';

export const HomeView: React.FC = () => {
  const { go, goToStep, t, lang, streak, latestScore, toastMsg, showToast } = useApp();

  const handleQuickAction = (action: string, msgKey: string) => {
    showToast(t(msgKey));
    setTimeout(() => {
      if (action === 'progress') {
        go('progress');
      } else {
        goToStep(action);
      }
    }, 450);
  };

  return (
    <div className="view" data-view="home">
      <section className="hero container">
        <div className="hero-c">
          <div className="announcement">
            <span className="dot" />
            {t('CANOPUS · THE GUIDING STAR')}
          </div>
          <h1>
            {t('Your potential is')} <span className="grad">{t('infinite.')}</span>
          </h1>
          <p className="lead">
            {t(
              'A calmer, smarter way to learn. Turn your goals into progress and every study session into a step toward your future.'
            )}
          </p>

          <div className="quick" id="start">
            <div className="quick-label">{t('WHAT DO YOU WANT TO DO TODAY?')}</div>
            <div className="quick-grid">
              <button
                className="qa"
                onClick={() => handleQuickAction('ask', 'Opening AI Study Companion…')}
              >
                <i className="c-v">✧</i>
                <div>
                  <b>{t('Ask a question')}</b>
                  <span>{t('AI explains any concept')}</span>
                </div>
              </button>

              <button
                className="qa"
                onClick={() => handleQuickAction('quiz', 'Opening quiz…')}
              >
                <i className="c-g">✎</i>
                <div>
                  <b>{t('Take a quiz')}</b>
                  <span>{t('Find your weak areas')}</span>
                </div>
              </button>

              <button
                className="qa"
                onClick={() => handleQuickAction('material', 'Ready for your PDF upload…')}
              >
                <i className="c-b">▤</i>
                <div>
                  <b>{t('Upload a PDF')}</b>
                  <span>{t('Summaries and quizzes')}</span>
                </div>
              </button>

              <button
                className="qa"
                onClick={() => handleQuickAction('progress', 'Loading your progress…')}
              >
                <i className="c-m">✦</i>
                <div>
                  <b>{t('See my progress')}</b>
                  <span>{t('Goals and streaks')}</span>
                </div>
              </button>
            </div>

            <div className="tags" id="toast" role="status">
              {toastMsg ? (
                <span style={{ color: '#f5cd78', fontWeight: 600 }}>✦ {toastMsg}</span>
              ) : (
                <>
                  <span className="av" aria-hidden="true">
                    <span>A</span>
                    <span>D</span>
                    <span>M</span>
                  </span>
                  <span>{t('Built for curious minds.')}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="visual" aria-label="Study progress preview">
          <div className="par">
            <div className="sys">
              <div className="orbit o1">
                <div className="arm">
                  <i className="sat" />
                </div>
              </div>
              <div className="orbit o2">
                <div className="arm">
                  <i className="sat" />
                </div>
              </div>
              <div className="star">
                <span>✦</span>
              </div>
              <div className="star-name">{t('CANOPUS')}</div>
            </div>
          </div>

          <span className="fs a">✧</span>
          <span className="fs b">✦</span>
          <span className="fs c">✧</span>

          <div
            className="card prog"
            onClick={() => go('progress')}
            style={{ cursor: 'pointer', ['--p' as any]: `${latestScore}%` }}
            title="View progress analysis"
          >
            <div className="mini">{t('YOUR PROGRESS')}</div>
            <div className="prow">
              <div>
                <strong className="dyn">{latestScore}%</strong>
                <p>{t('Latest quiz score')}</p>
              </div>
              <div className="ring">
                <span className="dyn">{latestScore}%</span>
              </div>
            </div>
            <div className="track">
              <span />
            </div>
          </div>

          <div
            className="card streak"
            onClick={() => go('progress')}
            style={{ cursor: 'pointer' }}
            title="View streak & progress"
          >
            <i>✹</i>
            <div>
              <strong className="dyn">{formatStreak(streak.n, lang)}</strong>
              <p>{t('Keep your momentum')}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="stats container" aria-label="Study philosophy">
        <div
          className="stat"
          onClick={() => go('learn')}
          style={{ cursor: 'pointer' }}
          title="Start learning"
        >
          <i>✧</i>
          <div>
            <strong>{t('Learn')}</strong>
            <p>{t('At your own pace')}</p>
          </div>
        </div>
        <div
          className="stat"
          onClick={() => go('progress')}
          style={{ cursor: 'pointer' }}
          title="Track your growth"
        >
          <i>✦</i>
          <div>
            <strong>{t('Grow')}</strong>
            <p>{t('Progress that adds up')}</p>
          </div>
        </div>
      </section>
    </div>
  );
};
