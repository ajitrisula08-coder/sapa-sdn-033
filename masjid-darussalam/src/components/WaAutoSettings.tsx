import { CheckCircle2, CircleAlert, Loader2, MessageCircle, RefreshCw, Send } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import { friendlyError, updateSettings } from '../lib/api';
import { emitDataChanged } from '../lib/events';
import { supabase } from '../lib/supabase';
import { normalizeWhatsapp } from '../lib/whatsapp';
import { Field } from './ui';

const FN = 'kirim-pengingat-jumat';

interface Status { tokenConfigured: boolean; autoEnabled: boolean; device?: { device_status?: string; device?: string; quota?: string | number; package?: string } | null }

export async function callFn<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(FN, { body });
  if (error) {
    const ctx = (error as { context?: Response }).context;
    const msg = ctx ? (await ctx.json().catch(() => null))?.error : null;
    throw new Error(msg ?? error.message);
  }
  return data as T;
}

/** Pengaturan pengingat WhatsApp otomatis (Fonnte) — khusus admin. */
export function WaAutoSettings() {
  const { settings, reload } = useSettings();
  const toast = useToast();
  const [status, setStatus] = useState<Status | null>(null);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testNo, setTestNo] = useState('');
  const [testing, setTesting] = useState(false);

  const check = useCallback(async () => {
    setChecking(true);
    try { setStatus(await callFn<Status>({ mode: 'status' })); }
    catch (e) { toast.error(`Gagal memeriksa status: ${friendlyError(e)}`); }
    finally { setChecking(false); }
  }, [toast]);
  useEffect(() => { void check(); }, [check]);

  async function toggle(on: boolean) {
    setSaving(true);
    try {
      await updateSettings({ wa_auto_enabled: on });
      toast.success(on ? 'Pengingat otomatis diaktifkan: setiap Kamis 16:00 WITA.' : 'Pengingat otomatis dinonaktifkan.');
      emitDataChanged('settings'); reload(); void check();
    } catch (e) { toast.error(friendlyError(e)); } finally { setSaving(false); }
  }

  async function test() {
    const n = normalizeWhatsapp(testNo);
    if (!n) { toast.error('Nomor tujuan uji tidak valid. Contoh: 0812 3456 7890'); return; }
    setTesting(true);
    try {
      const r = await callFn<{ sent: boolean }>({ mode: 'test', target: n });
      if (r.sent) toast.success('Pesan uji terkirim. Periksa WhatsApp di nomor tersebut.');
      else toast.error('Pesan uji gagal dikirim.');
    } catch (e) { toast.error(friendlyError(e)); } finally { setTesting(false); }
  }

  const connected = status?.device?.device_status === 'connect';
  const ready = !!status?.tokenConfigured && connected;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ['Token Fonnte', status ? (status.tokenConfigured ? 'Terpasang' : 'Belum dipasang') : '…', !!status?.tokenConfigured],
          ['Perangkat WA masjid', status?.tokenConfigured ? (connected ? 'Tersambung' : (status.device?.device_status ?? 'Belum tersambung')) : '—', connected],
          ['Jadwal kirim', settings.wa_auto_enabled ? 'Aktif · Kamis 16:00 WITA' : 'Nonaktif', settings.wa_auto_enabled],
        ].map(([label, value, ok]) => (
          <div key={String(label)} className={`rounded-2xl border p-4 ${ok ? 'border-emerald-200 bg-emerald-50/60' : 'border-amber-200 bg-amber-50/60'}`}>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
            <p className="mt-1 flex items-center gap-1.5 font-semibold text-slate-800">
              {ok ? <CheckCircle2 className="size-4 text-emerald-600" /> : <CircleAlert className="size-4 text-amber-600" />} {String(value)}
            </p>
          </div>
        ))}
      </div>
      {status?.device?.quota !== undefined && <p className="text-xs text-slate-500">Paket: {status.device?.package ?? '—'} · Sisa kuota: {String(status.device?.quota)}</p>}

      <div className="flex flex-wrap gap-2">
        <button className="btn-outline" onClick={check} disabled={checking}>{checking ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />} Periksa status</button>
        {settings.wa_auto_enabled
          ? <button className="btn-outline" disabled={saving} onClick={() => toggle(false)}>Nonaktifkan pengingat otomatis</button>
          : <button className="btn-primary" disabled={saving || !ready} onClick={() => toggle(true)} title={ready ? '' : 'Pasang token dan sambungkan perangkat terlebih dahulu'}><MessageCircle className="size-4" /> Aktifkan pengingat otomatis</button>}
      </div>

      <div className="rounded-2xl border border-slate-200 p-4">
        <Field label="Kirim pesan uji" hint="Untuk memastikan WhatsApp masjid sudah tersambung. Isi dengan nomor Anda sendiri.">
          <div className="flex gap-2">
            <input className="input" inputMode="tel" placeholder="0812 3456 7890" value={testNo} onChange={(e) => setTestNo(e.target.value)} />
            <button className="btn-primary shrink-0" disabled={testing || !status?.tokenConfigured} onClick={test}>{testing ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Kirim uji</button>
          </div>
        </Field>
      </div>

      {!status?.tokenConfigured && (
        <ol className="list-decimal space-y-1.5 rounded-2xl bg-slate-50 p-4 pl-8 text-sm text-slate-600">
          <li>Siapkan <b>nomor WhatsApp khusus masjid</b> di sebuah HP yang selalu aktif.</li>
          <li>Daftar di <b>fonnte.com</b>, tambahkan perangkat (<i>Add device</i>) dengan nomor itu, lalu <b>pindai kode QR</b> dari WhatsApp HP masjid (Perangkat tertaut).</li>
          <li>Salin <b>Token</b> perangkat dari Fonnte.</li>
          <li>Buka <b>Supabase → Edge Functions → Secrets</b>, tambahkan nama <code className="rounded bg-white px-1">FONNTE_TOKEN</code> dengan nilai token tadi. Jangan kirim token lewat chat.</li>
          <li>Kembali ke sini, klik <b>Periksa status</b>, kirim <b>pesan uji</b>, lalu <b>Aktifkan</b>.</li>
        </ol>
      )}
      <p className="text-xs text-slate-500">Pesan otomatis dikirim setiap Kamis pukul 16:00 WITA ke Imam, Khatib, dan Bilal Jumat terdekat yang nomornya sudah diisi. Petugas yang sudah diingatkan (manual atau otomatis) tidak dikirimi pesan dobel.</p>
    </div>
  );
}
