import { useCallback, useEffect, useRef, useState } from 'react';
import { friendlyError } from '../lib/api';
import { isSupabaseConfigured } from '../lib/supabase';
import { onDataChanged } from '../lib/events';

interface Options {
  /** Muat ulang otomatis setiap N milidetik (mis. untuk layar TV). */
  refreshMs?: number;
  /** Nama "topik" data; query dimuat ulang saat topik ini diumumkan berubah. */
  topics?: string[];
  enabled?: boolean;
}

/** Hook pengambilan data sederhana dengan loading, error, dan reload. */
export function useQuery<T>(fn: () => Promise<T>, deps: unknown[], opts: Options = {}) {
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const enabled = (opts.enabled ?? true) && isSupabaseConfigured;
  const seq = useRef(0);

  const load = useCallback(async (silent = false) => {
    if (!enabled) { setLoading(false); return; }
    const my = ++seq.current;
    if (!silent) setLoading(true);
    try {
      const res = await fnRef.current();
      if (my === seq.current) { setData(res); setError(null); }
    } catch (e) {
      if (my === seq.current) setError(friendlyError(e));
    } finally {
      if (my === seq.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!opts.refreshMs || !enabled) return;
    const id = window.setInterval(() => void load(true), opts.refreshMs);
    return () => window.clearInterval(id);
  }, [load, opts.refreshMs, enabled]);

  const topicsKey = (opts.topics ?? []).join(',');
  useEffect(() => {
    if (!topicsKey) return;
    return onDataChanged(topicsKey.split(','), () => void load(true));
  }, [load, topicsKey]);

  return { data, error, loading, reload: load, setData };
}
