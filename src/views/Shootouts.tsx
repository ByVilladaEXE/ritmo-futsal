import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { RotateCcw, Target } from 'lucide-react';
import { Idx, useMatch } from '../store/useMatch';
import { sfx, vib } from '../audio/audioEngine';

type Mode = 'rounds' | 'instant';

export default function Shootouts() {
  const s = useMatch();
  const [mode, setMode] = useState<Mode>('rounds');
  const [started, setStarted] = useState(false);
  const [turn, setTurn] = useState<Idx>(0);
  const [round, setRound] = useState(0);
  const [scores, setScores] = useState<[number, number]>([0, 0]);
  const [roundResult, setRoundResult] = useState<[boolean | null, boolean | null]>([null, null]);
  const [orders, setOrders] = useState<[string[], string[]]>(() => [
    s.roster.filter((p) => p.team === 0 && !p.expelled).map((p) => p.id),
    s.roster.filter((p) => p.team === 1 && !p.expelled).map((p) => p.id),
  ]);
  const [left, setLeft] = useState(5);
  const [running, setRunning] = useState(false);
  const end = useRef(0);

  useEffect(() => {
    if (!running) return;
    end.current = performance.now() + 5000;
    const id = window.setInterval(() => {
      const ms = Math.max(0, end.current - performance.now());
      setLeft(ms / 1000);
      if (ms <= 3000 && ms > 2900) sfx.beep();
      if (ms <= 0) { clearInterval(id); setRunning(false); sfx.final(); vib([250, 80, 250]); }
    }, 50);
    return () => clearInterval(id);
  }, [running]);

  const winner: Idx | null = mode === 'rounds'
    ? roundResult[0] !== null && roundResult[1] !== null
      ? roundResult[0] !== roundResult[1] ? (roundResult[0] ? 0 : 1) : null
      : null
    : null;

  const record = (goal: boolean) => {
    if (!started || winner !== null) return;
    if (mode === 'instant') {
      if (!goal) {
        setWinnerInstant(turn === 0 ? 1 : 0);
      } else {
        setScores((p) => [p[0] + (turn === 0 ? 1 : 0), p[1] + (turn === 1 ? 1 : 0)]);
      }
      setTurn(turn === 0 ? 1 : 0);
      setRunning(false); setLeft(5);
      return;
    }

    setRoundResult((p) => turn === 0 ? [goal, p[1]] : [p[0], goal]);
    if (goal) setScores((p) => [p[0] + (turn === 0 ? 1 : 0), p[1] + (turn === 1 ? 1 : 0)]);
    setRunning(false); setLeft(5);
    if (turn === 0) { setTurn(1); setRoundResult([goal, null]); }
    else {
      if (roundResult[0] !== null && roundResult[0] !== goal) setWinnerInstant(goal ? 1 : 0);
      setTurn(0); setRound((r) => r + 1); setRoundResult([null, null]);
    }
  };

  const [instantWinner, setWinnerInstant] = useState<Idx | null>(null);
  const finalWinner = instantWinner ?? winner;
  const currentId = orders[turn][Math.floor(round)];
  const currentPlayer = s.roster.find((p) => p.id === currentId);

  const move = (team: Idx, index: number, delta: number) => {
    setOrders((p) => {
      const copy: [string[], string[]] = [[...p[0]], [...p[1]]];
      const target = index + delta;
      if (target < 0 || target >= copy[team].length) return p;
      [copy[team][index], copy[team][target]] = [copy[team][target], copy[team][index]];
      return copy;
    });
  };

  const reset = () => {
    setStarted(false); setTurn(0); setRound(0); setScores([0, 0]); setRoundResult([null, null]); setWinnerInstant(null); setRunning(false); setLeft(5);
  };

  return (
    <div className="grid gap-3 px-3 pb-4">
      {!started && (
        <>
          <div className="card p-3">
            <div className="num mb-2">MODO DE ELIMINACIÓN</div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setMode('rounds')} className={`h-14 rounded-xl text-xs font-bold ${mode === 'rounds' ? 'bg-white text-black' : 'border border-[var(--line)]'}`}>POR RONDAS IGUALES<br /><small>Recomendado</small></button>
              <button onClick={() => setMode('instant')} className={`h-14 rounded-xl text-xs font-bold ${mode === 'instant' ? 'bg-red-600 text-white' : 'border border-[var(--line)]'}`}>FALLO INSTANTÁNEO</button>
            </div>
          </div>
          {([0, 1] as Idx[]).map((team) => (
            <div key={team} className="card p-3">
              <div className="num mb-2" style={{ color: s.teams[team].color }}>{s.teams[team].name} · ORDEN</div>
              {orders[team].map((id, index) => {
                const p = s.roster.find((x) => x.id === id);
                return p ? (
                  <div key={id} className="mb-1 flex h-12 items-center gap-2 rounded-xl border border-[var(--line)] px-2">
                    <span className="num w-7">{index + 1}</span><b className="min-w-0 flex-1 truncate">#{p.number} {p.name}</b>
                    <button onClick={() => move(team, index, -1)} className="h-10 w-10 rounded-lg border border-[var(--line)]">↑</button>
                    <button onClick={() => move(team, index, 1)} className="h-10 w-10 rounded-lg border border-[var(--line)]">↓</button>
                  </div>
                ) : null;
              })}
            </div>
          ))}
          <button onClick={() => setStarted(true)} disabled={!orders[0].length || !orders[1].length} className="num h-16 rounded-2xl bg-white text-xl text-black disabled:opacity-40">INICIAR DESAFÍO 2/3</button>
        </>
      )}

      {started && finalWinner === null && (
        <>
          <div className="card p-4 text-center">
            <div className="num text-sm" style={{ color: s.teams[turn].color }}>RONDA {round + 1} · TURNO</div>
            <div className="num mt-1 text-3xl">{currentPlayer?.name || 'Jugador'} — Equipo {turn === 0 ? 'A' : 'B'}</div>
            <motion.div className="num my-3 text-7xl" animate={left < 3 ? { scale: [1, 1.06, 1] } : undefined} transition={{ repeat: left < 3 ? Infinity : 0, duration: 0.7 }}>{left.toFixed(1)}<small className="text-xl">s</small></motion.div>
            <div className="h-2 overflow-hidden rounded-full bg-[var(--line)]"><motion.div className="h-full bg-cyan-300" animate={{ width: `${left / 5 * 100}%` }} /></div>
            <button onClick={() => { setLeft(5); setRunning(true); sfx.beep(); }} disabled={running} className="num mt-3 h-12 w-full rounded-xl border border-[var(--line)]"><Target className="mr-1 inline" size={18} /> {running ? 'CRONÓMETRO ACTIVO' : 'INICIAR 5.0 SEG'}</button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => record(true)} className="num h-16 rounded-2xl text-xl text-black" style={{ background: s.teams[turn].color }}>¡GOL!</button>
            <button onClick={() => record(false)} className="num card h-16 text-xl">FALLO</button>
          </div>
        </>
      )}

      {finalWinner !== null && (
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="num card p-6 text-center text-3xl" style={{ borderColor: s.teams[finalWinner].color, color: s.teams[finalWinner].color }}>
          ¡GANA {s.teams[finalWinner].name}!
        </motion.div>
      )}
      <button onClick={reset} className="card num h-12"><RotateCcw size={16} className="mr-1 inline" /> Reiniciar desafío</button>
    </div>
  );
}
