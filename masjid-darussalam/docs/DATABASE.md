# Struktur Database — Masjid Darussalam

Database memakai **Supabase PostgreSQL**. Seluruh skema ada di
`supabase/migrations/20261122000001_skema_awal.sql`.

## Prinsip utama

| Prinsip | Cara penerapan |
|---|---|
| Saldo selalu akurat | Saldo **tidak disimpan** sebagai angka. Saldo dihitung dari `mosque_settings.opening_balance` + transaksi aktif, lewat view `public_transactions` dan fungsi `finance_summary()`. |
| Transaksi tidak bisa dihapus | Tidak ada policy DELETE, hak DELETE dicabut, dan trigger `transactions_no_delete` menolak penghapusan. |
| Setiap perubahan tercatat | Trigger `write_audit_log()` menyimpan data lama & baru ke `audit_logs`. Edit transaksi **wajib** alasan (`change_reason`), pembatalan **wajib** alasan (`void_reason`). |
| Hanya satu admin | Unique index `profiles_single_admin` hanya mengizinkan satu baris `is_admin = true`. Status admin tidak bisa diubah dari aplikasi. |
| Publik hanya membaca | RLS aktif di semua tabel. Pengunjung (`anon`) hanya punya policy `SELECT`. |
| Data donatur terlindungi | Publik membaca transaksi lewat view `public_transactions`, yang hanya menampilkan nama donatur bila `donor_is_public = true`. Tabel `transactions` tidak dapat dibaca publik. |
| Validasi di database | `CHECK` constraint (nominal > 0, tanggal Jumat harus hari Jumat, urutan waktu salat, dll.) dan trigger validasi (kategori sesuai jenis, peran petugas sesuai). |

## Tabel

### 1. `mosque_settings` (selalu 1 baris, `id = 1`)
Identitas masjid, koordinat, zona waktu (default `Asia/Makassar`), metode hitung
jadwal (`KEMENAG`, `MWL`, `EGYPTIAN`, `UMM_AL_QURA`, `SINGAPORE`, `ISNA`), mazhab
Asar, koreksi menit (`adj_subuh` … `adj_isya`, −30 s.d. +30), koreksi Hijriah,
saldo awal kas + tanggalnya, jam Jumat bawaan, mode Ramadan, teks berjalan TV.

### 2. `profiles`
Terhubung 1-1 dengan `auth.users`. Kolom: `full_name`, `is_admin`. Dibuat
otomatis oleh trigger `on_auth_user_created` (tidak otomatis admin).

### 3. `prayer_schedules`
Jadwal salat **manual** per tanggal (`schedule_date` unik). Kolom waktu yang
kosong berarti memakai hasil perhitungan otomatis. Perubahan tercatat di audit log.

### 4. `friday_officers`
Petugas Jumat: `full_name` (unik), `roles` (array: `imam`, `khatib`, `bilal`, `muazin`), `is_active`.

### 5. `friday_schedules`
Jadwal Jumat: `friday_date` (unik, wajib hari Jumat), `start_time`, `imam_id`,
`khatib_id`, `bilal_id`, `muazin_id` (FK ke `friday_officers`, `ON DELETE RESTRICT`),
`sermon_theme`, `notes`. Trigger memastikan petugas memiliki peran yang sesuai.

### 6. `transaction_categories`
Kategori pemasukan (Infak Jumat, Infak Harian, Sedekah Jamaah, Sumbangan Donatur,
Bantuan Pemerintah, Pemasukan Lainnya) dan pengeluaran (Listrik, Air, Kebersihan,
Pemeliharaan Masjid, Honor Petugas, Kegiatan Keagamaan, Kegiatan Sosial,
Pengeluaran Lainnya).

### 7. `transactions`
| Kolom | Keterangan |
|---|---|
| `trx_number` | Otomatis: `PM-YYYYMM-00001` (pemasukan) / `PK-YYYYMM-00002` (pengeluaran) |
| `trx_date`, `type`, `category_id`, `description`, `amount` | Wajib |
| `donor_name`, `donor_is_public` | Opsional, privat secara bawaan |
| `proof_path` | Path file bukti di Storage bucket privat `bukti-transaksi` |
| `recorded_by`, `recorded_by_name`, `created_at` | Diisi otomatis, tidak bisa diubah |
| `status` | `aktif` / `dibatalkan` |
| `void_reason`, `voided_at`, `voided_by` | Diisi saat pembatalan |
| `change_reason` | Alasan edit terakhir (disalin ke audit log) |

### 8. `announcements`
`title`, `content`, `category` (kegiatan, berita_duka, gotong_royong, infak, penting, lainnya),
`is_pinned`, `status` (`terbit`/`arsip`), `publish_at`, `expires_at`.
Publik hanya melihat yang terbit, sudah waktunya, dan belum kedaluwarsa.

### 9. `activities`
Agenda: `title`, `description`, `category` (pengajian, ceramah, ramadan, idulfitri,
iduladha, sosial, gotong_royong, lainnya), `activity_date`, `start_time`, `end_time`,
`location`, `status` (terjadwal, berlangsung, selesai, dibatalkan).

### 10. `inventories`
`name`, `category`, `quantity`, `unit`, `condition` (baik, rusak_ringan, rusak_berat, hilang),
`purchase_date`, `notes`.

### 11. `audit_logs`
`table_name`, `record_id`, `action` (INSERT/UPDATE/VOID/DELETE), `old_data`, `new_data`
(JSONB), `reason`, `changed_by`, `changed_at`. Hanya admin yang dapat membaca; tidak
dapat diubah atau dihapus.

## View & fungsi publik

| Nama | Fungsi |
|---|---|
| `public_transactions` (view) | Transaksi aktif + nama kategori + **saldo berjalan**. Tanpa data pribadi. Sengaja dibuat sebagai *security definer view* agar publik bisa membaca ringkasan tanpa akses ke tabel `transactions`. |
| `friday_officer_stats` (view) | Jumlah tugas tiap petugas per peran + tanggal tugas terakhir. |
| `finance_summary(p_start, p_end)` | Saldo awal periode, total pemasukan, total pengeluaran, saldo akhir. |
| `finance_monthly(p_months)` | Total per bulan untuk grafik. |
| `finance_by_category(p_start, p_end)` | Total per kategori. |
| `is_admin()` | `true` jika pengguna yang login adalah administrator. |

## Rumus saldo

```
Saldo akhir = Saldo awal + Total pemasukan aktif − Total pengeluaran aktif
```

Transaksi berstatus `dibatalkan` tidak dihitung, tetapi tetap tersimpan.

## Catatan pemeriksa keamanan Supabase (Security Advisor)

Beberapa peringatan memang **disengaja**:
- `security_definer_view` pada `public_transactions`: view ini sengaja memakai hak pemilik
  agar jamaah bisa melihat transaksi aktif **tanpa** akses ke tabel `transactions`
  (yang berisi nama donatur privat & bukti). Kolom yang ditampilkan sudah disaring.
- `finance_summary`, `finance_monthly`, `finance_by_category`, `is_admin` dapat dipanggil publik:
  hanya mengembalikan angka ringkasan / true-false, untuk transparansi kas.

Fungsi trigger internal sudah dikunci oleh migration 2.
