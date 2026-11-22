import type { MosqueSettings } from './types';

export type ThemeId = 'zamrud' | 'malam' | 'marun' | 'toska' | 'ungu' | 'coklat';

/** Daftar tema. `swatch` hanya untuk pratinjau di menu Pengaturan. */
export const THEMES: { id: ThemeId; label: string; desc: string; swatch: [string, string, string] }[] = [
  { id: 'zamrud', label: 'Zamrud', desc: 'Hijau zamrud & emas — identitas utama masjid', swatch: ['#047857', '#022c22', '#c9a227'] },
  { id: 'malam', label: 'Biru Malam', desc: 'Biru tua yang tenang, cocok untuk malam hari', swatch: ['#1d4ed8', '#0b1630', '#c9a227'] },
  { id: 'marun', label: 'Marun Klasik', desc: 'Merah marun hangat bernuansa klasik', swatch: ['#be123c', '#3b0716', '#c9a227'] },
  { id: 'toska', label: 'Toska', desc: 'Hijau kebiruan yang segar', swatch: ['#0f766e', '#032a2a', '#c9a227'] },
  { id: 'ungu', label: 'Ungu Ramadan', desc: 'Ungu anggun, cocok untuk bulan Ramadan', swatch: ['#7e22ce', '#2a0a3f', '#c9a227'] },
  { id: 'coklat', label: 'Coklat Kayu', desc: 'Coklat kayu yang teduh dan natural', swatch: ['#73462b', '#2a180f', '#c9a227'] },
];

export const isThemeId = (v: unknown): v is ThemeId => THEMES.some((t) => t.id === v);

/** Tema yang berlaku saat ini (berganti tiap hari bila theme_rotate aktif). */
export function activeTheme(s: Pick<MosqueSettings, 'theme' | 'theme_rotate'>, now: Date = new Date()): ThemeId {
  if (s.theme_rotate) {
    const day = Math.floor((now.getTime() + 8 * 3600_000) / 86_400_000); // hari dalam WITA
    return THEMES[day % THEMES.length].id;
  }
  return isThemeId(s.theme) ? s.theme : 'zamrud';
}
