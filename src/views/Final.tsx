import { useEffect, useRef, useState } from 'react';
import { Check, Play, RotateCcw } from 'lucide-react';
import { useMatch } from '../store/useMatch';
import { sfx, vib } from '../audio/audioEngine';

export default function Final() {
  const s = useMatch();
  const [rounds, setRounds] = useState<1 | 2>(1);
  const [done, setDone] = useState<number[]>([]);
  const [plan, setPlan] = useState(false);
  const [seconds, setSeconds] = useState(30);
  const [running, setRunning] = useState(false);
  const end = useRef(0);
  const [a, b] = s.teams;
  const winner = a.goals === b.goals ? null : a.goals > b.goals ? a : b;
  const loser = winner === a ? b : a;
  const mvp = [...s.roster].filter((p) => p.goals > 0).sort((x, y) => y.goals - x.goals)[0];
  const exercises = [
    '20 sentadillas',
    '15 flexiones de pecho',
    '30 segundos de plancha abdominal',
    '10 burpees',
  ];

  useEffect(() => {
    if (!running) return;
    end.current = Date.now() + seconds * 1000;
    const id = window.setInterval(() => {
      const n = Math.max(0, Math.ceil((end.current - Date.now()) / 1000));
      setSeconds(n);
      if (n <= 5 && n > 0) sfx.countdownFast();
      if (n === 0) { clearInterval(id); setRunning(false); sfx.final(); vib([300, 100, 300]); }
    }, 100);
    return () => clearInterval(id);
  }, [running]);

  const total = rounds * exercises.length;
  const progress = done.length;

  return (
    <div className="grid gap-3 px-3 pb-4">
      <section className="card p-5 text-center" style={{ borderColor: winner?.color }}>
        <div className="num text-4xl" style={{ color: winner?.color }}>{winner ? `VICTORIA ${winner.name}` : 'EMPATE'}</div>
        <div className="num mt-2 text-6xl">{a.goals}<span className="text-[var(--mut)]"> — </span>{b.goals}</div>
        {winner && <p className="mt-2 text-sm text-[var(--mut)]">{loser.name} completa la penitencia.</p>}
        {mvp && <div className="mt-3 rounded-xl border border-yellow-400/60 bg-yellow-400/10 p-3"><div className="text-xs font-bold text-yellow-300">GOLEADOR / MVP</div><div className="num mt-1 text-2xl">#{mvp.number} {mvp.name} · {mvp.goals}</div></div>}
      </section>
      {winner && (
        <section className="card p-3">
          <div className="mb-3 flex items-center justify-between">
            <div className="num text-lg">PENITENCIA SENA</div>
            <div className="grid grid-cols-2 gap-1">
              {([1, 2] as const).map((n) => <button key={n} onClick={() => setRounds(n)} className={`num h-10 rounded-lg px-3 ${rounds === n ? 'bg-white text-black' : 'card'}`}>{n} Ronda</button>)}
            </div>
          </div>
          <div className="mb-3 h-2 overflow-hidden rounded-full bg-[var(--line)]"><div className="h-full bg-emerald-400 transition-all" style={{ width: `${progress / total * 100}%` }} /></div>
          {exercises.map((name, i) => (
            <button key={name} onClick={() => setDone((p) => p.includes(i) ? p.filter((x) => x !== i) : [...p, i])} className="mb-2 flex h-14 w-full items-center gap-3 rounded-2xl border border-[var(--line)] px-3 text-left">
              <span className="grid h-8 w-8 place-items-center rounded-full" style={{ background: done.includes(i) ? '#34d399' : 'var(--line)', color: done.includes(i) ? '#05130d' : 'inherit' }}>{done.includes(i) && <Check size={18} />}</span>
              <b>{name}</b>
            </button>
          ))}
          {plan && (
            <div className="mb-2 rounded-2xl border border-[var(--line)] p-3 text-center">
              <div className="num text-5xl">{seconds}<small className="text-base">s</small></div>
              <button onClick={() => { setSeconds(30); setRunning(true); sfx.beep(); }} className="num mt-2 h-12 w-full rounded-xl bg-white text-black"><Play size={16} className="mr-1 inline" /> Iniciar 30s</button>
            </div>
          )}
          <button onClick={() => setPlan((v) => !v)} className="card num h-12 w-full">TEMPORIZADOR DE PLANCHA</button>
        </section>
      )}
      <button onClick={() => s.reset()} className="card num h-14"><RotateCcw size={18} className="mr-2 inline" /> NUEVO PARTIDO</button>
    </div>
  );
}
