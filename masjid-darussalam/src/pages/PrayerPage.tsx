import { ChevronLeft, ChevronRight, Clock4, ExternalLink, History, Info, Pencil, RotateCcw, Settings2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminOnly } from '../components/AdminGate';
import { AuditList } from '../components/AuditList';
import { PrayerCards } from '../components/PrayerWidgets';
import { Badge, ErrorState, Field, Modal, PageHeader, useConfirm } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import { usePrayerStatus } from '../hooks/usePrayerStatus';
import { useQuery } from '../hooks/useQuery';
import { deletePrayerOverride, friendlyError, getPrayerOverrides, upsertPrayerOverride } from '../lib/api';
import { ALL_TIME_KEYS, CALC_METHODS, PRAYER_LABEL, TIMEZONE_LABEL, type TimeKey } from '../lib/constants';
import { emitDataChanged } from '../lib/events';
import { formatCountdown, formatDateLong, formatMonthYear, hijriDate, parseISODate, todayISO } from '../lib/format';
import { computeDay, computeMonth, formatPrayerTime, methodDescription, type DaySchedule } from '../lib/prayer';
import type { PrayerOverride } from '../lib/types';

function OverrideModal({ day, existing, onClose, onSaved }: { day: DaySchedule; existing?: PrayerOverride; onClose: () => void; onSaved: () => void }) {
  const { settings } = useSettings();
  const toast = useToast();
  const auto = computeDay(day.date, settings, null);
  const [vals, setVals] = useState<Record<TimeKey, string>>(() => Object.fromEntries(
    ALL_TIME_KEYS.map((k) => [k, existing?.[k]?.slice(0, 5) ?? '']),
  ) as Record<TimeKey, string>);
  const [note, setNote] = useState(existing?.note ?? '');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const any = Object.values(vals).some(Boolean);

  async function save() {
    if (!any) { toast.error('Isi minimal satu waktu sholat manual.'); return; }
    setSaving(true);
    try {
      await upsertPrayerOverride({
        schedule_date: day.date,
        subuh: vals.subuh || null, terbit: vals.terbit || null, zuhur: vals.zuhur || null,
        asar: vals.asar || null, magrib: vals.magrib || null, isya: vals.isya || null,
        note: note.trim() || null, change_reason: reason.trim() || null,
      } as Omit<PrayerOverride, 'id' | 'updated_at'>);
      toast.success('Jadwal manual berhasil disimpan.');
      emitDataChanged('prayer');
      onSaved();
    } catch (e) { toast.error(friendlyError(e)); } finally { setSaving(false); }
  }

  return (
    <Modal open onClose={onClose} title={`Jadwal Manual — ${formatDateLong(day.date)}`} size="lg"
      footer={<><button className="btn-outline" onClick={onClose}>Batal</button><button className="btn-primary" disabled={saving} onClick={save}>{saving ? 'Menyimpan…' : 'Simpan Jadwal'}</button></>}>
      <p className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">
        Kosongkan kolom untuk memakai waktu hasil perhitungan otomatis. Waktu dalam {TIMEZONE_LABEL[settings.timezone]}.
      </p>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {ALL_TIME_KEYS.map((k) => (
          <Field key={k} label={PRAYER_LABEL[k]} hint={`Otomatis: ${formatPrayerTime(auto.times[k], settings.timezone)}`}>
            <input type="time" className="input tabular" value={vals[k]} onChange={(e) => setVals({ ...vals, [k]: e.target.value })} />
          </Field>
        ))}
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="Catatan (tampil ke jamaah)"><input className="input" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Mis. menyesuaikan jadwal Kemenag" /></Field>
        <Field label="Alasan perubahan (untuk riwayat)"><input className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Mis. koreksi dari Kemenag Kukar" /></Field>
      </div>
    </Modal>
  );
}

