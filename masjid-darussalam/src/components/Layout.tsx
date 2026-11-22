import { LogOut, Menu, MonitorPlay, ShieldCheck, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import { isSupabaseConfigured } from '../lib/supabase';
import { LogoMark } from './Logo';
import { BOTTOM_NAV, NAV_ITEMS } from './nav';

function Brand({ compact = false }: { compact?: boolean }) {
  const { settings } = useSettings();
  return (
    <div className="flex items-center gap-3">
      <LogoMark className={compact ? 'size-9' : 'size-11'} />
      <div className="min-w-0 leading-tight">
        <p className={`font-display font-bold tracking-wide text-white ${compact ? 'text-lg' : 'text-xl'}`}>{settings.name}</p>
        {!compact && <p className="truncate text-[11px] text-emerald-100/70">{settings.subtitle}</p>}
      </div>
    </div>
  );
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const { isAdmin } = useAuth();
  const items = NAV_ITEMS.filter((n) => !(isAdmin && n.to === '/login'));
  return (
    <nav className="space-y-1">
      {items.map(({ to, label, icon: Icon }) => (
        <NavLink key={to} to={to} end={to === '/'} onClick={onNavigate}
          className={({ isActive }) => `group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[14.5px] font-medium transition ${
            isActive ? 'bg-white/12 text-white shadow-inner ring-1 ring-white/10' : 'text-emerald-50/75 hover:bg-white/6 hover:text-white'}`}>
          {({ isActive }) => (<>
            <Icon className={`size-[18px] ${isActive ? 'text-gold-300' : 'text-emerald-200/60 group-hover:text-emerald-100'}`} />
            {label}
            {isActive && <span className="ml-auto size-1.5 rounded-full bg-gold-400" />}
          </>)}
        </NavLink>
      ))}
    </nav>
  );
}

function AdminCard() {
  const { isAdmin, adminName, signOut } = useAuth();
  const toast = useToast();
  if (!isAdmin) return null;
  return (
    <div className="rounded-2xl bg-white/6 p-3 ring-1 ring-white/10">
      <div className="flex items-center gap-2.5">
        <div className="grid size-9 place-items-center rounded-xl bg-gold-400/20 text-gold-300"><ShieldCheck className="size-5" /></div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{adminName ?? 'Administrator'}</p>
          <p className="text-[11px] text-emerald-100/60">Mode administrator</p>
        </div>
        <button className="rounded-lg p-2 text-emerald-100/70 hover:bg-white/10 hover:text-white" title="Keluar"
          onClick={async () => { await signOut(); toast.success('Anda telah keluar dari mode admin.'); }}>
          <LogOut className="size-4" />
        </button>
      </div>
    </div>
  );
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="bg-islamic relative flex h-full flex-col overflow-hidden">
      <div className="pattern-overlay pointer-events-none absolute inset-0 opacity-[0.07]" />
      <div className="relative border-b border-white/10 px-5 py-5"><Brand /></div>
      <div className="relative flex-1 overflow-y-auto px-3 py-4 scrollbar-thin"><NavList onNavigate={onNavigate} /></div>
      <div className="relative space-y-3 p-4">
        <AdminCard />
        <a href="/tv" target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-gold-400 to-gold-500 px-4 py-2.5 text-sm font-semibold text-emerald-950 shadow hover:from-gold-300">
          <MonitorPlay className="size-4" /> Buka Mode TV Masjid
        </a>
      </div>
    </div>
  );
}

export default function Layout() {
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  const { error } = useSettings();
  useEffect(() => { setOpen(false); window.scrollTo({ top: 0 }); }, [loc.pathname]);
  const bottom = NAV_ITEMS.filter((n) => BOTTOM_NAV.includes(n.to));

  return (
    <div className="min-h-dvh lg:pl-[272px]">
      {/* Sidebar desktop */}
      <aside className="no-print fixed inset-y-0 left-0 z-40 hidden w-[272px] lg:block"><Sidebar /></aside>

      {/* Header HP/tablet */}
      <header className="no-print bg-islamic sticky top-0 z-30 flex items-center justify-between px-4 py-3 shadow-md lg:hidden" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
        <Brand compact />
        <button className="rounded-xl p-2 text-white hover:bg-white/10" onClick={() => setOpen(true)} aria-label="Buka menu"><Menu className="size-6" /></button>
      </header>

      {/* Drawer HP */}
      {open && (
        <div className="no-print fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-emerald-950/50" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 right-0 w-[86%] max-w-[320px] animate-fade-up shadow-2xl">
            <button className="absolute right-3 top-4 z-10 rounded-xl p-2 text-white hover:bg-white/10" onClick={() => setOpen(false)} aria-label="Tutup menu"><X className="size-5" /></button>
            <Sidebar onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}

      <main className="mx-auto max-w-[1360px] px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:pb-12 lg:pt-8 print-full">
        {!isSupabaseConfigured && (
          <div className="no-print mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <b>Mode pratinjau:</b> aplikasi belum terhubung ke database Supabase. Jadwal salat tetap dihitung otomatis,
            tetapi data keuangan, Jumat, agenda, pengumuman, dan inventaris belum dapat ditampilkan.
            Lihat panduan di <code className="rounded bg-amber-100 px-1">README.md</code>.
          </div>
        )}
        {isSupabaseConfigured && error && (
          <div className="no-print mb-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            Pengaturan masjid gagal dimuat: {error} Aplikasi memakai pengaturan bawaan sementara.
          </div>
        )}
        <Outlet />
        <footer className="no-print mt-12 border-t border-emerald-900/10 pt-5 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} Masjid Darussalam · Desa Teratak, Muara Kaman · Dikembangkan oleh AJI PRASETIA TRISULA
        </footer>
      </main>

      {/* Bottom nav HP */}
      <nav className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-emerald-900/10 bg-white/95 backdrop-blur lg:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="grid grid-cols-5">
          {bottom.map(({ to, short, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold ${isActive ? 'text-emerald-700' : 'text-slate-500'}`}>
              {({ isActive }) => (<>
                <span className={`grid h-7 w-12 place-items-center rounded-full transition ${isActive ? 'bg-emerald-100' : ''}`}><Icon className="size-[19px]" /></span>
                {short ?? label}
              </>)}
            </NavLink>
          ))}
          <button onClick={() => setOpen(true)} className="flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold text-slate-500">
            <span className="grid h-7 w-12 place-items-center rounded-full"><Menu className="size-[19px]" /></span>
            Lainnya
          </button>
        </div>
      </nav>
    </div>
  );
}
