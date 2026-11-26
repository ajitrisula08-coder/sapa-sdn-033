import { formatDateLong, hhmm } from './format';
import type { FridaySchedule } from './types';

export type ReminderRole = 'imam' | 'khatib' | 'bilal';
export const REMINDER_ROLES: { key: ReminderRole; label: string }[] = [
  { key: 'imam', label: 'Imam' }, { key: 'khatib', label: 'Khatib' }, { key: 'bilal', label: 'Bilal' },
];

/** Ubah "0812-3456 7890" / "+62 812..." menjadi "6281234567890". null bila tidak valid. */
export function normalizeWhatsapp(input: string): string | null {
  let d = input.replace(/[^\d+]/g, '');
  if (d.startsWith('+')) d = d.slice(1);
  if (d.startsWith('0')) d = '62' + d.slice(1);
  else if (d.startsWith('8')) d = '62' + d;
  return /^62\d{8,13}$/.test(d) ? d : null;
}

/** Tampilan rapi: 0812-3456-7890 */
export function prettyWhatsapp(n: string): string {
  const local = n.startsWith('62') ? '0' + n.slice(2) : n;
  return local.replace(/^(\d{4})(\d{4})(\d+)$/, '$1-$2-$3');
}

/** Persiapan khusus untuk setiap tugas. */
const PERSIAPAN: Record<ReminderRole, string[]> = {
  imam: [
    'Hadir ± 15 menit sebelum waktu sholat',
    'Menjaga kelancaran bacaan dan mengingatkan jamaah untuk merapikan saf',
  ],
  khatib: [
    'Menyiapkan naskah khutbah yang memenuhi rukun khutbah',
    'Menyampaikan khutbah dengan ringkas, jelas, dan menyejukkan',
    'Hadir ± 15 menit sebelum waktu sholat',
  ],
  bilal: [
    'Memeriksa pengeras suara sebelum azan',
    'Menyiapkan azan, iqamah, dan pengumuman sebelum khutbah',
    'Hadir ± 20 menit sebelum waktu sholat',
  ],
};

const GARIS = '━━━━━━━━━━━━━━━━━━';

/** Pesan pengingat untuk satu petugas (format teks WhatsApp). */
export function reminderMessage(s: FridaySchedule, role: ReminderRole, name: string, mosqueName: string): string {
  const label = REMINDER_ROLES.find((r) => r.key === role)!.label.toUpperCase();
  return [
    '🕌 *PENGINGAT TUGAS SHOLAT JUMAT*',
    `*${mosqueName}*`,
    GARIS,
    '',
    'Assalamu\'alaikum warahmatullahi wabarakatuh.',
    '',
    `Yth. *Bapak ${name}* 🤲`,
    'Dengan hormat, kami mengingatkan amanah Bapak sebagai:',
    '',
    `🎖️ *${label} SHOLAT JUMAT*`,
    '',
    `📅 *${formatDateLong(s.friday_date)}*`,
    `🕛 Pukul *${hhmm(s.start_time)} WITA*`,
    `📍 ${mosqueName}`,
    ...(role === 'khatib' && s.sermon_theme ? [`📖 Tema khutbah: _${s.sermon_theme}_`] : []),
    '',
    '✅ *Mohon persiapan:*',
    ...PERSIAPAN[role].map((p) => `• ${p}`),
    '',
    '> _"Sebaik-baik hari yang matahari terbit padanya adalah hari Jumat."_',
    '> (HR. Muslim no. 854)',
    '',
    'Apabila berhalangan, mohon mengabari pengurus *paling lambat Jumat pagi* agar dapat dicarikan pengganti.',
    '',
    'Jazakumullahu khairan katsiran 🙏',
    `_Pengurus ${mosqueName}_`,
  ].join('\n');
}

/** Pesan ringkasan untuk grup WhatsApp pengurus/petugas. */
export function groupMessage(s: FridaySchedule, mosqueName: string): string {
  const n = (o?: { full_name: string } | null) => (o?.full_name ? `*${o.full_name}*` : '_(belum ditentukan)_');
  return [
    '🕌 *PETUGAS SHOLAT JUMAT*',
    `*${mosqueName}*`,
    GARIS,
    '',
    'Assalamu\'alaikum warahmatullahi wabarakatuh.',
    '',
    `📅 *${formatDateLong(s.friday_date)}*`,
    `🕛 Pukul *${hhmm(s.start_time)} WITA*`,
    '',
    `🎖️ Imam    : ${n(s.imam)}`,
    `🎤 Khatib  : ${n(s.khatib)}`,
    `🔔 Bilal   : ${n(s.bilal)}`,
    ...(s.sermon_theme ? ['', `📖 Tema khutbah: _${s.sermon_theme}_`] : []),
    '',
    'Mohon kepada para petugas untuk mempersiapkan diri dan hadir lebih awal. Apabila berhalangan, mohon segera mengabari pengurus.',
    '',
    'Jazakumullahu khairan katsiran 🙏',
    `_Pengurus ${mosqueName}_`,
  ].join('\n');
}

/** Tautan wa.me: membuka WhatsApp dengan pesan siap kirim. Tanpa nomor = pilih kontak/grup sendiri. */
export function waLink(text: string, phone?: string | null): string {
  return `https://wa.me/${phone ?? ''}?text=${encodeURIComponent(text)}`;
}
