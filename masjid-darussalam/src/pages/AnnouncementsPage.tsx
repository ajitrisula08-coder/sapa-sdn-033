import { Archive, ArchiveRestore, Megaphone, Pencil, Pin, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { AdminOnly } from '../components/AdminGate';
import { Badge, EmptyState, ErrorState, Field, LoadingBlock, Modal, PageHeader, useConfirm, type BadgeTone } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useQuery } from '../hooks/useQuery';
import { deleteAnnouncement, friendlyError, getAnnouncements, saveAnnouncement } from '../lib/api';
import { ANNOUNCEMENT_CATEGORY } from '../lib/constants';
import { emitDataChanged } from '../lib/events';
import { formatDateTime } from '../lib/format';
import { isSupabaseConfigured } from '../lib/supabase';
import type { Announcement, AnnouncementCategory } from '../lib/types';

const TONE: Record<AnnouncementCategory, BadgeTone> = { kegiatan: 'emerald', berita_duka: 'slate', gotong_royong: 'sky', infak: 'gold', penting: 'rose', lainnya: 'slate' };

/** datetime-local (waktu perangkat) <-> ISO */
const toLocalInput = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : null);

function AnnouncementModal({ initial, onClose }: { initial: Partial<Announcement>; onClose: () => void }) {
  const toast = useToast();
  const [f, setF] = useState<Partial<Announcement>>({ category: 'kegiatan', status: 'terbit', is_pinned: false, ...initial });
  const [publishAt, setPublishAt] = useState(toLocalInput(initial.publish_at ?? new Date().toISOString()));
  const [expiresAt, setExpiresAt] = useState(toLocalInput(initial.expires_at));
  const [saving, setSaving] = useState(false);
  async function save() {
    if (!f.title || f.title.trim().length < 3) { toast.error('Judul minimal 3 karakter.'); return; }
    if (!f.content || f.content.trim().length < 3) { toast.error('Isi pengumuman wajib diisi.'); return; }
    const p = fromLocalInput(publishAt) ?? new Date().toISOString();
    const x = fromLocalInput(expiresAt);
    if (x && x <= p) { toast.error('Waktu berakhir harus setelah waktu terbit.'); return; }
    setSaving(true);
    try {
      await saveAnnouncement({ id: f.id, title: f.title.trim(), content: f.content.trim(), category: f.category, is_pinned: f.is_pinned, status: f.status, publish_at: p, expires_at: x });
      toast.success('Pengumuman disimpan.');
      emitDataChanged('announcements');
      onClose();
    } catch (e) { toast.error(friendlyError(e)); } finally { setSaving(false); }
  }
  return (
    <Modal open onClose={onClose} title={f.id ? 'Edit Pengumuman' : 'Buat Pengumuman'} size="lg"
      footer={<><button className="btn-outline" onClick={onClose}>Batal</button><button className="btn-primary" disabled={saving} onClick={save}>{saving ? 'Menyimpan…' : 'Simpan'}</button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Judul" required className="sm:col-span-2"><input className="input" maxLength={150} value={f.title ?? ''} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
        <Field label="Kategori" required>
          <select className="input" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value as AnnouncementCategory })}>
            {Object.entries(ANNOUNCEMENT_CATEGORY).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        <Field label="Status">
          <select className="input" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as Announcement['status'] })}>
            <option value="terbit">Terbit</option><option value="arsip">Arsip</option>
          </select>
        </Field>
        <Field label="Isi pengumuman" required className="sm:col-span-2"><textarea className="input min-h-36" maxLength={5000} value={f.content ?? ''} onChange={(e) => setF({ ...f, content: e.target.value })} /></Field>
        <Field label="Waktu terbit"><input type="datetime-local" className="input" value={publishAt} onChange={(e) => setPublishAt(e.target.value)} /></Field>
        <Field label="Berakhir (opsional)" hint="Setelah waktu ini pengumuman otomatis tidak tampil."><input type="datetime-local" className="input" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} /></Field>
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700 sm:col-span-2">
          <input type="checkbox" className="size-4 accent-emerald-700" checked={!!f.is_pinned} onChange={(e) => setF({ ...f, is_pinned: e.target.checked })} /> Sematkan di urutan teratas (juga diutamakan di layar TV)
        </label>
      </div>
    </Modal>
  );
}

