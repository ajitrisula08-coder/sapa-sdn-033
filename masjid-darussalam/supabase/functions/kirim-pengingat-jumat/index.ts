// =====================================================================
//  MASJID DARUSSALAM — Edge Function: kirim-pengingat-jumat
//  Mengirim pengingat WhatsApp (via Fonnte) ke Imam, Khatib, dan Bilal
//  untuk sholat Jumat terdekat.
//
//  Dipanggil oleh:
//   - pg_cron setiap Kamis 16:00 WITA  (body: {"mode":"cron"})
//   - Admin dari aplikasi               (body: {"mode":"status"|"send"|"test"})
//
//  Rahasia yang dibutuhkan (diisi pemilik di Supabase Dashboard →
//  Edge Functions → Secrets):  FONNTE_TOKEN
//  Aman dipanggil berulang: petugas yang sudah diingatkan tidak dikirimi lagi.
// =====================================================================
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const ROLES = [
  { key: 'imam', label: 'IMAM' },
  { key: 'khatib', label: 'KHATIB' },
  { key: 'bilal', label: 'BILAL' },
] as const;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
});

/** Tanggal & jam sekarang di WITA. */
function nowWita() {
  const d = new Date(Date.now() + 8 * 3600_000);
  return { iso: d.toISOString().slice(0, 10), dow: d.getUTCDay(), hour: d.getUTCHours() };
}

function formatTanggal(iso: string) {
  const d = new Date(iso + 'T12:00:00Z');
  return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

const PERSIAPAN: Record<string, string[]> = {
  IMAM: ['Hadir ± 15 menit sebelum waktu sholat', 'Menjaga kelancaran bacaan dan mengingatkan jamaah untuk merapikan saf'],
  KHATIB: ['Menyiapkan naskah khutbah yang memenuhi rukun khutbah', 'Menyampaikan khutbah dengan ringkas, jelas, dan menyejukkan', 'Hadir ± 15 menit sebelum waktu sholat'],
  BILAL: ['Memeriksa pengeras suara sebelum azan', 'Menyiapkan azan, iqamah, dan pengumuman sebelum khutbah', 'Hadir ± 20 menit sebelum waktu sholat'],
};

function pesan(nama: string, tugas: string, tanggal: string, jam: string, tema: string | null, masjid: string) {
  return [
    '🕌 *PENGINGAT TUGAS SHOLAT JUMAT*',
    `*${masjid}*`,
    '━━━━━━━━━━━━━━━━━━',
    '',
    "Assalamu'alaikum warahmatullahi wabarakatuh.",
    '',
    `Yth. *Bapak ${nama}* 🤲`,
    'Dengan hormat, kami mengingatkan amanah Bapak sebagai:',
    '',
    `🎖️ *${tugas} SHOLAT JUMAT*`,
    '',
    `📅 *${formatTanggal(tanggal)}*`,
    `🕛 Pukul *${jam.slice(0, 5)} WITA*`,
    `📍 ${masjid}`,
    ...(tugas === 'KHATIB' && tema ? [`📖 Tema khutbah: _${tema}_`] : []),
    '',
    '✅ *Mohon persiapan:*',
    ...(PERSIAPAN[tugas] ?? []).map((p) => `• ${p}`),
    '',
    '> _"Sebaik-baik hari yang matahari terbit padanya adalah hari Jumat."_',
    '> (HR. Muslim no. 854)',
    '',
    'Apabila berhalangan, mohon mengabari pengurus *paling lambat Jumat pagi* agar dapat dicarikan pengganti.',
    '',
    'Jazakumullahu khairan katsiran 🙏',
    `_Pengurus ${masjid}_`,
    '',
    '_(Pesan otomatis dari aplikasi masjid)_',
  ].join('\n');
}

async function fonnte(path: string, token: string, form?: Record<string, string>) {
  const body = new FormData();
  for (const [k, v] of Object.entries(form ?? {})) body.append(k, v);
  const res = await fetch(`https://api.fonnte.com/${path}`, { method: 'POST', headers: { Authorization: token }, body });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok && data?.status !== false, data };
}

