'use client';

import { createContext, useContext, useMemo } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types';
import { AuthProvider } from './AuthProvider';

type SupabaseContext = {
  supabase: SupabaseClient<Database> | null;
};

const Context = createContext<SupabaseContext>({ supabase: null });

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return null;
    return createBrowserClient<Database>(url, key);
  }, []);

  return (
    <Context.Provider value={{ supabase }}>
      <AuthProvider supabase={supabase}>
        {children}
      </AuthProvider>
    </Context.Provider>
  );
}

export function useSupabase() {
  const context = useContext(Context);
  if (!context.supabase) {
    throw new Error(
      'Supabase client not available. Check your environment variables.'
    );
  }
  return { supabase: context.supabase };
}
