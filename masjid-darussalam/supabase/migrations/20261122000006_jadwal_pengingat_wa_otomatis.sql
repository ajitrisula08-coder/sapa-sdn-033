-- =====================================================================
--  MASJID DARUSSALAM — Migration 6: pengingat WA otomatis (Fonnte)
--  Membutuhkan Edge Function "kirim-pengingat-jumat" (supabase/functions)
--  dan secret FONNTE_TOKEN yang diisi pemilik di Supabase Dashboard.
-- =====================================================================
alter table public.mosque_settings
  add column wa_auto_enabled boolean not null default false;
comment on column public.mosque_settings.wa_auto_enabled is 'Kirim pengingat WA otomatis ke petugas Jumat setiap Kamis 16:00 WITA (butuh FONNTE_TOKEN).';

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

-- Kamis 16:00 WITA = Kamis 08:00 UTC. Fungsi sendiri memeriksa saklar wa_auto_enabled
-- dan tidak mengirim ulang ke petugas yang sudah diingatkan.
-- GANTI <project-ref> dengan ref project Supabase Anda bila memakai project lain.
select cron.schedule(
  'pengingat-petugas-jumat',
  '0 8 * * 4',
  $$
  select net.http_post(
    url := 'https://ofcfezdaczeozifnwxlc.supabase.co/functions/v1/kirim-pengingat-jumat',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := '{"mode":"cron"}'::jsonb,
    timeout_milliseconds := 60000
  );
  $$
);
