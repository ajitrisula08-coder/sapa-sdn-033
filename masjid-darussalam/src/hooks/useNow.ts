import { useEffect, useState } from 'react';
import { nowMs } from '../lib/clock';

/** Waktu sekarang (dikoreksi dengan jam server) yang diperbarui setiap `intervalMs` (default 1 detik). */
export function useNow(intervalMs = 1000): Date {
  const [now, setNow] = useState(() => new Date(nowMs()));
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date(nowMs())), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}
