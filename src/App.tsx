import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Dices, Flag, Settings, Target, Timer, Users } from 'lucide-react';
import { useMatch } from './store/useMatch';
import { unlock } from './audio/audioEngine';
import { Hud } from './components/Hud';
import { Sheet } from './components/Sheet';
import Match from './views/Match';
import Sanctions from './views/Sanctions';
import Setup from './views/Setup';
import Cards from './views/Cards';
import Shootouts from './views/Shootouts';
import Final from './views/Final';
import Plantilla from './views/Plantilla';
import { EffectsLayer } from './components/EffectsLayer';

const TABS = [
  { k: 'match', l: 'Partido', I: Timer },
  { k: 'cards', l: 'Cartas & Dado', I: Dices },
  { k: 'sanc', l: 'Sanciones', I: Flag },
  { k: 'shoot', l: 'Shootouts', I: Target },
  { k: 'roster', l: 'Plantilla', I: Users },
  { k: 'setup', l: 'Setup', I: Settings },
] as const;
type Tab = (typeof TABS)[number]['k'];

const g = (a: string, b: string) => `radial-gradient(80% 45% at 12% 0%,${a}66,transparent 70%),radial-gradient(80% 45% at 88% 0%,${b}66,transparent 70%)`;
const MODAL = {
  dice: ['⏱ DADO DE FORMATO', 'Lanza el dado para jugar 2v2, 3v3 o 4v4. El primer aviso ocurre al minuto 18 del 1T; el segundo al minuto 38 del 2T.'],
  x2: ['✖2 GOL DOBLE GLOBAL', 'El equipo con ventaja activa goles dobles desde el minuto 38 hasta el 40.'],
  golden: ['🏆 GOL DE ORO', 'Empate al minuto 38: el primer gol termina el partido.'],
};

export default function App() {
  const s = useMatch();
  const [tab, setTab] = useState<Tab>('match');
  const mode = s.flags.golden ? 'golden' : s.flags.x2 ? 'x2' : s.phase === 't1' && s.flags.alert1 ? 'dice' : 'normal';
  const layers: Record<string, string> = {
    normal: g(s.teams[0].color, s.teams[1].color),
    dice: 'radial-gradient(90% 60% at 50% 0%,#22d3ee77,transparent 65%),radial-gradient(70% 50% at 50% 100%,#8b5cf677,transparent 70%)',
    x2: 'radial-gradient(90% 60% at 50% 0%,#facc15aa,transparent 65%),radial-gradient(70% 40% at 50% 100%,#f59e0b66,transparent 70%)',
    golden: 'radial-gradient(90% 60% at 50% 0%,#ef4444aa,transparent 60%),radial-gradient(70% 50% at 50% 100%,#facc1577,transparent 70%)',
  };

  useEffect(() => {
    const u = () => unlock();
    window.addEventListener('pointerdown', u, { passive: true });
    const id = setInterval(() => useMatch.getState().tick(), 200);
    return () => { window.removeEventListener('pointerdown', u); clearInterval(id); };
  }, []);

  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    const ask = async () => {
      try { if ('wakeLock' in navigator && document.visibilityState === 'visible') lock = await navigator.wakeLock.request('screen'); } catch { /* sin soporte */ }
    };
    void ask();
    document.addEventListener('visibilitychange', ask);
    return () => { document.removeEventListener('visibilitychange', ask); void lock?.release().catch(() => {}); };
  }, []);

  useEffect(() => { document.documentElement.classList.toggle('sun', s.sun); }, [s.sun]);
  useEffect(() => {
    const c = s.sun ? '#ffffff' : mode === 'normal' ? '#070a14' : mode === 'dice' ? '#0b1030' : mode === 'x2' ? '#2a2105' : '#2a0707';
    document.querySelector('meta[name=theme-color]')?.setAttribute('content', c);
  }, [mode, s.sun]);

  useEffect(() => {
    if (s.phase !== 'final') return;
    const [a, b] = s.teams;
    const w = a.goals === b.goals ? null : a.goals > b.goals ? a : b;
    confetti({ particleCount: 180, spread: 100, origin: { y: 0.4 }, colors: w ? [w.color, '#ffffff'] : undefined });
  }, [s.phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const m = s.modal ? MODAL[s.modal] : null;
  return (
    <div className="relative flex h-dvh flex-col overflow-hidden" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      {Object.entries(layers).map(([k, bg]) => (
        <motion.div key={k} className="atm pointer-events-none absolute inset-0" style={{ background: bg }} animate={{ opacity: mode === k ? 1 : 0 }} transition={{ duration: 1 }} />
      ))}
      {s.doubleTeam !== null && s.cardEndsAt > 0 && (
        <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: s.cardEndsAt > 0 ? 1 : 0 }} className="pointer-events-none absolute inset-y-0 z-[5]"
          style={{ [s.doubleTeam === 0 ? 'left' : 'right']: 0, width: 4, background: s.teams[s.doubleTeam].color, boxShadow: `0 0 18px ${s.teams[s.doubleTeam].color}` }} />
      )}
      <Hud />
      <main className="relative z-10 flex-1 overflow-y-auto overflow-x-hidden pt-1">
        {tab === 'match' && (s.phase === 'final' ? <Final /> : <Match />)}
        {tab === 'sanc' && <Sanctions />}
        {tab === 'setup' && <Setup />}
        {tab === 'cards' && <Cards />}
        {tab === 'shoot' && <Shootouts />}
        {tab === 'roster' && <Plantilla />}
      </main>
      <EffectsLayer />
      <nav className="relative z-10 grid grid-cols-6 border-t border-[var(--line)] bg-[var(--bg)]/80 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
        {TABS.map(({ k, l, I }) => (
          <button key={k} onClick={() => setTab(k)} className="relative flex h-16 flex-col items-center justify-center gap-0.5 text-[10px] font-bold">
            {tab === k && <motion.span layoutId="tab" className="absolute inset-x-2 top-0 h-1 rounded-b bg-[var(--fg)]" />}
            <I size={22} style={{ opacity: tab === k ? 1 : 0.5 }} />{l}
          </button>
        ))}
      </nav>
      <Sheet open={!!m} onClose={s.closeModal}>
        <h3 className="num text-2xl">{m?.[0]}</h3>
        <p className="mt-2 text-[var(--mut)]">{m?.[1]}</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {s.modal === 'dice' && s.running && <button onClick={() => { s.toggle(); s.closeModal(); }} className="num h-14 rounded-2xl bg-white text-black">PAUSAR</button>}
          <button onClick={s.closeModal} className="num card h-14">ENTENDIDO</button>
        </div>
      </Sheet>
    </div>
  );
}
