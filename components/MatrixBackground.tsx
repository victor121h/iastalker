'use client';

import { useEffect, useRef, memo, useState } from 'react';

function MatrixBackgroundComponent() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const dropsRef = useRef<number[]>([]);
  const [shouldAnimate, setShouldAnimate] = useState(true);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setShouldAnimate(false);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      const fontSize = 16;
      const columns = Math.floor(canvas.width / fontSize);
      dropsRef.current = Array(columns).fill(0).map(() => Math.random() * -50);
    };

    resize();

    const letters = 'OBSERVER01';
    const fontSize = 16;
    let lastTime = 0;
    const fps = 20;
    const frameInterval = 1000 / fps;

    const draw = (timestamp: number) => {
      if (timestamp - lastTime < frameInterval) {
        animationRef.current = requestAnimationFrame(draw);
        return;
      }
      lastTime = timestamp;

      ctx.fillStyle = 'rgba(26, 10, 46, 0.08)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.font = `${fontSize}px monospace`;

      const drops = dropsRef.current;
      for (let i = 0; i < drops.length; i++) {
        const text = letters[Math.floor(Math.random() * letters.length)];
        const x = i * fontSize;
        const y = drops[i] * fontSize;

        const hue = (i * 3 + Date.now() * 0.01) % 360;
        if (hue > 270 || hue < 30) {
          ctx.fillStyle = `rgba(193, 53, 132, 0.25)`;
        } else if (hue < 120) {
          ctx.fillStyle = `rgba(138, 43, 226, 0.25)`;
        } else {
          ctx.fillStyle = `rgba(247, 119, 55, 0.2)`;
        }
        ctx.fillText(text, x, y);

        if (y > canvas.height && Math.random() > 0.95) {
          drops[i] = 0;
        }
        drops[i]++;
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    animationRef.current = requestAnimationFrame(draw);
    window.addEventListener('resize', resize);

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  if (!shouldAnimate) {
    return null;
  }

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none opacity-15"
      style={{ zIndex: 0 }}
    />
  );
}

const MatrixBackground = memo(MatrixBackgroundComponent);
export default MatrixBackground;
