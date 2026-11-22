import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { sfx, vib } from '../audio/audioEngine';

export type Phase = 'pre' | 't1' | 'ht' | 't2' | 'final';
export type Idx = 0 | 1;
export type Kind = 'Y' | 'R';
export type Modal = null | 'dice' | 'x2' | 'golden';
export type CardKind = 'shootout' | 'sanction' | 'double' | 'steal' | 'wildcard';
export interface SecretCard { kind: CardKind | null; used: boolean }
export type RosterTeam = -1 | 0 | 1;
export interface Player {
  id: string; name: string; number: number; team: RosterTeam;
  captain: boolean; onField: boolean; expelled: boolean; goals: number;
  yellows?: number;
}
export type EffectKind = 'goal' | 'yellow' | 'red' | 'dice' | 'x2' | 'golden' | 'card';
export interface MatchEffect { id: string; kind: EffectKind; team: Idx | null; text: string }
export interface Team { name: string; captain: string; color: string; goals: number; fouls: number }
export interface Sanction { id: string; team: Idx; kind: Kind; label: string; endAt: number; ended: boolean; playerId?: string }
export interface Ev { id: string; at: number; phase: Phase; text: string }
export interface Flags { alert1: boolean; alert2: boolean; x2: boolean; golden: boolean }
interface Snap { teams: [Team, Team]; sanctions: Sanction[]; flags: Flags; events: Ev[]; phase: Phase; roster: Player[] }
interface Clock { phase: Phase; half: number; acc: number; running: boolean; t0: number | null }

export interface S extends Clock {
  teams: [Team, Team]; foulLimit: number; sanctions: Sanction[]; events: Ev[]; history: Snap[];
  flags: Flags; sun: boolean; modal: Modal;
  cards: [SecretCard, SecretCard]; diceFormat: string | null; doubleTeam: Idx | null; cardEndsAt: number;
  redDuration: number;
  roster: Player[]; fx: 'full' | 'save'; effect: MatchEffect | null;
  toggle(): void; adjust(ms: number): void; next(): void; goal(i: Idx): void; foul(i: Idx): void;
  sanction(i: Idx, k: Kind, playerId?: string): void; upgrade(id: string): void; rename(id: string, label: string): void;
  clear(id: string): void; undo(): void; setTeam(i: Idx, p: Partial<Team>): void; setHalf(min: number): void;
  setFoulLimit(n: number): void; toggleSun(): void; closeModal(): void; reset(): void; tick(): void;
  setRedDuration(seconds: number): void;
  dealCards(a: CardKind, b: CardKind): void; rollDice(format: string): void;
  activateCard(i: Idx, forced?: boolean): void;
  activateWildcard(i: Idx, power: 'shootout' | 'sanction' | 'double'): void;
  addPlayer(name: string, team: RosterTeam, number?: number): void;
  addPlayers(text: string, team: RosterTeam): void;
  movePlayer(id: string, team: RosterTeam): void;
  setCaptain(id: string): void;
  editPlayer(id: string, patch: Partial<Pick<Player, 'name' | 'number' | 'onField'>>): void;
  removePlayer(id: string): void;
  drawCaptain(team: Idx): void;
  balanceDraft(): void;
  recordGoalAuthor(i: Idx, playerId: string): void;
  setFx(mode: 'full' | 'save'): void;
  triggerEffect(kind: EffectKind, team: Idx | null, text: string): void;
  clearEffect(): void;
  resetMatch(keepRoster: boolean): void;
}

const uid = () => Math.random().toString(36).slice(2, 9);
// Reloj basado en timestamps: no pierde segundos aunque la pantalla se apague.
export const periodMs = (s: Clock) => s.acc + (s.running && s.t0 ? Date.now() - s.t0 : 0);
export const matchMs = (s: Clock) => (s.phase === 'pre' || s.phase === 't1' ? 0 : s.half * 1000) + periodMs(s);

