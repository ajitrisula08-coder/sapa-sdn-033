import type { AuditLog } from './types';

const FIELD_LABEL: Record<string, string> = {
  amount: 'Nominal', description: 'Keterangan', trx_date: 'Tanggal', category_id: 'Kategori', type: 'Jenis',
  donor_name: 'Nama donatur', donor_is_public: 'Tampilkan donatur', status: 'Status', proof_path: 'Bukti',
  subuh: 'Subuh', terbit: 'Terbit', zuhur: 'Zuhur', asar: 'Asar', magrib: 'Magrib', isya: 'Isya', note: 'Catatan',
  calc_method: 'Metode', madhab: 'Mazhab', latitude: 'Lintang', longitude: 'Bujur', timezone: 'Zona waktu',
  adj_subuh: 'Koreksi Subuh', adj_terbit: 'Koreksi Terbit', adj_zuhur: 'Koreksi Zuhur', adj_asar: 'Koreksi Asar',
  adj_magrib: 'Koreksi Magrib', adj_isya: 'Koreksi Isya', hijri_offset: 'Koreksi Hijriah',
  opening_balance: 'Saldo awal', opening_balance_date: 'Tanggal saldo awal', name: 'Nama masjid',
  schedule_date: 'Tanggal', coordinates_verified: 'Koordinat terverifikasi', ramadan_mode: 'Mode Ramadan',
};
const IGNORE = new Set(['updated_at', 'created_at', 'id', 'recorded_by', 'recorded_by_name', 'created_by', 'trx_number', 'void_reason', 'voided_at', 'voided_by']);

export const ACTION_LABEL: Record<AuditLog['action'], string> = {
  INSERT: 'Ditambahkan', UPDATE: 'Diubah', VOID: 'Dibatalkan', DELETE: 'Dihapus',
};

/** Daftar perubahan kolom "lama → baru" dari satu entri audit. */
export function diffAudit(log: AuditLog): { field: string; from: string; to: string }[] {
  if (log.action !== 'UPDATE' || !log.old_data || !log.new_data) return [];
  const out: { field: string; from: string; to: string }[] = [];
  for (const key of Object.keys(log.new_data)) {
    if (IGNORE.has(key)) continue;
    const a = log.old_data[key];
    const b = log.new_data[key];
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      out.push({ field: FIELD_LABEL[key] ?? key, from: fmt(a), to: fmt(b) });
    }
  }
  return out;
}

function fmt(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'Ya' : 'Tidak';
  if (typeof v === 'string' && /^\d{2}:\d{2}:\d{2}$/.test(v)) return v.slice(0, 5);
  return String(v);
}
