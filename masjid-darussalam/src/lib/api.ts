import { isSupabaseConfigured, PROOF_BUCKET, supabase } from './supabase';
import type {
  Activity, Announcement, AuditLog, CategoryTotal, FinanceSummary, FridayOfficer, FridaySchedule,
  Inventory, MonthlyFinance, MosqueSettings, OfficerStats, PrayerOverride, PublicTransaction,
  Transaction, TrxCategory, TrxType,
} from './types';

/** Pesan error yang ramah untuk pengguna awam. */
export function friendlyError(err: unknown): string {
  const raw = (err as { message?: string })?.message ?? String(err ?? 'Terjadi kesalahan.');
  if (!isSupabaseConfigured) return 'Aplikasi belum terhubung ke database Supabase.';
  if (/Failed to fetch|NetworkError|Load failed/i.test(raw)) return 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.';
  if (/row-level security|permission denied/i.test(raw)) return 'Anda tidak memiliki izin untuk melakukan tindakan ini. Silakan login sebagai admin.';
  if (/Invalid login credentials/i.test(raw)) return 'Email atau kata sandi salah.';
  if (/duplicate key.*friday_schedules_friday_date/i.test(raw)) return 'Jadwal untuk tanggal Jumat tersebut sudah ada.';
  if (/duplicate key.*friday_officers_name/i.test(raw)) return 'Nama petugas tersebut sudah terdaftar.';
  if (/duplicate key.*prayer_schedules/i.test(raw)) return 'Jadwal manual untuk tanggal tersebut sudah ada.';
  if (/violates foreign key.*friday/i.test(raw)) return 'Petugas masih tercatat pada jadwal Jumat sehingga tidak dapat dihapus. Nonaktifkan saja.';
  if (/friday_date_check/i.test(raw)) return 'Tanggal yang dipilih bukan hari Jumat.';
  if (/prayer_schedules_order/i.test(raw)) return 'Urutan waktu sholat tidak logis (Subuh < Zuhur < Asar < Magrib < Isya).';
  if (/check constraint/i.test(raw)) return 'Data tidak valid. Periksa kembali isian Anda.';
  return raw;
}

function ensure<T>(res: { data: T | null; error: unknown }): T {
  if (res.error) throw res.error;
  return res.data as T;
}

const num = (v: unknown) => Number(v ?? 0);

// ---------------- Pengaturan ----------------
export async function getSettings(): Promise<MosqueSettings> {
  const data = ensure(await supabase.from('mosque_settings').select('*').eq('id', 1).single()) as unknown as MosqueSettings;
  return { ...data, latitude: num(data.latitude), longitude: num(data.longitude), opening_balance: num(data.opening_balance) };
}
export async function updateSettings(patch: Partial<MosqueSettings> & { change_reason?: string }) {
  const { id: _id, updated_at: _u, ...rest } = patch as MosqueSettings;
  ensure(await supabase.from('mosque_settings').update(rest).eq('id', 1).select().single());
}

// ---------------- Jadwal sholat ----------------
export async function getPrayerOverrides(from: string, to: string): Promise<PrayerOverride[]> {
  return ensure(await supabase.from('prayer_schedules').select('*').gte('schedule_date', from).lte('schedule_date', to).order('schedule_date'));
}
export async function upsertPrayerOverride(row: Omit<PrayerOverride, 'id' | 'updated_at'> & { change_reason?: string }) {
  ensure(await supabase.from('prayer_schedules').upsert(row, { onConflict: 'schedule_date' }).select().single());
}
export async function deletePrayerOverride(id: string) {
  ensure(await supabase.from('prayer_schedules').delete().eq('id', id));
}

// ---------------- Jumat ----------------
const FRIDAY_SELECT = '*, imam:friday_officers!friday_schedules_imam_id_fkey(full_name), khatib:friday_officers!friday_schedules_khatib_id_fkey(full_name), bilal:friday_officers!friday_schedules_bilal_id_fkey(full_name), muazin:friday_officers!friday_schedules_muazin_id_fkey(full_name)';

export async function getFridaySchedules(opts: { from?: string; to?: string; ascending?: boolean; limit?: number } = {}): Promise<FridaySchedule[]> {
  let q = supabase.from('friday_schedules').select(FRIDAY_SELECT);
  if (opts.from) q = q.gte('friday_date', opts.from);
  if (opts.to) q = q.lte('friday_date', opts.to);
  q = q.order('friday_date', { ascending: opts.ascending ?? true });
  if (opts.limit) q = q.limit(opts.limit);
  return ensure(await q) as FridaySchedule[];
}
export async function getNextFriday(fromISO: string): Promise<FridaySchedule | null> {
  const rows = await getFridaySchedules({ from: fromISO, ascending: true, limit: 1 });
  return rows[0] ?? null;
}
export async function saveFridaySchedule(row: Partial<FridaySchedule>) {
  const { id, imam: _a, khatib: _b, bilal: _c, muazin: _d, ...rest } = row;
  if (id) ensure(await supabase.from('friday_schedules').update(rest).eq('id', id).select().single());
  else ensure(await supabase.from('friday_schedules').insert(rest).select().single());
}
export async function deleteFridaySchedule(id: string) {
  ensure(await supabase.from('friday_schedules').delete().eq('id', id));
}
export async function getOfficers(): Promise<FridayOfficer[]> {
  return ensure(await supabase.from('friday_officers').select('*').order('full_name'));
}
export async function getOfficerStats(): Promise<OfficerStats[]> {
  return ensure(await supabase.from('friday_officer_stats').select('*').order('full_name'));
}
export async function saveOfficer(row: Partial<FridayOfficer>) {
  const { id, ...rest } = row;
  if (id) ensure(await supabase.from('friday_officers').update(rest).eq('id', id).select().single());
  else ensure(await supabase.from('friday_officers').insert(rest).select().single());
}
export async function deleteOfficer(id: string) {
  ensure(await supabase.from('friday_officers').delete().eq('id', id));
}

