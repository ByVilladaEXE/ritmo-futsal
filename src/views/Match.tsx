import { ReactNode, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { History, Pause, Play, Undo2 } from 'lucide-react';
import { Idx, useMatch } from '../store/useMatch';
import { fmt, ink, useNow } from '../lib';
import { Sheet } from '../components/Sheet';
import { sfx } from '../audio/audioEngine';

type Seq = { n: string; id: number; total: number } | null;
function useSeq() {
  const [v, setV] = useState<Seq>(null);
  const id = useRef(0);
  const tm = useRef<number[]>([]);
  const run = (from: number, end: string, endSound: () => void, tick: () => void) => {
    tm.current.forEach(clearTimeout);
    tm.current = [];
    const k = ++id.current;
    for (let i = 0; i <= from; i++) {
      tm.current.push(window.setTimeout(() => {
        if (i < from) { setV({ n: String(from - i), id: k, total: from }); tick(); }
        else { setV({ n: end, id: k, total: from }); endSound(); tm.current.push(window.setTimeout(() => setV(null), 900)); }
      }, i * 1000));
    }
  };
  return { v, run };
}

const B = ({ children, ...p }: { children: ReactNode; onClick?: () => void; disabled?: boolean }) => (
  <button {...p} className="card flex h-12 items-center justify-center gap-1 text-xs font-bold disabled:opacity-40 active:scale-95">{children}</button>
);
const NEXT = { pre: '▶ INICIAR 1T', t1: 'FIN 1T → DESCANSO', ht: '▶ INICIAR 2T', t2: 'FIN DEL PARTIDO', final: 'PARTIDO TERMINADO' };

export default function Match() {
  useNow();
  const s = useMatch();
  const { v, run } = useSeq();
  const [flash, setFlash] = useState<Idx | null>(null);
  const [tl, setTl] = useState(false);
  const [goalToast, setGoalToast] = useState<Idx | null>(null);
  const live = s.phase === 't1' || s.phase === 't2';
  const goal = (i: Idx) => {
    if (!live) return;
    s.goal(i); setFlash(i); setGoalToast(i);
    setTimeout(() => setFlash(null), 1100);
    setTimeout(() => setGoalToast(null), 4000);
  };
  const [a, b] = s.teams;
  const win = a.goals === b.goals ? null : a.goals > b.goals ? a : b;

  return (
    <div className="flex min-h-full flex-col gap-3 px-3 pb-3">
      <div className="grid grid-cols-2 gap-3">
        {([0, 1] as Idx[]).map((i) => {
          const t = s.teams[i];
          return (
            <div key={i} className="flex flex-col gap-2">
              <motion.button whileTap={{ scale: 0.94 }} disabled={!live} onClick={() => goal(i)} className="num h-40 rounded-3xl text-3xl disabled:opacity-40"
                style={{ background: `linear-gradient(160deg,${t.color},${t.color}99)`, color: ink(t.color), boxShadow: `0 0 40px ${t.color}55` }}>
                + GOL{s.flags.x2 && ' x2'}
              </motion.button>
              <button onClick={() => s.foul(i)} disabled={!live} className="card num flex h-14 items-center justify-center gap-2 disabled:opacity-40 active:scale-95">FALTA <b>{t.fouls}/{s.foulLimit}</b></button>
              {t.fouls >= s.foulLimit && (
                <motion.div animate={{ opacity: [1, 0.5, 1] }} transition={{ repeat: Infinity, duration: 0.9 }} className="rounded-xl bg-red-600 p-2 text-center text-xs font-extrabold text-white">6.ª FALTA = TIRO LIBRE SIN BARRERA (7–8m)</motion.div>
              )}
            </div>
          );
        })}
      </div>

      <AnimatePresence>
        {goalToast !== null && (
          <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} className="card fixed bottom-20 left-3 right-3 z-30 p-2">
            <div className="mb-1 text-center text-[10px] font-bold" style={{ color: s.teams[goalToast].color }}>¿QUIÉN ANOTÓ?</div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {s.roster.filter((p) => p.team === goalToast && !p.expelled).map((p) => (
                <button key={p.id} onClick={() => { s.recordGoalAuthor(goalToast, p.id); setGoalToast(null); }}
                  className="h-11 shrink-0 rounded-xl border px-3 text-sm font-bold" style={{ borderColor: s.teams[goalToast].color }}>#{p.number} {p.name}</button>
              ))}
              {s.roster.filter((p) => p.team === goalToast).length === 0 && <span className="mx-auto py-2 text-xs text-[var(--mut)]">Sin jugadores asignados</span>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {s.phase === 'final' && (
        <div className="card p-4 text-center">
          <div className="num text-2xl" style={{ color: win?.color }}>{win ? `¡GANA ${win.name}!` : 'EMPATE'}</div>
          <p className="mt-1 text-sm text-[var(--mut)]">{win ? `Penitencia para ${(win === a ? b : a).name}.` : 'Define por shootouts.'}</p>
        </div>
      )}

      <div className="mt-auto grid gap-2">
        <button onClick={s.toggle} disabled={!live} className="num flex h-16 items-center justify-center gap-2 rounded-2xl bg-white text-2xl text-black disabled:opacity-40 active:scale-95">
          {s.running ? <><Pause /> PAUSA</> : <><Play /> PLAY</>}
        </button>
        <div className="grid grid-cols-3 gap-2">
          <B onClick={() => run(3, '¡3S!', sfx.short, sfx.beep)}>ZONA 3s</B>
          <B onClick={() => run(3, '¡PITO!', sfx.short, sfx.beep)}>SAQUE 3-2-1</B>
          <B onClick={() => run(4, '¡FIN!', sfx.short, sfx.tick)}>CRONO 4s</B>
          <B onClick={s.undo} disabled={!s.history.length}><Undo2 size={16} /> DESHACER</B>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <B onClick={() => s.adjust(-10000)} disabled={!live}>−10s</B>
          <B onClick={() => s.adjust(10000)} disabled={!live}>+10s</B>
          <B onClick={() => setTl(true)}><History size={16} /> LÍNEA</B>
        </div>
        <button onClick={s.next} disabled={s.phase === 'final'} className="num h-14 rounded-2xl border-2 border-[var(--fg)] text-lg disabled:opacity-40 active:scale-95">{NEXT[s.phase]}</button>
      </div>

      <AnimatePresence>
        {flash !== null && (
          <motion.div key="g" className="pointer-events-none fixed inset-x-0 top-1/3 z-40 text-center" initial={{ scale: 0.3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0, y: -30 }}>
            <span className="num text-7xl" style={{ color: s.teams[flash].color, textShadow: `0 0 40px ${s.teams[flash].color}` }}>¡GOOOL!</span>
          </motion.div>
        )}
      </AnimatePresence>

      {v && (
        <div className="pointer-events-none fixed inset-0 z-40 grid place-items-center">
          <div className="relative grid place-items-center">
            <svg width="220" height="220" className="absolute -rotate-90">
              <circle cx="110" cy="110" r="100" fill="none" stroke="currentColor" strokeOpacity=".15" strokeWidth="10" />
              <circle key={v.id} cx="110" cy="110" r="100" fill="none" stroke="currentColor" strokeWidth="10" strokeLinecap="round" pathLength={1} strokeDasharray={1} style={{ animation: `ring ${v.total}s linear forwards` }} />
            </svg>
            <motion.span key={v.n} className="num text-7xl" initial={{ scale: 1.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>{v.n}</motion.span>
          </div>
        </div>
      )}

      <Sheet open={tl} onClose={() => setTl(false)}>
        <h3 className="num mb-3 text-xl">LÍNEA DE TIEMPO</h3>
        {s.events.length === 0 && <p className="text-sm text-[var(--mut)]">Aún no hay eventos. Inicia el partido para registrarlos.</p>}
        {[...s.events].reverse().map((e) => (
          <div key={e.id} className="flex gap-3 border-b border-[var(--line)] py-2 text-sm"><span className="num text-[var(--mut)]">{fmt(e.at)}</span>{e.text}</div>
        ))}
      </Sheet>
    </div>
  );
}
