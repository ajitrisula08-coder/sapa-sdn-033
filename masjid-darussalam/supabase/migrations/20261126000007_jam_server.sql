-- =====================================================================
--  MASJID DARUSSALAM — Migration 7: jam server
--  Aplikasi (terutama layar TV) memakai jam server agar tetap benar walau
--  jam perangkat salah (mis. TV box tanpa baterai jam yang reset saat dicabut).
-- =====================================================================
create or replace function public.server_now()
returns timestamptz
language sql
stable
set search_path = ''
as $$ select now(); $$;
grant execute on function public.server_now() to anon, authenticated;
