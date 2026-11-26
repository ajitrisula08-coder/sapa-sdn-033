import { Boxes, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { AdminOnly } from '../components/AdminGate';
import { Badge, EmptyState, ErrorState, Field, LoadingBlock, Modal, PageHeader, useConfirm, type BadgeTone } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useQuery } from '../hooks/useQuery';
import { deleteInventory, friendlyError, getInventories, saveInventory } from '../lib/api';
import { INVENTORY_CATEGORY, INVENTORY_CONDITION } from '../lib/constants';
import { emitDataChanged } from '../lib/events';
import { angka, formatDate, todayISO } from '../lib/format';
import { isSupabaseConfigured } from '../lib/supabase';
import type { Inventory, InventoryCategory, InventoryCondition } from '../lib/types';

const COND_TONE: Record<InventoryCondition, BadgeTone> = { baik: 'emerald', rusak_ringan: 'gold', rusak_berat: 'rose', hilang: 'slate' };

function InventoryModal({ initial, onClose }: { initial: Partial<Inventory>; onClose: () => void }) {
  const toast = useToast();
  const [f, setF] = useState<Partial<Inventory>>({ category: 'perlengkapan_ibadah', condition: 'baik', quantity: 1, unit: 'buah', ...initial });
  const [saving, setSaving] = useState(false);
  async function save() {
    if (!f.name || f.name.trim().length < 2) { toast.error('Nama barang wajib diisi.'); return; }
    if (f.quantity === undefined || f.quantity < 0 || !Number.isInteger(Number(f.quantity))) { toast.error('Jumlah harus bilangan bulat ≥ 0.'); return; }
    if (f.purchase_date && f.purchase_date > todayISO()) { toast.error('Tanggal pembelian tidak boleh di masa depan.'); return; }
    setSaving(true);
    try {
      await saveInventory({ id: f.id, name: f.name.trim(), category: f.category, quantity: Number(f.quantity), unit: f.unit?.trim() || 'buah', condition: f.condition, purchase_date: f.purchase_date || null, notes: f.notes?.trim() || null });
      toast.success('Data inventaris disimpan.');
      emitDataChanged('inventory');
      onClose();
    } catch (e) { toast.error(friendlyError(e)); } finally { setSaving(false); }
  }
  return (
    <Modal open onClose={onClose} title={f.id ? 'Edit Barang' : 'Tambah Barang Inventaris'} size="lg"
      footer={<><button className="btn-outline" onClick={onClose}>Batal</button><button className="btn-primary" disabled={saving} onClick={save}>{saving ? 'Menyimpan…' : 'Simpan'}</button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nama barang" required className="sm:col-span-2"><input className="input" maxLength={120} value={f.name ?? ''} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Mis. Karpet sajadah, Kipas angin dinding" /></Field>
        <Field label="Kategori" required>
          <select className="input" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value as InventoryCategory })}>
            {Object.entries(INVENTORY_CATEGORY).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        <Field label="Kondisi" required>
          <select className="input" value={f.condition} onChange={(e) => setF({ ...f, condition: e.target.value as InventoryCondition })}>
            {Object.entries(INVENTORY_CONDITION).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-[1fr_110px] gap-3">
          <Field label="Jumlah" required><input type="number" min={0} step={1} className="input" value={f.quantity ?? ''} onChange={(e) => setF({ ...f, quantity: e.target.value === '' ? undefined : Number(e.target.value) })} /></Field>
          <Field label="Satuan"><input className="input" maxLength={20} value={f.unit ?? ''} onChange={(e) => setF({ ...f, unit: e.target.value })} /></Field>
        </div>
        <Field label="Tanggal pembelian"><input type="date" className="input" max={todayISO()} value={f.purchase_date ?? ''} onChange={(e) => setF({ ...f, purchase_date: e.target.value || null })} /></Field>
        <Field label="Keterangan" className="sm:col-span-2"><textarea className="input min-h-20" maxLength={500} value={f.notes ?? ''} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
      </div>
    </Modal>
  );
}

