export type TrxType = 'pemasukan' | 'pengeluaran';

export interface MosqueSettings {
  id: number;
  name: string;
  subtitle: string;
  address: string;
  district: string;
  regency: string;
  province: string;
  logo_url: string | null;
  latitude: number;
  longitude: number;
  coordinates_verified: boolean;
  timezone: 'Asia/Makassar' | 'Asia/Jakarta' | 'Asia/Jayapura';
  calc_method: CalcMethod;
  madhab: 'SYAFII' | 'HANAFI';
  adj_subuh: number;
  adj_terbit: number;
  adj_zuhur: number;
  adj_asar: number;
  adj_magrib: number;
  adj_isya: number;
  hijri_offset: number;
  opening_balance: number;
  opening_balance_date: string | null;
  friday_default_time: string;
  ramadan_mode: boolean;
  tv_running_text: string | null;
  updated_at?: string;
}

export type CalcMethod = 'KEMENAG' | 'MWL' | 'EGYPTIAN' | 'UMM_AL_QURA' | 'SINGAPORE' | 'ISNA';

export interface PrayerOverride {
  id: string;
  schedule_date: string;
  subuh: string | null;
  terbit: string | null;
  zuhur: string | null;
  asar: string | null;
  magrib: string | null;
  isya: string | null;
  note: string | null;
  updated_at: string;
}

export type OfficerRole = 'imam' | 'khatib' | 'bilal' | 'muazin';

export interface FridayOfficer {
  id: string;
  full_name: string;
  roles: OfficerRole[];
  notes: string | null;
  is_active: boolean;
}

export interface OfficerStats extends FridayOfficer {
  as_imam: number;
  as_khatib: number;
  as_bilal: number;
  as_muazin: number;
  last_duty: string | null;
}

export interface FridaySchedule {
  id: string;
  friday_date: string;
  start_time: string;
  imam_id: string | null;
  khatib_id: string | null;
  bilal_id: string | null;
  muazin_id: string | null;
  sermon_theme: string | null;
  notes: string | null;
  imam?: { full_name: string } | null;
  khatib?: { full_name: string } | null;
  bilal?: { full_name: string } | null;
  muazin?: { full_name: string } | null;
}

export interface TrxCategory {
  id: string;
  type: TrxType;
  name: string;
  slug: string;
  sort_order: number;
  is_active: boolean;
}

/** Baris dari view public_transactions (aman untuk publik). */
export interface PublicTransaction {
  id: string;
  trx_number: string;
  trx_date: string;
  type: TrxType;
  category_id: string;
  category_name: string;
  description: string;
  amount: number;
  donor_display: string | null;
  running_balance: number;
  created_at: string;
}

/** Baris lengkap tabel transactions (hanya admin). */
export interface Transaction {
  id: string;
  trx_number: string;
  trx_date: string;
  type: TrxType;
  category_id: string;
  description: string;
  amount: number;
  donor_name: string | null;
  donor_is_public: boolean;
  proof_path: string | null;
  recorded_by_name: string | null;
  status: 'aktif' | 'dibatalkan';
  void_reason: string | null;
  voided_at: string | null;
  created_at: string;
  updated_at: string;
  category?: { name: string } | null;
}

export interface FinanceSummary {
  opening_balance: number;
  total_income: number;
  total_expense: number;
  closing_balance: number;
  trx_count: number;
}

export interface MonthlyFinance {
  month_start: string;
  total_income: number;
  total_expense: number;
  closing_balance: number;
}

export interface CategoryTotal {
  category_id: string;
  category_name: string;
  type: TrxType;
  total: number;
  trx_count: number;
}

export type AnnouncementCategory = 'kegiatan' | 'berita_duka' | 'gotong_royong' | 'infak' | 'penting' | 'lainnya';

export interface Announcement {
  id: string;
  title: string;
  content: string;
  category: AnnouncementCategory;
  is_pinned: boolean;
  status: 'terbit' | 'arsip';
  publish_at: string;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export type ActivityCategory = 'pengajian' | 'ceramah' | 'ramadan' | 'idulfitri' | 'iduladha' | 'sosial' | 'gotong_royong' | 'lainnya';
export type ActivityStatus = 'terjadwal' | 'berlangsung' | 'selesai' | 'dibatalkan';

export interface Activity {
  id: string;
  title: string;
  description: string | null;
  category: ActivityCategory;
  activity_date: string;
  start_time: string;
  end_time: string | null;
  location: string | null;
  status: ActivityStatus;
}

export type InventoryCategory = 'perlengkapan_ibadah' | 'elektronik' | 'furnitur' | 'kebersihan' | 'buku' | 'lainnya';
export type InventoryCondition = 'baik' | 'rusak_ringan' | 'rusak_berat' | 'hilang';

export interface Inventory {
  id: string;
  name: string;
  category: InventoryCategory;
  quantity: number;
  unit: string;
  condition: InventoryCondition;
  purchase_date: string | null;
  notes: string | null;
  updated_at: string;
}

export interface AuditLog {
  id: number;
  table_name: string;
  record_id: string;
  action: 'INSERT' | 'UPDATE' | 'VOID' | 'DELETE';
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  reason: string | null;
  changed_at: string;
}
