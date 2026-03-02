'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';

type AuthContext = {
  user: User | null;
  isLoading: boolean;
};

const Context = createContext<AuthContext>({ user: null, isLoading: true });

export function AuthProvider({
  children,
  supabase,
}: {
  children: React.ReactNode;
  supabase: ReturnType<typeof import('@/shared/api/supabase/client').createClient> | null;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        setIsLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [supabase]);

  return (
    <Context.Provider value={{ user, isLoading }}>
      {children}
    </Context.Provider>
  );
}

export function useAuth() {
  return useContext(Context);
}
