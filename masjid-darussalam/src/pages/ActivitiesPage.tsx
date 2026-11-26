import { CalendarDays, Clock, MapPin, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { AdminOnly } from '../components/AdminGate';
import { Badge, EmptyState, ErrorState, Field, LoadingBlock, Modal, PageHeader, useConfirm, type BadgeTone } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useQuery } from '../hooks/useQuery';
import { deleteActivity, friendlyError, getActivities, saveActivity } from '../lib/api';
import { ACTIVITY_CATEGORY, ACTIVITY_STATUS } from '../lib/constants';
import { emitDataChanged } from '../lib/events';
import { addDaysISO, formatDateLong, hhmm, parseISODate, todayISO } from '../lib/format';
import { isSupabaseConfigured } from '../lib/supabase';
import type { Activity, ActivityCategory, ActivityStatus } from '../lib/types';

const STATUS_TONE: Record<ActivityStatus, BadgeTone> = { terjadwal: 'sky', berlangsung: 'emerald', selesai: 'slate', dibatalkan: 'rose' };

function ActivityModal({ initial, onClose }: { initial: Partial<Activity>; onClose: () => void }) {
  const toast = useToast();
  const [f, setF] = useState<Partial<Activity>>({ category: 'pengajian', status: 'terjadwal', activity_date: todayISO(), start_time: '19:30', ...initial });
  const [saving, setSaving] = useState(false);
  async function save() {
    if (!f.title || f.title.trim().length < 3) { toast.error('Judul kegiatan minimal 3 karakter.'); return; }
    if (!f.activity_date || !f.start_time) { toast.error('Tanggal dan jam mulai wajib diisi.'); return; }
    if (f.end_time && f.end_time <= f.start_time) { toast.error('Jam selesai harus setelah jam mulai.'); return; }
    setSaving(true);
    try {
      await saveActivity({ id: f.id, title: f.title.trim(), description: f.description?.trim() || null, category: f.category, activity_date: f.activity_date, start_time: f.start_time, end_time: f.end_time || null, location: f.location?.trim() || null, status: f.status });
      toast.success('Agenda kegiatan disimpan.');
      emitDataChanged('activities');
      onClose();
    } catch (e) { toast.error(friendlyError(e)); } finally { setSaving(false); }
  }
  return (
    <Modal open onClose={onClose} title={f.id ? 'Edit Agenda' : 'Tambah Agenda Kegiatan'} size="lg"
      footer={<><button className="btn-outline" onClick={onClose}>Batal</button><button className="btn-primary" disabled={saving} onClick={save}>{saving ? 'Menyimpan…' : 'Simpan'}</button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Judul kegiatan" required className="sm:col-span-2"><input className="input" maxLength={150} value={f.title ?? ''} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
        <Field label="Jenis kegiatan" required>
          <select className="input" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value as ActivityCategory })}>
            {Object.entries(ACTIVITY_CATEGORY).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        <Field label="Status" required>
          <select className="input" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as ActivityStatus })}>
            {Object.entries(ACTIVITY_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        <Field label="Tanggal" required><input type="date" className="input" value={f.activity_date ?? ''} onChange={(e) => setF({ ...f, activity_date: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Jam mulai" required><input type="time" className="input" value={hhmm(f.start_time) === '—' ? '' : hhmm(f.start_time)} onChange={(e) => setF({ ...f, start_time: e.target.value })} /></Field>
          <Field label="Jam selesai"><input type="time" className="input" value={f.end_time ? hhmm(f.end_time) : ''} onChange={(e) => setF({ ...f, end_time: e.target.value || null })} /></Field>
        </div>
        <Field label="Lokasi" className="sm:col-span-2"><input className="input" maxLength={150} value={f.location ?? ''} onChange={(e) => setF({ ...f, location: e.target.value })} placeholder="Mis. Ruang utama masjid" /></Field>
        <Field label="Deskripsi" className="sm:col-span-2"><textarea className="input min-h-28" maxLength={3000} value={f.description ?? ''} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
      </div>
    </Modal>
  );
}

export default function ActivitiesPage() {
  const { isAdmin } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const today = todayISO();
  const [view, setView] = useState<'upcoming' | 'past'>('upcoming');
  const [cat, setCat] = useState<ActivityCategory | ''>('');
  const q = useQuery(() => view === 'upcoming'
    ? getActivities({ from: today, ascending: true, limit: 100 })
    : getActivities({ to: addDaysISO(today, -1), ascending: false, limit: 100 }), [view, today], { topics: ['activities'] });
  const [edit, setEdit] = useState<Partial<Activity> | null>(null);
  const items = (q.data ?? []).filter((a) => !cat || a.category === cat);

  async function remove(a: Activity) {
    const r = await confirm({ title: 'Hapus agenda?', message: `Agenda "${a.title}" akan dihapus.`, tone: 'danger', confirmLabel: 'Hapus' });
    if (!r.ok) return;
    try { await deleteActivity(a.id); toast.success('Agenda dihapus.'); emitDataChanged('activities'); } catch (e) { toast.error(friendlyError(e)); }
  }

  return (
    <div>
      <PageHeader icon={CalendarDays} title="Agenda Kegiatan" subtitle="Pengajian, ceramah, Ramadan, hari raya, dan kegiatan sosial"
        actions={<AdminOnly><button className="btn-primary" onClick={() => setEdit({})}><Plus className="size-4" /> Tambah Agenda</button></AdminOnly>} />
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 rounded-xl bg-white p-1 shadow-soft ring-1 ring-emerald-900/5">
          {([['upcoming', 'Mendatang'], ['past', 'Telah lewat']] as const).map(([v, l]) => (
            <button key={v} onClick={() => setView(v)} className={`rounded-lg px-4 py-2 text-sm font-semibold ${view === v ? 'bg-emerald-700 text-white' : 'text-slate-600 hover:bg-emerald-50'}`}>{l}</button>
          ))}
        </div>
        <select className="input sm:w-64" value={cat} onChange={(e) => setCat(e.target.value as ActivityCategory | '')} aria-label="Filter jenis kegiatan">
          <option value="">Semua jenis kegiatan</option>
          {Object.entries(ACTIVITY_CATEGORY).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      {!isSupabaseConfigured ? <div className="card"><EmptyState title="Belum terhubung ke database" /></div>
        : q.loading ? <LoadingBlock /> : q.error ? <ErrorState message={q.error} onRetry={() => q.reload()} />
        : !items.length ? <div className="card"><EmptyState icon={CalendarDays} title="Belum ada agenda" action={isAdmin ? <button className="btn-primary" onClick={() => setEdit({})}><Plus className="size-4" /> Tambah Agenda</button> : undefined} /></div>
        : (
          <div className="grid gap-4 md:grid-cols-2">
            {items.map((a) => {
              const d = parseISODate(a.activity_date);
              return (
                <article key={a.id} className={`card flex gap-4 p-5 ${a.status === 'dibatalkan' ? 'opacity-65' : ''}`}>
                  <div className="bg-islamic grid h-20 w-16 shrink-0 place-items-center rounded-2xl text-white">
                    <div className="text-center">
                      <p className="font-display text-3xl font-bold leading-none">{d.getUTCDate()}</p>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-gold-300">{d.toLocaleDateString('id-ID', { month: 'short', timeZone: 'UTC' })}</p>
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge tone="emerald">{ACTIVITY_CATEGORY[a.category]}</Badge>
                      <Badge tone={STATUS_TONE[a.status]}>{ACTIVITY_STATUS[a.status]}</Badge>
                    </div>
                    <h3 className="mt-1.5 text-lg font-bold text-slate-800">{a.title}</h3>
                    <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-slate-500">
                      <span className="inline-flex items-center gap-1"><Clock className="size-3.5" />{formatDateLong(a.activity_date)}, {hhmm(a.start_time)}{a.end_time ? `–${hhmm(a.end_time)}` : ''} WITA</span>
                      {a.location && <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" />{a.location}</span>}
                    </p>
                    {a.description && <p className="mt-2 whitespace-pre-line text-sm text-slate-600">{a.description}</p>}
                    {isAdmin && (
                      <div className="mt-3 flex gap-1">
                        <button className="btn-ghost px-2.5 py-1.5 text-xs" onClick={() => setEdit(a)}><Pencil className="size-3.5" /> Edit</button>
                        <button className="btn-ghost px-2.5 py-1.5 text-xs text-rose-600" onClick={() => remove(a)}><Trash2 className="size-3.5" /> Hapus</button>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      {edit && <ActivityModal initial={edit} onClose={() => setEdit(null)} />}
    </div>
  );
}
