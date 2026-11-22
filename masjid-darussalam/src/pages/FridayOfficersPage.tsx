import { BellRing, BookOpen, Maximize, MessageCircle, Mic, Minimize, Pencil, Star, Users, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatedName } from '../components/AnimatedName';
import { LogoMark } from '../components/Logo';
import { EmptyState, ErrorState, LoadingBlock } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useNow } from '../hooks/useNow';
import { useQuery } from '../hooks/useQuery';
import { getFridaySchedules } from '../lib/api';
import { formatDateLong, hhmm, hijriDate, parseISODate, todayISO } from '../lib/format';
import { zonedTime } from '../lib/prayer';
import { isSupabaseConfigured } from '../lib/supabase';
import type { FridaySchedule } from '../lib/types';

const ROLES = [
  { key: 'imam', label: 'Imam', arab: 'الإمام', icon: Star },
  { key: 'khatib', label: 'Khatib', arab: 'الخطيب', icon: Mic },
  // Di Masjid Darussalam, tugas muazin dirangkap oleh bilal.
  { key: 'bilal', label: 'Bilal', arab: 'البلال', icon: BellRing },
] as const;

/** Ornamen bintang segi delapan (berputar perlahan). */
function StarOrnament({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden>
      <g fill="none" stroke="currentColor" strokeWidth="1.2">
        <path d="M100 10l26 64 64 26-64 26-26 64-26-64-64-26 64-26z" />
        <path d="M100 38l44 18 18 44-18 44-44 18-44-18-18-44 18-44z" />
        <circle cx="100" cy="100" r="30" />
        <circle cx="100" cy="100" r="90" strokeDasharray="2 6" />
      </g>
    </svg>
  );
}

function Countdown({ target, big }: { target: Date; big: boolean }) {
  const now = useNow(1000);
  const ms = target.getTime() - now.getTime();
  const endMs = target.getTime() + 75 * 60_000;
  if (ms <= 0) {
    return (
      <p className={`inline-flex animate-glow items-center gap-2 rounded-full bg-gold-400 px-5 py-2 font-bold text-slate-900 ${big ? 'text-2xl' : 'text-base'}`}>
        {now.getTime() < endMs ? 'Sholat Jumat sedang berlangsung' : 'Sholat Jumat telah selesai'}
      </p>
    );
  }
  const s = Math.floor(ms / 1000);
  const parts = [
    ['Hari', Math.floor(s / 86400)], ['Jam', Math.floor((s % 86400) / 3600)],
    ['Menit', Math.floor((s % 3600) / 60)], ['Detik', s % 60],
  ] as const;
  return (
    <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
      {parts.map(([l, v]) => (
        <div key={l} className={`rounded-2xl bg-white/10 text-center ring-1 ring-white/15 backdrop-blur ${big ? 'min-w-28 px-5 py-3' : 'min-w-[4.5rem] px-3 py-2'}`}>
          <p className={`font-display font-bold tabular leading-none ${big ? 'text-6xl' : 'text-3xl sm:text-4xl'}`}>{String(v).padStart(2, '0')}</p>
          <p className={`mt-1 font-semibold uppercase tracking-wider text-gold-300 ${big ? 'text-sm' : 'text-[10px]'}`}>{l}</p>
        </div>
      ))}
    </div>
  );
}

