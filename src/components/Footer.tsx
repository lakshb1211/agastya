import React from 'react';
import { useApp } from '../context/AppContext';

export const Footer: React.FC = () => {
  const { go, t } = useApp();

  return (
    <footer className="footer container">
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
      <p>{t('Made for curious minds. Built for brighter futures.')}</p>
      <span className="fs2">✧</span>
    </footer>
  );
};
