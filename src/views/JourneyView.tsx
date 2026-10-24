import React from 'react';
import { useApp } from '../context/AppContext';

export const JourneyView: React.FC = () => {
  const { goToStep, t } = useApp();

  return (
    <div className="view" data-view="journey">
      <section className="journey container" id="journey-card" style={{ marginTop: '50px' }}>
        <div>
          <span className="eyebrow">{t('YOUR FUTURE, ONE STEP AT A TIME')}</span>
          <h2>
            {t('Small steps.')}
            <br />
            <span className="grad">{t('Extraordinary growth.')}</span>
          </h2>
          <p>
            {t(
              'You don’t need to have everything figured out. Just start with one goal, one session, and one step forward.'
            )}
          </p>
          <button
            className="btn"
            onClick={() => goToStep('material')}
          >
            {t('Begin your journey')} <span>→</span>
          </button>
        </div>

        <div className="jart" aria-hidden="true">
          <div className="jo j1" />
          <div className="jo j2" />
          <div className="planet">✦</div>
        </div>
      </section>
    </div>
  );
};
