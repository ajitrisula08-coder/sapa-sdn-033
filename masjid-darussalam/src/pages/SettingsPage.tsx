import { Building2, Clock4, History, KeyRound, Landmark, LocateFixed, MonitorPlay, Save, Settings } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { RequireAdmin } from '../components/AdminGate';
import { AuditList } from '../components/AuditList';
import { Field, PageHeader, useConfirm } from '../components/ui';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import { friendlyError, updateSettings } from '../lib/api';
import { ALL_TIME_KEYS, CALC_METHODS, PRAYER_LABEL, TIMEZONE_LABEL } from '../lib/constants';
import { emitDataChanged } from '../lib/events';
import { formatDate, rupiah, todayISO } from '../lib/format';
import { computeDay, formatPrayerTime } from '../lib/prayer';
import { supabase } from '../lib/supabase';
import type { CalcMethod, MosqueSettings } from '../lib/types';

function Section({ id, icon: Icon, title, desc, children, onSave, saving }: {
  id: string; icon: React.ComponentType<{ className?: string }>; title: string; desc: string; children: ReactNode; onSave?: () => void; saving?: boolean;
}) {
  return (
    <section id={id} className="card scroll-mt-24 p-5 sm:p-6">
      <div className="mb-5 flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><Icon className="size-5" /></div>
        <div><h2 className="font-display text-xl font-bold text-emerald-950">{title}</h2><p className="text-sm text-slate-500">{desc}</p></div>
      </div>
      {children}
      {onSave && (
        <div className="mt-5 flex justify-end border-t border-slate-100 pt-4">
          <button className="btn-primary" disabled={saving} onClick={onSave}><Save className="size-4" /> {saving ? 'Menyimpan…' : 'Simpan'}</button>
        </div>
      )}
    </section>
  );
}

