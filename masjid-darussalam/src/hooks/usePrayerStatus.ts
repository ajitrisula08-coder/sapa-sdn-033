import { useMemo } from 'react';
import { useSettings } from '../context/SettingsContext';
import { prayerStatus } from '../lib/prayer';
import { useNow } from './useNow';

export function usePrayerStatus() {
  const now = useNow(1000);
  const { settings, overrides } = useSettings();
  // Hitung ulang jadwal tiap menit (detik hanya untuk jam & hitung mundur).
  const minuteKey = Math.floor(now.getTime() / 60000);
  const status = useMemo(() => prayerStatus(new Date(minuteKey * 60000 + 59999), settings, overrides),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [minuteKey, settings, overrides]);
  // Pastikan "berikutnya" benar pada detik saat waktu sholat tiba.
  const fresh = status.next.at <= now ? prayerStatus(now, settings, overrides) : status;
  return { now, settings, status: fresh, remainingMs: fresh.next.at.getTime() - now.getTime() };
}
