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

/** Pesan pengingat untuk satu petugas. */
export function reminderMessage(s: FridaySchedule, role: ReminderRole, name: string, mosqueName: string): string {
  const label = REMINDER_ROLES.find((r) => r.key === role)!.label.toUpperCase();
  const lines = [
    'Assalamu\'alaikum warahmatullahi wabarakatuh.',
    '',
    `Yth. Bapak *${name}*,`,
    `kami mengingatkan bahwa Bapak dijadwalkan bertugas sebagai *${label}* sholat Jumat di ${mosqueName}:`,
    '',
    `📅 ${formatDateLong(s.friday_date)}`,
    `🕛 Pukul ${hhmm(s.start_time)} WITA`,
  ];
  if (role === 'khatib' && s.sermon_theme) lines.push(`📖 Tema khutbah: ${s.sermon_theme}`);
  lines.push(
    '',
    'Mohon persiapannya. Apabila berhalangan, mohon segera mengabari pengurus agar dapat dicarikan pengganti.',
    '',
    'Jazakumullahu khairan.',
    `— Pengurus ${mosqueName}`,
  );
  return lines.join('\n');
}

/** Pesan ringkasan untuk grup WhatsApp pengurus/petugas. */
export function groupMessage(s: FridaySchedule, mosqueName: string): string {
  const n = (o?: { full_name: string } | null) => o?.full_name ?? '(belum ditentukan)';
  return [
    'Assalamu\'alaikum warahmatullahi wabarakatuh.',
    '',
    `*Petugas Sholat Jumat ${mosqueName}*`,
    `📅 ${formatDateLong(s.friday_date)} · 🕛 ${hhmm(s.start_time)} WITA`,
    '',
    `• Imam   : ${n(s.imam)}`,
    `• Khatib : ${n(s.khatib)}`,
    `• Bilal  : ${n(s.bilal)}`,
    ...(s.sermon_theme ? ['', `📖 Tema khutbah: ${s.sermon_theme}`] : []),
    '',
    'Mohon persiapannya. Jazakumullahu khairan.',
  ].join('\n');
}

/** Tautan wa.me: membuka WhatsApp dengan pesan siap kirim. Tanpa nomor = pilih kontak/grup sendiri. */
export function waLink(text: string, phone?: string | null): string {
  return `https://wa.me/${phone ?? ''}?text=${encodeURIComponent(text)}`;
}
