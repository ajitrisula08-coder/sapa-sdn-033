import { isSupabaseConfigured, supabase } from './supabase';

/**
 * Bus peristiwa sederhana: setelah data berubah (oleh admin di tab ini, atau
 * melalui Supabase Realtime dari perangkat lain), semua komponen yang
 * berlangganan topik tersebut memuat ulang datanya.
 */
type Listener = (topic: string) => void;
const listeners = new Set<{ topics: string[]; fn: Listener }>();

export function emitDataChanged(...topics: string[]) {
  for (const l of listeners) {
    const hit = topics.find((t) => l.topics.includes(t));
    if (hit) l.fn(hit);
  }
}

export function onDataChanged(topics: string[], fn: Listener): () => void {
  const entry = { topics, fn };
  listeners.add(entry);
  return () => { listeners.delete(entry); };
}

const TABLE_TOPIC: Record<string, string> = {
  mosque_settings: 'settings',
  prayer_schedules: 'prayer',
  friday_schedules: 'friday',
  announcements: 'announcements',
  activities: 'activities',
};

let started = false;
/** Berlangganan perubahan realtime dari Supabase (sekali per aplikasi). */
export function startRealtime() {
  if (started || !isSupabaseConfigured) return;
  started = true;
  const ch = supabase.channel('masjid-public-changes');
  for (const table of Object.keys(TABLE_TOPIC)) {
    ch.on('postgres_changes', { event: '*', schema: 'public', table }, () => emitDataChanged(TABLE_TOPIC[table]));
  }
  ch.subscribe();
}
