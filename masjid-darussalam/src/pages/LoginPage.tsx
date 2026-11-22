import { Eye, EyeOff, LogIn, ShieldCheck } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { LogoMark } from '../components/Logo';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import { friendlyError } from '../lib/api';
import { isSupabaseConfigured } from '../lib/supabase';

export default function LoginPage() {
  const { signIn, isAdmin } = useAuth();
  const { settings } = useSettings();
  const toast = useToast();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (isAdmin) return <Navigate to="/" replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!email.trim() || !password) { setErr('Email dan kata sandi wajib diisi.'); return; }
    setBusy(true);
    try {
      await signIn(email.trim(), password);
      toast.success('Selamat datang, Administrator.');
      nav('/');
    } catch (e2) { setErr(friendlyError(e2)); } finally { setBusy(false); }
  }

  return (
    <div className="mx-auto grid max-w-4xl overflow-hidden rounded-[28px] shadow-lift lg:grid-cols-2">
      <div className="bg-islamic relative hidden flex-col justify-between p-10 text-white lg:flex">
        <div className="pattern-overlay pointer-events-none absolute inset-0 opacity-10" />
        <div className="relative"><LogoMark className="size-16" /></div>
        <div className="relative">
          <p className="font-arabic text-3xl text-gold-300">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</p>
          <h2 className="mt-4 font-display text-4xl font-bold">{settings.name}</h2>
          <p className="mt-2 text-emerald-50/75">Panel administrasi untuk mengelola jadwal, keuangan, agenda, pengumuman, dan inventaris masjid.</p>
        </div>
        <p className="relative text-xs text-emerald-50/50">Akses terbatas untuk pengurus yang ditunjuk.</p>
      </div>
      <div className="bg-white p-7 sm:p-10">
        <div className="mb-7 flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><ShieldCheck className="size-6" /></div>
          <div><h1 className="font-display text-3xl font-bold text-emerald-950">Login Admin</h1><p className="text-sm text-slate-500">Masuk dengan akun administrator</p></div>
        </div>
        {!isSupabaseConfigured && <p className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Login belum dapat digunakan karena aplikasi belum terhubung ke Supabase.</p>}
        <form onSubmit={submit} className="space-y-4" noValidate>
          <label className="block"><span className="label">Email</span>
            <input type="email" autoComplete="username" className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@contoh.com" />
          </label>
          <label className="block"><span className="label">Kata sandi</span>
            <div className="relative">
              <input type={show ? 'text' : 'password'} autoComplete="current-password" className="input pr-11" value={password} onChange={(e) => setPassword(e.target.value)} />
              <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" onClick={() => setShow(!show)} aria-label={show ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}>
                {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </label>
          {err && <p className="rounded-xl bg-rose-50 p-3 text-sm font-medium text-rose-700" role="alert">{err}</p>}
          <button type="submit" className="btn-primary w-full py-3" disabled={busy || !isSupabaseConfigured}><LogIn className="size-4" /> {busy ? 'Memeriksa…' : 'Masuk'}</button>
        </form>
        <p className="mt-6 text-xs text-slate-500">Tidak ada pendaftaran publik. Akun admin dibuat oleh pengembang melalui Supabase Dashboard. Lupa kata sandi? Hubungi pengembang aplikasi.</p>
      </div>
    </div>
  );
}
