import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Crown, Shuffle, Trash2, UserPlus } from 'lucide-react';
import { Idx, RosterTeam, useMatch } from '../store/useMatch';
import { Sheet } from '../components/Sheet';

export default function Plantilla() {
  const s = useMatch();
  const [internal, setInternal] = useState<'-1' | '0' | '1'>('0');
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const [paste, setPaste] = useState('');
  const [pasteOpen, setPasteOpen] = useState(false);
  const [edit, setEdit] = useState<string | null>(null);
  const [roulette, setRoulette] = useState('');
  const [spinning, setSpinning] = useState(false);
  const [draftTurn, setDraftTurn] = useState<0 | 1>(0);

  const team = Number(internal) as RosterTeam;
  const players = s.roster.filter((p) => p.team === team);

  const runCaptain = (i: Idx) => {
    const candidates = s.roster.filter((p) => p.team === i && !p.expelled);
    if (!candidates.length) return;
    setSpinning(true);
    let n = 0;
    const id = window.setInterval(() => setRoulette(candidates[n++ % candidates.length].name), 70);
    window.setTimeout(() => {
      clearInterval(id);
      s.drawCaptain(i);
      setRoulette(s.roster.find((p) => p.team === i && p.captain)?.name || candidates[0].name);
      setSpinning(false);
    }, 1000);
  };

  const add = () => {
    if (!name.trim()) return;
    s.addPlayer(name, team, number ? Number(number) : undefined);
    setName('');
    setNumber('');
  };

  return (
    <div className="grid gap-3 px-3 pb-4">
      <div className="grid grid-cols-3 gap-2">
        {([
          ['0', 'EQUIPO A'], ['1', 'EQUIPO B'], ['-1', 'COMODÍN']
        ] as const).map(([k, label]) => (
          <button key={k} onClick={() => setInternal(k)} className={`num h-12 rounded-xl text-xs ${internal === k ? 'text-black' : 'card'}`}
            style={internal === k ? { background: k === '-1' ? '#e2e8f0' : s.teams[Number(k) as 0 | 1].color } : undefined}>{label}</button>
        ))}
      </div>

      <div className="card p-3">
        <div className="grid grid-cols-[1fr_72px_56px] gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} placeholder="Nombre del jugador" className="min-w-0 rounded-xl border border-[var(--line)] bg-transparent px-3 outline-none" />
          <input value={number} onChange={(e) => setNumber(e.target.value.replace(/\D/g, '').slice(0, 2))} inputMode="numeric" placeholder="#" className="rounded-xl border border-[var(--line)] bg-transparent text-center outline-none" />
          <button onClick={add} aria-label="Añadir jugador" className="grid h-12 place-items-center rounded-xl bg-[var(--fg)] text-[var(--bg)]"><UserPlus size={20} /></button>
        </div>
        <button onClick={() => setPasteOpen(true)} className="num mt-2 h-11 w-full rounded-xl border border-[var(--line)] text-xs">PEGAR LISTA</button>
      </div>

      {team !== -1 && (
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <div className="card num grid h-12 place-items-center text-sm">{roulette || 'CAPITÁN POR SORTEO'}</div>
          <button onClick={() => runCaptain(team as 0 | 1)} disabled={spinning} className="h-12 rounded-xl px-4 font-bold" style={{ background: s.teams[team as 0 | 1].color, color: 'white' }}><Shuffle className="mr-1 inline" size={17} /> SORTear</button>
        </div>
      )}

      {team === -1 && (
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => s.balanceDraft()} className="num card h-14 border-cyan-400/60 text-cyan-300"><Shuffle className="mr-1 inline" size={16} /> MEZCLAR</button>
          <button onClick={() => {
            const player = s.roster.find((p) => p.team === -1);
            if (player) { s.movePlayer(player.id, draftTurn); setDraftTurn(draftTurn === 0 ? 1 : 0); }
          }} className="num h-14 rounded-xl bg-white text-black">1-A-1 · → {draftTurn === 0 ? 'A' : 'B'}</button>
        </div>
      )}

      <motion.div layout className="grid gap-2">
        <AnimatePresence mode="popLayout">
          {players.map((p) => (
            <motion.article layout key={p.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.85, x: 30 }}
              className="card flex min-h-16 items-center gap-2 p-2"
              style={{ borderColor: p.captain ? '#facc15' : p.team === -1 ? 'var(--line)' : s.teams[p.team].color, boxShadow: p.captain ? '0 0 24px rgba(250,204,21,.18)' : undefined }}>
              <button onClick={() => s.setCaptain(p.id)} disabled={p.team === -1 || p.expelled} className="grid h-11 w-11 place-items-center rounded-full" style={{ background: p.captain ? '#facc15' : 'var(--line)' }}>
                <Crown size={20} style={{ color: p.captain ? '#1c1600' : 'var(--mut)' }} />
              </button>
              <button onClick={() => setEdit(p.id)} className="min-w-0 flex-1 text-left">
                <div className="flex items-center gap-2"><span className="num text-lg">#{p.number}</span><b className="truncate">{p.name}</b></div>
                <div className="mt-1 flex gap-1 text-[10px]">
                  {p.captain && <span className="rounded-full bg-yellow-400 px-2 py-0.5 text-black">CAPITÁN</span>}
                  {p.goals > 0 && <span className="rounded-full bg-cyan-400 px-2 py-0.5 text-black">{p.goals} GOLES</span>}
                  {(p.yellows || 0) > 0 && <span className="rounded-full bg-yellow-400/30 px-2 py-0.5">🟨 {p.yellows}</span>}
                  {p.expelled ? <span className="rounded-full bg-red-600 px-2 py-0.5 text-white">EXPULSADO</span> : <button onClick={(e) => { e.stopPropagation(); s.editPlayer(p.id, { onField: !p.onField }); }} className={`rounded-full px-2 py-0.5 ${p.onField ? 'bg-emerald-400 text-black' : 'border border-[var(--line)]'}`}>{p.onField ? 'EN CANCHA' : 'SUPLENTE'}</button>}
                </div>
              </button>
              <button onClick={() => s.movePlayer(p.id, p.team === 0 ? 1 : p.team === 1 ? -1 : 0)} aria-label="Mover jugador" className="grid h-11 w-11 place-items-center rounded-xl border border-[var(--line)]">⇄</button>
              <button onClick={() => s.removePlayer(p.id)} aria-label="Eliminar" className="grid h-11 w-11 place-items-center text-red-400"><Trash2 size={18} /></button>
            </motion.article>
          ))}
        </AnimatePresence>
      </motion.div>
      {players.length === 0 && <div className="card p-8 text-center text-sm text-[var(--mut)]">No hay jugadores en esta zona.</div>}

      <Sheet open={pasteOpen} onClose={() => setPasteOpen(false)}>
        <h3 className="num text-xl">PEGAR LISTA</h3>
        <textarea value={paste} onChange={(e) => setPaste(e.target.value)} rows={7} placeholder={'Nombres separados por coma o salto de línea'} className="mt-3 w-full resize-none rounded-2xl border border-[var(--line)] bg-transparent p-3 outline-none" />
        <button onClick={() => { s.addPlayers(paste, team); setPaste(''); setPasteOpen(false); }} className="num mt-3 h-14 w-full rounded-2xl bg-[var(--fg)] text-[var(--bg)]">CREAR JUGADORES</button>
      </Sheet>

      <Sheet open={edit !== null} onClose={() => setEdit(null)}>
        {edit && (() => {
          const p = s.roster.find((x) => x.id === edit);
          return p ? <>
            <h3 className="num text-xl">EDITAR JUGADOR</h3>
            <input value={p.name} onChange={(e) => s.editPlayer(p.id, { name: e.target.value })} className="mt-3 h-12 w-full rounded-xl border border-[var(--line)] bg-transparent px-3 outline-none" />
            <input value={p.number} onChange={(e) => s.editPlayer(p.id, { number: Number(e.target.value) || 0 })} inputMode="numeric" className="mt-2 h-12 w-full rounded-xl border border-[var(--line)] bg-transparent px-3 outline-none" />
            <button onClick={() => setEdit(null)} className="num mt-3 h-14 w-full rounded-2xl bg-[var(--fg)] text-[var(--bg)]">LISTO</button>
          </> : null;
        })()}
      </Sheet>
    </div>
  );
}
