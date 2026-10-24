import React, { useEffect, useRef } from 'react';

interface StarParticle {
  x: number;
  y: number;
  r: number;
  a: number;
  s: number;
  vx: number;
  vy: number;
  g: boolean;
}

interface ShootingStar {
  x: number;
  y: number;
  l: number;
  v: number;
}

export const StarryBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const x = c.getContext('2d');
    if (!x) return;

    let S: StarParticle[] = [];
    let SH: ShootingStar[] = [];
    let raf: number;

    const size = () => {
      cancelAnimationFrame(raf);
      const u = c.parentElement || document.body;
      const w = u.offsetWidth;
      const h = u.offsetHeight;
      const d = window.devicePixelRatio || 1;

      c.width = w * d;
      c.height = h * d;
      x.setTransform(d, 0, 0, d, 0, 0);
      S = [];

      const count = Math.min(220, Math.floor((w * h) / 5000));
      for (let i = 0; i < count; i++) {
        let bx = Math.random() * w;
        let by = Math.random() * h;

        // Denser along the Milky Way band
        if (i % 2) {
          const p = Math.random() * w;
          bx = p;
          by = 170 + p * -0.25 + (Math.random() - 0.5) * 220 * Math.random() + 60;
        }

        S.push({
          x: bx,
          y: by,
          r: Math.random() * 1.3 + 0.2,
          a: Math.random(),
          s: Math.random() * 0.02 + 0.004,
          vx: (Math.random() - 0.3) * 0.18,
          vy: (Math.random() - 0.5) * 0.08,
          g: Math.random() < 0.12,
        });
      }
      draw();
    };

    const draw = () => {
      const w = c.offsetWidth;
      const h = c.offsetHeight;
      x.clearRect(0, 0, w, h);

      S.forEach((s) => {
        s.a += s.s;
        s.x += s.vx;
        s.y += s.vy;
        if (s.x > w + 4) s.x = -4;
        if (s.x < -4) s.x = w + 4;
        if (s.y > h + 4) s.y = -4;
        if (s.y < -4) s.y = h + 4;

        const o = 0.35 + 0.55 * Math.abs(Math.sin(s.a));
        x.beginPath();
        x.arc(s.x, s.y, s.r, 0, 6.283);
        x.fillStyle = s.g ? `rgba(245,205,120,${o})` : `rgba(220,225,255,${o})`;
        x.fill();
      });

      if (Math.random() < 0.012 && SH.length < 3) {
        SH.push({
          x: Math.random() * w * 0.9,
          y: Math.random() * h * 0.4,
          l: 0,
          v: 7 + Math.random() * 5,
        });
      }

      SH = SH.filter((m) => {
        m.x += m.v;
        m.y += m.v * 0.45;
        m.l++;
        const g = x.createLinearGradient(m.x, m.y, m.x - 90, m.y - 40);
        g.addColorStop(0, `rgba(255,240,200,${1 - m.l / 60})`);
        g.addColorStop(1, 'rgba(255,240,200,0)');
        x.strokeStyle = g;
        x.lineWidth = 1.6;
        x.beginPath();
        x.moveTo(m.x, m.y);
        x.lineTo(m.x - 90, m.y - 40);
        x.stroke();
        return m.l < 60;
      });

      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        raf = requestAnimationFrame(draw);
      }
    };

    size();
    window.addEventListener('resize', size);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', size);
    };
  }, []);

  return (
    <>
      <canvas ref={canvasRef} id="stars" aria-hidden="true" />
      <div className="milky" aria-hidden="true" />
    </>
  );
};
