import { useEffect, useState } from 'react';

export const fmt = (ms: number) => {
  const t = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
};
export const ink = (h: string) => {
  const n = parseInt(h.slice(1), 16);
  return 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) > 150 ? '#0b0f1a' : '#fff';
};
export function useNow(ms = 100) {
  const [n, set] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => set(Date.now()), ms); return () => clearInterval(id); }, [ms]);
  return n;
}
