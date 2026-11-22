import {
  ArrowDownRight, ArrowRight, ArrowUpRight, BookOpen, CalendarDays, Clock4, Info, Landmark, MapPin,
  Megaphone, MonitorPlay, Users, Wallet,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { TV_URL } from '../components/nav';
import { IncomeExpenseChart } from '../components/FinanceChart';
import { LogoMark } from '../components/Logo';
import { PrayerCards } from '../components/PrayerWidgets';
import { AnimatedNumber, Badge, EmptyState, ErrorState, Skeleton } from '../components/ui';
import { usePrayerStatus } from '../hooks/usePrayerStatus';
import { useQuery } from '../hooks/useQuery';
import { getActivities, getAnnouncements, getFinanceMonthly, getFinanceSummary, getNextFriday } from '../lib/api';
import { ACTIVITY_CATEGORY, ANNOUNCEMENT_CATEGORY, CALC_METHODS, PRAYER_LABEL, TIMEZONE_LABEL } from '../lib/constants';
import {
  formatClock, formatCountdown, formatDate, formatDateLong, formatDayShort, hhmm, hijriDate, rupiah, todayISO,
} from '../lib/format';
import { formatPrayerTime } from '../lib/prayer';
import { isSupabaseConfigured } from '../lib/supabase';

function monthRange(iso: string) {
  const [y, m] = iso.split('-').map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { start: `${iso.slice(0, 7)}-01`, end: `${iso.slice(0, 7)}-${String(last).padStart(2, '0')}` };
}

function SectionTitle({ icon: Icon, title, to, linkLabel = 'Lihat semua' }: { icon: React.ComponentType<{ className?: string }>; title: string; to?: string; linkLabel?: string }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="flex min-w-0 items-center gap-2 font-display text-[1.3rem] font-bold leading-tight text-emerald-950 sm:text-[1.45rem]">
        <Icon className="size-5 shrink-0 text-gold-600" /> {title}
      </h2>
      {to && <Link to={to} className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-sm font-semibold text-emerald-700 hover:text-emerald-900">{linkLabel} <ArrowRight className="size-4" /></Link>}
    </div>
  );
}

function Hero() {
  const { now, settings, status, remainingMs } = usePrayerStatus();
  const tz = settings.timezone;
  const iso = todayISO(tz, now);
  return (
    <section className="bg-islamic relative overflow-hidden rounded-[28px] p-5 text-white shadow-lift sm:p-8">
      <div className="pattern-overlay pointer-events-none absolute inset-0 opacity-[0.08]" />
      <div className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full border border-gold-400/15" />
      <div className="pointer-events-none absolute -right-10 -top-10 size-52 rounded-full border border-gold-400/20" />
      <div className="relative grid gap-6 lg:grid-cols-[1.25fr_1fr] lg:items-center">
        <div>
          <div className="flex items-center gap-4">
            <LogoMark className="size-16 shadow-lg sm:size-20" />
            <div>
              <p className="font-arabic text-lg text-gold-300 sm:text-xl">مسجد دار السلام</p>
              <h1 className="font-display text-3xl font-bold leading-none sm:text-5xl">{settings.name}</h1>
              <p className="mt-1.5 flex items-start gap-1.5 text-sm text-emerald-50/80">
                <MapPin className="mt-0.5 size-4 shrink-0 text-gold-300" />
                {settings.address}, {settings.district}, {settings.regency}, {settings.province}
              </p>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap items-end gap-x-6 gap-y-2">
            <p className="font-display text-6xl font-bold leading-none tabular sm:text-7xl" aria-live="off">{formatClock(now, tz)}</p>
            <div className="pb-1">
              <p className="text-base font-semibold">{formatDateLong(iso)}</p>
              <p className="text-sm text-gold-300">{hijriDate(now, tz, settings.hijri_offset)} · {TIMEZONE_LABEL[tz]}</p>
            </div>
          </div>
        </div>
        <div className="rounded-3xl bg-white/[0.07] p-5 ring-1 ring-white/12 backdrop-blur-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-300">Sholat berikutnya</p>
          <div className="mt-2 flex items-end justify-between gap-3">
            <div>
              <p className="font-display text-4xl font-bold">{PRAYER_LABEL[status.next.key]}</p>
              <p className="text-sm text-emerald-50/75">{status.next.isTomorrow ? 'Besok, ' : 'Pukul '}{formatPrayerTime(status.next.at, tz)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-emerald-50/70">Hitung mundur</p>
              <p className="font-display text-4xl font-bold tabular gold-text sm:text-5xl">{formatCountdown(remainingMs)}</p>
            </div>
          </div>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-gradient-to-r from-gold-500 to-gold-300 transition-all" style={{ width: `${Math.max(3, 100 - Math.min(100, remainingMs / (6 * 3600_000) * 100))}%` }} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link to="/jadwal-salat" className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/15"><Clock4 className="size-4" /> Jadwal bulanan</Link>
            <a href={TV_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-xl bg-gold-400 px-3 py-2 text-xs font-bold text-emerald-950 hover:bg-gold-300"><MonitorPlay className="size-4" /> Mode TV</a>
          </div>
        </div>
      </div>
    </section>
  );
}

function PrayerSection() {
  const { settings, status } = usePrayerStatus();
  return (
    <section>
      <SectionTitle icon={Clock4} title="Jadwal Sholat Hari Ini" to="/jadwal-salat" linkLabel="Detail" />
      <PrayerCards status={status} tz={settings.timezone} />
      <p className="mt-3 flex items-start gap-1.5 text-xs text-slate-500">
        <Info className="mt-0.5 size-3.5 shrink-0" />
        <span>
          Dihitung otomatis dengan metode <b>{CALC_METHODS[settings.calc_method].label}</b> untuk koordinat {Number(settings.latitude).toFixed(4)}, {Number(settings.longitude).toFixed(4)} ({TIMEZONE_LABEL[settings.timezone]}).
          {!settings.coordinates_verified && <span className="text-amber-700"> Koordinat masih perkiraan — admin perlu memperbaruinya di Pengaturan.</span>}
        </span>
      </p>
    </section>
  );
}

function FridayCard() {
  const today = todayISO();
  const q = useQuery(() => getNextFriday(today), [today], { topics: ['friday'] });
  const f = q.data;
  const rows: [string, string | undefined][] = f ? [
    ['Imam', f.imam?.full_name], ['Khatib', f.khatib?.full_name], ['Bilal', f.bilal?.full_name],
  ] : [];
  return (
    <div className="card relative h-full overflow-hidden p-5">
      <SectionTitle icon={Users} title="Sholat Jumat" to="/jumat" />
      {!isSupabaseConfigured ? <EmptyState title="Belum terhubung ke database" />
        : q.loading ? <div className="space-y-3"><Skeleton className="h-6 w-2/3" /><Skeleton className="h-24" /></div>
        : q.error ? <ErrorState message={q.error} onRetry={() => q.reload()} />
        : !f ? <EmptyState icon={Users} title="Jadwal Jumat belum diisi" description="Administrator belum memasukkan jadwal petugas Jumat berikutnya." />
        : (
          <div>
            <div className="mb-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-cream-100 p-4 ring-1 ring-emerald-900/5">
              <p className="text-sm font-semibold text-emerald-800">{formatDateLong(f.friday_date)}</p>
              <p className="text-xs text-slate-500">Pukul {hhmm(f.start_time)} WITA</p>
              {f.sermon_theme && <p className="mt-2 flex items-start gap-1.5 text-sm text-slate-700"><BookOpen className="mt-0.5 size-4 shrink-0 text-gold-600" /> <span>Tema: <i>{f.sermon_theme}</i></span></p>}
            </div>
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {rows.map(([role, name]) => (
                <div key={role} className="rounded-xl border border-slate-100 p-3">
                  <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{role}</dt>
                  <dd className={`mt-0.5 text-sm font-semibold ${name ? 'text-slate-800' : 'text-slate-400 italic'}`}>{name ?? 'Belum ditentukan'}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
    </div>
  );
}

function FinanceSection() {
  const today = todayISO();
  const { start, end } = monthRange(today);
  const total = useQuery(() => getFinanceSummary(null, null), [], { topics: ['finance'] });
  const month = useQuery(() => getFinanceSummary(start, end), [start, end], { topics: ['finance'] });
  const chart = useQuery(() => getFinanceMonthly(6), [], { topics: ['finance'] });
  const cards = [
    { label: 'Saldo Kas Saat Ini', value: total.data?.closing_balance, icon: Landmark, tone: 'hero' as const },
    { label: 'Pemasukan Bulan Ini', value: month.data?.total_income, icon: ArrowUpRight, tone: 'in' as const },
    { label: 'Pengeluaran Bulan Ini', value: month.data?.total_expense, icon: ArrowDownRight, tone: 'out' as const },
  ];
  const loading = total.loading || month.loading;
  const error = total.error || month.error;
  return (
    <section>
      <SectionTitle icon={Wallet} title="Ringkasan Keuangan" to="/keuangan" linkLabel="Detail kas" />
      {!isSupabaseConfigured ? <div className="card"><EmptyState icon={Wallet} title="Data keuangan belum tersedia" description="Hubungkan aplikasi ke Supabase agar saldo kas tampil. Saldo tidak pernah diisi dengan data contoh." /></div>
        : error ? <ErrorState message={error} onRetry={() => { total.reload(); month.reload(); }} />
        : (
          <div className="grid gap-4 lg:grid-cols-[1fr_1.35fr]">
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              {cards.map(({ label, value, icon: Icon, tone }) => (
                <div key={label} className={`relative overflow-hidden rounded-2xl p-5 ${tone === 'hero' ? 'bg-islamic text-white shadow-lift' : 'card'}`}>
                  {tone === 'hero' && <div className="pattern-overlay pointer-events-none absolute inset-0 opacity-10" />}
                  <div className="relative flex items-center justify-between">
                    <p className={`text-sm font-semibold ${tone === 'hero' ? 'text-emerald-50/85' : 'text-slate-500'}`}>{label}</p>
                    <div className={`grid size-9 place-items-center rounded-xl ${tone === 'hero' ? 'bg-white/12 text-gold-300' : tone === 'in' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                      <Icon className="size-5" />
                    </div>
                  </div>
                  {loading ? <Skeleton className={`relative mt-3 h-9 w-3/4 ${tone === 'hero' ? 'bg-white/15' : ''}`} /> : (
                    <p className={`relative mt-2 font-display text-[2rem] font-bold leading-tight ${tone === 'hero' ? 'gold-text' : 'text-emerald-950'}`}>
                      <AnimatedNumber value={value ?? 0} format={rupiah} />
                    </p>
                  )}
                  {tone === 'hero' && <p className="relative mt-1 text-xs text-emerald-50/65">Saldo awal + seluruh pemasukan − seluruh pengeluaran</p>}
                </div>
              ))}
            </div>
            <div className="card p-5">
              <p className="mb-2 text-sm font-semibold text-slate-600">Pemasukan & pengeluaran 6 bulan terakhir</p>
              {chart.loading ? <Skeleton className="h-[260px]" /> : chart.error ? <ErrorState message={chart.error} /> : (
                <IncomeExpenseChart data={(chart.data ?? []).map((m) => ({
                  label: new Date(m.month_start + 'T12:00:00Z').toLocaleDateString('id-ID', { month: 'short', timeZone: 'UTC' }),
                  income: m.total_income, expense: m.total_expense,
                }))} />
              )}
            </div>
          </div>
        )}
    </section>
  );
}

function AnnouncementsCard() {
  const q = useQuery(() => getAnnouncements({ limit: 3 }), [], { topics: ['announcements'] });
  return (
    <div className="card h-full p-5">
      <SectionTitle icon={Megaphone} title="Pengumuman Terbaru" to="/pengumuman" />
      {!isSupabaseConfigured ? <EmptyState title="Belum terhubung ke database" />
        : q.loading ? <div className="space-y-3"><Skeleton className="h-16" /><Skeleton className="h-16" /></div>
        : q.error ? <ErrorState message={q.error} onRetry={() => q.reload()} />
        : !q.data?.length ? <EmptyState icon={Megaphone} title="Belum ada pengumuman" />
        : (
          <ul className="space-y-3">
            {q.data.map((a) => (
              <li key={a.id} className="rounded-2xl border border-slate-100 p-4 transition hover:border-emerald-200 hover:bg-emerald-50/30">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <Badge tone={a.category === 'berita_duka' ? 'slate' : a.category === 'penting' ? 'rose' : 'emerald'}>{ANNOUNCEMENT_CATEGORY[a.category]}</Badge>
                  {a.is_pinned && <Badge tone="gold">Disematkan</Badge>}
                  <span className="text-xs text-slate-400">{formatDate(a.publish_at.slice(0, 10))}</span>
                </div>
                <p className="font-semibold text-slate-800">{a.title}</p>
                <p className="mt-0.5 line-clamp-2 text-sm text-slate-500">{a.content}</p>
              </li>
            ))}
          </ul>
        )}
    </div>
  );
}

function AgendaCard() {
  const today = todayISO();
  const q = useQuery(() => getActivities({ from: today, limit: 4 }), [today], { topics: ['activities'] });
  const items = (q.data ?? []).filter((a) => a.status !== 'dibatalkan');
  return (
    <div className="card h-full p-5">
      <SectionTitle icon={CalendarDays} title="Agenda Mendatang" to="/agenda" />
      {!isSupabaseConfigured ? <EmptyState title="Belum terhubung ke database" />
        : q.loading ? <div className="space-y-3"><Skeleton className="h-16" /><Skeleton className="h-16" /></div>
        : q.error ? <ErrorState message={q.error} onRetry={() => q.reload()} />
        : !items.length ? <EmptyState icon={CalendarDays} title="Belum ada agenda mendatang" />
        : (
          <ul className="space-y-3">
            {items.map((a) => {
              const [, , d] = a.activity_date.split('-');
              return (
                <li key={a.id} className="flex gap-4 rounded-2xl border border-slate-100 p-3.5">
                  <div className="grid w-14 shrink-0 place-items-center rounded-xl bg-emerald-700 py-2 text-white">
                    <span className="font-display text-2xl font-bold leading-none">{Number(d)}</span>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-gold-300">{formatDayShort(a.activity_date).split(',')[0]}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800">{a.title}</p>
                    <p className="text-xs text-slate-500">{formatDate(a.activity_date)} · {hhmm(a.start_time)}{a.end_time ? `–${hhmm(a.end_time)}` : ''} WITA{a.location ? ` · ${a.location}` : ''}</p>
                    <Badge tone="sky" className="mt-1.5">{ACTIVITY_CATEGORY[a.category]}</Badge>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
    </div>
  );
}

export default function Dashboard() {
  return (
    <div className="space-y-8">
      <Hero />
      <PrayerSection />
      <div className="grid gap-6 lg:grid-cols-2">
        <FridayCard />
        <AnnouncementsCard />
      </div>
      <FinanceSection />
      <AgendaCard />
    </div>
  );
}
