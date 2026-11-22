# 🕌 Masjid Darussalam — Sistem Informasi dan Administrasi Masjid

Desa Teratak, Kecamatan Muara Kaman, Kabupaten Kutai Kartanegara, Kalimantan Timur.
Pengembang/pemilik proyek: **AJI PRASETIA TRISULA**.

Aplikasi web untuk jamaah dan pengurus Masjid Darussalam. Dapat dibuka di HP,
tablet, laptop, dan TV masjid.

| Untuk jamaah (tanpa login) | Untuk administrator |
|---|---|
| Jadwal salat otomatis + hitung mundur | Atur metode, koordinat, koreksi menit & jadwal manual |
| Jadwal & petugas salat Jumat | Kelola petugas & jadwal Jumat |
| Saldo kas, transaksi, laporan PDF/Excel | Catat pemasukan/pengeluaran, edit (beralasan), batalkan (beralasan) |
| Agenda, pengumuman, inventaris | Kelola agenda, pengumuman (arsip), inventaris |
| Layar TV masjid di alamat `/tv` | Identitas masjid, saldo awal, teks berjalan TV, mode Ramadan, audit log |

**Teknologi:** React + Vite, TypeScript, Tailwind CSS, Supabase (PostgreSQL, Auth, RLS, Storage, Realtime),
Lucide Icons, Recharts, jsPDF, ExcelJS, adhan-js. Deployment: Vercel.

---

## Panduan Instalasi (langkah demi langkah)

Kerjakan **satu langkah per waktu**. Tidak perlu terburu-buru.

### Langkah 1 — Buat project Supabase
1. Buka <https://supabase.com>, daftar/masuk (bisa memakai akun GitHub).
2. Klik **New project**. Isi nama `masjid-darussalam`, buat *Database Password* (simpan sendiri, **jangan dibagikan ke siapa pun**), pilih region **Southeast Asia (Singapore)**.
3. Tunggu ±2 menit sampai project siap.

### Langkah 2 — Jalankan skema database
1. Di Supabase, buka menu **SQL Editor** → **New query**.
2. Buka file `supabase/migrations/20261122000001_skema_awal.sql`, salin **seluruh** isinya, tempel ke SQL Editor.
3. Klik **Run**. Harus muncul "Success. No rows returned".

### Langkah 3 — Matikan pendaftaran publik
1. Buka **Authentication → Sign In / Providers** (atau *Settings*).
2. Matikan **Allow new users to sign up**. Dengan begitu tidak ada orang yang bisa mendaftar sendiri.

### Langkah 4 — Buat akun administrator
1. Buka **Authentication → Users → Add user → Create new user**.
2. Isi email & kata sandi admin (minimal 8 karakter), centang **Auto Confirm User**.
3. Buka **SQL Editor**, salin isi `supabase/02_jadikan_admin.sql`, **ganti email** di dalamnya dengan email admin tadi, lalu **Run**.
   Hasilnya harus menampilkan 1 baris dengan `is_admin = true`.

### Langkah 5 — Ambil kunci publik Supabase
Buka **Project Settings → API** (atau **Data API / API Keys**). Anda butuh dua nilai:
- **Project URL** — contoh `https://abcdefgh.supabase.co`
- **anon public key** (kunci *publishable/anon*)

> ⚠️ **JANGAN** memakai atau membagikan **service_role key**. Aplikasi ini tidak memerlukannya.
> Kunci *anon* aman dipakai di aplikasi karena seluruh data dilindungi Row Level Security.

### Langkah 6 — Deploy ke Vercel
1. Buka <https://vercel.com>, masuk dengan akun GitHub.
2. **Add New → Project** → pilih repository ini.
3. Pada **Root Directory**, klik *Edit* dan pilih folder **`masjid-darussalam`**.
4. Framework terdeteksi otomatis sebagai **Vite**.
5. Buka **Environment Variables**, tambahkan:
   - `VITE_SUPABASE_URL` = Project URL dari Langkah 5
   - `VITE_SUPABASE_ANON_KEY` = anon public key dari Langkah 5
6. Klik **Deploy**. Setelah selesai, Anda mendapat alamat seperti `https://masjid-darussalam.vercel.app`.

