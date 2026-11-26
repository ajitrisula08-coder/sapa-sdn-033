import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** true bila URL & anon key Supabase sudah diisi di .env.local / Vercel. */
export const isSupabaseConfigured = Boolean(url && anonKey && url.startsWith('https://') && !url.includes('xxxxxxxx'));

// Hanya kunci "anon public" yang boleh dipakai di frontend.
// Service role key TIDAK PERNAH dipakai atau disimpan di aplikasi ini.
export const supabase: SupabaseClient = createClient(
  isSupabaseConfigured ? url! : 'https://belum-dikonfigurasi.supabase.co',
  isSupabaseConfigured ? anonKey! : 'belum-dikonfigurasi',
  { auth: { persistSession: true, autoRefreshToken: true } },
);

export const PROOF_BUCKET = 'bukti-transaksi';
