import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Dices, Eye, LockKeyhole, Zap } from 'lucide-react';
import { CardKind, Idx, useMatch } from '../store/useMatch';
import { sfx, vib } from '../audio/audioEngine';
import { Sheet } from '../components/Sheet';

const CARD_INFO: Record<CardKind, { name: string; short: string }> = {
  shootout: { name: 'Shootout', short: 'Pateo de precisión desde 2/3' },
  double: { name: 'Gol Doble', short: 'Tus goles valen x2 por 2:00' },
  sanction: { name: 'Sanción', short: 'Uno menos rival por 2:00' },
  steal: { name: 'Robo de Carta', short: 'Roba el arma rival si no fue usada' },
  wildcard: { name: 'Comodín', short: 'Elige shootout, sanción o gol doble' },
};

export default function Cards() {
  const s = useMatch();
  const [rolling, setRolling] = useState(false);
  const [result, setResult] = useState(s.diceFormat);
  const [rot, setRot] = useState({ x: -24, y: 38 });
  const [revealed, setRevealed] = useState<Idx | null>(null);
  const [force, setForce] = useState<Idx | null>(null);
  const [wild, setWild] = useState<Idx | null>(null);
  const rollTimers = useRef<number[]>([]);

  const roll = () => {
    if (rolling) return;
    setRolling(true);
    sfx.diceRiser();
    setRot({ x: rot.x + 720, y: rot.y + 900 });
    const faces = ['2 vs 2', '3 vs 3', '4 vs 4', '2 vs 2', '3 vs 3', '4 vs 4'];
    let n = 0;
    rollTimers.current.forEach(clearInterval);
    rollTimers.current = [];
    const id = window.setInterval(() => {
      const face = faces[n++ % faces.length];
      setResult(face);
      sfx.tick();
    }, 90);
    rollTimers.current.push(id);
    window.setTimeout(() => {
      clearInterval(id);
      const face = faces[Math.floor(Math.random() * faces.length)];
      setResult(face); s.rollDice(face); setRolling(false);
      sfx.alarm(); vib([120, 50, 120]);
    }, 1800);
  };

  const deal = () => {
    const deck: CardKind[] = ['shootout', 'double', 'sanction', 'steal', 'wildcard'];
    const a = deck[Math.floor(Math.random() * deck.length)];
    let b = deck[Math.floor(Math.random() * deck.length)];
    s.dealCards(a, b);
  };

  return (
    <div className="grid gap-4 px-3 pb-4">
      <section className="card relative overflow-hidden p-4 text-center">
        <div className="num mb-3 text-sm" style={{ color: '#67e8f9' }}>{s.diceFormat ? `FORMATO ACTIVO · ${s.diceFormat}` : 'DADO DE FORMATO'}</div>
        <motion.div
          className="dice mx-auto"
          animate={{ rotateX: rot.x, rotateY: rot.y, scale: rolling ? [1, 1.08, 1] : 1 }}
          transition={{ duration: rolling ? 1.8 : 0.5, ease: 'easeOut' }}
        >
          <div className="dice-face"><span>{result?.replace(' vs ', '') || '·'}</span></div>
        </motion.div>
        <AnimatePresence>{result && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="num mt-3 text-2xl">{rolling ? 'LANZANDO...' : result}</motion.div>}</AnimatePresence>
        <button onClick={roll} disabled={rolling} className="num mt-3 h-14 w-full rounded-2xl bg-cyan-300 text-lg text-black disabled:opacity-60">
          <Dices className="mr-2 inline" size={22} /> {rolling ? 'Girando' : 'LANZAR DADO'}
        </button>
      </section>

      <section className="grid grid-cols-2 gap-3">
        {([0, 1] as Idx[]).map((i) => {
          const card = s.cards[i];
          const info = card.kind ? CARD_INFO[card.kind] : null;
          return (
            <div key={i} className="card p-3" style={{ borderColor: s.teams[i].color }}>
              <div className="num mb-2 truncate" style={{ color: s.teams[i].color }}>{s.teams[i].name}</div>
              {info ? (
                <>
                  <button
                    className="secret-card relative h-44 w-full"
                    onPointerDown={() => setRevealed(i)}
                    onPointerUp={() => setRevealed(null)}
                    onPointerLeave={() => setRevealed(null)}
                    onPointerMove={(e) => {
                      const r = e.currentTarget.getBoundingClientRect();
                      const x = ((e.clientX - r.left) / r.width - 0.5) * 14;
                      const y = ((e.clientY - r.top) / r.height - 0.5) * -14;
                      e.currentTarget.style.setProperty('--tilt-x', `${y}deg`);
                      e.currentTarget.style.setProperty('--tilt-y', `${x}deg`);
                    }}
                  >
                    <motion.div className="secret-inner" animate={{ rotateY: revealed === i ? 180 : 0 }} transition={{ type: 'spring', stiffness: 260, damping: 22 }}>
                      <div className="secret-front"><LockKeyhole /><span>MANTENÉ</span></div>
                      <div className="secret-back" style={{ background: `linear-gradient(145deg,${s.teams[i].color},#111827)` }}>
                        {i === revealed ? null : null}<Eye size={20} /><b>{info.name}</b><small>{info.short}</small>
                      </div>
                    </motion.div>
                  </button>
                  <button disabled={card.used} onClick={() => card.kind === 'wildcard' ? setWild(i) : setForce(i)} className="num mt-2 h-12 w-full rounded-xl border border-[var(--line)] disabled:opacity-40">
                    <Zap size={16} className="mr-1 inline" /> {card.used ? 'USADA' : 'ACTIVAR'}
                  </button>
                </>
              ) : <button onClick={() => deal()} className="card h-44 w-full text-sm text-[var(--mut)]">Repartir carta</button>}
            </div>
          );
        })}
      </section>

      <Sheet open={force !== null} onClose={() => setForce(null)}>
        <h3 className="num text-xl">¿ACTIVAR ARMA SECRETA?</h3>
        <p className="mt-2 text-sm text-[var(--mut)]">El efecto se aplicará ahora y la carta quedará usada.</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button onClick={() => setForce(null)} className="card num h-14">CANCELAR</button>
          <button onClick={() => { if (force !== null) s.activateCard(force, true); setForce(null); }} className="num h-14 rounded-2xl bg-white text-black">ACTIVAR</button>
        </div>
      </Sheet>
      <Sheet open={wild !== null} onClose={() => setWild(null)}>
        <h3 className="num text-xl">ELEGÍ EL PODER</h3>
        <div className="mt-3 grid gap-2">
          {([
            ['shootout', 'Shootout desde 2/3'],
            ['sanction', 'Sanción 2:00'],
            ['double', 'Gol Doble 2:00'],
          ] as const).map(([power, label]) => (
            <button key={power} onClick={() => { if (wild !== null) s.activateWildcard(wild, power); setWild(null); }} className="num card h-14">{label}</button>
          ))}
        </div>
      </Sheet>
    </div>
  );
}
