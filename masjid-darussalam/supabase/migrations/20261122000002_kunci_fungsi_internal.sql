-- =====================================================================
--  MASJID DARUSSALAM — Migration 2
--  Fungsi trigger internal tidak boleh dipanggil lewat API (/rest/v1/rpc).
--  Trigger tetap berjalan normal karena hak EXECUTE tidak diperiksa saat
--  trigger aktif. Jalankan setelah migration 1.
-- =====================================================================
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.transactions_before_write() from public, anon, authenticated;
revoke execute on function public.write_audit_log() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.prevent_delete() from public, anon, authenticated;
revoke execute on function public.validate_friday_roles() from public, anon, authenticated;
revoke execute on function public.protect_profile_admin_flag() from public, anon, authenticated;
