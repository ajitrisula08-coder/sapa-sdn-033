import { Paperclip } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useConfirm, Field, Modal } from './ui';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import { createTransaction, friendlyError, updateTransaction, uploadProof, type TrxInput } from '../lib/api';
import { emitDataChanged } from '../lib/events';
import { formatDate, rupiah, todayISO } from '../lib/format';
import type { Transaction, TrxCategory, TrxType } from '../lib/types';

export function TransactionModal({ type, existing, categories, onClose }: {
  type: TrxType; existing?: Transaction; categories: TrxCategory[]; onClose: () => void;
}) {
  const toast = useToast();
  const confirm = useConfirm();
  const { settings } = useSettings();
  const cats = useMemo(() => categories.filter((c) => c.type === type && (c.is_active || c.id === existing?.category_id)), [categories, type, existing]);
  const [f, setF] = useState({
    trx_date: existing?.trx_date ?? todayISO(),
    category_id: existing?.category_id ?? cats[0]?.id ?? '',
    description: existing?.description ?? '',
    amount: existing ? String(Math.round(existing.amount)) : '',
    donor_name: existing?.donor_name ?? '',
    donor_is_public: existing?.donor_is_public ?? false,
  });
  const [file, setFile] = useState<File | null>(null);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const amount = Number(f.amount.replace(/\D/g, ''));
  const label = type === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran';

  function validate(): string | null {
    if (!f.trx_date) return 'Tanggal wajib diisi.';
    if (f.trx_date > todayISO()) return 'Tanggal transaksi tidak boleh di masa depan.';
    if (settings.opening_balance_date && f.trx_date < settings.opening_balance_date) return `Tanggal tidak boleh sebelum tanggal saldo awal (${formatDate(settings.opening_balance_date)}).`;
    if (!f.category_id) return 'Kategori wajib dipilih.';
    if (f.description.trim().length < 3) return 'Keterangan minimal 3 karakter.';
    if (!amount || amount <= 0) return 'Nominal harus lebih dari 0.';
    if (amount > 10_000_000_000) return 'Nominal terlalu besar.';
    if (existing && reason.trim().length < 5) return 'Alasan perubahan wajib diisi (minimal 5 karakter).';
    return null;
  }

  async function save() {
    const err = validate();
    if (err) { toast.error(err); return; }
    const cat = cats.find((c) => c.id === f.category_id)?.name;
    const r = await confirm({
      title: existing ? `Simpan perubahan ${existing.trx_number}?` : `Simpan ${label.toLowerCase()}?`,
      message: (
        <div className="space-y-1">
          <p>Pastikan data berikut sudah benar:</p>
          <ul className="rounded-xl bg-slate-50 p-3 text-slate-700">
            <li>Tanggal: <b>{formatDate(f.trx_date)}</b></li>
            <li>Kategori: <b>{cat}</b></li>
            <li>Keterangan: <b>{f.description.trim()}</b></li>
            <li>Nominal: <b className={type === 'pemasukan' ? 'text-emerald-700' : 'text-amber-700'}>{rupiah(amount)}</b></li>
          </ul>
          <p className="text-xs text-slate-500">Transaksi tidak dapat dihapus. Kesalahan hanya dapat diperbaiki melalui edit (tercatat) atau pembatalan dengan alasan.</p>
        </div>
      ),
      confirmLabel: 'Ya, simpan',
    });
    if (!r.ok) return;
    setSaving(true);
    try {
      let proof_path = existing?.proof_path ?? null;
      if (file) proof_path = await uploadProof(file);
      const input: TrxInput = {
        trx_date: f.trx_date, type, category_id: f.category_id, description: f.description.trim(), amount,
        donor_name: type === 'pemasukan' && f.donor_name.trim() ? f.donor_name.trim() : null,
        donor_is_public: type === 'pemasukan' && f.donor_name.trim() ? f.donor_is_public : false,
        proof_path,
      };
      if (existing) {
        await updateTransaction(existing.id, input, reason.trim());
        toast.success(`Transaksi ${existing.trx_number} berhasil diperbarui.`);
      } else {
        const t = await createTransaction(input);
        toast.success(`${label} tercatat dengan nomor ${t.trx_number}.`);
      }
      emitDataChanged('finance');
      onClose();
    } catch (e) { toast.error(friendlyError(e)); } finally { setSaving(false); }
  }

  return (
    <Modal open onClose={onClose} title={existing ? `Edit Transaksi ${existing.trx_number}` : `Catat ${label}`} size="lg"
      footer={<><button className="btn-outline" onClick={onClose}>Batal</button><button className="btn-primary" disabled={saving} onClick={save}>{saving ? 'Menyimpan…' : 'Simpan Transaksi'}</button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tanggal transaksi" required>
          <input type="date" className="input" max={todayISO()} min={settings.opening_balance_date ?? undefined} value={f.trx_date} onChange={(e) => setF({ ...f, trx_date: e.target.value })} />
        </Field>
        <Field label="Kategori" required>
          <select className="input" value={f.category_id} onChange={(e) => setF({ ...f, category_id: e.target.value })}>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Keterangan" required className="sm:col-span-2" hint="Keterangan ini tampil di laporan publik untuk jamaah.">
          <input className="input" maxLength={300} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder={type === 'pemasukan' ? 'Mis. Kotak infak Jumat pekan ke-3' : 'Mis. Pembayaran token listrik November'} />
        </Field>
        <Field label="Nominal (Rp)" required hint={amount ? rupiah(amount) : undefined}>
          <input inputMode="numeric" className="input tabular text-lg font-semibold" value={amount ? amount.toLocaleString('id-ID') : ''} onChange={(e) => setF({ ...f, amount: e.target.value.replace(/\D/g, '') })} placeholder="0" />
        </Field>
        <Field label="Bukti transaksi (opsional)" hint={existing?.proof_path && !file ? 'Sudah ada bukti. Pilih file baru untuk mengganti.' : 'JPG, PNG, WEBP, atau PDF — maks. 5 MB. Bukti hanya dapat dilihat admin.'}>
          <label className="input flex cursor-pointer items-center gap-2 text-slate-500">
            <Paperclip className="size-4" /> <span className="truncate">{file ? file.name : 'Pilih file…'}</span>
            <input type="file" className="hidden" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
        </Field>
        {type === 'pemasukan' && (
          <>
            <Field label="Nama donatur (opsional)" hint="Data pribadi. Tidak ditampilkan ke publik kecuali diizinkan.">
              <input className="input" maxLength={100} value={f.donor_name} onChange={(e) => setF({ ...f, donor_name: e.target.value })} placeholder="Kosongkan bila anonim / Hamba Allah" />
            </Field>
            <label className="mt-7 flex items-start gap-2 text-sm text-slate-700">
              <input type="checkbox" className="mt-0.5 size-4 accent-emerald-700" disabled={!f.donor_name.trim()} checked={f.donor_is_public && !!f.donor_name.trim()} onChange={(e) => setF({ ...f, donor_is_public: e.target.checked })} />
              <span>Donatur <b>mengizinkan</b> namanya ditampilkan di laporan publik</span>
            </label>
          </>
        )}
        {existing && (
          <Field label="Alasan perubahan" required className="sm:col-span-2" hint="Wajib diisi. Tersimpan di riwayat audit bersama data sebelum dan sesudah perubahan.">
            <textarea className="input min-h-20" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Mis. Salah ketik nominal, seharusnya Rp 250.000" />
          </Field>
        )}
      </div>
    </Modal>
  );
}
