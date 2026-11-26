import { CalculationMethod, CalculationParameters, Coordinates, Madhab, PrayerTimes, Rounding } from 'adhan';
import { ALL_TIME_KEYS, CALC_METHODS, PRAYER_KEYS, TIMEZONE_OFFSET, type PrayerKey, type TimeKey } from './constants';
import { addDaysISO, parseISODate, todayISO } from './format';
import type { MosqueSettings, PrayerOverride } from './types';

/**
 * PERHITUNGAN JADWAL SHOLAT
 * ------------------------
 * Dihitung secara astronomis memakai pustaka "adhan" (https://github.com/batoulapps/adhan-js),
 * berdasarkan koordinat masjid, tanggal, dan metode yang dipilih di menu Pengaturan.
 * Hasil dapat dikoreksi per waktu (menit) dan ditimpa manual per tanggal oleh admin.
 */

export type DayTimes = Record<TimeKey, Date>;

export interface DaySchedule {
  date: string;
  times: DayTimes;
  /** Waktu yang ditimpa manual oleh admin pada tanggal ini. */
  manual: Partial<Record<TimeKey, boolean>>;
  note: string | null;
}

function buildParams(s: MosqueSettings): CalculationParameters {
  let p: CalculationParameters;
  switch (s.calc_method) {
    case 'KEMENAG':
      // Kriteria Kementerian Agama RI: Subuh 20°, Isya 18°, ihtiyat 2 menit.
      p = new CalculationParameters('Other', 20, 18);
      p.methodAdjustments = { fajr: 2, sunrise: -2, dhuhr: 2, asr: 2, maghrib: 2, isha: 2 };
      p.rounding = Rounding.Up;
      break;
    case 'SINGAPORE': p = CalculationMethod.Singapore(); break;
    case 'MWL': p = CalculationMethod.MuslimWorldLeague(); break;
    case 'EGYPTIAN': p = CalculationMethod.Egyptian(); break;
    case 'UMM_AL_QURA': p = CalculationMethod.UmmAlQura(); break;
    case 'ISNA': p = CalculationMethod.NorthAmerica(); break;
    default: p = CalculationMethod.Singapore();
  }
  p.madhab = s.madhab === 'HANAFI' ? Madhab.Hanafi : Madhab.Shafi;
  p.adjustments = {
    fajr: s.adj_subuh, sunrise: s.adj_terbit, dhuhr: s.adj_zuhur,
    asr: s.adj_asar, maghrib: s.adj_magrib, isha: s.adj_isya,
  };
  return p;
}

/** Ubah "HH:MM" pada tanggal ISO di zona waktu masjid menjadi Date (instan). */
export function zonedTime(iso: string, hhmm: string, tz: MosqueSettings['timezone']): Date {
  const [y, m, d] = iso.split('-').map(Number);
  const [hh, mm] = hhmm.split(':').map(Number);
  return new Date(Date.UTC(y, m - 1, d, hh - TIMEZONE_OFFSET[tz], mm));
}

export function computeDay(iso: string, s: MosqueSettings, override?: PrayerOverride | null): DaySchedule {
  const base = parseISODate(iso);
  // adhan memakai komponen tanggal lokal dari objek Date.
  const local = new Date(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate(), 12);
  const pt = new PrayerTimes(new Coordinates(Number(s.latitude), Number(s.longitude)), local, buildParams(s));
  const times: DayTimes = {
    subuh: pt.fajr, terbit: pt.sunrise, zuhur: pt.dhuhr, asar: pt.asr, magrib: pt.maghrib, isya: pt.isha,
  };
  const manual: DaySchedule['manual'] = {};
  if (override) {
    for (const k of ALL_TIME_KEYS) {
      const v = override[k];
      if (v) {
        times[k] = zonedTime(iso, v.slice(0, 5), s.timezone);
        manual[k] = true;
      }
    }
  }
  return { date: iso, times, manual, note: override?.note ?? null };
}

export interface PrayerStatus {
  today: DaySchedule;
  current: PrayerKey | null;
  next: { key: PrayerKey; at: Date; isTomorrow: boolean };
}

export function prayerStatus(now: Date, s: MosqueSettings, overrides: PrayerOverride[]): PrayerStatus {
  const iso = todayISO(s.timezone, now);
  const find = (d: string) => overrides.find((o) => o.schedule_date === d) ?? null;
  const today = computeDay(iso, s, find(iso));
  let current: PrayerKey | null = null;
  for (const k of PRAYER_KEYS) if (today.times[k] <= now) current = k;
  // Sebelum Subuh: masih waktu Isya malam sebelumnya.
  if (!current) current = 'isya';
  const nextKey = PRAYER_KEYS.find((k) => today.times[k] > now);
  if (nextKey) return { today, current, next: { key: nextKey, at: today.times[nextKey], isTomorrow: false } };
  const tIso = addDaysISO(iso, 1);
  const tomorrow = computeDay(tIso, s, find(tIso));
  return { today, current, next: { key: 'subuh', at: tomorrow.times.subuh, isTomorrow: true } };
}

export function formatPrayerTime(d: Date, tz: string): string {
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz }).replace('.', ':');
}

export function methodDescription(s: MosqueSettings): string {
  const m = CALC_METHODS[s.calc_method];
  return `${m.label} — ${m.detail} Mazhab Asar: ${s.madhab === 'HANAFI' ? 'Hanafi (bayangan 2×)' : 'Syafi\'i (bayangan 1×)'}.`;
}

/** Jadwal satu bulan penuh (untuk tabel). */
export function computeMonth(year: number, month: number, s: MosqueSettings, overrides: PrayerOverride[]): DaySchedule[] {
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const out: DaySchedule[] = [];
  for (let d = 1; d <= days; d++) {
    const iso = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    out.push(computeDay(iso, s, overrides.find((o) => o.schedule_date === iso)));
  }
  return out;
}
