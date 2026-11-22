-- =====================================================================
--  MASJID DARUSSALAM — Menjadikan satu akun sebagai ADMINISTRATOR
--
--  Jalankan SETELAH:
--   1. migration 20261122000001_skema_awal.sql berhasil dijalankan, dan
--   2. akun admin dibuat di Supabase Dashboard > Authentication > Users > Add user.
--
--  Ganti email di bawah dengan email akun admin yang Anda buat,
--  lalu klik "Run" di SQL Editor.
--  Sistem hanya mengizinkan SATU administrator.
-- =====================================================================

update public.profiles
set is_admin = true,
    full_name = 'AJI PRASETIA TRISULA'          -- nama yang tercatat di setiap transaksi
where id = (select id from auth.users where email = 'GANTI-DENGAN-EMAIL-ADMIN@contoh.com');

-- Periksa hasilnya (harus muncul 1 baris dengan is_admin = true):
select p.full_name, u.email, p.is_admin
from public.profiles p join auth.users u on u.id = p.id
where p.is_admin;