function Showcase({ s, big, tz, hijriOffset }: { s: FridaySchedule; big: boolean; tz: string; hijriOffset: number }) {
  const start = zonedTime(s.friday_date, hhmm(s.start_time), tz as 'Asia/Makassar');
  return (
    <div className="relative">
      <div className="text-center">
        <p className="animate-rise-in text-xs font-bold uppercase tracking-[0.3em] text-gold-300 sm:text-sm">Petugas Sholat Jumat</p>
        <h2 className={`mt-2 animate-rise-in font-display font-bold leading-tight [animation-delay:100ms] ${big ? 'text-6xl' : 'text-4xl sm:text-5xl'}`}>{formatDateLong(s.friday_date)}</h2>
        <p className={`mt-1 animate-rise-in text-emerald-50/80 [animation-delay:200ms] ${big ? 'text-2xl' : 'text-base'}`}>
          {hijriDate(parseISODate(s.friday_date), 'UTC', hijriOffset)} · Pukul {hhmm(s.start_time)} WITA
        </p>
        <div className="mt-5 animate-rise-in [animation-delay:300ms]"><Countdown target={start} big={big} /></div>
      </div>

      <div className={`mt-8 grid gap-4 ${big ? 'grid-cols-2 gap-6' : 'sm:grid-cols-2'}`}>
        {ROLES.map((r, i) => {
          const name = (s[r.key] as { full_name: string } | null | undefined)?.full_name;
          const Icon = r.icon;
          return (
            <div key={r.key} style={{ animationDelay: `${450 + i * 180}ms` }}
              className={`group relative animate-rise-in overflow-hidden rounded-3xl bg-white/[0.07] p-5 ring-1 ring-white/15 backdrop-blur-sm transition hover:bg-white/[0.11] sm:p-7 ${i === 2 ? (big ? 'col-span-2' : 'sm:col-span-2') : ''}`}>
              <StarOrnament className="pointer-events-none absolute -right-10 -top-10 size-40 animate-spin-slow text-gold-400/15" />
              <div className="relative flex items-center justify-between gap-3">
                <span className={`role-badge inline-flex items-center rounded-full bg-gradient-to-b from-gold-300 to-gold-500 font-extrabold uppercase tracking-wider text-slate-900 ${big ? 'gap-3 px-6 py-3 text-3xl' : 'gap-2.5 px-5 py-2.5 text-xl sm:text-2xl'}`}
                  style={{ animationDelay: `${i * 0.4}s` }}>
                  <Icon className={`animate-icon-swing ${big ? 'size-8' : 'size-6'}`} style={{ animationDelay: `${i * 0.3}s` }} /> {r.label}
                </span>
                <span className={`font-arabic text-gold-300/85 ${big ? 'text-5xl' : 'text-3xl'}`}>{r.arab}</span>
              </div>
              <p className={`relative mt-4 break-words font-display font-bold leading-[1.1] ${big ? 'text-[clamp(3rem,5.2vw,6rem)]' : 'text-[clamp(2.1rem,5.5vw,3.6rem)]'}`}>
                {name
                  ? <AnimatedName text={name} startDelay={700 + i * 220} />
                  : <span className="italic text-white/45">Belum ditentukan</span>}
              </p>
            </div>
          );
        })}
      </div>

      {(s.sermon_theme || s.notes) && (
        <div className="mt-6 animate-rise-in rounded-3xl bg-gradient-to-r from-gold-400/20 to-gold-400/5 p-5 text-center ring-1 ring-gold-400/30 [animation-delay:1200ms]">
          {s.sermon_theme && (
            <p className={`font-semibold ${big ? 'text-3xl' : 'text-lg sm:text-xl'}`}>
              <BookOpen className="mr-2 inline size-5 -translate-y-0.5 text-gold-300" />Tema khutbah: <i className="text-gold-300">“{s.sermon_theme}”</i>
            </p>
          )}
          {s.notes && <p className={`mt-1 text-emerald-50/75 ${big ? 'text-xl' : 'text-sm'}`}>{s.notes}</p>}
        </div>
      )}
    </div>
  );
}