/** Apakah pemanggil adalah administrator yang sedang login? */
async function isAdminCaller(req: Request): Promise<boolean> {
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token || token.startsWith('sb_')) return false;
  const { data } = await admin.auth.getUser(token);
  if (!data.user) return false;
  const { data: p } = await admin.from('profiles').select('is_admin').eq('id', data.user.id).maybeSingle();
  return Boolean(p?.is_admin);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Gunakan POST' }, 405);

  const body = await req.json().catch(() => ({}));
  const mode: string = body?.mode ?? 'cron';
  const token = Deno.env.get('FONNTE_TOKEN') ?? '';
  const callerIsAdmin = mode === 'cron' ? false : await isAdminCaller(req);
  if (mode !== 'cron' && !callerIsAdmin) return json({ error: 'Khusus administrator.' }, 403);

  const { data: settings } = await admin.from('mosque_settings').select('name, wa_auto_enabled').eq('id', 1).single();
  const masjid = settings?.name ?? 'Masjid Darussalam';

  // ---- Status: apakah token terpasang & perangkat WA tersambung ----
  if (mode === 'status') {
    if (!token) return json({ tokenConfigured: false, autoEnabled: settings?.wa_auto_enabled ?? false });
    const dev = await fonnte('device', token).catch(() => ({ ok: false, data: null }));
    return json({ tokenConfigured: true, autoEnabled: settings?.wa_auto_enabled ?? false, device: dev.data });
  }

  // ---- Uji kirim ke satu nomor (admin) ----
  if (mode === 'test') {
    if (!token) return json({ error: 'Token Fonnte belum dipasang (FONNTE_TOKEN).' }, 400);
    const target = String(body?.target ?? '').replace(/\D/g, '');
    if (!/^62\d{8,13}$/.test(target)) return json({ error: 'Nomor tujuan uji tidak valid.' }, 400);
    const r = await fonnte('send', token, {
      target, countryCode: '62',
      message: `Assalamu'alaikum. Ini pesan uji coba dari aplikasi ${masjid}. Pengingat WhatsApp otomatis sudah tersambung. ✅`,
    });
    return json({ sent: r.ok, detail: r.data }, r.ok ? 200 : 502);
  }

  // ---- Kirim pengingat (cron atau admin) ----
  const w = nowWita();
  if (mode === 'cron') {
    if (!settings?.wa_auto_enabled) return json({ skipped: 'Pengiriman otomatis dinonaktifkan di Pengaturan.' });
    // Hanya Kamis siang/sore s.d. Jumat pagi agar pemanggilan di luar jadwal tidak berefek.
    if (!((w.dow === 4 && w.hour >= 12) || (w.dow === 5 && w.hour < 11))) return json({ skipped: 'Di luar jendela waktu pengingat.' });
  }
  if (!token) return json({ error: 'Token Fonnte belum dipasang (FONNTE_TOKEN).' }, 400);

  const { data: sched } = await admin.from('friday_schedules')
    .select('id, friday_date, start_time, sermon_theme, imam_id, khatib_id, bilal_id')
    .gte('friday_date', w.iso).order('friday_date').limit(1).maybeSingle();
  if (!sched) return json({ skipped: 'Belum ada jadwal Jumat mendatang.' });

  const ids = ROLES.map((r) => sched[`${r.key}_id` as const]).filter(Boolean) as string[];
  const [{ data: officers }, { data: contacts }, { data: sent }] = await Promise.all([
    admin.from('friday_officers').select('id, full_name').in('id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000']),
    admin.from('officer_contacts').select('officer_id, whatsapp').in('officer_id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000']),
    admin.from('friday_reminders').select('role').eq('schedule_id', sched.id),
  ]);
  const already = new Set((sent ?? []).map((s) => s.role));

  const results: { role: string; status: string; nama?: string }[] = [];
  for (const r of ROLES) {
    const officerId = sched[`${r.key}_id` as const] as string | null;
    const officer = officers?.find((o) => o.id === officerId);
    if (!officer) { results.push({ role: r.key, status: 'petugas belum ditentukan' }); continue; }
    if (already.has(r.key)) { results.push({ role: r.key, nama: officer.full_name, status: 'sudah diingatkan sebelumnya' }); continue; }
    const phone = contacts?.find((c) => c.officer_id === officerId)?.whatsapp;
    if (!phone) { results.push({ role: r.key, nama: officer.full_name, status: 'nomor WA belum diisi' }); continue; }
    const res = await fonnte('send', token, {
      target: phone, countryCode: '62',
      message: pesan(officer.full_name, r.label, sched.friday_date, sched.start_time, sched.sermon_theme, masjid),
    });
    if (res.ok) {
      await admin.from('friday_reminders').insert({ schedule_id: sched.id, role: r.key, officer_id: officerId, channel: 'otomatis', sent_by: null });
      results.push({ role: r.key, nama: officer.full_name, status: 'terkirim' });
    } else {
      results.push({ role: r.key, nama: officer.full_name, status: `gagal: ${res.data?.reason ?? 'tidak diketahui'}` });
    }
    await new Promise((ok) => setTimeout(ok, 3000)); // jeda antarpesan agar aman
  }
  return json({ friday_date: sched.friday_date, results });
});
