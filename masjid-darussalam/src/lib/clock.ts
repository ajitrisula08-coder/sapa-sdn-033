import { isSupabaseConfigured, supabase } from './supabase';

/**
 * JAM TERKOREKSI
 * Banyak TV box Android tidak punya baterai jam, sehingga jamnya kembali ke
 * tanggal pabrik setiap kali listrik dicabut. Aplikasi membandingkan jam
 * perangkat dengan jam server (Supabase) dan memakai selisihnya, sehingga
 * jam, jadwal, dan hitung mundur sholat tetap benar.
 */
let offsetMs = 0;
let lastSync = 0;
let synced = false;

/** Waktu sekarang (ms) yang sudah dikoreksi dengan jam server. */
export const nowMs = () => Date.now() + offsetMs;
export const clockOffsetMs = () => offsetMs;
export const isClockSynced = () => synced;

export async function syncClock(): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    const t0 = Date.now();
    const { data, error } = await supabase.rpc('server_now');
    const t1 = Date.now();
    if (error || !data) return;
    const server = new Date(data as string).getTime();
    if (Number.isNaN(server) || t1 - t0 > 10_000) return; // respons terlalu lambat: abaikan
    offsetMs = server - (t0 + t1) / 2;
    synced = true;
    lastSync = Date.now();
  } catch {
    /* tanpa internet: tetap pakai jam perangkat */
  }
}

let started = false;
/** Sinkronkan saat aplikasi dibuka, lalu setiap 10 menit & saat internet kembali. */
export function startClockSync() {
  if (started) return;
  started = true;
  void syncClock();
  window.setInterval(() => void syncClock(), 10 * 60_000);
  window.addEventListener('online', () => void syncClock());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && Date.now() - lastSync > 60_000) void syncClock();
  });
}
