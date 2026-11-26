import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { useNow } from '../hooks/useNow';
import { activeTheme, isThemeId, type ThemeId } from '../lib/themes';
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

/** Tema yang sedang dipratinjau (mis. dari menu Pengaturan atau ?tema= di layar TV). */
let previewTheme: ThemeId | null = null;
const previewListeners = new Set<() => void>();
export function setPreviewTheme(t: ThemeId | null) {
  previewTheme = t;
  previewListeners.forEach((fn) => fn());
}

function applyTheme(id: ThemeId) {
  const root = document.documentElement;
  if (id === 'zamrud') delete root.dataset.theme; else root.dataset.theme = id;
  const color = getComputedStyle(root).getPropertyValue('--color-emerald-900').trim();
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color || '#064e3b');
}

function ThemeApplier({ settings }: { settings: MosqueSettings }) {
  const now = useNow(60_000);
  useEffect(() => {
    const run = () => {
      const fromUrl = new URLSearchParams(window.location.search).get('tema');
      applyTheme(previewTheme ?? (isThemeId(fromUrl) ? fromUrl : activeTheme(settings, now)));
    };
    run();
    previewListeners.add(run);
    return () => { previewListeners.delete(run); };
  }, [settings, now]);
  return null;
}

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
      <ThemeApplier settings={s.data ?? DEFAULT_SETTINGS} />
      {children}
    </SettingsCtx.Provider>
  );
}

export function useSettings() {
  const c = useContext(SettingsCtx);
  if (!c) throw new Error('useSettings must be inside SettingsProvider');
  return c;
}