export default function AnnouncementsPage() {
  const { isAdmin } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [showArchived, setShowArchived] = useState(false);
  const q = useQuery(() => getAnnouncements({ includeArchived: isAdmin && showArchived }), [isAdmin, showArchived], { topics: ['announcements'] });
  const [edit, setEdit] = useState<Partial<Announcement> | null>(null);
  const now = new Date().toISOString();

  async function toggleArchive(a: Announcement) {
    try {
      await saveAnnouncement({ id: a.id, status: a.status === 'arsip' ? 'terbit' : 'arsip' });
      toast.success(a.status === 'arsip' ? 'Pengumuman diterbitkan kembali.' : 'Pengumuman diarsipkan.');
      emitDataChanged('announcements');
    } catch (e) { toast.error(friendlyError(e)); }
  }
  async function remove(a: Announcement) {
    const r = await confirm({ title: 'Hapus pengumuman permanen?', message: <>Pengumuman "<b>{a.title}</b>" akan dihapus. Jika hanya ingin menyembunyikan, gunakan <b>Arsipkan</b>.</>, tone: 'danger', confirmLabel: 'Hapus' });
    if (!r.ok) return;
    try { await deleteAnnouncement(a.id); toast.success('Pengumuman dihapus.'); emitDataChanged('announcements'); } catch (e) { toast.error(friendlyError(e)); }
  }

  return (
    <div>
      <PageHeader icon={Megaphone} title="Pengumuman" subtitle="Informasi terbaru dari pengurus Masjid Darussalam"
        actions={<AdminOnly>
          <label className="btn-outline cursor-pointer"><input type="checkbox" className="size-4 accent-emerald-700" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} /> Tampilkan arsip</label>
          <button className="btn-primary" onClick={() => setEdit({})}><Plus className="size-4" /> Buat Pengumuman</button>
        </AdminOnly>} />
      {!isSupabaseConfigured ? <div className="card"><EmptyState title="Belum terhubung ke database" /></div>
        : q.loading ? <LoadingBlock /> : q.error ? <ErrorState message={q.error} onRetry={() => q.reload()} />
        : !q.data?.length ? <div className="card"><EmptyState icon={Megaphone} title="Belum ada pengumuman" action={isAdmin ? <button className="btn-primary" onClick={() => setEdit({})}><Plus className="size-4" /> Buat Pengumuman</button> : undefined} /></div>
        : (
          <div className="space-y-4">
            {q.data.map((a) => {
              const scheduled = a.publish_at > now;
              const expired = !!a.expires_at && a.expires_at <= now;
              return (
                <article key={a.id} className={`card relative overflow-hidden p-5 sm:p-6 ${a.status === 'arsip' || expired ? 'opacity-60' : ''} ${a.category === 'berita_duka' ? 'border-l-4 border-slate-500' : a.is_pinned ? 'border-l-4 border-gold-500' : ''}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={TONE[a.category]}>{ANNOUNCEMENT_CATEGORY[a.category]}</Badge>
                    {a.is_pinned && <Badge tone="gold"><Pin className="size-3" /> Disematkan</Badge>}
                    {a.status === 'arsip' && <Badge tone="slate">Arsip</Badge>}
                    {scheduled && <Badge tone="sky">Terjadwal</Badge>}
                    {expired && <Badge tone="slate">Kedaluwarsa</Badge>}
                    <span className="text-xs text-slate-400">{formatDateTime(a.publish_at)} WITA</span>
                  </div>
                  <h2 className="mt-2 font-display text-2xl font-bold text-emerald-950">{a.title}</h2>
                  <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-slate-600">{a.content}</p>
                  {isAdmin && (
                    <div className="mt-4 flex flex-wrap gap-1 border-t border-slate-100 pt-3">
                      <button className="btn-ghost px-2.5 py-1.5 text-xs" onClick={() => setEdit(a)}><Pencil className="size-3.5" /> Edit</button>
                      <button className="btn-ghost px-2.5 py-1.5 text-xs" onClick={() => toggleArchive(a)}>{a.status === 'arsip' ? <><ArchiveRestore className="size-3.5" /> Terbitkan lagi</> : <><Archive className="size-3.5" /> Arsipkan</>}</button>
                      <button className="btn-ghost px-2.5 py-1.5 text-xs text-rose-600" onClick={() => remove(a)}><Trash2 className="size-3.5" /> Hapus</button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      {edit && <AnnouncementModal initial={edit} onClose={() => setEdit(null)} />}
    </div>
  );
}
