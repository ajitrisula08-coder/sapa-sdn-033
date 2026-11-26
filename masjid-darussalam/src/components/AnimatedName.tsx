import { useEffect, useState } from 'react';

/**
 * Nama petugas yang "hidup": huruf muncul satu per satu, lalu bergelombang
 * pelan dengan kilau emas yang berjalan dari kiri ke kanan.
 * Animasi masuk diputar ulang setiap `replayMs` agar tampilan tidak statis.
 */
export function AnimatedName({ text, startDelay = 0, replayMs = 14_000, className = '', style }: {
  text: string; startDelay?: number; replayMs?: number; className?: string; style?: React.CSSProperties;
}) {
  const [cycle, setCycle] = useState(0);
  useEffect(() => {
    if (!replayMs) return;
    const id = window.setInterval(() => setCycle((c) => c + 1), replayMs);
    return () => window.clearInterval(id);
  }, [replayMs]);

  const step = 45; // jeda antarhuruf (ms)
  const words = text.split(/\s+/).filter(Boolean);
  const total = text.replace(/\s+/g, '').length;
  let idx = 0;
  return (
    <span key={cycle} className={className} style={style} aria-label={text} role="text">
      {words.map((w, wi) => (
        <span key={wi} className="inline-block whitespace-nowrap" aria-hidden>
          {[...w].map((ch) => {
            const i = idx++;
            const inDelay = startDelay + i * step;
            const waveDelay = startDelay + total * step + 400 + i * 90;
            return (
              <span key={i} className="name-letter" style={{
                animation: `letter-in 0.7s cubic-bezier(0.34,1.56,0.64,1) ${inDelay}ms both, letter-wave 3.2s ease-in-out ${waveDelay}ms infinite, shimmer 4s ease-in-out ${i * 70}ms infinite`,
              }}>{ch}</span>
            );
          })}
          {wi < words.length - 1 && <span className="inline-block w-[0.28em]" />}
        </span>
      ))}
    </span>
  );
}
