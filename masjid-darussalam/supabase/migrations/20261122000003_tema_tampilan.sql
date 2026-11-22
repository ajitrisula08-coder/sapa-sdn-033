-- =====================================================================
--  MASJID DARUSSALAM — Migration 3: tema tampilan & slide petugas Jumat di TV
-- =====================================================================
alter table public.mosque_settings
  add column theme text not null default 'zamrud'
    check (theme in ('zamrud', 'malam', 'marun', 'toska', 'ungu', 'coklat')),
  add column theme_rotate boolean not null default false,
  add column tv_friday_slide boolean not null default true;
comment on column public.mosque_settings.theme is 'Tema warna tampilan aplikasi & layar TV.';
comment on column public.mosque_settings.theme_rotate is 'Jika true, tema berganti otomatis setiap hari.';
comment on column public.mosque_settings.tv_friday_slide is 'Tampilkan slide petugas Jumat layar penuh di TV pada Kamis-Jumat.';