// ---------------- Keuangan ----------------
export async function getCategories(): Promise<TrxCategory[]> {
  return ensure(await supabase.from('transaction_categories').select('*').order('type').order('sort_order'));
}

export async function getFinanceSummary(start?: string | null, end?: string | null): Promise<FinanceSummary> {
  const data = ensure(await supabase.rpc('finance_summary', { p_start: start ?? null, p_end: end ?? null })) as FinanceSummary[];
  const r = data?.[0];
  return {
    opening_balance: num(r?.opening_balance), total_income: num(r?.total_income),
    total_expense: num(r?.total_expense), closing_balance: num(r?.closing_balance), trx_count: num(r?.trx_count),
  };
}
export async function getFinanceMonthly(months = 6): Promise<MonthlyFinance[]> {
  const data = ensure(await supabase.rpc('finance_monthly', { p_months: months })) as MonthlyFinance[];
  return (data ?? []).map((r) => ({ month_start: r.month_start, total_income: num(r.total_income), total_expense: num(r.total_expense), closing_balance: num(r.closing_balance) }));
}
export async function getFinanceByCategory(start?: string | null, end?: string | null): Promise<CategoryTotal[]> {
  const data = ensure(await supabase.rpc('finance_by_category', { p_start: start ?? null, p_end: end ?? null })) as CategoryTotal[];
  return (data ?? []).map((r) => ({ ...r, total: num(r.total), trx_count: num(r.trx_count) }));
}

export interface TrxFilter {
  from?: string;
  to?: string;
  type?: TrxType | '';
  categoryId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  includeVoided?: boolean;
}

const cleanSearch = (s: string) => s.replace(/[%,()*\\]/g, ' ').trim();

/** Transaksi publik (view tanpa data pribadi). */
export async function getPublicTransactions(f: TrxFilter): Promise<{ rows: PublicTransaction[]; count: number }> {
  const pageSize = f.pageSize ?? 20;
  const page = f.page ?? 0;
  let q = supabase.from('public_transactions').select('*', { count: 'exact' });
  if (f.from) q = q.gte('trx_date', f.from);
  if (f.to) q = q.lte('trx_date', f.to);
  if (f.type) q = q.eq('type', f.type);
  if (f.categoryId) q = q.eq('category_id', f.categoryId);
  if (f.search && cleanSearch(f.search)) {
    const s = cleanSearch(f.search);
    q = q.or(`description.ilike.%${s}%,trx_number.ilike.%${s}%`);
  }
  q = q.order('trx_date', { ascending: false }).order('created_at', { ascending: false }).range(page * pageSize, page * pageSize + pageSize - 1);
  const res = await q;
  if (res.error) throw res.error;
  return {
    rows: (res.data ?? []).map((r) => ({ ...(r as PublicTransaction), amount: num(r.amount), running_balance: num(r.running_balance) })),
    count: res.count ?? 0,
  };
}

/** Semua transaksi publik dalam periode (untuk laporan & ekspor), urut naik. */
export async function getAllPublicTransactions(from?: string | null, to?: string | null): Promise<PublicTransaction[]> {
  const out: PublicTransaction[] = [];
  const size = 1000;
  for (let page = 0; page < 50; page++) {
    let q = supabase.from('public_transactions').select('*');
    if (from) q = q.gte('trx_date', from);
    if (to) q = q.lte('trx_date', to);
    const res = await q.order('trx_date').order('created_at').order('id').range(page * size, page * size + size - 1);
    if (res.error) throw res.error;
    const rows = res.data ?? [];
    out.push(...rows.map((r) => ({ ...(r as PublicTransaction), amount: num(r.amount), running_balance: num(r.running_balance) })));
    if (rows.length < size) break;
  }
  return out;
}

