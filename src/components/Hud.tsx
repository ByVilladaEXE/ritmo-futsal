import { motion } from 'framer-motion';
import { Moon, Sun } from 'lucide-react';
import { Idx, matchMs, periodMs, useMatch } from '../store/useMatch';
import { fmt, useNow } from '../lib';

const PH = { pre: 'PREVIA', t1: '1T', ht: 'DESCANSO', t2: '2T', final: 'FINAL' };
const livePeriodRemaining = (s: ReturnType<typeof useMatch.getState>) => s.half * 1000 - periodMs(s);

export function Hud() {
  useNow();
  const s = useMatch();
  const m = matchMs(s);
  const period = periodMs(s);
  const urgent = livePeriodRemaining(s) <= 10000;
  const Score = ({ i }: { i: Idx }) => (
    <div className="w-24 text-center">
      <div className="num text-5xl leading-none" style={{ color: s.teams[i].color, textShadow: `0 0 24px ${s.teams[i].color}88` }}>{s.teams[i].goals}</div>
      <div className="num truncate text-[11px]">{s.teams[i].name}</div>
    </div>
  );
  return (
    <header className="relative z-10 px-3 pb-2 pt-2">
      <button onClick={s.toggleSun} aria-label="Modo Sol" className="absolute right-2 top-1 p-2 opacity-70">{s.sun ? <Moon size={16} /> : <Sun size={16} />}</button>
      <button onClick={() => s.setFx(s.fx === 'full' ? 'save' : 'full')} className="absolute right-11 top-1 rounded-full border border-[var(--line)] px-2 py-1 text-[9px] font-bold">
        FX: {s.fx === 'full' ? 'FULL' : 'AHORRO'}
      </button>
      <div className="flex items-center justify-between">
        <Score i={0} />
        <div className="text-center">
          <motion.div animate={urgent ? { scale: [1, 1.06, 1], textShadow: ['0 0 0 transparent','0 0 24px #ef4444','0 0 0 transparent'] } : undefined} transition={{ repeat: urgent ? Infinity : 0, duration: 0.7 }} className="num text-5xl leading-none">{fmt(period)}</motion.div>
          <div className="num text-xs text-[var(--mut)]">{PH[s.phase]} · TOTAL {fmt(m)}</div>
        </div>
        <Score i={1} />
      </div>
      <div className="mt-2 flex flex-wrap justify-center gap-1.5">
        {s.flags.x2 && <motion.span animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 0.9 }} className="num rounded-full bg-yellow-400 px-3 text-sm text-black">GOL x2</motion.span>}
        {s.flags.golden && <motion.span animate={{ opacity: [1, 0.5, 1] }} transition={{ repeat: Infinity, duration: 0.8 }} className="num rounded-full bg-red-600 px-3 text-sm text-white">GOL DE ORO</motion.span>}
        {s.sanctions.map((x) =>
          x.ended ? (
            <motion.button key={x.id} onClick={() => s.clear(x.id)} animate={{ scale: [1, 1.08, 1] }} transition={{ repeat: Infinity, duration: 0.7 }} className="rounded-full bg-emerald-400 px-3 py-0.5 text-xs font-extrabold text-black">¡PUEDE REINGRESAR! {x.label}</motion.button>
          ) : (
            <span key={x.id} className="num rounded-full border px-2 py-0.5 text-xs" style={{ borderColor: s.teams[x.team].color }}>{x.kind === 'Y' ? '🟨' : '🟥'} {fmt(x.endAt - m)}</span>
          )
        )}
      </div>
    </header>
  );
}