const fresh = () => ({
  phase: 'pre' as Phase, running: false, acc: 0, t0: null as number | null,
  sanctions: [] as Sanction[], events: [] as Ev[], history: [] as Snap[], modal: null as Modal,
  flags: { alert1: false, alert2: false, x2: false, golden: false },
  cards: [{ kind: null, used: false }, { kind: null, used: false }] as [SecretCard, SecretCard],
  diceFormat: null as string | null, doubleTeam: null as Idx | null, cardEndsAt: 0,
  roster: [] as Player[], fx: 'full' as 'full' | 'save', effect: null as MatchEffect | null,
});
const log = (s: S, text: string): Ev[] => [...s.events, { id: uid(), at: matchMs(s), phase: s.phase, text }];
const snap = (s: S): Snap => ({ teams: s.teams, sanctions: s.sanctions, flags: s.flags, events: s.events, phase: s.phase, roster: s.roster });
const pushH = (s: S) => [...s.history.slice(-29), snap(s)];
const still = { running: false, t0: null as number | null };

export const useMatch = create<S>()(persist((set, get) => ({
  ...fresh(),
  half: 1200, redDuration: 180, foulLimit: 5, sun: false,
  teams: [
    { name: 'ESTEBAN FC', captain: 'Esteban', color: '#3b82f6', goals: 0, fouls: 0 },
    { name: 'EQUIPO B', captain: '', color: '#ef4444', goals: 0, fouls: 0 },
  ],
  roster: [
    { id: 'esteban', name: 'Esteban', number: 1, team: 0, captain: true, onField: true, expelled: false, goals: 0 },
  ],
  toggle: () => {
    const s = get();
    if (s.phase !== 't1' && s.phase !== 't2') return;
    if (s.running) set({ acc: periodMs(s), ...still }); else set({ running: true, t0: Date.now() });
    sfx.short();
  },
  adjust: (ms) => { const s = get(); set({ acc: Math.max(0, periodMs(s) + ms), t0: s.running ? Date.now() : null }); },
  next: () => {
    const s = get();
    if (s.phase === 'pre') { set({ phase: 't1', acc: 0, running: true, t0: Date.now(), events: log(s, 'Inicia 1T') }); sfx.long(); }
    else if (s.phase === 't1') { set({ phase: 'ht', acc: 0, ...still, events: log(s, 'Fin 1T') }); sfx.final(); }
    else if (s.phase === 'ht') {
      set({ phase: 't2', acc: 0, running: true, t0: Date.now(), events: log(s, 'Inicia 2T'),
        teams: s.teams.map((t) => ({ ...t, fouls: 0 })) as [Team, Team] });
      sfx.long();
    } else if (s.phase === 't2') {
      set({ phase: 'final', acc: periodMs(s), ...still, events: log(s, 'Final del partido') });
      sfx.final();
    }
  },
  goal: (i) => {
    const s = get();
    if (s.phase !== 't1' && s.phase !== 't2') return;
    const activeDouble = s.doubleTeam === i && s.cardEndsAt > matchMs(s);
    const m = s.flags.x2 || activeDouble ? 2 : 1;
    const teams = s.teams.map((t, k) => (k === i ? { ...t, goals: t.goals + m } : t)) as [Team, Team];
    set({
      history: pushH(s), teams, events: log(s, `⚽ Gol ${s.teams[i].name}${m > 1 ? ' (x2)' : ''}`),
      effect: { id: uid(), kind: m > 1 ? 'x2' : 'goal', team: i, text: m > 1 ? `¡GOL DOBLE x2! ${s.teams[i].name}` : `¡GOOOL! ${s.teams[i].name}` },
      ...(s.flags.golden ? { phase: 'final' as Phase, acc: periodMs(s), ...still } : {}),
    });
    sfx.goal(); sfx.goalDrop(); vib([80, 40, 80]);
  },
  foul: (i) => {
    const s = get();
    if (s.phase !== 't1' && s.phase !== 't2') return;
    const n = s.teams[i].fouls + 1;
    set({
      history: pushH(s), events: log(s, `Falta ${s.teams[i].name} (${n})`),
      teams: s.teams.map((t, k) => (k === i ? { ...t, fouls: n } : t)) as [Team, Team],
    });
    sfx.tick(); vib(n >= s.foulLimit ? [100, 60, 100] : 40);
  },
  sanction: (i, k, playerId) => {
    const s = get();
    const n = s.sanctions.filter((x) => x.team === i).length + 1;
    const player = playerId ? s.roster.find((p) => p.id === playerId) : undefined;
    const duration = k === 'R' ? s.redDuration * 1000 : 120000;
    const sc: Sanction = { id: uid(), team: i, kind: k, label: player?.name || `Jugador #${n}`, endAt: matchMs(s) + duration, ended: false, playerId };
    const roster = playerId
      ? s.roster.map((p) => p.id === playerId ? {
          ...p,
          expelled: k === 'R' ? true : p.expelled,
          onField: k === 'R' ? false : p.onField,
          yellows: k === 'Y' ? (p.yellows || 0) + 1 : p.yellows,
        } : p)
      : s.roster;
    set({
      history: pushH(s), sanctions: [...s.sanctions, sc], roster,
      effect: { id: uid(), kind: k === 'Y' ? 'yellow' : 'red', team: i, text: k === 'Y' ? 'TARJETA AMARILLA' : 'TARJETA ROJA' },
      events: log(s, `${k === 'Y' ? '🟨' : '🟥'} ${s.teams[i].name} ${sc.label}`),
    });
    sfx.card(); vib(k === 'R' ? [200, 80, 200] : 120);
  },
  upgrade: (id) => {
    const s = get();
    const target = s.sanctions.find((x) => x.id === id);
    set({
      sanctions: s.sanctions.map((x) => (x.id === id ? { ...x, kind: 'R' as Kind, endAt: matchMs(s) + s.redDuration * 1000, ended: false } : x)),
      roster: target?.playerId ? s.roster.map((p) => p.id === target.playerId ? { ...p, expelled: true, onField: false } : p) : s.roster,
      events: log(s, '2ª amarilla → roja'),
    });
    vib([200, 80, 200]);
  },
  rename: (id, label) => set((s) => ({ sanctions: s.sanctions.map((x) => (x.id === id ? { ...x, label } : x)) })),
  clear: (id) => set((s) => ({ sanctions: s.sanctions.filter((x) => x.id !== id) })),
  undo: () => {
    const s = get();
    const h = s.history[s.history.length - 1];
    if (h) set({ ...h, history: s.history.slice(0, -1), modal: null });
  },
  setTeam: (i, p) => set((s) => ({ teams: s.teams.map((t, k) => (k === i ? { ...t, ...p } : t)) as [Team, Team] })),
  setHalf: (min) => set({ half: Math.min(30, Math.max(1, min)) * 60 }),
  setFoulLimit: (n) => set({ foulLimit: n }),
  setRedDuration: (seconds) => set({ redDuration: seconds }),
  toggleSun: () => set((s) => ({ sun: !s.sun })),
  closeModal: () => set({ modal: null }),
  reset: () => get().resetMatch(true),
  resetMatch: (keepRoster) => set((s) => ({
    ...fresh(),
    teams: s.teams.map((t) => ({ ...t, goals: 0, fouls: 0 })) as [Team, Team],
    half: s.half,
    foulLimit: s.foulLimit,
    sun: s.sun,
    roster: keepRoster ? s.roster.map((p) => ({ ...p, goals: 0, yellows: 0, expelled: false, onField: p.team === -1 ? false : p.onField })) : [],
  })),
  tick: () => {
    const s = get();
    const m = matchMs(s);
    if (s.sanctions.some((x) => !x.ended && x.endAt <= m)) {
      set({ sanctions: s.sanctions.map((x) => (!x.ended && x.endAt <= m ? { ...x, ended: true } : x)) });
      sfx.reentry(); vib([300, 100, 300]);
    }
    if (!s.running) return;
    const p = periodMs(s);
    const warn = Math.max(0, s.half * 1000 - 120000);
    if (s.phase === 't1' && !s.flags.alert1 && p >= warn) {
      set({ flags: { ...s.flags, alert1: true }, modal: 'dice', events: log(s, '⏱ Minuto 18:00: Primer Dado') });
      sfx.alarm(); vib([200, 100, 200, 100, 400]);
    }
    if (s.phase === 't2' && !s.flags.alert2 && p >= warn) {
      const tie = s.teams[0].goals === s.teams[1].goals;
      set({ flags: { ...s.flags, alert2: true, x2: !tie, golden: tie }, modal: tie ? 'golden' : 'x2', events: log(s, tie ? '🏆 Minuto 38: Gol de Oro' : '✖2 Minuto 38: Gol Doble Global') });
      sfx.alarm(); vib([300, 100, 300, 100, 500]);
    }
    if (p >= s.half * 1000) { set({ acc: s.half * 1000, ...still }); sfx.final(); vib([500, 150, 500]); }
  },
  dealCards: (a, b) => set({ cards: [{ kind: a, used: false }, { kind: b, used: false }] }),
  rollDice: (format) => set({ diceFormat: format, events: log(get(), `🎲 Formato: ${format}`) }),
  activateCard: (i, forced = false) => {
    const s = get();
    const card = s.cards[i];
    if (!card.kind || card.used) return;
    if (!forced && (s.flags.alert1 || s.phase === 'ht')) {
      s.modal && set({ modal: s.modal });
      return;
    }
    if (card.kind === 'steal') {
      const rival = (i === 0 ? 1 : 0) as Idx;
      if (s.cards[rival].used) {
        set({ history: pushH(s), effect: { id: uid(), kind: 'card', team: i, text: 'ROBO FALLIDO · CARTA YA USADA' }, events: log(s, `Robo fallido de ${s.teams[i].name}: carta ya usada`) });
        sfx.card(); return;
      }
      const stolen = s.cards[rival].kind;
      if (!stolen) return;
      set({
        cards: s.cards.map((c, k) => k === i ? { kind: stolen, used: false } : k === rival ? { kind: null, used: true } : c) as [SecretCard, SecretCard],
        events: log(s, `🎴 ${s.teams[i].name} robó una carta secreta`),
        effect: { id: uid(), kind: 'card', team: i, text: `ROBO DE CARTA · ${s.teams[i].name}` },
      });
    } else if (card.kind === 'double') {
      set({ doubleTeam: i, cardEndsAt: matchMs(s) + 120000, cards: s.cards.map((c, k) => k === i ? { ...c, used: true } : c) as [SecretCard, SecretCard], effect: { id: uid(), kind: 'x2', team: i, text: `GOL DOBLE · ${s.teams[i].name}` }, events: log(s, `Gol Doble activado: ${s.teams[i].name}`) });
      sfx.alarm(); vib([300, 100, 300]);
    } else if (card.kind === 'sanction') {
      const rival = (i === 0 ? 1 : 0) as Idx;
      const n = s.sanctions.filter((x) => x.team === rival).length + 1;
      const sc: Sanction = { id: uid(), team: rival, kind: 'Y', label: `Jugador #${n}`, endAt: matchMs(s) + 120000, ended: false };
      set({ sanctions: [...s.sanctions, sc], cards: s.cards.map((c, k) => k === i ? { ...c, used: true } : c) as [SecretCard, SecretCard], events: log(s, `Sanción secreta: ${s.teams[rival].name}`) });
      sfx.card(); vib([200, 80, 200]);
    } else if (card.kind === 'shootout') {
      set({ cards: s.cards.map((c, k) => k === i ? { ...c, used: true } : c) as [SecretCard, SecretCard], effect: { id: uid(), kind: 'card', team: i, text: 'SHOOTOUT · DESDE 2/3' }, events: log(s, `Shootout secreto: ${s.teams[i].name}`) });
      sfx.long(); vib([200, 80, 200]);
    } else if (card.kind === 'wildcard') {
      set({ cards: s.cards.map((c, k) => k === i ? { ...c, used: true } : c) as [SecretCard, SecretCard], effect: { id: uid(), kind: 'card', team: i, text: 'COMODÍN · ELIGE UN PODER' }, events: log(s, `Comodín activado: ${s.teams[i].name}`) });
      sfx.alarm(); vib([300, 100, 300]);
    }
  },
  activateWildcard: (i, power) => {
    const s = get();
    const usedCards = s.cards.map((c, k) => k === i ? { ...c, used: true } : c) as [SecretCard, SecretCard];
    if (power === 'double') {
      set({ cards: usedCards, doubleTeam: i, cardEndsAt: matchMs(s) + 120000, effect: { id: uid(), kind: 'x2', team: i, text: `COMODÍN GOL DOBLE · ${s.teams[i].name}` }, events: log(s, 'Comodín: Gol Doble') });
      sfx.alarm(); vib([300, 100, 300]);
    } else if (power === 'sanction') {
      const rival = (i === 0 ? 1 : 0) as Idx;
      const sc: Sanction = { id: uid(), team: rival, kind: 'Y', label: 'Jugador seleccionado', endAt: matchMs(s) + 120000, ended: false };
      set({ cards: usedCards, sanctions: [...s.sanctions, sc], effect: { id: uid(), kind: 'yellow', team: rival, text: 'COMODÍN · SANCIÓN 2:00' }, events: log(s, 'Comodín: Sanción 2:00') });
      sfx.card(); vib(120);
    } else {
      set({ cards: usedCards, effect: { id: uid(), kind: 'card', team: i, text: 'COMODÍN · SHOOTOUT 2/3' }, events: log(s, 'Comodín: Shootout') });
      sfx.long(); vib([200, 80, 200]);
    }
  },
  addPlayer: (name, team, number) => set((s) => {
    const clean = name.trim();
    if (!clean) return s;
    const used = s.roster.map((p) => p.number);
    let n = number ?? 2;
    while (used.includes(n) && n < 99) n++;
    return {
      roster: [...s.roster, { id: uid(), name: clean, number: n, team, captain: false, onField: team !== -1 && s.roster.filter((p) => p.team === team && p.onField).length < 4, expelled: false, goals: 0 }],
    };
  }),
  addPlayers: (text, team) => set((s) => {
    const names = text.split(/[\n,;]+/).map((n) => n.trim()).filter(Boolean);
    if (!names.length) return s;
    let used = s.roster.map((p) => p.number);
    let next = 2;
    let onCount = s.roster.filter((p) => p.team === team && p.onField).length;
    const added = names.map((name) => {
      while (used.includes(next)) next++;
      const number = next++;
      used = [...used, number];
      const onField = team !== -1 && onCount < 4;
      if (onField) onCount++;
      return { id: uid(), name, number, team, captain: false, onField, expelled: false, goals: 0 };
    });
    return { roster: [...s.roster, ...added] };
  }),
  movePlayer: (id, team) => set((s) => ({
    roster: s.roster.map((p) => p.id === id ? {
      ...p, team,
      onField: team !== -1 && s.roster.filter((x) => x.team === team && x.onField).length < 4,
      captain: team === -1 ? false : p.captain,
    } : p),
  })),
  setCaptain: (id) => set((s) => {
    const player = s.roster.find((p) => p.id === id);
    if (!player) return s;
    return {
      roster: s.roster.map((p) => ({ ...p, captain: p.team === player.team && p.id === id })),
      teams: s.teams.map((t, i) => i === player.team ? { ...t, captain: player.name } : t) as [Team, Team],
    };
  }),
  editPlayer: (id, patch) => set((s) => ({
    roster: s.roster.map((p) => p.id === id ? { ...p, ...patch } : p),
  })),
  removePlayer: (id) => set((s) => ({ roster: s.roster.filter((p) => p.id !== id) })),
  drawCaptain: (team) => set((s) => {
    const candidates = s.roster.filter((p) => p.team === team && !p.expelled);
    if (!candidates.length) return s;
    const player = candidates[Math.floor(Math.random() * candidates.length)];
    return {
      roster: s.roster.map((p) => ({ ...p, captain: p.team === team ? p.id === player.id : p.captain })),
      teams: s.teams.map((t, i) => i === team ? { ...t, captain: player.name } : t) as [Team, Team],
    };
  }),
  balanceDraft: () => set((s) => {
    const free = s.roster.filter((p) => p.team === -1).sort(() => Math.random() - 0.5);
    const byId = new Map(free.map((p, i) => [p.id, i % 2 as RosterTeam]));
    return {
      roster: s.roster.map((p) => {
        const team = byId.get(p.id);
        return team === undefined ? p : { ...p, team, onField: s.roster.filter((x) => x.team === team && x.onField).length < 4 };
      }),
    };
  }),
  recordGoalAuthor: (i, playerId) => set((s) => ({
    roster: s.roster.map((p) => p.id === playerId ? { ...p, goals: p.goals + (s.flags.x2 || s.doubleTeam === i ? 2 : 1) } : p),
    events: log(s, `⚽ Goleador: ${s.roster.find((p) => p.id === playerId)?.name || 'Jugador'}`),
  })),
  setFx: (mode) => set({ fx: mode }),
  triggerEffect: (kind, team, text) => set({ effect: { id: uid(), kind, team, text } }),
  clearEffect: () => set({ effect: null }),
}), {
  name: 'futsal-arbitro-v1',
  partialize: (s) => ({
    teams: s.teams, half: s.half, foulLimit: s.foulLimit, phase: s.phase, running: s.running, acc: s.acc, t0: s.t0,
    sanctions: s.sanctions, events: s.events, history: s.history, flags: s.flags, sun: s.sun,
    cards: s.cards, diceFormat: s.diceFormat, doubleTeam: s.doubleTeam, cardEndsAt: s.cardEndsAt,
    roster: s.roster, fx: s.fx, redDuration: s.redDuration,
  }),
}));