### Langkah 7 — Pengaturan awal oleh admin
1. Buka aplikasi → **Login Admin** → masuk.
2. Buka **Pengaturan**:
   - **Lokasi & Jadwal Salat:** isi koordinat **tepat** masjid. Cara termudah: buka Google Maps, tekan lama titik masjid, salin angkanya; atau tekan **Gunakan lokasi perangkat** saat berada di masjid. Centang *Koordinat sudah diperiksa*.
   - Bandingkan jadwal dengan Kemenag (<https://bimasislam.kemenag.go.id/jadwalshalat>). Jika berbeda 1–2 menit, isi **koreksi menit**.
   - **Saldo Awal Kas:** isi saldo kas **nyata** saat ini beserta tanggalnya.
3. Selesai. Mulai catat transaksi, jadwal Jumat, agenda, dan pengumuman.

### Langkah 8 — Pasang di TV masjid
Buka browser TV (atau laptop/STB yang tersambung ke TV), lalu buka `https://alamat-aplikasi-anda/tv`.
- Tekan **Layar penuh** (atau klik dua kali layar).
- Mode **Ramadan** menampilkan waktu imsak & berbuka (otomatis aktif di bulan Ramadan, atau diaktifkan di Pengaturan).
- Data diperbarui otomatis (realtime + setiap 1 menit). Halaman memuat ulang sendiri setiap 6 jam.

---

## Menjalankan di komputer sendiri (untuk pengembang)

```bash
cd masjid-darussalam
npm install
cp .env.example .env.local   # lalu isi URL & anon key
npm run dev                  # buka http://localhost:5173
npm run build                # cek TypeScript + build produksi
```

Tanpa `.env.local`, aplikasi berjalan dalam **mode pratinjau**: jadwal salat tetap dihitung, tetapi
data lain kosong (tidak pernah memakai data contoh sebagai saldo asli).

## Jadwal salat — sumber & metode
- Dihitung secara astronomis dengan pustaka sumber terbuka **adhan-js** dari koordinat masjid.
- Metode bawaan **Kemenag RI**: sudut Subuh 20°, Isya 18°, Asar mazhab Syafi'i, ihtiyat +2 menit (Terbit −2 menit).
- Zona waktu **Asia/Makassar (WITA, UTC+8)** — bukan waktu Jakarta.
- Admin dapat mengganti metode, memberi koreksi per waktu, atau menimpa jadwal per tanggal. Semua perubahan tercatat di riwayat.
- Tanggal Hijriah memakai kalender Umm al-Qura dengan koreksi ±hari yang dapat diatur.
- **Catatan:** koordinat bawaan (-0.0636, 116.8614) hanya titik perkiraan Kecamatan Muara Kaman. Wajib diganti dengan koordinat masjid.

## Keamanan
- Row Level Security aktif di seluruh tabel; pengunjung hanya dapat membaca data publik.
- Hanya satu administrator (dijamin oleh database). Tidak ada pendaftaran publik.
- Transaksi tidak dapat dihapus; edit dan pembatalan wajib beralasan dan tercatat di audit log.
- Nama donatur hanya tampil ke publik bila donatur mengizinkan. Bukti transaksi disimpan di bucket privat.
- Service role key tidak pernah dipakai di frontend.

Struktur lengkap database: [`docs/DATABASE.md`](docs/DATABASE.md).

## Mengganti logo
Logo saat ini adalah logo **sementara**. Untuk memakai logo resmi:
- isi **URL logo** di Pengaturan → Identitas Masjid, **atau**
- simpan file logo ke `public/` (mis. `public/logo-resmi.png`) lalu isi URL `/logo-resmi.png`,
  dan ganti juga `public/logo.svg` untuk ikon tab browser.

## Struktur folder
```
masjid-darussalam/
├─ supabase/migrations/   skema database (SQL)
├─ supabase/02_jadikan_admin.sql
├─ docs/DATABASE.md       dokumentasi tabel
├─ public/                logo & aset statis
└─ src/
   ├─ components/         Layout, Logo, UI, grafik, modal transaksi, audit
   ├─ context/            Auth, Settings, Toast
   ├─ hooks/              useNow, useQuery, usePrayerStatus
   ├─ lib/                api (Supabase), prayer, format, export PDF/Excel, konstanta
   └─ pages/              Dashboard, Jadwal Salat, Jumat, Keuangan, Laporan,
                          Agenda, Pengumuman, Inventaris, Pengaturan, Login, TV
```
