import {
  Boxes, CalendarClock, CalendarDays, Clock4, FileBarChart, LayoutDashboard, LogIn, Megaphone, Mic,
  Settings, Users, Wallet, type LucideIcon,
} from 'lucide-react';

export interface NavItem { to: string; label: string; icon: LucideIcon; short?: string }

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, short: 'Beranda' },
  { to: '/jadwal-salat', label: 'Jadwal Sholat', icon: Clock4, short: 'Sholat' },
  { to: '/jumat', label: 'Sholat Jumat', icon: Users, short: 'Jumat' },
  { to: '/petugas-jumat', label: 'Petugas Jumat', icon: Mic },
  { to: '/keuangan', label: 'Keuangan Masjid', icon: Wallet, short: 'Kas' },
  { to: '/laporan', label: 'Laporan Keuangan', icon: FileBarChart },
  { to: '/agenda', label: 'Agenda Kegiatan', icon: CalendarDays, short: 'Agenda' },
  { to: '/pengumuman', label: 'Pengumuman', icon: Megaphone },
  { to: '/inventaris', label: 'Inventaris Masjid', icon: Boxes },
  { to: '/pengaturan', label: 'Pengaturan', icon: Settings },
  { to: '/login', label: 'Login Admin', icon: LogIn },
];

export const BOTTOM_NAV = ['/', '/jadwal-salat', '/keuangan', '/agenda'];
export { CalendarClock };

/** Alamat layar TV, mengikuti base path (mis. /sapa-sdn-033/masjid/tv di GitHub Pages). */
export const TV_URL = `${import.meta.env.BASE_URL}tv`;
