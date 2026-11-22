import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useMatch } from '../store/useMatch';

export function EffectsLayer() {
  const s = useMatch();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!s.effect) return;
    const team = s.effect.team;
    const color = team === null ? '#67e8f9' : s.teams[team].color;
    if (s.fx === 'full' && (s.effect.kind === 'goal' || s.effect.kind === 'x2')) {
      void confetti({ particleCount: s.effect.kind === 'x2' ? 130 : 70, spread: 80, origin: { y: 0.42 }, colors: [color, '#ffffff', '#facc15'] });
    }
    const id = window.setTimeout(() => s.clearEffect(), 2400);
    return () => clearTimeout(id);
  }, [s.effect, s.fx, s.teams, s.clearEffect]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || s.fx !== 'full') return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let frame = 0;
    let active = true;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);
    const particles = Array.from({ length: 18 }, (_, i) => ({
      x: (i * 83) % canvas.clientWidth,
      y: (i * 47) % canvas.clientHeight,
      r: 1 + (i % 3),
      speed: 0.06 + (i % 5) * 0.025,
    }));
    const draw = () => {
      if (!active) return;
      ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
      particles.forEach((p, i) => {
        p.y -= p.speed;
        if (p.y < -5) p.y = canvas.clientHeight + 5;
        const color = i % 2 ? s.teams[0].color : s.teams[1].color;
        ctx.globalAlpha = 0.16;
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      });
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => { active = false; cancelAnimationFrame(frame); window.removeEventListener('resize', resize); };
  }, [s.fx, s.teams]);

  return (
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
      {s.fx === 'full' && <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />}
      <AnimatePresence>
        {s.effect && (
          <motion.div key={s.effect.id}
            initial={{ x: '-110%', skewX: -12, opacity: 0 }}
            animate={{ x: ['-110%', '8%', '-4%', '0%'], skewX: [-12, 8, -2, 0], opacity: [0, 1, 1, 1] }}
            exit={{ x: '110%', opacity: 0 }}
            transition={{ duration: s.effect.kind === 'goal' || s.effect.kind === 'x2' ? 0.7 : 0.45, times: [0, 0.55, 0.75, 1] }}
            className="num absolute left-0 right-0 top-[26%] mx-auto w-[92%] rounded-xl px-4 py-4 text-center text-3xl"
            style={{
              background: s.effect.team === null ? 'linear-gradient(90deg,#0e7499,#7c3aed)' : `linear-gradient(90deg,${s.teams[s.effect.team].color},#111827)`,
              boxShadow: `0 12px 60px ${s.effect.team === null ? '#22d3ee' : s.teams[s.effect.team].color}88`,
            }}>
            {s.effect.text}
          </motion.div>
        )}
      </AnimatePresence>
      {s.effect && <motion.div initial={{ scale: 0, opacity: 0.8 }} animate={{ scale: 4, opacity: 0 }} transition={{ duration: 0.9 }}
        className="absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border-4"
        style={{ borderColor: s.effect.team === null ? '#67e8f9' : s.teams[s.effect.team].color }} />}
    </div>
  );
}
