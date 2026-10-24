import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Attempt } from '../types';
import { fetchAttempts } from '../services/storage';

export const ProgressView: React.FC = () => {
  const { go, goToStep, t, streak, user, clearHistory } = useApp();
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    const data = await fetchAttempts(user);
    setAttempts(data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const scores = attempts.map((a) => (a.t > 0 ? Math.round((a.s / a.t) * 100) : 0));
  const avgAccuracy = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

  // Aggregate topics
  const topicStats: Record<string, { c: number; t: number }> = {};
  attempts.forEach((a) => {
    Object.entries(a.tp || {}).forEach(([k, [c, t]]) => {
      const entry = (topicStats[k] = topicStats[k] || { c: 0, t: 0 });
      entry.c += c;
      entry.t += t;
    });
  });

  const topicList = Object.entries(topicStats).map(([topic, stat]) => ({
    topic,
    percent: stat.t > 0 ? Math.round((stat.c / stat.t) * 100) : 0,
    total: stat.t
  })).sort((a, b) => a.percent - b.percent);

  const weakTopics = topicList.filter((item) => item.percent < 70);

  // Render SVG Trend
  const renderTrendSvg = () => {
    if (!attempts.length) return null;
    const W = 560;
    const H = 200;
    const l = 34;
    const b = 24;
    const top = 12;
    const rt = 12;
    const n = attempts.length;

    const X = (i: number) => (n < 2 ? l + (W - l - rt) / 2 : l + (i * (W - l - rt)) / (n - 1));
    const Y = (v: number) => top + ((100 - v) * (H - top - b)) / 100;

    const gridLines = [0, 25, 50, 75, 100].map((v) => (
      <g key={v}>
        <line
          x1={l}
          x2={W - rt}
          y1={Y(v)}
          y2={Y(v)}
          stroke="rgba(255,255,255,.08)"
        />
        <text
          x={l - 6}
          y={Y(v) + 4}
          fill="#a3abc5"
          fontSize="10"
          textAnchor="end"
        >
          {v}
        </text>
      </g>
    ));

    const pathData = attempts.map((_, i) => `${i ? 'L' : 'M'}${X(i)} ${Y(scores[i])}`).join(' ');

    const dots = attempts.map((_, i) => {
      const p = scores[i];
      const col = p >= 70 ? '#a9e8c0' : p >= 50 ? '#f5cd78' : '#ff9a9a';
      return (
        <g key={i}>
          <circle cx={X(i)} cy={Y(p)} r="4" fill={col} />
          <text
            x={X(i)}
            y={H - 8}
            fill="#a3abc5"
            fontSize="10"
            textAnchor="middle"
          >
            #{i + 1}
          </text>
        </g>
      );
    });

    return (
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Score trend chart"
        style={{ width: '100%', height: 'auto' }}
      >
        {gridLines}
        <line
          x1={l}
          x2={W - rt}
          y1={Y(70)}
          y2={Y(70)}
          stroke="#f5cd78"
          strokeDasharray="5 4"
        />
        <text
          x={W - rt}
          y={Y(70) - 4}
          fill="#f5cd78"
          fontSize="10"
          textAnchor="end"
        >
          {t('Goal 70%')}
        </text>
        <path d={pathData} fill="none" stroke="#ad91ff" strokeWidth="2.5" />
        {dots}
      </svg>
    );
  };

  return (
    <div className="view" data-view="progress">
      <section className="container" id="dash" aria-label="Progress analysis">
        <div className="dw">
          <div className="dh">
            <h2>{t('Your progress analysis')}</h2>
            <button className="dx" id="dclose" onClick={() => go('home')}>
              ← {t('Home')}
            </button>
          </div>

          {!loading && !attempts.length ? (
            <div className="dc" style={{ marginTop: '24px' }}>
              <h3>{t('No quiz data yet')}</h3>
              <p className="s">
                Take a diagnostic quiz and this page will show your score trend, weak areas, and
                actionable advice to improve.
              </p>
              <button className="b2" onClick={() => goToStep('quiz')}>
                {t('Take a quiz')}
              </button>
            </div>
          ) : (
            <div>
              <div className="kp">
                <div>
                  <strong>{attempts.length}</strong>
                  <span>{t('Total quizzes')}</span>
                </div>
                <div>
                  <strong>{avgAccuracy}%</strong>
                  <span>{t('Overall accuracy')}</span>
                </div>
                <div>
                  <strong>{streak.n}</strong>
                  <span>{t('Current streak')}</span>
                </div>
                <div>
                  <strong>{weakTopics.length}</strong>
                  <span>{t('Weak areas identified')}</span>
                </div>
              </div>

              {/* Trend Chart */}
              <div className="dc">
                <h3>Score Trend</h3>
                <p className="s">Recent performance across study sessions</p>
                {renderTrendSvg()}
              </div>

              {/* Weak Topics */}
              {topicList.length > 0 && (
                <div className="dc">
                  <h3>Topic Breakdown & Accuracy</h3>
                  <p className="s">Mastery percentage across all tested topics</p>
                  <div>
                    {topicList.map((item, idx) => (
                      <div key={idx} className="tb">
                        <span>{item.topic}</span>
                        <i>
                          <b
                            style={{
                              width: `${item.percent}%`,
                              background:
                                item.percent >= 70
                                  ? '#a9e8c0'
                                  : item.percent >= 50
                                  ? '#f5cd78'
                                  : '#ff9a9a'
                            }}
                          />
                        </i>
                        <span>{item.percent}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent attempts */}
              <div className="dc">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3>Recent Attempts</h3>
                  <button
                    className="dx"
                    style={{ fontSize: '11px', padding: '4px 10px', minHeight: 'auto' }}
                    onClick={async () => {
                      await clearHistory();
                      await loadData();
                    }}
                  >
                    Clear history
                  </button>
                </div>
                <ul className="im">
                  {attempts.slice(-5).reverse().map((att, idx) => {
                    const pct = att.t > 0 ? Math.round((att.s / att.t) * 100) : 0;
                    const dateStr = new Date(att.d).toLocaleDateString();
                    return (
                      <li key={idx}>
                        <em>Quiz #{attempts.length - idx}</em> · {att.s}/{att.t} ({pct}%)
                        <span style={{ float: 'right', color: 'var(--muted)', fontSize: '11px' }}>
                          {dateStr}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="row" style={{ marginTop: '20px' }}>
                <button className="b2" onClick={() => goToStep('quiz')}>
                  {t('Take a quiz')} →
                </button>
                <button className="b2 ghost" onClick={() => goToStep('material')}>
                  {t('Upload a PDF')}
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
