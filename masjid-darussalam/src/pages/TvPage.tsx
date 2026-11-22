import { ArrowLeft, BellRing, BookOpen, Landmark, Maximize, Megaphone, Mic, Minimize, Moon, Star, Users, Volume2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { LogoMark } from '../components/Logo';
import { PRAYER_ICON } from '../components/PrayerWidgets';
import { usePrayerStatus } from '../hooks/usePrayerStatus';
import { useQuery } from '../hooks/useQuery';
import { getAnnouncements, getFinanceSummary, getNextFriday } from '../lib/api';
import { ANNOUNCEMENT_CATEGORY, PRAYER_ARABIC, PRAYER_KEYS, PRAYER_LABEL } from '../lib/constants';
import { addDaysISO, formatClock, formatCountdown, formatDateLong, hhmm, hijriDate, hijriMonth, rupiah, todayISO } from '../lib/format';
import { formatPrayerTime, zonedTime } from '../lib/prayer';
import { isSupabaseConfigured } from '../lib/supabase';

/** Satuan responsif 16:9: 1u = 1% lebar layar 16:9 yang muat di jendela. */
const u = (n: number) => `calc(var(--u) * ${n})`;
const REFRESH = 60_000;

export default function TvPage() {
  const { now, settings, status, remainingMs } = usePrayerStatus();
  const tz = settings.timezone;
  const today = todayISO(tz, now);
  const [params, setParams] = useSearchParams();
  const modeParam = params.get('mode');
  const ramadan = modeParam === 'ramadan' || (modeParam !== 'normal' && (settings.ramadan_mode || hijriMonth(now, tz, settings.hijri_offset) === 9));
  const [isFull, setIsFull] = useState(false);
  const [showControls, setShowControls] = useState(true);

  const friday = useQuery(() => getNextFriday(today), [today], { refreshMs: REFRESH, topics: ['friday'] });
  const finance = useQuery(() => getFinanceSummary(null, null), [], { refreshMs: REFRESH, topics: ['finance'] });
  const ann = useQuery(() => getAnnouncements({ limit: 6 }), [], { refreshMs: REFRESH, topics: ['announcements'] });
  const anns = ann.data ?? [];
  const [annIdx, setAnnIdx] = useState(0);
  useEffect(() => {
    if (anns.length < 2) return;
    const id = setInterval(() => setAnnIdx((i) => (i + 1) % anns.length), 12_000);
    return () => clearInterval(id);
  }, [anns.length]);
  const current = anns[annIdx % Math.max(1, anns.length)];

  // Layar TV: muat ulang penuh setiap 6 jam agar selalu memakai versi terbaru.
  useEffect(() => { const id = setTimeout(() => window.location.reload(), 6 * 3600_000); return () => clearTimeout(id); }, []);

  // Kontrol tersembunyi otomatis; muncul saat mouse bergerak / layar disentuh.
  useEffect(() => {
    let t = setTimeout(() => setShowControls(false), 4000);
    const wake = () => { setShowControls(true); clearTimeout(t); t = setTimeout(() => setShowControls(false), 4000); };
    window.addEventListener('mousemove', wake);
    window.addEventListener('touchstart', wake);
    window.addEventListener('keydown', wake);
    return () => { clearTimeout(t); window.removeEventListener('mousemove', wake); window.removeEventListener('touchstart', wake); window.removeEventListener('keydown', wake); };
  }, []);

  useEffect(() => {
    const on = () => setIsFull(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', on);
    return () => document.removeEventListener('fullscreenchange', on);
  }, []);
  const toggleFull = useCallback(async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch { /* browser TV tertentu tidak mendukung */ }
  }, []);

  // Penanda "waktu salat telah tiba" selama 10 menit setelah masuk waktu.
  const arrived = useMemo(() => {
    for (const k of PRAYER_KEYS) {
      const diff = now.getTime() - status.today.times[k].getTime();
      if (diff >= 0 && diff < 10 * 60_000) return k;
    }
    return null;
  }, [now, status]);

  const imsak = new Date(status.today.times.subuh.getTime() - 10 * 60_000);
  const runningText = settings.tv_running_text?.trim() || anns.map((a) => `${a.title}: ${a.content.replace(/\s+/g, ' ').slice(0, 140)}`).join('   ✦   ') || `Selamat datang di ${settings.name}. Mari makmurkan masjid dengan salat berjamaah.`;
  const f = friday.data;
  const fridayRows: [string, string | undefined][] = f ? [['Imam', f.imam?.full_name], ['Khatib', f.khatib?.full_name], ['Bilal', f.bilal?.full_name], ['Muazin', f.muazin?.full_name]] : [];

  // Slide petugas Jumat layar penuh: Kamis & Jumat (s.d. 90 menit setelah Jumat dimulai),
  // tampil 15 detik di akhir setiap menit. ?slide=jumat untuk memaksa tampil (uji coba).
  const fridayWindow = !!f && (f.friday_date === addDaysISO(today, 1)
    || (f.friday_date === today && now.getTime() < zonedTime(f.friday_date, hhmm(f.start_time), tz).getTime() + 90 * 60_000));
  const showFridaySlide = !arrived && !!f && (params.get('slide') === 'jumat'
    || (settings.tv_friday_slide && fridayWindow && now.getSeconds() >= 45));
  const SLIDE_ROLES = [
    { key: 'imam', label: 'Imam', icon: Star }, { key: 'khatib', label: 'Khatib', icon: Mic },
    { key: 'bilal', label: 'Bilal', icon: BellRing }, { key: 'muazin', label: 'Muazin', icon: Volume2 },
  ] as const;

  const style = { '--u': 'min(1vw, 1.7778vh)' } as CSSProperties;

  return (
    <div className="bg-islamic relative grid h-dvh w-screen cursor-none place-items-center overflow-hidden text-white" style={style} onDoubleClick={toggleFull}>
      <div className="pattern-overlay pointer-events-none absolute inset-0 opacity-[0.07]" />
      <div className="relative flex flex-col" style={{ width: u(100), height: u(56.25), padding: u(2) }}>
        {/* Header */}
        <header className="flex items-center justify-between" style={{ gap: u(2) }}>
          <div className="flex items-center" style={{ gap: u(1.4) }}>
            <LogoMark className="shrink-0" style={{ width: u(6), height: u(6) }} />
            <div>
              <p className="font-arabic leading-none text-gold-300" style={{ fontSize: u(1.7) }}>مسجد دار السلام</p>
              <h1 className="font-display font-bold leading-none" style={{ fontSize: u(3.6) }}>{settings.name}</h1>
              <p className="text-emerald-50/75" style={{ fontSize: u(1.15), marginTop: u(0.3) }}>{settings.address}, {settings.district}, {settings.regency}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-display font-bold leading-none tabular" style={{ fontSize: u(5.6) }}>{formatClock(now, tz)}</p>
            <p className="font-semibold" style={{ fontSize: u(1.45) }}>{formatDateLong(today)}</p>
            <p className="text-gold-300" style={{ fontSize: u(1.3) }}>{hijriDate(now, tz, settings.hijri_offset)}</p>
          </div>
        </header>

        {/* Konten utama */}
        <div className="grid min-h-0 flex-1" style={{ gridTemplateColumns: '1.55fr 1fr', gridTemplateRows: 'minmax(0, 1fr)', gap: u(1.6), marginTop: u(1.6) }}>
          {/* Kiri: salat berikutnya */}
          <div className="relative flex flex-col justify-center overflow-hidden rounded-[2vw] bg-white/[0.06] ring-1 ring-white/12" style={{ padding: u(2.4) }}>
            <div className="pointer-events-none absolute -right-[6%] -top-[30%] aspect-square w-[60%] rounded-full border border-gold-400/15" />
            {arrived ? (
              <div className="relative text-center">
                <p className="font-arabic text-gold-300" style={{ fontSize: u(4.5) }}>{PRAYER_ARABIC[arrived]}</p>
                <p className="font-display font-bold" style={{ fontSize: u(5.2) }}>Waktu Salat {PRAYER_LABEL[arrived]} telah tiba</p>
                <p className="text-emerald-50/80" style={{ fontSize: u(1.9), marginTop: u(0.8) }}>Luruskan dan rapatkan saf. Mohon nonaktifkan suara ponsel.</p>
              </div>
            ) : (
              <div className="relative">
                <p className="font-semibold uppercase text-gold-300" style={{ fontSize: u(1.4), letterSpacing: '0.2em' }}>{ramadan ? 'Ramadan Mubarak · ' : ''}Menuju salat berikutnya</p>
                <div className="flex items-end justify-between" style={{ gap: u(2), marginTop: u(0.6) }}>
                  <div>
                    <p className="font-display font-bold leading-none" style={{ fontSize: u(7) }}>{PRAYER_LABEL[status.next.key]}</p>
                    <p className="text-emerald-50/80" style={{ fontSize: u(2), marginTop: u(0.4) }}>{status.next.isTomorrow ? 'Besok, pukul ' : 'Pukul '}{formatPrayerTime(status.next.at, tz)} WITA</p>
                  </div>
                  <p className="gold-text font-display font-bold leading-none tabular" style={{ fontSize: u(8.2) }}>{formatCountdown(remainingMs)}</p>
                </div>
                {ramadan && (
                  <div className="grid grid-cols-2" style={{ gap: u(1.2), marginTop: u(1.2) }}>
                    {([['Imsak', imsak], ['Berbuka', status.today.times.magrib]] as const).map(([l, t]) => (
                      <div key={l} className="flex items-center justify-between rounded-[1vw] bg-gold-400/15 ring-1 ring-gold-400/30" style={{ padding: `${u(0.6)} ${u(1.4)}` }}>
                        <span className="flex items-center font-semibold" style={{ gap: u(0.6), fontSize: u(1.7) }}><Moon style={{ width: u(1.8), height: u(1.8) }} className="text-gold-300" />{l}</span>
                        <span className="font-display font-bold tabular text-gold-300" style={{ fontSize: u(3) }}>{formatPrayerTime(t, tz)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Kanan: Jumat, saldo, pengumuman */}
          <div className="grid min-h-0" style={{ gridTemplateRows: 'auto auto 1fr', gap: u(1.2) }}>
            <div className="rounded-[1.4vw] bg-white/[0.06] ring-1 ring-white/12" style={{ padding: u(1.4) }}>
              <p className="flex items-center font-semibold text-gold-300" style={{ fontSize: u(1.25), gap: u(0.6) }}><Users style={{ width: u(1.5), height: u(1.5) }} /> Petugas Jumat {f ? `· ${formatDateLong(f.friday_date).split(',')[1]?.trim()} · ${hhmm(f.start_time)}` : ''}</p>
              {f ? (
                <div className="grid grid-cols-4" style={{ gap: u(0.8), marginTop: u(0.6) }}>
                  {fridayRows.map(([r, n]) => (
                    <div key={r} className="min-w-0">
                      <p className="text-emerald-50/60" style={{ fontSize: u(0.95) }}>{r}</p>
                      <p className="line-clamp-2 font-semibold leading-tight" style={{ fontSize: u(1.25) }}>{n ?? '—'}</p>
                    </div>
                  ))}
                </div>
              ) : <p className="text-emerald-50/60" style={{ fontSize: u(1.3), marginTop: u(0.5) }}>{isSupabaseConfigured ? 'Jadwal belum diisi pengurus.' : 'Belum terhubung ke database.'}</p>}
            </div>
            <div className="flex items-center justify-between rounded-[1.4vw] bg-gradient-to-r from-gold-400/20 to-gold-400/5 ring-1 ring-gold-400/30" style={{ padding: `${u(0.7)} ${u(1.4)}` }}>
              <p className="flex items-center font-semibold text-gold-300" style={{ fontSize: u(1.3), gap: u(0.6) }}><Landmark style={{ width: u(1.6), height: u(1.6) }} /> Saldo Kas Masjid</p>
              <p className="font-display font-bold tabular" style={{ fontSize: u(2.9) }}>{finance.data ? rupiah(finance.data.closing_balance) : '—'}</p>
            </div>
            <div className="min-h-0 overflow-hidden rounded-[1.4vw] bg-white/[0.06] ring-1 ring-white/12" style={{ padding: u(1.4) }}>
              <p className="flex items-center font-semibold text-gold-300" style={{ fontSize: u(1.25), gap: u(0.6) }}><Megaphone style={{ width: u(1.5), height: u(1.5) }} /> Pengumuman{current ? ` · ${ANNOUNCEMENT_CATEGORY[current.category]}` : ''} {anns.length > 1 ? `(${(annIdx % anns.length) + 1}/${anns.length})` : ''}</p>
              {current ? (
                <div key={current.id} className="animate-fade-up" style={{ marginTop: u(0.6) }}>
                  <p className="truncate font-bold leading-tight" style={{ fontSize: u(1.7) }}>{current.title}</p>
                  <p className="line-clamp-2 text-emerald-50/85" style={{ fontSize: u(1.3), marginTop: u(0.4) }}>{current.content}</p>
                </div>
              ) : <p className="text-emerald-50/60" style={{ fontSize: u(1.3), marginTop: u(0.5) }}>Belum ada pengumuman.</p>}
            </div>
          </div>
        </div>

        {/* Jadwal 5 waktu */}
        <div className="grid grid-cols-5" style={{ gap: u(1.1), marginTop: u(1.6) }}>
          {PRAYER_KEYS.map((k) => {
            const Icon = PRAYER_ICON[k];
            const next = status.next.key === k && !status.next.isTomorrow;
            const cur = status.current === k;
            return (
              <div key={k} className={`relative overflow-hidden rounded-[1.2vw] text-center transition ${next ? 'bg-gradient-to-b from-gold-300 to-gold-500 text-emerald-950 shadow-2xl' : cur ? 'bg-white/15 ring-2 ring-white/40' : 'bg-white/[0.07] ring-1 ring-white/12'}`} style={{ padding: `${u(0.7)} ${u(0.8)}` }}>
                <div className="flex items-center justify-center" style={{ gap: u(0.5) }}>
                  <Icon style={{ width: u(1.6), height: u(1.6) }} className={next ? '' : 'text-gold-300'} />
                  <p className="font-semibold" style={{ fontSize: u(1.6) }}>{PRAYER_LABEL[k]}</p>
                </div>
                <p className="font-display font-bold leading-none tabular" style={{ fontSize: u(3.7), marginTop: u(0.2) }}>{formatPrayerTime(status.today.times[k], tz)}</p>
                {next && <p className="font-bold uppercase" style={{ fontSize: u(0.9), letterSpacing: '0.15em', marginTop: u(0.2) }}>Berikutnya</p>}
                {cur && !next && <p className="font-bold uppercase text-gold-300" style={{ fontSize: u(0.9), letterSpacing: '0.15em', marginTop: u(0.2) }}>Waktu saat ini</p>}
              </div>
            );
          })}
        </div>

        {/* Teks berjalan */}
        <div className="flex items-center overflow-hidden rounded-full bg-black/20 ring-1 ring-white/10" style={{ marginTop: u(1.2), height: u(3) }}>
          <span className="shrink-0 rounded-full bg-gold-400 font-bold text-emerald-950" style={{ fontSize: u(1.1), padding: `${u(0.5)} ${u(1.2)}`, marginLeft: u(0.25) }}>INFO</span>
          <div className="min-w-0 flex-1 overflow-hidden">
            <div className="flex w-max animate-marquee whitespace-nowrap" style={{ fontSize: u(1.35) }}>
              <span style={{ paddingRight: u(6), paddingLeft: u(2) }}>{runningText}</span>
              <span style={{ paddingRight: u(6), paddingLeft: u(2) }} aria-hidden>{runningText}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Slide petugas Jumat */}
      {showFridaySlide && f && (
        <div className="bg-islamic absolute inset-0 z-20 grid place-items-center animate-fade-up" style={style}>
          <div className="pattern-overlay pointer-events-none absolute inset-0 opacity-[0.08]" />
          <div className="pointer-events-none absolute -right-[8%] -top-[20%] aspect-square w-[40%] animate-spin-slow rounded-full border-2 border-dashed border-gold-400/20" />
          <div className="pointer-events-none absolute -bottom-[25%] -left-[8%] aspect-square w-[45%] animate-spin-slow rounded-full border-2 border-dashed border-gold-400/15 [animation-direction:reverse]" />
          <div className="relative flex flex-col" style={{ width: u(100), height: u(56.25), padding: u(2.5) }}>
            <div className="text-center">
              <p className="animate-rise-in font-bold uppercase text-gold-300" style={{ fontSize: u(1.6), letterSpacing: '0.3em' }}>Petugas Salat Jumat</p>
              <p className="animate-rise-in font-display font-bold [animation-delay:120ms]" style={{ fontSize: u(4.2) }}>{formatDateLong(f.friday_date)} · {hhmm(f.start_time)} WITA</p>
            </div>
            <div className="grid flex-1 grid-cols-2" style={{ gap: u(1.6), marginTop: u(1.6) }}>
              {SLIDE_ROLES.map((r, i) => {
                const name = (f[r.key] as { full_name: string } | null | undefined)?.full_name;
                const Icon = r.icon;
                return (
                  <div key={r.key} className="flex animate-rise-in flex-col justify-center overflow-hidden rounded-[1.6vw] bg-white/[0.07] ring-1 ring-white/15"
                    style={{ padding: `${u(1.4)} ${u(2.2)}`, animationDelay: `${250 + i * 160}ms` }}>
                    <span className="inline-flex w-fit items-center rounded-full bg-gold-400 font-bold uppercase text-slate-900" style={{ gap: u(0.5), padding: `${u(0.35)} ${u(1)}`, fontSize: u(1.4), letterSpacing: '0.1em' }}>
                      <Icon style={{ width: u(1.5), height: u(1.5) }} /> {r.label}
                    </span>
                    <p className={`font-display font-bold leading-[1.05] ${name ? 'gold-shimmer' : 'italic text-white/45'}`} style={{ fontSize: u(name && name.length > 22 ? 4.2 : 5.4), marginTop: u(0.6) }}>{name ?? 'Belum ditentukan'}</p>
                  </div>
                );
              })}
            </div>
            {f.sermon_theme && (
              <p className="flex animate-rise-in items-center justify-center text-center font-semibold [animation-delay:950ms]" style={{ fontSize: u(1.9), marginTop: u(1.4), gap: u(0.6) }}>
                <BookOpen className="text-gold-300" style={{ width: u(2), height: u(2) }} /> Tema khutbah: <i className="text-gold-300">“{f.sermon_theme}”</i>
              </p>
            )}
          </div>
        </div>
      )}

      {/* Kontrol (muncul saat mouse/sentuh) */}
      <div className={`absolute right-4 top-4 z-30 flex cursor-auto gap-2 transition-opacity duration-500 ${showControls ? 'opacity-100' : 'pointer-events-none opacity-0'}`}>
        <Link to="/" className="flex items-center gap-1.5 rounded-xl bg-black/40 px-3 py-2 text-sm font-semibold backdrop-blur hover:bg-black/60"><ArrowLeft className="size-4" /> Aplikasi</Link>
        <div className="flex overflow-hidden rounded-xl bg-black/40 text-sm font-semibold backdrop-blur">
          {([['normal', 'Normal'], ['ramadan', 'Ramadan']] as const).map(([m, l]) => (
            <button key={m} onClick={() => setParams({ mode: m })} className={`px-3 py-2 ${(m === 'ramadan') === ramadan ? 'bg-gold-400 text-emerald-950' : 'hover:bg-black/30'}`}>{l}</button>
          ))}
        </div>
        <button onClick={toggleFull} className="flex items-center gap-1.5 rounded-xl bg-black/40 px-3 py-2 text-sm font-semibold backdrop-blur hover:bg-black/60">
          {isFull ? <><Minimize className="size-4" /> Keluar layar penuh</> : <><Maximize className="size-4" /> Layar penuh</>}
        </button>
      </div>
    </div>
  );
}
