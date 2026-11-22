import { motion } from 'framer-motion';
import { useState } from 'react';
import { X } from 'lucide-react';
import { Idx, matchMs, useMatch } from '../store/useMatch';
import { fmt, useNow } from '../lib';

export default function Sanctions() {
  useNow();
  const s = useMatch();
  const m = matchMs(s);
  const [selected, setSelected] = useState<[string | null, string | null]>([null, null]);
  return (
    <div className="grid gap-4 px-3 pb-4">
      {([0, 1] as Idx[]).map((i) => {
        const t = s.teams[i];
        const list = s.sanctions.filter((x) => x.team === i);
        return (
          <div key={i} className="card p-3" style={{ borderColor: t.color }}>
            <div className="num mb-2 text-lg" style={{ color: t.color }}>{t.name}</div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => s.sanction(i, 'Y', selected[i] || undefined)} className="h-14 rounded-2xl bg-yellow-400 font-extrabold text-black active:scale-95">🟨 AMARILLA 2:00</button>
              <button onClick={() => s.sanction(i, 'R', selected[i] || undefined)} className="h-14 rounded-2xl bg-red-600 font-extrabold text-white active:scale-95">🟥 ROJA {s.redDuration / 60}:00</button>
            </div>
            <div className="mt-2 flex gap-2 overflow-x-auto">
              {s.roster.filter((p) => p.team === i && !p.expelled).map((p) => (
                <button key={p.id} onClick={() => setSelected((v) => i === 0 ? [p.id, v[1]] : [v[0], p.id])}
                  className="h-10 shrink-0 rounded-full border px-3 text-xs font-bold"
                  style={{ borderColor: selected[i] === p.id ? t.color : 'var(--line)', background: selected[i] === p.id ? t.color : 'transparent' }}>#{p.number} {p.name}</button>
              ))}
            </div>
            {list.length === 0 && <p className="mt-3 text-center text-sm text-[var(--mut)]">Sin sanciones. Toca una tarjeta para iniciar los 2:00.</p>}
            {list.map((x) => (
              <div key={x.id} className="mt-2 flex items-center gap-2 rounded-xl border border-[var(--line)] p-2">
                <span>{x.kind === 'Y' ? '🟨' : '🟥'}</span>
                <input value={x.label} onChange={(e) => s.rename(x.id, e.target.value)} className="min-w-0 flex-1 bg-transparent text-sm font-bold outline-none" />
                {x.ended ? (
                  <motion.button animate={{ scale: [1, 1.06, 1] }} transition={{ repeat: Infinity, duration: 0.8 }} onClick={() => s.clear(x.id)} className="rounded-xl bg-emerald-400 px-3 py-2 text-xs font-extrabold text-black">¡PUEDE REINGRESAR!</motion.button>
                ) : (
                  <>
                    <span className="num text-xl">{fmt(x.endAt - m)}</span>
                    {x.kind === 'Y' && <button onClick={() => s.upgrade(x.id)} className="rounded-lg bg-red-600 px-2 py-1 text-[10px] font-bold text-white">2ª AM → ROJA</button>}
                    <button onClick={() => s.clear(x.id)} aria-label="Quitar"><X size={18} /></button>
                  </>
                )}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