function SettingsForm() {
  const { settings, reload } = useSettings();
  const toast = useToast();
  const confirm = useConfirm();
  const [f, setF] = useState<MosqueSettings>(settings);
  const [saving, setSaving] = useState<string | null>(null);
  const [pw, setPw] = useState({ a: '', b: '' });
  useEffect(() => { setF(settings); }, [settings]);
  const set = (patch: Partial<MosqueSettings>) => setF((x) => ({ ...x, ...patch }));

  async function save(section: string, keys: (keyof MosqueSettings)[]) {
    const patch = Object.fromEntries(keys.map((k) => [k, f[k]])) as Partial<MosqueSettings>;
    setSaving(section);
    try {
      await updateSettings(patch);
      toast.success('Pengaturan berhasil disimpan.');
      emitDataChanged('settings', 'finance');
      reload();
    } catch (e) { toast.error(friendlyError(e)); } finally { setSaving(null); }
  }

  function useMyLocation() {
    if (!navigator.geolocation) { toast.error('Perangkat ini tidak mendukung lokasi.'); return; }
    toast.info('Mengambil lokasi perangkat… Pastikan Anda berada di masjid.');
    navigator.geolocation.getCurrentPosition(
      (p) => { set({ latitude: Number(p.coords.latitude.toFixed(6)), longitude: Number(p.coords.longitude.toFixed(6)) }); toast.success(`Lokasi didapat (akurasi ±${Math.round(p.coords.accuracy)} m). Klik Simpan.`); },
      () => toast.error('Gagal mengambil lokasi. Izinkan akses lokasi di browser.'),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  async function saveFinance() {
    if (!(f.opening_balance >= 0)) { toast.error('Saldo awal tidak boleh negatif.'); return; }
    const r = await confirm({
      title: 'Ubah saldo awal kas?',
      message: <p>Saldo awal akan diatur menjadi <b>{rupiah(f.opening_balance)}</b>{f.opening_balance_date ? <> per <b>{formatDate(f.opening_balance_date)}</b></> : ''}. Seluruh saldo berjalan akan dihitung ulang. Perubahan ini tercatat di riwayat audit.</p>,
      confirmLabel: 'Ya, simpan saldo awal',
    });
    if (r.ok) await save('finance', ['opening_balance', 'opening_balance_date']);
  }

  async function changePassword() {
    if (pw.a.length < 8) { toast.error('Kata sandi minimal 8 karakter.'); return; }
    if (pw.a !== pw.b) { toast.error('Konfirmasi kata sandi tidak sama.'); return; }
    setSaving('pw');
    try {
      const { error } = await supabase.auth.updateUser({ password: pw.a });
      if (error) throw error;
      setPw({ a: '', b: '' });
      toast.success('Kata sandi berhasil diganti.');
    } catch (e) { toast.error(friendlyError(e)); } finally { setSaving(null); }
  }

  const preview = computeDay(todayISO(f.timezone), f, null);

  return (
    <div className="space-y-6">
      <Section id="identitas" icon={Building2} title="Identitas Masjid" desc="Nama, alamat, dan logo yang tampil di seluruh aplikasi dan layar TV."
        saving={saving === 'id'} onSave={() => save('id', ['name', 'subtitle', 'address', 'district', 'regency', 'province', 'logo_url'])}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nama masjid" required><input className="input" value={f.name} onChange={(e) => set({ name: e.target.value })} /></Field>
          <Field label="Subjudul"><input className="input" value={f.subtitle} onChange={(e) => set({ subtitle: e.target.value })} /></Field>
          <Field label="Desa / alamat"><input className="input" value={f.address} onChange={(e) => set({ address: e.target.value })} /></Field>
          <Field label="Kecamatan"><input className="input" value={f.district} onChange={(e) => set({ district: e.target.value })} /></Field>
          <Field label="Kabupaten"><input className="input" value={f.regency} onChange={(e) => set({ regency: e.target.value })} /></Field>
          <Field label="Provinsi"><input className="input" value={f.province} onChange={(e) => set({ province: e.target.value })} /></Field>
          <Field label="URL logo resmi (opsional)" className="sm:col-span-2" hint="Kosongkan untuk memakai logo sementara. Harus diawali https:// atau / (file di folder public).">
            <input className="input" value={f.logo_url ?? ''} onChange={(e) => set({ logo_url: e.target.value.trim() || null })} placeholder="https://… atau /logo-resmi.png" />
          </Field>
        </div>
      </Section>

      <Section id="jadwal" icon={Clock4} title="Lokasi & Jadwal Salat" desc="Koordinat masjid, metode perhitungan, dan koreksi menit setiap waktu salat."
        saving={saving === 'prayer'} onSave={() => save('prayer', ['latitude', 'longitude', 'coordinates_verified', 'timezone', 'calc_method', 'madhab', 'adj_subuh', 'adj_terbit', 'adj_zuhur', 'adj_asar', 'adj_magrib', 'adj_isya', 'hijri_offset', 'friday_default_time'])}>
        {!f.coordinates_verified && (
          <p className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Koordinat saat ini masih <b>perkiraan</b>. Buka Google Maps, tekan lama pada titik masjid, salin angka koordinatnya ke sini — atau tekan "Gunakan lokasi perangkat" saat berada di masjid.</p>
        )}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Lintang (latitude)" required hint="Contoh: -0.063600"><input type="number" step="0.000001" className="input tabular" value={f.latitude} onChange={(e) => set({ latitude: Number(e.target.value) })} /></Field>
          <Field label="Bujur (longitude)" required hint="Contoh: 116.861400"><input type="number" step="0.000001" className="input tabular" value={f.longitude} onChange={(e) => set({ longitude: Number(e.target.value) })} /></Field>
          <div className="flex flex-col justify-center gap-2 lg:col-span-2">
            <button type="button" className="btn-outline" onClick={useMyLocation}><LocateFixed className="size-4" /> Gunakan lokasi perangkat</button>
            <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" className="size-4 accent-emerald-700" checked={f.coordinates_verified} onChange={(e) => set({ coordinates_verified: e.target.checked })} /> Koordinat sudah diperiksa dan sesuai lokasi masjid</label>
          </div>
          <Field label="Zona waktu" required>
            <select className="input" value={f.timezone} onChange={(e) => set({ timezone: e.target.value as MosqueSettings['timezone'] })}>
              {Object.entries(TIMEZONE_LABEL).map(([k, v]) => <option key={k} value={k}>{k} — {v}</option>)}
            </select>
          </Field>
          <Field label="Metode perhitungan" required className="lg:col-span-2" hint={CALC_METHODS[f.calc_method].detail}>
            <select className="input" value={f.calc_method} onChange={(e) => set({ calc_method: e.target.value as CalcMethod })}>
              {Object.entries(CALC_METHODS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </Field>
          <Field label="Mazhab waktu Asar">
            <select className="input" value={f.madhab} onChange={(e) => set({ madhab: e.target.value as MosqueSettings['madhab'] })}>
              <option value="SYAFII">Syafi'i (umum di Indonesia)</option><option value="HANAFI">Hanafi</option>
            </select>
          </Field>
        </div>
        {f.timezone !== 'Asia/Makassar' && <p className="mt-3 text-sm text-rose-700">Perhatian: Desa Teratak berada di zona WITA (Asia/Makassar).</p>}
        <h3 className="mb-2 mt-6 text-sm font-bold uppercase tracking-wider text-slate-500">Koreksi menit (− / +)</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {ALL_TIME_KEYS.map((k) => {
            const key = `adj_${k}` as const;
            return (
              <div key={k} className="rounded-xl border border-slate-100 p-3">
                <p className="text-sm font-semibold text-slate-700">{PRAYER_LABEL[k]}</p>
                <input type="number" min={-30} max={30} className="input mt-1 tabular" value={f[key]} onChange={(e) => set({ [key]: Math.max(-30, Math.min(30, Math.round(Number(e.target.value) || 0))) } as Partial<MosqueSettings>)} aria-label={`Koreksi ${PRAYER_LABEL[k]}`} />
                <p className="mt-1 text-xs text-slate-500">Hasil: <b className="tabular">{formatPrayerTime(preview.times[k], f.timezone)}</b></p>
              </div>
            );
          })}
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Koreksi tanggal Hijriah (hari)" hint="Sesuaikan dengan keputusan sidang isbat bila berbeda."><input type="number" min={-3} max={3} className="input" value={f.hijri_offset} onChange={(e) => set({ hijri_offset: Math.max(-3, Math.min(3, Math.round(Number(e.target.value) || 0))) })} /></Field>
          <Field label="Jam salat Jumat bawaan"><input type="time" className="input" value={f.friday_default_time.slice(0, 5)} onChange={(e) => set({ friday_default_time: e.target.value })} /></Field>
        </div>
      </Section>

      <Section id="keuangan" icon={Landmark} title="Saldo Awal Kas" desc="Saldo kas nyata pada saat aplikasi mulai digunakan. Bukan data contoh."
        saving={saving === 'finance'} onSave={saveFinance}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Saldo awal (Rp)" required hint={rupiah(f.opening_balance)}>
            <input inputMode="numeric" className="input tabular text-lg font-semibold" value={f.opening_balance ? Math.round(f.opening_balance).toLocaleString('id-ID') : '0'} onChange={(e) => set({ opening_balance: Number(e.target.value.replace(/\D/g, '')) || 0 })} />
          </Field>
          <Field label="Per tanggal" hint="Transaksi sebelum tanggal ini tidak dapat dicatat.">
            <input type="date" className="input" max={todayISO()} value={f.opening_balance_date ?? ''} onChange={(e) => set({ opening_balance_date: e.target.value || null })} />
          </Field>
        </div>
      </Section>

      <Section id="tv" icon={MonitorPlay} title="Layar TV Masjid" desc="Teks berjalan dan mode Ramadan pada halaman /tv."
        saving={saving === 'tv'} onSave={() => save('tv', ['tv_running_text', 'ramadan_mode'])}>
        <div className="space-y-4">
          <Field label="Teks berjalan (opsional)" hint="Maks. 500 karakter. Jika kosong, judul pengumuman terbaru yang ditampilkan.">
            <textarea className="input min-h-20" maxLength={500} value={f.tv_running_text ?? ''} onChange={(e) => set({ tv_running_text: e.target.value || null })} />
          </Field>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700"><input type="checkbox" className="size-4 accent-emerald-700" checked={f.ramadan_mode} onChange={(e) => set({ ramadan_mode: e.target.checked })} /> Aktifkan Mode Ramadan di layar TV (menampilkan waktu imsak & berbuka)</label>
          <a href="/tv" target="_blank" rel="noreferrer" className="btn-gold"><MonitorPlay className="size-4" /> Buka layar TV</a>
        </div>
      </Section>

      <Section id="akun" icon={KeyRound} title="Akun Administrator" desc="Ganti kata sandi login admin. Pendaftaran admin baru tidak tersedia untuk publik.">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Kata sandi baru"><input type="password" autoComplete="new-password" className="input" value={pw.a} onChange={(e) => setPw({ ...pw, a: e.target.value })} /></Field>
          <Field label="Ulangi kata sandi baru"><input type="password" autoComplete="new-password" className="input" value={pw.b} onChange={(e) => setPw({ ...pw, b: e.target.value })} /></Field>
          <div className="flex items-end"><button className="btn-primary w-full" disabled={saving === 'pw'} onClick={changePassword}><KeyRound className="size-4" /> Ganti Kata Sandi</button></div>
        </div>
      </Section>

      <Section id="audit" icon={History} title="Riwayat Aktivitas (Audit Log)" desc="50 perubahan data terakhir di seluruh sistem.">
        <AuditList limit={50} />
      </Section>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <div>
      <PageHeader icon={Settings} title="Pengaturan" subtitle="Identitas masjid, jadwal salat, saldo awal, layar TV, dan akun admin" />
      <RequireAdmin><SettingsForm /></RequireAdmin>
    </div>
  );
}
