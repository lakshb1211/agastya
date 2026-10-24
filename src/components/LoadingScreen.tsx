import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';

export const LoadingScreen: React.FC = () => {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);
  const { t } = useApp();

  const dismiss = () => {
    setFading(true);
    setTimeout(() => {
      setVisible(false);
    }, 350);
  };

  useEffect(() => {
    const timer = setTimeout(dismiss, 1100);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`sl ${fading ? 'out' : ''}`}
      id="sl"
      role="status"
      aria-live="polite"
      aria-label="Loading"
      onClick={dismiss}
      style={{ cursor: 'pointer' }}
    >
      <div className="sl-stage">
        <div className="sl-scene">
          <div className="sl-planet sl-a"></div>
          <div className="sl-planet sl-b"></div>
          <div className="sl-star">
            <div className="sl-comet"></div>
          </div>
        </div>
      </div>
      <div className="sl-wish">{t('make a wish until the star reaches')}</div>
    </div>
  );
};
