import { Moon, Sun, Sunrise, Sunset, CloudSun, Hand } from 'lucide-react';
import { PRAYER_ARABIC, PRAYER_KEYS, PRAYER_LABEL, type PrayerKey } from '../lib/constants';
import { formatPrayerTime, type PrayerStatus } from '../lib/prayer';

export const PRAYER_ICON: Record<PrayerKey, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  subuh: Sunrise, zuhur: Sun, asar: CloudSun, magrib: Sunset, isya: Moon,
};

export function PrayerCards({ status, tz }: { status: PrayerStatus; tz: string }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {PRAYER_KEYS.map((k, i) => {
        const Icon = PRAYER_ICON[k];
        const isNext = status.next.key === k && !status.next.isTomorrow;
        const isCurrent = status.current === k;
        return (
          <div key={k} style={{ animationDelay: `${i * 60}ms` }}
            className={`relative animate-fade-up overflow-hidden rounded-2xl p-4 transition ${i === 4 ? 'col-span-2 sm:col-span-1' : ''} ${
              isNext ? 'bg-islamic text-white shadow-lift ring-2 ring-gold-400/70'
              : isCurrent ? 'bg-emerald-50 ring-1 ring-emerald-600/25' : 'card'}`}>
            {isNext && <div className="pattern-overlay pointer-events-none absolute inset-0 opacity-10" />}
            <div className="relative flex items-start justify-between">
              <div className={`grid size-10 place-items-center rounded-xl ${isNext ? 'bg-white/12 text-gold-300' : 'bg-emerald-100/70 text-emerald-700'}`}>
                <Icon className="size-5" />
              </div>
              <span className={`font-arabic text-lg ${isNext ? 'text-gold-300' : 'text-emerald-700/60'}`}>{PRAYER_ARABIC[k]}</span>
            </div>
            <p className={`relative mt-3 text-sm font-semibold ${isNext ? 'text-emerald-50' : 'text-slate-500'}`}>{PRAYER_LABEL[k]}</p>
            <p className={`relative font-display text-[2.1rem] font-bold leading-none tabular ${isNext ? 'gold-text' : 'text-emerald-950'}`}>
              {formatPrayerTime(status.today.times[k], tz)}
            </p>
            <div className="relative mt-2 flex flex-wrap gap-1">
              {isNext && <span className="rounded-full bg-gold-400 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-950">Berikutnya</span>}
              {isCurrent && !isNext && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white"><Hand className="size-3" />Waktu saat ini</span>}
              {status.today.manual[k] && <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${isNext ? 'bg-white/15 text-white' : 'bg-amber-100 text-amber-800'}`}>Manual</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