export default function FridayOfficersPage() {
  const { settings } = useSettings();
  const { isAdmin } = useAuth();
  const today = todayISO(settings.timezone);
  const q = useQuery(() => getFridaySchedules({ from: today, ascending: true, limit: 6 }), [today], { topics: ['friday'], refreshMs: 120_000 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [presenting, setPresenting] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const list = q.data ?? [];
  const sel = useMemo(() => list.find((x) => x.id === selectedId) ?? list[0], [list, selectedId]);

  const openPresentation = useCallback(async () => {
    setPresenting(true);
    try { await document.documentElement.requestFullscreen?.(); } catch { /* tidak didukung */ }
  }, []);
  const closePresentation = useCallback(async () => {
    setPresenting(false);
    if (document.fullscreenElement) { try { await document.exitFullscreen(); } catch { /* abaikan */ } }
  }, []);
  useEffect(() => {
    if (!presenting) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') void closePresentation(); };
    const onFs = () => { if (!document.fullscreenElement) setPresenting(false); };
    document.addEventListener('keydown', onKey);
    document.addEventListener('fullscreenchange', onFs);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('fullscreenchange', onFs); };
  }, [presenting, closePresentation]);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3.5">
          <div className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-800 text-gold-300 shadow-soft"><Users className="size-6" /></div>
          <div>
            <h1 className="font-display text-3xl font-bold text-emerald-950 sm:text-[2.1rem]">Petugas Jumat</h1>
            <p className="text-sm text-slate-500">Tampilan besar petugas sholat Jumat pekan ini</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {isAdmin && <Link to="/jumat" className="btn-outline"><Pencil className="size-4" /> Kelola jadwal</Link>}
          {isAdmin && <Link to="/jumat?tab=pengingat" className="btn bg-[#25D366] text-white hover:bg-[#1ebe5a]"><MessageCircle className="size-4" /> Pengingat WA</Link>}
          {sel && <button className="btn-gold" onClick={openPresentation}><Maximize className="size-4" /> Layar penuh</button>}
        </div>
      </div>

      {list.length > 1 && (
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
          {list.map((x) => (
            <button key={x.id} onClick={() => setSelectedId(x.id)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${sel?.id === x.id ? 'bg-emerald-700 text-white shadow' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-emerald-300'}`}>
              {parseISODate(x.friday_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', timeZone: 'UTC' })}
            </button>
          ))}
        </div>
      )}

      {!isSupabaseConfigured ? <div className="card"><EmptyState title="Belum terhubung ke database" /></div>
        : q.loading && !q.data ? <LoadingBlock />
        : q.error ? <ErrorState message={q.error} onRetry={() => q.reload()} />
        : !sel ? (
          <div className="card"><EmptyState icon={Users} title="Jadwal Jumat berikutnya belum diisi" description="Petugas Jumat dimasukkan oleh administrator di menu Sholat Jumat."
            action={isAdmin ? <Link to="/jumat" className="btn-primary">Isi jadwal Jumat</Link> : undefined} /></div>
        ) : (
          <div ref={stageRef} className="bg-islamic relative overflow-hidden rounded-[32px] px-5 py-8 text-white shadow-lift sm:px-10 sm:py-12">
            <div className="pattern-overlay pointer-events-none absolute inset-0 opacity-[0.08]" />
            <StarOrnament className="pointer-events-none absolute -left-24 -top-24 size-80 animate-spin-slow text-gold-400/10" />
            <StarOrnament className="pointer-events-none absolute -bottom-28 -right-24 size-96 animate-spin-slow text-gold-400/10 [animation-direction:reverse]" />
            <div className="pointer-events-none absolute left-1/2 top-6 hidden -translate-x-1/2 animate-float opacity-30 sm:block"><LogoMark className="size-10" /></div>
            <div key={sel.id} className="relative"><Showcase s={sel} big={false} tz={settings.timezone} hijriOffset={settings.hijri_offset} /></div>
          </div>
        )}

      {presenting && sel && (
        <div className="bg-islamic fixed inset-0 z-[95] flex flex-col overflow-y-auto text-white">
          <div className="pattern-overlay pointer-events-none fixed inset-0 opacity-[0.08]" />
          <StarOrnament className="pointer-events-none fixed -left-32 -top-32 size-[28rem] animate-spin-slow text-gold-400/10" />
          <StarOrnament className="pointer-events-none fixed -bottom-40 -right-32 size-[32rem] animate-spin-slow text-gold-400/10 [animation-direction:reverse]" />
          <div className="relative flex items-center justify-between px-8 pt-6">
            <div className="flex items-center gap-3"><LogoMark className="size-12" /><p className="font-display text-3xl font-bold">{settings.name}</p></div>
            <button onClick={closePresentation} className="flex items-center gap-2 rounded-xl bg-black/30 px-4 py-2 text-sm font-semibold hover:bg-black/50"><Minimize className="size-4" /> Keluar <X className="size-4" /></button>
          </div>
          <div key={`p-${sel.id}`} className="relative mx-auto my-auto w-full max-w-[1500px] px-8 py-8"><Showcase s={sel} big tz={settings.timezone} hijriOffset={settings.hijri_offset} /></div>
        </div>
      )}
    </div>
  );
}
