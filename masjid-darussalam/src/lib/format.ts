import { nowMs } from './clock';
import { HIJRI_MONTHS } from './constants';

export const APP_TZ = 'Asia/Makassar';

const rupiahFmt = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });
const numberFmt = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 });

export const rupiah = (n: number | null | undefined) => rupiahFmt.format(Number(n ?? 0)).replace(/ /g, ' ');
export const angka = (n: number | null | undefined) => numberFmt.format(Number(n ?? 0));

/** Rp 1,2 jt — untuk sumbu grafik. */
export function rupiahShort(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `${(n / 1_000_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} M`;
  if (abs >= 1_000_000) return `${(n / 1_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} jt`;
  if (abs >= 1_000) return `${(n / 1_000).toLocaleString('id-ID', { maximumFractionDigits: 0 })} rb`;
  return String(n);
}

/** Komponen tanggal (Y-M-D) pada zona waktu tertentu. */
export function ymdInTz(date: Date, tz: string = APP_TZ): { y: number; m: number; d: number } {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return { y: get('year'), m: get('month'), d: get('day') };
}

/** "YYYY-MM-DD" untuk hari ini (atau tanggal tertentu) di zona waktu masjid. */
export function todayISO(tz: string = APP_TZ, date: Date = new Date(nowMs())): string {
  const { y, m, d } = ymdInTz(date, tz);
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** Parse "YYYY-MM-DD" menjadi Date pada tengah hari UTC (aman untuk operasi tanggal). */
export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12));
}

export function isoFromUTCDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDaysISO(iso: string, days: number): string {
  const d = parseISODate(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return isoFromUTCDate(d);
}

/** Senin, 22 November 2026 */
export function formatDateLong(iso: string): string {
  return parseISODate(iso).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}
export function formatDate(iso: string): string {
  return parseISODate(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}
export function formatDayShort(iso: string): string {
  return parseISODate(iso).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
}
export function formatMonthYear(iso: string): string {
  return parseISODate(iso).toLocaleDateString('id-ID', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}
export function weekdayName(iso: string): string {
  return parseISODate(iso).toLocaleDateString('id-ID', { weekday: 'long', timeZone: 'UTC' });
}

/** Tanggal + jam dari timestamp, di zona waktu masjid. */
export function formatDateTime(ts: string | Date, tz: string = APP_TZ): string {
  return new Date(ts).toLocaleString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: tz,
  });
}

export function formatClock(date: Date, tz: string = APP_TZ, withSeconds = true): string {
  return date.toLocaleTimeString('id-ID', {
    hour: '2-digit', minute: '2-digit', second: withSeconds ? '2-digit' : undefined, hour12: false, timeZone: tz,
  }).replace(/\./g, ':');
}

/** "12:00:00" → "12:00" */
export const hhmm = (t: string | null | undefined) => (t ? t.slice(0, 5) : '—');

/** Tanggal Hijriah (Umm al-Qura) dengan koreksi hari. */
export function hijriDate(date: Date, tz: string = APP_TZ, offsetDays = 0): string {
  const shifted = new Date(date.getTime() + offsetDays * 86_400_000);
  try {
    const parts = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', {
      day: 'numeric', month: 'numeric', year: 'numeric', timeZone: tz,
    }).formatToParts(shifted);
    const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
    const day = get('day');
    const month = get('month');
    const year = get('year');
    if (!day || !month || !year) throw new Error('hijri');
    return `${day} ${HIJRI_MONTHS[month - 1]} ${year} H`;
  } catch {
    return '';
  }
}

/** Nomor bulan Hijriah (1–12), untuk mendeteksi Ramadan. */
export function hijriMonth(date: Date, tz: string = APP_TZ, offsetDays = 0): number {
  try {
    const shifted = new Date(date.getTime() + offsetDays * 86_400_000);
    const parts = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { month: 'numeric', timeZone: tz }).formatToParts(shifted);
    return Number(parts.find((p) => p.type === 'month')?.value) || 0;
  } catch {
    return 0;
  }
}

/** Format durasi (ms) menjadi HH:MM:SS */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
}

export function friendlyCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 60000));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m} menit lagi`;
  return `${h} jam ${m} menit lagi`;
}
