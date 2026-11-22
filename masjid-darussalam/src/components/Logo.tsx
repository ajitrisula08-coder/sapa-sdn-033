import { useId } from 'react';
import { useSettings } from '../context/SettingsContext';

/**
 * Logo SEMENTARA Masjid Darussalam (kubah + menara + bintang segi delapan).
 * Untuk mengganti dengan logo resmi: isi "URL Logo" di menu Pengaturan,
 * atau ganti file public/logo.svg.
 */
export function LogoMark({ className = 'size-11', style }: { className?: string; style?: React.CSSProperties }) {
  const { settings } = useSettings();
  // ID gradien unik per instance: bila ada logo di elemen tersembunyi, gradien tetap tampil.
  const uid = useId().replace(/:/g, '');
  const bg = `lg-bg-${uid}`;
  const au = `lg-au-${uid}`;
  if (settings.logo_url) {
    return <img src={settings.logo_url} alt={`Logo ${settings.name}`} className={`${className} shrink-0 rounded-2xl object-contain`} style={style} />;
  }
  return (
    <svg viewBox="0 0 64 64" className={`${className} shrink-0`} style={style} role="img" aria-label="Logo Masjid Darussalam">
      <defs>
        <linearGradient id={bg} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#059669" /><stop offset="1" stopColor="#064e3b" /></linearGradient>
        <linearGradient id={au} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f8e6b0" /><stop offset="1" stopColor="#c9a227" /></linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill={`url(#${bg})`} />
      <path d="M32 6 36 14 44 12 42 20 50 24 42 28 44 36 36 34 32 42 28 34 20 36 22 28 14 24 22 20 20 12 28 14Z" fill="none" stroke={`url(#${au})`} strokeWidth="1.2" opacity=".5" />
      <path d="M32 17c-7 4-11 9-11 15h22c0-6-4-11-11-15Z" fill={`url(#${au})`} />
      <rect x="31.3" y="11" width="1.4" height="6" fill={`url(#${au})`} />
      <circle cx="32" cy="10.5" r="1.6" fill={`url(#${au})`} />
      <rect x="19" y="32" width="26" height="16" rx="1.5" fill="#fff" opacity=".95" />
      <path d="M28 48v-7a4 4 0 0 1 8 0v7Z" fill="#065f46" />
      <rect x="13" y="24" width="3.4" height="24" rx="1" fill={`url(#${au})`} />
      <rect x="47.6" y="24" width="3.4" height="24" rx="1" fill={`url(#${au})`} />
      <path d="M12.6 24 14.7 19l2.1 5Zm34.6 0 2.1-5 2.1 5Z" fill={`url(#${au})`} />
      <rect x="11" y="48" width="42" height="3" rx="1.5" fill={`url(#${au})`} />
    </svg>
  );
}