export default function PrayerPage() {
  const { settings, now, status, remainingMs } = usePrayerStatus();
  const { isAdmin } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const tz = settings.timezone;
  const today = todayISO(tz, now);
  const [ym, setYm] = useState(() => today.slice(0, 7));
  const [y, m] = ym.split('-').map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const ov = useQuery(() => getPrayerOverrides(`${ym}-01`, `${ym}-${last}`), [ym, last], { topics: ['prayer'] });
  const overrides = ov.data ?? [];
  const days = useMemo(() => computeMonth(y, m, settings, overrides), [y, m, settings, overrides]);
  const [editing, setEditing] = useState<DaySchedule | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const shift = (delta: number) => {
    const d = new Date(Date.UTC(y, m - 1 + delta, 1));
    setYm(d.toISOString().slice(0, 7));
  };

  async function resetDay(o: PrayerOverride) {
    const r = await confirm({ title: 'Kembalikan ke jadwal otomatis?', message: `Jadwal manual tanggal ${formatDateLong(o.schedule_date)} akan dihapus dan kembali memakai hasil perhitungan.`, confirmLabel: 'Ya, kembalikan', tone: 'danger' });
    if (!r.ok) return;
    try { await deletePrayerOverride(o.id); toast.success('Jadwal dikembalikan ke perhitungan otomatis.'); emitDataChanged('prayer'); }
    catch (e) { toast.error(friendlyError(e)); }
  }

  return (
    <div>
      <PageHeader icon={Clock4} title="Jadwal Sholat" subtitle={`${formatDateLong(today)} · ${hijriDate(now, tz, settings.hijri_offset)}`}
        actions={<AdminOnly>
          <button className="btn-outline" onClick={() => setShowHistory(true)}><History className="size-4" /> Riwayat Perubahan</button>
          <Link to="/pengaturan#jadwal" className="btn-primary"><Settings2 className="size-4" /> Metode & Koreksi</Link>
        </AdminOnly>} />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-soft ring-1 ring-emerald-900/5">
        <p className="text-sm text-slate-600">Menuju <b className="text-emerald-800">{PRAYER_LABEL[status.next.key]}</b>{status.next.isTomorrow ? ' (besok)' : ''} pukul <b>{formatPrayerTime(status.next.at, tz)}</b></p>
        <p className="font-display text-3xl font-bold text-emerald-800 tabular">{formatCountdown(remainingMs)}</p>
      </div>
      <PrayerCards status={status} tz={tz} />
      {status.today.note && <p className="mt-3 text-sm text-amber-800">Catatan hari ini: {status.today.note}</p>}

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-4">
            <h2 className="font-display text-xl font-bold text-emerald-950">Jadwal {formatMonthYear(`${ym}-01`)}</h2>
            <div className="flex gap-1">
              <button className="btn-outline px-2.5" onClick={() => shift(-1)} aria-label="Bulan sebelumnya"><ChevronLeft className="size-4" /></button>
              <button className="btn-outline px-3" onClick={() => setYm(today.slice(0, 7))}>Bulan ini</button>
              <button className="btn-outline px-2.5" onClick={() => shift(1)} aria-label="Bulan berikutnya"><ChevronRight className="size-4" /></button>
            </div>
          </div>
          {ov.error && <div className="p-4"><ErrorState message={`Jadwal manual gagal dimuat: ${ov.error}`} onRetry={() => ov.reload()} /></div>}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-emerald-950 text-left text-xs uppercase tracking-wider text-emerald-50">
                <tr>
                  <th className="px-4 py-3">Tanggal</th>
                  {ALL_TIME_KEYS.map((k) => <th key={k} className="px-3 py-3 text-center">{PRAYER_LABEL[k]}</th>)}
                  {isAdmin && <th className="px-3 py-3 text-right">Aksi</th>}
                </tr>
              </thead>
              <tbody>
                {days.map((d) => {
                  const isToday = d.date === today;
                  const isFri = parseISODate(d.date).getUTCDay() === 5;
                  const o = overrides.find((x) => x.schedule_date === d.date);
                  return (
                    <tr key={d.date} className={`border-b border-slate-100 ${isToday ? 'bg-gold-300/20 font-semibold' : isFri ? 'bg-emerald-50/50' : 'hover:bg-slate-50'}`}>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="w-24 text-slate-700">{parseISODate(d.date).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })}</span>
                          {isToday && <Badge tone="gold">Hari ini</Badge>}
                          {o && <Badge tone="gold" className="hidden sm:inline-flex">Manual</Badge>}
                        </div>
                        <span className="text-[11px] font-normal text-slate-400">{hijriDate(parseISODate(d.date), 'UTC', settings.hijri_offset)}</span>
                      </td>
                      {ALL_TIME_KEYS.map((k) => (
                        <td key={k} className={`px-3 py-2.5 text-center tabular ${d.manual[k] ? 'font-bold text-amber-700' : k === 'terbit' ? 'text-slate-400' : 'text-slate-700'}`}>
                          {formatPrayerTime(d.times[k], tz)}
                        </td>
                      ))}
                      {isAdmin && (
                        <td className="px-3 py-2 text-right whitespace-nowrap">
                          <button className="btn-ghost px-2 py-1.5" onClick={() => setEditing(d)} title="Atur jadwal manual"><Pencil className="size-4" /></button>
                          {o && <button className="btn-ghost px-2 py-1.5 text-rose-600" onClick={() => resetDay(o)} title="Kembalikan ke otomatis"><RotateCcw className="size-4" /></button>}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="p-4 text-xs text-slate-500">Waktu berwarna <b className="text-amber-700">jingga</b> adalah jadwal manual dari administrator. Baris hijau muda = hari Jumat.</p>
        </div>

        <aside className="space-y-4">
          <div className="card p-5">
            <h3 className="mb-3 flex items-center gap-2 font-display text-lg font-bold text-emerald-950"><Info className="size-5 text-gold-600" /> Sumber & Metode</h3>
            <dl className="space-y-3 text-sm">
              <div><dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">Metode</dt><dd className="font-semibold text-slate-800">{CALC_METHODS[settings.calc_method].label}</dd><dd className="text-slate-600">{methodDescription(settings)}</dd></div>
              <div><dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">Koordinat masjid</dt>
                <dd className="tabular text-slate-800">{Number(settings.latitude).toFixed(6)}, {Number(settings.longitude).toFixed(6)}</dd>
                <dd>{settings.coordinates_verified ? <Badge>Terverifikasi admin</Badge> : <Badge tone="gold">Masih perkiraan</Badge>}</dd>
              </div>
              <div><dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">Zona waktu</dt><dd className="text-slate-800">{settings.timezone} — {TIMEZONE_LABEL[settings.timezone]}</dd></div>
              <div><dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">Koreksi menit</dt>
                <dd className="tabular text-slate-700">{ALL_TIME_KEYS.map((k) => `${PRAYER_LABEL[k]} ${settings[`adj_${k}` as const] >= 0 ? '+' : ''}${settings[`adj_${k}` as const]}`).join(' · ')}</dd></div>
              <div><dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">Mesin perhitungan</dt>
                <dd className="text-slate-600">Perhitungan astronomis pustaka sumber terbuka <a className="font-semibold text-emerald-700 underline" href="https://github.com/batoulapps/adhan-js" target="_blank" rel="noreferrer">adhan-js</a>. Tanggal Hijriah memakai kalender Umm al-Qura{settings.hijri_offset ? ` (koreksi ${settings.hijri_offset > 0 ? '+' : ''}${settings.hijri_offset} hari)` : ''}.</dd></div>
            </dl>
            <a href="https://bimasislam.kemenag.go.id/jadwalshalat" target="_blank" rel="noreferrer" className="btn-outline mt-4 w-full"><ExternalLink className="size-4" /> Bandingkan dengan Kemenag RI</a>
          </div>
        </aside>
      </div>

      {editing && <OverrideModal day={editing} existing={overrides.find((o) => o.schedule_date === editing.date)} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); void ov.reload(true); }} />}
      <Modal open={showHistory} onClose={() => setShowHistory(false)} title="Riwayat Perubahan Jadwal Sholat" size="lg">
        {showHistory && <AuditList table={['prayer_schedules', 'mosque_settings']} describe={(d) => d.schedule_date ? `Jadwal manual ${formatDateLong(String(d.schedule_date))}` : 'Pengaturan masjid / metode jadwal'} />}
      </Modal>
    </div>
  );
}
