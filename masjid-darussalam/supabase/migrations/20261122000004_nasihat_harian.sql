-- =====================================================================
--  MASJID DARUSSALAM — Migration 4: nasihat harian di teks berjalan TV
-- =====================================================================
alter table public.mosque_settings
  add column tv_daily_quotes boolean not null default true;
comment on column public.mosque_settings.tv_daily_quotes is 'Tampilkan nasihat harian (ayat Al-Qur''an & hadis beserta sumbernya) di teks berjalan TV.';