export default function InventoryPage() {
  const { isAdmin } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const q = useQuery(getInventories, [], { topics: ['inventory'] });
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState<InventoryCategory | ''>('');
  const [cond, setCond] = useState<InventoryCondition | ''>('');
  const [edit, setEdit] = useState<Partial<Inventory> | null>(null);
  const items = useMemo(() => (q.data ?? []).filter((i) =>
    (!cat || i.category === cat) && (!cond || i.condition === cond) && (!search || i.name.toLowerCase().includes(search.toLowerCase()))), [q.data, cat, cond, search]);
  const counts = useMemo(() => {
    const c: Record<InventoryCondition, number> = { baik: 0, rusak_ringan: 0, rusak_berat: 0, hilang: 0 };
    for (const i of q.data ?? []) c[i.condition] += i.quantity;
    return c;
  }, [q.data]);

  async function remove(i: Inventory) {
    const r = await confirm({ title: 'Hapus barang?', message: `"${i.name}" akan dihapus dari daftar inventaris. Penghapusan tercatat di riwayat audit.`, tone: 'danger', confirmLabel: 'Hapus' });
    if (!r.ok) return;
    try { await deleteInventory(i.id); toast.success('Barang dihapus.'); emitDataChanged('inventory'); } catch (e) { toast.error(friendlyError(e)); }
  }

  return (
    <div>
      <PageHeader icon={Boxes} title="Inventaris Masjid" subtitle="Daftar aset dan perlengkapan Masjid Darussalam"
        actions={<AdminOnly><button className="btn-primary" onClick={() => setEdit({})}><Plus className="size-4" /> Tambah Barang</button></AdminOnly>} />
      {!isSupabaseConfigured ? <div className="card"><EmptyState title="Belum terhubung ke database" /></div> : (<>
        <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {(Object.keys(counts) as InventoryCondition[]).map((k) => (
            <button key={k} onClick={() => setCond(cond === k ? '' : k)} className={`card p-4 text-left transition hover:shadow-lift ${cond === k ? 'ring-2 ring-emerald-600' : ''}`}>
              <p className="text-sm font-semibold text-slate-500">{INVENTORY_CONDITION[k]}</p>
              <p className="font-display text-3xl font-bold text-emerald-950">{angka(counts[k])}</p>
              <p className="text-xs text-slate-400">unit barang</p>
            </button>
          ))}
        </div>
        <div className="card mb-4 grid gap-3 p-4 sm:grid-cols-[1.5fr_1fr_1fr]">
          <label className="relative"><span className="sr-only">Cari barang</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input className="input pl-9" placeholder="Cari nama barang…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </label>
          <select className="input" value={cat} onChange={(e) => setCat(e.target.value as InventoryCategory | '')} aria-label="Kategori">
            <option value="">Semua kategori</option>{Object.entries(INVENTORY_CATEGORY).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select className="input" value={cond} onChange={(e) => setCond(e.target.value as InventoryCondition | '')} aria-label="Kondisi">
            <option value="">Semua kondisi</option>{Object.entries(INVENTORY_CONDITION).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="card overflow-hidden">
          {q.loading ? <LoadingBlock /> : q.error ? <div className="p-4"><ErrorState message={q.error} onRetry={() => q.reload()} /></div>
            : !items.length ? <EmptyState icon={Boxes} title={q.data?.length ? 'Tidak ada barang yang cocok' : 'Belum ada data inventaris'} action={isAdmin && !q.data?.length ? <button className="btn-primary" onClick={() => setEdit({})}><Plus className="size-4" /> Tambah Barang</button> : undefined} />
            : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead className="bg-emerald-950 text-left text-xs uppercase tracking-wider text-emerald-50">
                    <tr><th className="px-4 py-3">Nama Barang</th><th className="px-4 py-3">Kategori</th><th className="px-4 py-3 text-center">Jumlah</th><th className="px-4 py-3">Kondisi</th><th className="px-4 py-3">Tgl. Pembelian</th><th className="px-4 py-3">Keterangan</th>{isAdmin && <th className="px-4 py-3 text-right">Aksi</th>}</tr>
                  </thead>
                  <tbody>
                    {items.map((i) => (
                      <tr key={i.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-3 font-semibold text-slate-800">{i.name}</td>
                        <td className="px-4 py-3 text-slate-600">{INVENTORY_CATEGORY[i.category]}</td>
                        <td className="px-4 py-3 text-center tabular">{angka(i.quantity)} {i.unit}</td>
                        <td className="px-4 py-3"><Badge tone={COND_TONE[i.condition]}>{INVENTORY_CONDITION[i.condition]}</Badge></td>
                        <td className="px-4 py-3 text-slate-600">{i.purchase_date ? formatDate(i.purchase_date) : '—'}</td>
                        <td className="max-w-xs px-4 py-3 text-slate-500">{i.notes ?? '—'}</td>
                        {isAdmin && (
                          <td className="whitespace-nowrap px-3 py-2 text-right">
                            <button className="btn-ghost px-2 py-1.5" onClick={() => setEdit(i)} title="Edit"><Pencil className="size-4" /></button>
                            <button className="btn-ghost px-2 py-1.5 text-rose-600" onClick={() => remove(i)} title="Hapus"><Trash2 className="size-4" /></button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
        </div>
      </>)}
      {edit && <InventoryModal initial={edit} onClose={() => setEdit(null)} />}
    </div>
  );
}
