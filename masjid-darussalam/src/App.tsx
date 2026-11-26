import { lazy, Suspense, useEffect } from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import { ConfirmProvider, LoadingBlock } from './components/ui';
import { AuthProvider } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
import { ToastProvider } from './context/ToastContext';
import { startClockSync } from './lib/clock';
import { startRealtime } from './lib/events';
import Dashboard from './pages/Dashboard';

const PrayerPage = lazy(() => import('./pages/PrayerPage'));
const FridayPage = lazy(() => import('./pages/FridayPage'));
const FridayOfficersPage = lazy(() => import('./pages/FridayOfficersPage'));
const FinancePage = lazy(() => import('./pages/FinancePage'));
const ReportPage = lazy(() => import('./pages/ReportPage'));
const ActivitiesPage = lazy(() => import('./pages/ActivitiesPage'));
const AnnouncementsPage = lazy(() => import('./pages/AnnouncementsPage'));
const InventoryPage = lazy(() => import('./pages/InventoryPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const TvPage = lazy(() => import('./pages/TvPage'));

function NotFound() {
  return (
    <div className="card mx-auto max-w-md p-10 text-center">
      <p className="font-display text-5xl font-bold text-emerald-800">404</p>
      <p className="mt-2 text-slate-500">Halaman tidak ditemukan.</p>
      <Link to="/" className="btn-primary mt-5">Kembali ke Dashboard</Link>
    </div>
  );
}

export default function App() {
  useEffect(() => { startRealtime(); startClockSync(); }, []);
  return (
    <ToastProvider>
      <AuthProvider>
        <SettingsProvider>
          <ConfirmProvider>
            <Suspense fallback={<LoadingBlock className="min-h-[50vh]" label="Memuat halaman…" />}>
              <Routes>
                <Route path="/tv" element={<TvPage />} />
                <Route element={<Layout />}>
                  <Route index element={<Dashboard />} />
                  <Route path="jadwal-salat" element={<PrayerPage />} />
                  <Route path="jumat" element={<FridayPage />} />
                  <Route path="petugas-jumat" element={<FridayOfficersPage />} />
                  <Route path="keuangan" element={<FinancePage />} />
                  <Route path="laporan" element={<ReportPage />} />
                  <Route path="agenda" element={<ActivitiesPage />} />
                  <Route path="pengumuman" element={<AnnouncementsPage />} />
                  <Route path="inventaris" element={<InventoryPage />} />
                  <Route path="pengaturan" element={<SettingsPage />} />
                  <Route path="login" element={<LoginPage />} />
                  <Route path="*" element={<NotFound />} />
                </Route>
              </Routes>
            </Suspense>
          </ConfirmProvider>
        </SettingsProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
