import type {
  ActivityCategory, ActivityStatus, AnnouncementCategory, CalcMethod,
  InventoryCategory, InventoryCondition, MosqueSettings, OfficerRole,
} from './types';

/**
 * Nilai bawaan identitas & pengaturan masjid. Sama persis dengan nilai default
 * di database (tabel mosque_settings). Dipakai sebelum data dari database dimuat,
 * atau bila aplikasi belum dihubungkan ke Supabase.
 *
 * Koordinat masjid dari Google Maps (dikonfirmasi pengurus, 22 Nov 2026).
 * Nilai yang berlaku tetap diambil dari database (menu Pengaturan).
 */
export const DEFAULT_SETTINGS: MosqueSettings = {
  id: 1,
  name: 'Masjid Darussalam',
  subtitle: 'Sistem Informasi dan Administrasi Masjid',
  address: 'Desa Teratak',
  district: 'Kecamatan Muara Kaman',
  regency: 'Kabupaten Kutai Kartanegara',
  province: 'Kalimantan Timur',
  logo_url: null,
  latitude: -0.275538,
  longitude: 116.857109,
  coordinates_verified: true,
  timezone: 'Asia/Makassar',
  calc_method: 'KEMENAG',
  madhab: 'SYAFII',
  adj_subuh: 0,
  adj_terbit: 0,
  adj_zuhur: 0,
  adj_asar: 0,
  adj_magrib: 0,
  adj_isya: 0,
  hijri_offset: 0,
  opening_balance: 0,
  opening_balance_date: null,
  friday_default_time: '12:00',
  ramadan_mode: false,
  tv_running_text: null,
  theme: 'zamrud',
  theme_rotate: false,
  tv_friday_slide: true,
};

export const CALC_METHODS: Record<CalcMethod, { label: string; detail: string }> = {
  KEMENAG: {
    label: 'Kemenag RI (Indonesia)',
    detail: 'Sudut Subuh 20°, sudut Isya 18°, Asar bayangan 1× (Syafi\'i), ihtiyat +2 menit (Terbit −2 menit), dibulatkan ke atas.',
  },
  SINGAPORE: { label: 'MUIS Singapura', detail: 'Sudut Subuh 20°, sudut Isya 18°, Zuhur +1 menit.' },
  MWL: { label: 'Muslim World League', detail: 'Sudut Subuh 18°, sudut Isya 17°.' },
  EGYPTIAN: { label: 'Egyptian General Authority', detail: 'Sudut Subuh 19,5°, sudut Isya 17,5°.' },
  UMM_AL_QURA: { label: 'Umm al-Qura (Makkah)', detail: 'Sudut Subuh 18,5°, Isya 90 menit setelah Magrib.' },
  ISNA: { label: 'ISNA (Amerika Utara)', detail: 'Sudut Subuh 15°, sudut Isya 15°.' },
};

export const TIMEZONE_LABEL: Record<MosqueSettings['timezone'], string> = {
  'Asia/Makassar': 'WITA (UTC+8)',
  'Asia/Jakarta': 'WIB (UTC+7)',
  'Asia/Jayapura': 'WIT (UTC+9)',
};

export const TIMEZONE_OFFSET: Record<MosqueSettings['timezone'], number> = {
  'Asia/Makassar': 8,
  'Asia/Jakarta': 7,
  'Asia/Jayapura': 9,
};

export const PRAYER_KEYS = ['subuh', 'zuhur', 'asar', 'magrib', 'isya'] as const;
export type PrayerKey = (typeof PRAYER_KEYS)[number];
export const ALL_TIME_KEYS = ['subuh', 'terbit', 'zuhur', 'asar', 'magrib', 'isya'] as const;
export type TimeKey = (typeof ALL_TIME_KEYS)[number];

export const PRAYER_LABEL: Record<TimeKey, string> = {
  subuh: 'Subuh',
  terbit: 'Terbit',
  zuhur: 'Zuhur',
  asar: 'Asar',
  magrib: 'Magrib',
  isya: 'Isya',
};

export const PRAYER_ARABIC: Record<TimeKey, string> = {
  subuh: 'الفجر',
  terbit: 'الشروق',
  zuhur: 'الظهر',
  asar: 'العصر',
  magrib: 'المغرب',
  isya: 'العشاء',
};

export const ROLE_LABEL: Record<OfficerRole, string> = {
  imam: 'Imam',
  khatib: 'Khatib',
  bilal: 'Bilal',
  muazin: 'Muazin', // tidak dipakai lagi: di Masjid Darussalam tugas muazin dirangkap bilal
};

export const ANNOUNCEMENT_CATEGORY: Record<AnnouncementCategory, string> = {
  kegiatan: 'Informasi Kegiatan',
  berita_duka: 'Berita Duka',
  gotong_royong: 'Gotong Royong',
  infak: 'Informasi Infak',
  penting: 'Penting',
  lainnya: 'Lainnya',
};

export const ACTIVITY_CATEGORY: Record<ActivityCategory, string> = {
  pengajian: 'Pengajian Rutin',
  ceramah: 'Ceramah Agama',
  ramadan: 'Kegiatan Ramadan',
  idulfitri: 'Sholat Idulfitri',
  iduladha: 'Sholat Iduladha',
  sosial: 'Kegiatan Sosial',
  gotong_royong: 'Gotong Royong',
  lainnya: 'Kegiatan Lainnya',
};

export const ACTIVITY_STATUS: Record<ActivityStatus, string> = {
  terjadwal: 'Terjadwal',
  berlangsung: 'Berlangsung',
  selesai: 'Selesai',
  dibatalkan: 'Dibatalkan',
};

export const INVENTORY_CATEGORY: Record<InventoryCategory, string> = {
  perlengkapan_ibadah: 'Perlengkapan Ibadah',
  elektronik: 'Elektronik',
  furnitur: 'Furnitur',
  kebersihan: 'Kebersihan',
  buku: 'Buku & Al-Qur\'an',
  lainnya: 'Lainnya',
};

export const INVENTORY_CONDITION: Record<InventoryCondition, string> = {
  baik: 'Baik',
  rusak_ringan: 'Rusak Ringan',
  rusak_berat: 'Rusak Berat',
  hilang: 'Hilang',
};

export const HIJRI_MONTHS = [
  'Muharam', 'Safar', 'Rabiulawal', 'Rabiulakhir', 'Jumadilawal', 'Jumadilakhir',
  'Rajab', 'Syakban', 'Ramadan', 'Syawal', 'Zulkaidah', 'Zulhijah',
];
