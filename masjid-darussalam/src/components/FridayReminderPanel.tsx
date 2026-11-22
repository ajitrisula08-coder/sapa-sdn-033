import { CheckCircle2, Copy, MessageCircle, Phone, Send, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import { useQuery } from '../hooks/useQuery';
import {
  friendlyError, getFridayReminders, getFridaySchedules, getOfficerContacts, logFridayReminder, saveOfficerContact,
} from '../lib/api';
import { formatDateLong, formatDateTime, hhmm, parseISODate, todayISO } from '../lib/format';
import {
  groupMessage, normalizeWhatsapp, prettyWhatsapp, REMINDER_ROLES, reminderMessage, waLink, type ReminderRole,
} from '../lib/whatsapp';
import type { FridaySchedule } from '../lib/types';
import { Badge, EmptyState, ErrorState, LoadingBlock } from './ui';

async function copyText(text: string, toast: { success: (m: string) => void; error: (m: string) => void }) {
  try { await navigator.clipboard.writeText(text); toast.success('Pesan disalin. Tempel di WhatsApp.'); }
  catch { toast.error('Gagal menyalin. Tahan lama pada teks lalu salin manual.'); }
}

function RoleCard({ schedule, role, label, phone, sentAt, mosqueName, onSent, onPhoneSaved }: {
  schedule: FridaySchedule; role: ReminderRole; label: string; phone: string | null; sentAt: string | null;
  mosqueName: string; onSent: () => void; onPhoneSaved: () => void;
}) {
  const toast = useToast();
  const officer = schedule[role] as { full_name: string } | null | undefined;
  const officerId = schedule[`${role}_id` as const];
  const initial = officer ? reminderMessage(schedule, role, officer.full_name, mosqueName) : '';
  const [text, setText] = useState(initial);
  const [newPhone, setNewPhone] = useState('');
  const [savingPhone, setSavingPhone] = useState(false);
  useEffect(() => { setText(initial); }, [initial]);

  if (!officer || !officerId) {
    return (
      <div className="card p-5">
        <Badge tone="slate">{label}</Badge>
        <p className="mt-3 text-sm italic text-slate-500">Petugas {label.toLowerCase()} belum ditentukan pada jadwal ini.</p>
      </div>
    );
  }

  async function addPhone() {
    const n = normalizeWhatsapp(newPhone);
    if (!n) { toast.error('Nomor WhatsApp tidak valid. Contoh: 0812 3456 7890'); return; }
    setSavingPhone(true);
    try { await saveOfficerContact(officerId!, n); toast.success('Nomor WhatsApp disimpan.'); setNewPhone(''); onPhoneSaved(); }
    catch (e) { toast.error(friendlyError(e)); } finally { setSavingPhone(false); }
  }

  async function send() {
    window.open(waLink(text, phone), '_blank', 'noopener');
    try { await logFridayReminder({ schedule_id: schedule.id, role, officer_id: officerId }); onSent(); }
    catch { /* pencatatan gagal tidak menghalangi pengiriman */ }
  }

  return (
    <div className={`card flex flex-col p-5 ${sentAt ? 'ring-2 ring-emerald-500/40' : ''}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-b from-gold-300 to-gold-500 px-4 py-1.5 text-sm font-extrabold uppercase tracking-wider text-slate-900">{label}</span>
        {sentAt
          ? <Badge tone="emerald"><CheckCircle2 className="size-3.5" /> Terkirim {formatDateTime(sentAt)}</Badge>
          : <Badge tone="gold">Belum diingatkan</Badge>}
      </div>
      <p className="mt-3 font-display text-2xl font-bold text-emerald-950">{officer.full_name}</p>
      {phone ? (
        <p className="flex items-center gap-1.5 text-sm text-slate-600"><Phone className="size-4 text-emerald-700" /> {prettyWhatsapp(phone)}</p>
      ) : (
        <div className="mt-2 rounded-xl bg-amber-50 p-3">
          <p className="text-xs font-semibold text-amber-900">Nomor WhatsApp belum diisi.</p>
          <div className="mt-2 flex gap-2">
            <input className="input py-2" inputMode="tel" placeholder="0812 3456 7890" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} aria-label={`Nomor WhatsApp ${officer.full_name}`} />
            <button className="btn-primary shrink-0 px-3" disabled={savingPhone} onClick={addPhone}>Simpan</button>
          </div>
        </div>
      )}
      <label className="mt-3 block flex-1">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">Pesan (bisa diubah)</span>
        <textarea className="input min-h-56 text-sm leading-relaxed" value={text} onChange={(e) => setText(e.target.value)} />
      </label>
      <div className="mt-3 flex flex-wrap gap-2">
        <button className="btn flex-1 bg-[#25D366] text-white hover:bg-[#1ebe5a]" onClick={send}>
          <Send className="size-4" /> {phone ? 'Kirim WA' : 'Buka WA (pilih kontak)'}
        </button>
        <button className="btn-outline" onClick={() => void copyText(text, toast)}>
          <Copy className="size-4" /> Salin
        </button>
      </div>
    </div>
  );
}

/** Panel admin: kirim pengingat WhatsApp ke petugas Jumat (Imam, Khatib, Bilal). */
export function FridayReminderPanel() {
  const { settings } = useSettings();
  const toast = useToast();
  const today = todayISO(settings.timezone);
  const schedules = useQuery(() => getFridaySchedules({ from: today, ascending: true, limit: 6 }), [today], { topics: ['friday'] });
  const contacts = useQuery(getOfficerContacts, [], { topics: ['contacts'] });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const list = schedules.data ?? [];
  const sel = useMemo(() => list.find((x) => x.id === selectedId) ?? list[0], [list, selectedId]);
  const reminders = useQuery(() => (sel ? getFridayReminders(sel.id) : Promise.resolve([])), [sel?.id], { topics: ['reminders'] });

  const phoneOf = (officerId: string | null) => contacts.data?.find((c) => c.officer_id === officerId)?.whatsapp ?? null;
  const sentAt = (role: ReminderRole) => reminders.data?.find((r) => r.role === role)?.sent_at ?? null;
  const isThursday = parseISODate(today).getUTCDay() === 4;

  if (schedules.loading) return <LoadingBlock />;
  if (schedules.error) return <ErrorState message={schedules.error} onRetry={() => schedules.reload()} />;
  if (!sel) return <div className="card"><EmptyState icon={MessageCircle} title="Belum ada jadwal Jumat mendatang" description="Buat jadwal Jumat terlebih dahulu di tab Jadwal Mendatang." /></div>;

  const group = groupMessage(sel, settings.name);

  return (
    <div className="space-y-5">
      <div className="card flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-gold-700">Pengingat WhatsApp petugas</p>
          <p className="font-display text-2xl font-bold text-emerald-950">{formatDateLong(sel.friday_date)} · {hhmm(sel.start_time)} WITA</p>
          <p className="text-sm text-slate-500">
            {isThursday ? 'Hari ini Kamis — waktu yang tepat untuk mengingatkan petugas.' : 'Disarankan dikirim setiap hari Kamis.'} Buka halaman ini di HP agar WhatsApp langsung terbuka.
          </p>
        </div>
        {list.length > 1 && (
          <select className="input sm:w-56" value={sel.id} onChange={(e) => setSelectedId(e.target.value)} aria-label="Pilih tanggal Jumat">
            {list.map((x) => <option key={x.id} value={x.id}>{formatDateLong(x.friday_date)}</option>)}
          </select>
        )}
      </div>

      {contacts.error && <ErrorState message={contacts.error} onRetry={() => contacts.reload()} />}

      <div className="grid gap-4 lg:grid-cols-3">
        {REMINDER_ROLES.map((r) => (
          <RoleCard key={`${sel.id}-${r.key}`} schedule={sel} role={r.key} label={r.label} mosqueName={settings.name}
            phone={phoneOf(sel[`${r.key}_id` as const])} sentAt={sentAt(r.key)}
            onSent={() => void reminders.reload(true)} onPhoneSaved={() => void contacts.reload(true)} />
        ))}
      </div>

      <div className="card p-5">
        <p className="flex items-center gap-2 font-semibold text-slate-800"><Users className="size-5 text-emerald-700" /> Ringkasan untuk grup WhatsApp</p>
        <pre className="mt-3 whitespace-pre-wrap rounded-xl bg-slate-50 p-4 font-sans text-sm text-slate-700">{group}</pre>
        <div className="mt-3 flex flex-wrap gap-2">
          <a className="btn bg-[#25D366] text-white hover:bg-[#1ebe5a]" href={waLink(group)} target="_blank" rel="noreferrer"><Send className="size-4" /> Kirim ke grup (pilih grup)</a>
          <button className="btn-outline" onClick={() => void copyText(group, toast)}><Copy className="size-4" /> Salin</button>
        </div>
      </div>
    </div>
  );
}
