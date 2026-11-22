import { useState } from 'react';
import { Idx, useMatch } from '../store/useMatch';

const COLORS = ['#ef4444', '#f97316', '#facc15', '#22c55e', '#06b6d4', '#3b82f6', '#a855f7', '#ec4899', '#ffffff'];
const RULES = [
  ['Charla previa · 2 minutos', '1. Presentación y cancha (arco 1 m x 70 cm). 2. 5 vs 5, sin portero fijo ni manos. 3. Dados al 18 y 38. 4. Zona de 1.5 m y crono de 3s. 5. Saques con pie en 4s, sin gol directo. 6. Fondo corto y sin fuera de juego. 7. 5.ª falta y libre sin barrera 7–8 m. 8. Amarilla 2m, roja 3–4m y desempate desde 2/3.'],
  ['Formato y tiempo', '40 minutos corridos: dos tiempos de 20:00. Al descanso se vuelve a 5 vs 5 y se reinician faltas acumulables. Cambios volantes ilimitados.'],
  ['Dados', 'Minuto 18:00 del 1T: primer dado 2v2, 3v3 o 4v4 hasta el descanso. Minuto 38:00 del 2T: segundo dado para los últimos 2 minutos.'],
  ['Disciplina', 'Amarilla: 2:00 fuera. Roja: expulsión definitiva y equipo con uno menos durante 3:00 o 4:00 según configuración.'],
  ['Faltas acumulables', 'Las primeras 5 faltas acumulan por equipo y tiempo. La 6.ª falta es tiro libre sin barrera desde 7–8 m, con arco sin portero.'],
  ['Cartas secretas', 'Un total de 5 cartas antes del partido: Shootout, Sanción 2:00, Gol Doble 2:00, Robo de Carta y Comodín. Solo activables en 2T entre 20 y 38 excepto decisión del árbitro.'],
  ['Desempate', 'Tanda de precisión desde 2/3 de cancha. Por rondas iguales o fallo instantáneo, según modo elegido antes de empezar.'],
];

export default function Setup() {
  const s = useMatch();
  const [armed, setArmed] = useState(false);
  const [volunteers, setVolunteers] = useState('Mateo\nJulián\nSantiago');
  const [roulette, setRoulette] = useState('');
  const [spinning, setSpinning] = useState(false);
  const drawCaptain = () => {
    const names = volunteers.split('\n').map((n) => n.trim()).filter(Boolean);
    if (!names.length) return;
    setSpinning(true);
    let n = 0;
    const id = window.setInterval(() => { setRoulette(names[n++ % names.length]); }, 70);
    window.setTimeout(() => {
      clearInterval(id);
      const name = names[Math.floor(Math.random() * names.length)];
      setRoulette(name); s.setTeam(1, { captain: name }); setSpinning(false);
    }, 1200);
  };
  return (
    <div className="grid gap-4 px-3 pb-4">
      {([0, 1] as Idx[]).map((i) => {
        const t = s.teams[i];
        return (
          <div key={i} className="card grid gap-2 p-3" style={{ borderColor: t.color }}>
            <div className="num text-lg" style={{ color: t.color }}>EQUIPO {i ? 'B' : 'A'}</div>
            <input value={t.name} onChange={(e) => s.setTeam(i, { name: e.target.value.toUpperCase() })} placeholder="Nombre del equipo" className="rounded-xl border border-[var(--line)] bg-transparent p-3 font-bold outline-none" />
            <input value={t.captain} onChange={(e) => s.setTeam(i, { captain: e.target.value })} placeholder="Capitán" className="rounded-xl border border-[var(--line)] bg-transparent p-3 outline-none" />
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button key={c} aria-label={c} onClick={() => s.setTeam(i, { color: c })} className="h-10 w-10 rounded-full" style={{ background: c, outline: t.color === c ? '3px solid var(--fg)' : 'none', outlineOffset: 2 }} />
              ))}
            </div>
          </div>
        );
      })}
      <div className="card p-3">
        <div className="num mb-2 text-lg">SORTEAR CAPITÁN B</div>
        <textarea value={volunteers} onChange={(e) => setVolunteers(e.target.value)} rows={3} placeholder={'Un voluntario por línea'} className="w-full resize-none rounded-xl border border-[var(--line)] bg-transparent p-3 outline-none" />
        <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
          <div className="card num grid h-14 place-items-center text-xl">{roulette || 'LISTO PARA SORTEAR'}</div>
          <button onClick={drawCaptain} disabled={spinning} className="num h-14 rounded-2xl bg-[var(--fg)] px-4 text-[var(--bg)] disabled:opacity-50">{spinning ? '...' : 'SORTEAR'}</button>
        </div>
      </div>
      <div className="card grid gap-3 p-3">
        <div className="flex items-center justify-between">
          <span className="font-bold">Duración por tiempo</span>
          <div className="num flex items-center gap-3 text-xl">
            <button onClick={() => s.setHalf(s.half / 60 - 1)} className="card h-11 w-11">−</button>{s.half / 60}:00
            <button onClick={() => s.setHalf(s.half / 60 + 1)} className="card h-11 w-11">+</button>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="font-bold">Límite de faltas</span>
          <div className="num grid h-11 w-11 place-items-center rounded-xl bg-[var(--fg)] text-[var(--bg)]">5</div>
        </div>
        <div className="flex items-center justify-between">
          <span className="font-bold">Duración de Roja</span>
          <div className="flex gap-2">
            {[180, 240].map((n) => (
              <button key={n} onClick={() => s.setRedDuration(n)} className={`num h-11 w-20 rounded-xl ${s.redDuration === n ? 'bg-[var(--fg)] text-[var(--bg)]' : 'card'}`}>{n / 60}:00</button>
            ))}
          </div>
        </div>
      </div>
      <div className="card p-3">
        <div className="num mb-1 text-lg">REGLAMENTO DE BOLSILLO</div>
        {RULES.map(([k, v]) => (
          <details key={k} className="border-b border-[var(--line)] py-2"><summary className="font-bold">{k}</summary><p className="pt-1 text-sm text-[var(--mut)]">{v}</p></details>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => s.resetMatch(true)} className="num h-14 rounded-2xl border border-[var(--line)] text-sm">NUEVO · MANTENER PLANTILLA</button>
        <button onClick={() => { if (armed) { s.resetMatch(false); setArmed(false); } else { setArmed(true); setTimeout(() => setArmed(false), 3000); } }}
          className={`num h-14 rounded-2xl text-sm ${armed ? 'bg-red-600 text-white' : 'card'}`}>
          {armed ? 'CONFIRMAR BORRADO' : 'BORRAR TODO'}
        </button>
      </div>
    </div>
  );
}