/** Transaksi lengkap (admin), termasuk yang dibatalkan. */
export async function getAdminTransactions(f: TrxFilter): Promise<{ rows: Transaction[]; count: number }> {
  const pageSize = f.pageSize ?? 20;
  const page = f.page ?? 0;
  let q = supabase.from('transactions').select('*, category:transaction_categories(name)', { count: 'exact' });
  if (f.from) q = q.gte('trx_date', f.from);
  if (f.to) q = q.lte('trx_date', f.to);
  if (f.type) q = q.eq('type', f.type);
  if (f.categoryId) q = q.eq('category_id', f.categoryId);
  if (!f.includeVoided) q = q.eq('status', 'aktif');
  if (f.search && cleanSearch(f.search)) {
    const s = cleanSearch(f.search);
    q = q.or(`description.ilike.%${s}%,trx_number.ilike.%${s}%,donor_name.ilike.%${s}%`);
  }
  q = q.order('trx_date', { ascending: false }).order('created_at', { ascending: false }).range(page * pageSize, page * pageSize + pageSize - 1);
  const res = await q;
  if (res.error) throw res.error;
  return { rows: (res.data ?? []).map((r) => ({ ...(r as Transaction), amount: num(r.amount) })), count: res.count ?? 0 };
}

export interface TrxInput {
  trx_date: string;
  type: TrxType;
  category_id: string;
  description: string;
  amount: number;
  donor_name: string | null;
  donor_is_public: boolean;
  proof_path?: string | null;
}

export async function createTransaction(input: TrxInput): Promise<Transaction> {
  return ensure(await supabase.from('transactions').insert(input).select().single()) as Transaction;
}
export async function updateTransaction(id: string, input: Partial<TrxInput>, reason: string) {
  ensure(await supabase.from('transactions').update({ ...input, change_reason: reason }).eq('id', id).select().single());
}
export async function voidTransaction(id: string, reason: string) {
  ensure(await supabase.from('transactions').update({ status: 'dibatalkan', void_reason: reason, voided_at: new Date().toISOString() }).eq('id', id).select().single());
}

export async function uploadProof(file: File): Promise<string> {
  if (file.size > 5 * 1024 * 1024) throw new Error('Ukuran file bukti maksimal 5 MB.');
  if (!/^(image\/(jpeg|png|webp)|application\/pdf)$/.test(file.type)) throw new Error('Format bukti harus JPG, PNG, WEBP, atau PDF.');
  const ext = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';
  const path = `${new Date().getFullYear()}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(PROOF_BUCKET).upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  return path;
}
export async function proofUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from(PROOF_BUCKET).createSignedUrl(path, 300);
  if (error) throw error;
  return data.signedUrl;
}

// ---------------- Audit ----------------
export async function getAuditLogs(opts: { table?: string | string[]; recordId?: string; limit?: number } = {}): Promise<AuditLog[]> {
  let q = supabase.from('audit_logs').select('*');
  if (Array.isArray(opts.table)) q = q.in('table_name', opts.table);
  else if (opts.table) q = q.eq('table_name', opts.table);
  if (opts.recordId) q = q.eq('record_id', opts.recordId);
  return ensure(await q.order('changed_at', { ascending: false }).limit(opts.limit ?? 100));
}

// ---------------- Pengumuman ----------------
export async function getAnnouncements(opts: { includeArchived?: boolean; limit?: number } = {}): Promise<Announcement[]> {
  let q = supabase.from('announcements').select('*');
  if (!opts.includeArchived) q = q.eq('status', 'terbit');
  q = q.order('is_pinned', { ascending: false }).order('publish_at', { ascending: false });
  if (opts.limit) q = q.limit(opts.limit);
  return ensure(await q);
}
export async function saveAnnouncement(row: Partial<Announcement>) {
  const { id, created_at: _c, updated_at: _u, ...rest } = row;
  if (id) ensure(await supabase.from('announcements').update(rest).eq('id', id).select().single());
  else ensure(await supabase.from('announcements').insert(rest).select().single());
}
export async function deleteAnnouncement(id: string) {
  ensure(await supabase.from('announcements').delete().eq('id', id));
}

// ---------------- Agenda ----------------
export async function getActivities(opts: { from?: string; to?: string; ascending?: boolean; limit?: number } = {}): Promise<Activity[]> {
  let q = supabase.from('activities').select('*');
  if (opts.from) q = q.gte('activity_date', opts.from);
  if (opts.to) q = q.lte('activity_date', opts.to);
  const asc = opts.ascending ?? true;
  q = q.order('activity_date', { ascending: asc }).order('start_time', { ascending: asc });
  if (opts.limit) q = q.limit(opts.limit);
  return ensure(await q);
}
export async function saveActivity(row: Partial<Activity>) {
  const { id, ...rest } = row;
  if (id) ensure(await supabase.from('activities').update(rest).eq('id', id).select().single());
  else ensure(await supabase.from('activities').insert(rest).select().single());
}
export async function deleteActivity(id: string) {
  ensure(await supabase.from('activities').delete().eq('id', id));
}

// ---------------- Inventaris ----------------
export async function getInventories(): Promise<Inventory[]> {
  return ensure(await supabase.from('inventories').select('*').order('name'));
}
export async function saveInventory(row: Partial<Inventory>) {
  const { id, updated_at: _u, ...rest } = row;
  if (id) ensure(await supabase.from('inventories').update(rest).eq('id', id).select().single());
  else ensure(await supabase.from('inventories').insert(rest).select().single());
}
export async function deleteInventory(id: string) {
  ensure(await supabase.from('inventories').delete().eq('id', id));
}
