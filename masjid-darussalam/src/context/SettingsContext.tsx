import { createContext, useContext, type ReactNode } from 'react';
import { useQuery } from '../hooks/useQuery';
import { getPrayerOverrides, getSettings } from '../lib/api';
import { DEFAULT_SETTINGS } from '../lib/constants';
import { addDaysISO, todayISO } from '../lib/format';
import type { MosqueSettings, PrayerOverride } from '../lib/types';

interface Ctx {
  settings: MosqueSettings;
  /** Jadwal manual dari kemarin s.d. 40 hari ke depan. */
  overrides: PrayerOverride[];
  loaded: boolean;
  error: string | null;
  reload: () => void;
}

const SettingsCtx = createContext<Ctx | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const s = useQuery(getSettings, [], { topics: ['settings'], refreshMs: 10 * 60_000 });
  const today = todayISO();
  const o = useQuery(() => getPrayerOverrides(addDaysISO(today, -1), addDaysISO(today, 40)), [today], { topics: ['prayer'], refreshMs: 10 * 60_000 });
  return (
    <SettingsCtx.Provider value={{
      settings: s.data ?? DEFAULT_SETTINGS,
      overrides: o.data ?? [],
      loaded: !s.loading,
      error: s.error,
      reload: () => { void s.reload(true); void o.reload(true); },
    }}>
      {children}
    </SettingsCtx.Provider>
  );
}

export function useSettings() {
  const c = useContext(SettingsCtx);
  if (!c) throw new Error('useSettings must be inside SettingsProvider');
  return c;
}
