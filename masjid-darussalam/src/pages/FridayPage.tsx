import { BookOpen, CalendarPlus, History, Maximize, Pencil, Plus, Trash2, UserPlus, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { AdminOnly } from '../components/AdminGate';
import { Badge, EmptyState, ErrorState, Field, LoadingBlock, Modal, PageHeader, useConfirm } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import { useQuery } from '../hooks/useQuery';
import {
  deleteFridaySchedule, deleteOfficer, friendlyError, getFridaySchedules, getOfficers, getOfficerStats, saveFridaySchedule, saveOfficer,
} from '../lib/api';
import { ROLE_LABEL } from '../lib/constants';
import { emitDataChanged } from '../lib/events';
import { addDaysISO, formatDate, formatDateLong, hhmm, parseISODate, todayISO } from '../lib/format';
import { isSupabaseConfigured } from '../lib/supabase';
import type { FridayOfficer, FridaySchedule, OfficerRole } from '../lib/types';

const ROLES: OfficerRole[] = ['imam', 'khatib', 'bilal', 'muazin'];

function nextFridayISO(from: string) {
  const dow = parseISODate(from).getUTCDay();
  return addDaysISO(from, (5 - dow + 7) % 7);
}

function ScheduleModal({ initial, officers, onClose }: { initial: Partial<FridaySchedule>; officers: FridayOfficer[]; onClose: () => void }) {
  const toast = useToast();
  const [f, setF] = useState<Partial<FridaySchedule>>(initial);
  const [saving, setSaving] = useState(false);
  const isFriday = f.friday_date ? parseISODate(f.friday_date).getUTCDay() === 5 : false;
  const set = (patch: Partial<FridaySchedule>) => setF((x) => ({ ...x, ...patch }));

  async function save() {
    if (!f.friday_date || !isFriday) { toast.error('Pilih tanggal yang jatuh pada hari Jumat.'); return; }
    setSaving(true);
    try {
      await saveFridaySchedule({
        id: f.id, friday_date: f.friday_date, start_time: f.start_time || '12:00',
        imam_id: f.imam_id || null, khatib_id: f.khatib_id || null, bilal_id: f.bilal_id || null, muazin_id: f.muazin_id || null,
        sermon_theme: f.sermon_theme?.trim() || null, notes: f.notes?.trim() || null,
      });
      toast.success(f.id ? 'Jadwal Jumat diperbarui.' : 'Jadwal Jumat ditambahkan.');
      emitDataChanged('friday');
      onClose();
    } catch (e) { toast.error(friendlyError(e)); } finally { setSaving(false); }
  }

  return (
    <Modal open onClose={onClose} title={f.id ? 'Edit Jadwal Jumat' : 'Tambah Jadwal Jumat'} size="lg"
      footer={<><button className="btn-outline" onClick={onClose}>Batal</button><button className="btn-primary" disabled={saving} onClick={save}>{saving ? 'Menyimpan…' : 'Simpan'}</button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tanggal Jumat" required hint={f.friday_date ? (isFriday ? formatDateLong(f.friday_date) : '⚠ Tanggal ini bukan hari Jumat') : undefined}>
          <input type="date" className="input" value={f.friday_date ?? ''} onChange={(e) => set({ friday_date: e.target.value })} />
        </Field>
        <Field label="Waktu pelaksanaan (WITA)" required>
          <input type="time" className="input" value={hhmm(f.start_time) === '—' ? '' : hhmm(f.start_time)} onChange={(e) => set({ start_time: e.target.value })} />
        </Field>
        {ROLES.map((r) => {
          const key = `${r}_id` as const;
          const opts = officers.filter((o) => o.roles.includes(r) && (o.is_active || o.id === f[key]));
          return (
            <Field key={r} label={ROLE_LABEL[r]} hint={opts.length ? undefined : `Belum ada petugas dengan peran ${ROLE_LABEL[r].toLowerCase()}. Tambahkan di tab Petugas.`}>
              <select className="input" value={f[key] ?? ''} onChange={(e) => set({ [key]: e.target.value || null } as Partial<FridaySchedule>)}>
                <option value="">— Belum ditentukan —</option>
                {opts.map((o) => <option key={o.id} value={o.id}>{o.full_name}</option>)}
              </select>
            </Field>
          );
        })}
        <Field label="Tema khutbah" className="sm:col-span-2">
          <input className="input" maxLength={200} value={f.sermon_theme ?? ''} onChange={(e) => set({ sermon_theme: e.target.value })} />
        </Field>
        <Field label="Catatan tambahan" className="sm:col-span-2">
          <textarea className="input min-h-20" maxLength={500} value={f.notes ?? ''} onChange={(e) => set({ notes: e.target.value })} />
        </Field>
      </div>
    </Modal>
  );
}

function OfficerModal({ initial, onClose }: { initial: Partial<FridayOfficer>; onClose: () => void }) {
  const toast = useToast();
  const [f, setF] = useState<Partial<FridayOfficer>>({ roles: [], is_active: true, ...initial });
  const [saving, setSaving] = useState(false);
  async function save() {
    if (!f.full_name || f.full_name.trim().length < 2) { toast.error('Nama petugas wajib diisi.'); return; }
    if (!f.roles?.length) { toast.error('Pilih minimal satu peran.'); return; }
    setSaving(true);
    try {
      await saveOfficer({ id: f.id, full_name: f.full_name.trim(), roles: f.roles, notes: f.notes?.trim() || null, is_active: f.is_active ?? true });
      toast.success('Data petugas disimpan.');
      emitDataChanged('friday');
      onClose();
    } catch (e) { toast.error(friendlyError(e)); } finally { setSaving(false); }
  }
  return (
    <Modal open onClose={onClose} title={f.id ? 'Edit Petugas' : 'Tambah Petugas Jumat'}
      footer={<><button className="btn-outline" onClick={onClose}>Batal</button><button className="btn-primary" disabled={saving} onClick={save}>{saving ? 'Menyimpan…' : 'Simpan'}</button></>}>
      <div className="space-y-4">
        <Field label="Nama lengkap" required><input className="input" maxLength={100} value={f.full_name ?? ''} onChange={(e) => setF({ ...f, full_name: e.target.value })} /></Field>
        <div>
          <span className="label">Peran <span className="text-rose-500">*</span></span>
          <div className="flex flex-wrap gap-2">
            {ROLES.map((r) => {
              const on = f.roles?.includes(r);
              return (
                <button type="button" key={r} onClick={() => setF({ ...f, roles: on ? f.roles!.filter((x) => x !== r) : [...(f.roles ?? []), r] })}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold ring-1 transition ${on ? 'bg-emerald-700 text-white ring-emerald-700' : 'bg-white text-slate-600 ring-slate-200 hover:ring-emerald-300'}`}>
                  {ROLE_LABEL[r]}
                </button>
              );
            })}
          </div>
        </div>
        <Field label="Catatan"><input className="input" maxLength={300} value={f.notes ?? ''} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input type="checkbox" className="size-4 accent-emerald-700" checked={f.is_active ?? true} onChange={(e) => setF({ ...f, is_active: e.target.checked })} /> Petugas aktif
        </label>
      </div>
    </Modal>
  );
}

function ScheduleCard({ s, onEdit, onDelete, highlight }: { s: FridaySchedule; onEdit?: () => void; onDelete?: () => void; highlight?: boolean }) {
  const rows: [string, string | undefined][] = [['Imam', s.imam?.full_name], ['Khatib', s.khatib?.full_name], ['Bilal', s.bilal?.full_name], ['Muazin', s.muazin?.full_name]];
  return (
    <div className={`relative overflow-hidden rounded-2xl p-5 transition duration-300 hover:-translate-y-1 hover:shadow-lift ${highlight ? 'bg-islamic text-white shadow-lift sm:p-7' : 'card'}`}>
      {highlight && <div className="pattern-overlay pointer-events-none absolute inset-0 opacity-10" />}
      {highlight && <div className="pointer-events-none absolute -right-16 -top-16 size-56 animate-spin-slow rounded-full border border-dashed border-gold-400/30" />}
      <div className="relative flex items-start justify-between gap-3">
        <div>
          {highlight && <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-gold-300">Jumat berikutnya</p>}
          <p className={`font-display text-2xl font-bold ${highlight ? '' : 'text-emerald-950'}`}>{formatDateLong(s.friday_date)}</p>
          <p className={`text-sm ${highlight ? 'text-emerald-50/75' : 'text-slate-500'}`}>Pukul {hhmm(s.start_time)} WITA</p>
        </div>
        {(onEdit || onDelete) && (
          <div className="flex gap-1">
            {onEdit && <button onClick={onEdit} className={`rounded-lg p-2 ${highlight ? 'hover:bg-white/10' : 'text-slate-500 hover:bg-slate-100'}`} title="Edit"><Pencil className="size-4" /></button>}
            {onDelete && <button onClick={onDelete} className={`rounded-lg p-2 ${highlight ? 'text-rose-200 hover:bg-white/10' : 'text-rose-600 hover:bg-rose-50'}`} title="Hapus"><Trash2 className="size-4" /></button>}
          </div>
        )}
      </div>
      <dl className="relative mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {rows.map(([role, name], i) => (
          <div key={role} style={{ animationDelay: `${150 + i * 120}ms` }} className={`animate-rise-in rounded-xl p-3 ${highlight ? 'bg-white/8 ring-1 ring-white/10 sm:p-4' : 'bg-slate-50'}`}>
            <dt className={`text-[11px] font-semibold uppercase tracking-wider ${highlight ? 'text-gold-300' : 'text-slate-400'}`}>{role}</dt>
            <dd className={`font-semibold leading-tight ${highlight ? 'font-display text-2xl sm:text-3xl' : 'text-sm'} ${name ? (highlight ? 'gold-shimmer' : '') : 'italic opacity-60'}`}>{name ?? 'Belum ditentukan'}</dd>
          </div>
        ))}
      </dl>
      {(s.sermon_theme || s.notes) && (
        <div className={`relative mt-3 space-y-1 text-sm ${highlight ? 'text-emerald-50/85' : 'text-slate-600'}`}>
          {s.sermon_theme && <p className="flex items-start gap-1.5"><BookOpen className="mt-0.5 size-4 shrink-0 text-gold-400" /> Tema: <i>{s.sermon_theme}</i></p>}
          {s.notes && <p className="text-xs opacity-80">Catatan: {s.notes}</p>}
        </div>
      )}
    </div>
  );
}

export default function FridayPage() {
  const { isAdmin } = useAuth();
  const { settings } = useSettings();
  const toast = useToast();
  const confirm = useConfirm();
  const today = todayISO();
  const [tab, setTab] = useState<'upcoming' | 'history' | 'officers'>('upcoming');
  const upcoming = useQuery(() => getFridaySchedules({ from: today, ascending: true, limit: 12 }), [today], { topics: ['friday'] });
  const history = useQuery(() => getFridaySchedules({ to: addDaysISO(today, -1), ascending: false, limit: 52 }), [today], { topics: ['friday'], enabled: tab === 'history' });
  const officers = useQuery(getOfficers, [], { topics: ['friday'] });
  const stats = useQuery(getOfficerStats, [], { topics: ['friday'], enabled: tab === 'officers' });
  const [editSched, setEditSched] = useState<Partial<FridaySchedule> | null>(null);
  const [editOfficer, setEditOfficer] = useState<Partial<FridayOfficer> | null>(null);

  async function removeSchedule(s: FridaySchedule) {
    const r = await confirm({ title: 'Hapus jadwal Jumat?', message: `Jadwal ${formatDateLong(s.friday_date)} akan dihapus. Riwayat penghapusan tetap tercatat di audit log.`, tone: 'danger', confirmLabel: 'Hapus' });
    if (!r.ok) return;
    try { await deleteFridaySchedule(s.id); toast.success('Jadwal dihapus.'); emitDataChanged('friday'); } catch (e) { toast.error(friendlyError(e)); }
  }
  async function removeOfficer(o: FridayOfficer) {
    const r = await confirm({ title: 'Hapus petugas?', message: `${o.full_name} akan dihapus dari daftar petugas. Jika pernah bertugas, sebaiknya nonaktifkan saja agar riwayat tetap utuh.`, tone: 'danger', confirmLabel: 'Hapus' });
    if (!r.ok) return;
    try { await deleteOfficer(o.id); toast.success('Petugas dihapus.'); emitDataChanged('friday'); } catch (e) { toast.error(friendlyError(e)); }
  }

  const tabs = [
    { id: 'upcoming', label: 'Jadwal Mendatang', icon: CalendarPlus },
    { id: 'history', label: 'Riwayat Petugas', icon: History },
    { id: 'officers', label: 'Daftar Petugas', icon: Users },
  ] as const;

  const newSchedule = () => setEditSched({ friday_date: nextFridayISO(today), start_time: settings.friday_default_time });

  return (
    <div>
      <PageHeader icon={Users} title="Sholat Jumat" subtitle="Jadwal & petugas sholat Jumat Masjid Darussalam"
        actions={<>
          <Link to="/petugas-jumat" className="btn-gold"><Maximize className="size-4" /> Tampilan Besar Petugas</Link>
          <AdminOnly>
          <button className="btn-outline" onClick={() => setEditOfficer({})}><UserPlus className="size-4" /> Tambah Petugas</button>
          <button className="btn-primary" onClick={newSchedule}><Plus className="size-4" /> Tambah Jadwal</button>
          </AdminOnly>
        </>} />

      <div className="mb-5 flex gap-1 overflow-x-auto rounded-2xl bg-white p-1.5 shadow-soft ring-1 ring-emerald-900/5">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)} className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition duration-300 ${tab === id ? 'bg-emerald-700 text-white shadow' : 'text-slate-600 hover:bg-emerald-50'}`}>
            <Icon className="size-4" /> {label}
          </button>
        ))}
      </div>

      <div key={tab} className="animate-fade-up">
      {!isSupabaseConfigured ? <div className="card"><EmptyState title="Belum terhubung ke database" /></div> : tab === 'upcoming' ? (
        upcoming.loading ? <LoadingBlock /> : upcoming.error ? <ErrorState message={upcoming.error} onRetry={() => upcoming.reload()} />
          : !upcoming.data?.length ? (
            <div className="card"><EmptyState icon={Users} title="Belum ada jadwal Jumat mendatang" description="Data petugas Jumat dimasukkan langsung oleh administrator masjid."
              action={isAdmin ? <button className="btn-primary" onClick={newSchedule}><Plus className="size-4" /> Tambah Jadwal</button> : undefined} /></div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {upcoming.data.map((s, i) => (
                <div key={s.id} style={{ animationDelay: `${i * 110}ms` }} className={`animate-rise-in ${i === 0 ? 'lg:col-span-2' : ''}`}>
                  <ScheduleCard s={s} highlight={i === 0}
                    onEdit={isAdmin ? () => setEditSched(s) : undefined} onDelete={isAdmin ? () => removeSchedule(s) : undefined} />
                </div>
              ))}
            </div>
          )
      ) : tab === 'history' ? (
        history.loading ? <LoadingBlock /> : history.error ? <ErrorState message={history.error} onRetry={() => history.reload()} />
          : !history.data?.length ? <div className="card"><EmptyState icon={History} title="Belum ada riwayat Jumat" /></div> : (
            <div className="card overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="border-b border-slate-100 text-left text-xs uppercase tracking-wider text-slate-500">
                  <tr><th className="px-4 py-3">Tanggal</th><th className="px-4 py-3">Imam</th><th className="px-4 py-3">Khatib</th><th className="px-4 py-3">Bilal</th><th className="px-4 py-3">Muazin</th><th className="px-4 py-3">Tema</th>{isAdmin && <th />}</tr>
                </thead>
                <tbody>
                  {history.data.map((s) => (
                    <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="px-4 py-3 font-semibold text-slate-700">{formatDate(s.friday_date)}</td>
                      <td className="px-4 py-3">{s.imam?.full_name ?? '—'}</td>
                      <td className="px-4 py-3">{s.khatib?.full_name ?? '—'}</td>
                      <td className="px-4 py-3">{s.bilal?.full_name ?? '—'}</td>
                      <td className="px-4 py-3">{s.muazin?.full_name ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-500">{s.sermon_theme ?? '—'}</td>
                      {isAdmin && <td className="px-2"><button className="btn-ghost px-2 py-1.5" onClick={() => setEditSched(s)} title="Edit"><Pencil className="size-4" /></button></td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
      ) : (
        stats.loading ? <LoadingBlock /> : stats.error ? <ErrorState message={stats.error} onRetry={() => stats.reload()} />
          : !stats.data?.length ? (
            <div className="card"><EmptyState icon={Users} title="Belum ada petugas terdaftar"
              action={isAdmin ? <button className="btn-primary" onClick={() => setEditOfficer({})}><UserPlus className="size-4" /> Tambah Petugas</button> : undefined} /></div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {stats.data.map((o, i) => (
                <div key={o.id} style={{ animationDelay: `${Math.min(i, 12) * 60}ms` }} className={`card animate-rise-in p-4 transition hover:-translate-y-0.5 hover:shadow-lift ${o.is_active ? '' : 'opacity-60'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-800">{o.full_name}</p>
                      <div className="mt-1 flex flex-wrap gap-1">{o.roles.map((r) => <Badge key={r}>{ROLE_LABEL[r]}</Badge>)}{!o.is_active && <Badge tone="slate">Nonaktif</Badge>}</div>
                    </div>
                    {isAdmin && (
                      <div className="flex">
                        <button className="btn-ghost px-2 py-1.5" onClick={() => setEditOfficer(o)} title="Edit"><Pencil className="size-4" /></button>
                        <button className="btn-ghost px-2 py-1.5 text-rose-600" onClick={() => removeOfficer(o)} title="Hapus"><Trash2 className="size-4" /></button>
                      </div>
                    )}
                  </div>
                  <div className="mt-3 grid grid-cols-4 gap-1 text-center text-xs">
                    {([['Imam', o.as_imam], ['Khatib', o.as_khatib], ['Bilal', o.as_bilal], ['Muazin', o.as_muazin]] as const).map(([l, n]) => (
                      <div key={l} className="rounded-lg bg-slate-50 py-1.5"><p className="font-display text-lg font-bold text-emerald-800">{n}</p><p className="text-slate-500">{l}</p></div>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-slate-500">Terakhir bertugas: {o.last_duty ? formatDate(o.last_duty) : 'belum pernah'}</p>
                </div>
              ))}
            </div>
          )
      )}

      </div>

      {editSched && <ScheduleModal initial={editSched} officers={officers.data ?? []} onClose={() => setEditSched(null)} />}
      {editOfficer && <OfficerModal initial={editOfficer} onClose={() => setEditOfficer(null)} />}
    </div>
  );
}
