import { Lock } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LoadingBlock } from './ui';

/** Menampilkan isi hanya untuk administrator. */
export function AdminOnly({ children }: { children: ReactNode }) {
  const { isAdmin } = useAuth();
  return isAdmin ? <>{children}</> : null;
}

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { isAdmin, loading } = useAuth();
  if (loading) return <LoadingBlock label="Memeriksa sesi admin…" />;
  if (!isAdmin) {
    return (
      <div className="card mx-auto max-w-md p-8 text-center">
        <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-700"><Lock className="size-7" /></div>
        <h2 className="font-display text-2xl font-bold text-emerald-950">Khusus Administrator</h2>
        <p className="mt-2 text-sm text-slate-500">Halaman ini hanya dapat diakses oleh pengurus/administrator masjid.</p>
        <Link to="/login" className="btn-primary mt-5">Login Admin</Link>
      </div>
    );
  }
  return <>{children}</>;
}
