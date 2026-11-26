import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

interface AuthState {
  session: Session | null;
  isAdmin: boolean;
  adminName: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthCtx = createContext<AuthState | null>(null);

async function loadProfile(userId: string) {
  const { data } = await supabase.from('profiles').select('full_name, is_admin').eq('id', userId).maybeSingle();
  return data as { full_name: string; is_admin: boolean } | null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminName, setAdminName] = useState<string | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let active = true;
    const apply = async (s: Session | null) => {
      if (!active) return;
      setSession(s);
      if (s?.user) {
        const p = await loadProfile(s.user.id);
        if (!active) return;
        setIsAdmin(Boolean(p?.is_admin));
        setAdminName(p?.full_name ?? null);
      } else {
        setIsAdmin(false);
        setAdminName(null);
      }
      setLoading(false);
    };
    supabase.auth.getSession().then(({ data }) => apply(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      // Jangan memanggil Supabase langsung di dalam callback (anjuran Supabase).
      window.setTimeout(() => void apply(s), 0);
    });
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, []);

  const value = useMemo<AuthState>(() => ({
    session, isAdmin, adminName, loading,
    async signIn(email, password) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const p = await loadProfile(data.user.id);
      if (!p?.is_admin) {
        await supabase.auth.signOut();
        throw new Error('Akun ini bukan administrator Masjid Darussalam.');
      }
      setIsAdmin(true);
      setAdminName(p.full_name);
    },
    async signOut() {
      await supabase.auth.signOut();
      setIsAdmin(false);
      setAdminName(null);
    },
  }), [session, isAdmin, adminName, loading]);

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const c = useContext(AuthCtx);
  if (!c) throw new Error('useAuth must be inside AuthProvider');
  return c;
}
