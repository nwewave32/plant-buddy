'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { User as AuthUser } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, User } from '@/shared/types';

type AuthContext = {
  user: AuthUser | null;
  profile: User | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
};

const Context = createContext<AuthContext>({
  user: null,
  profile: null,
  isLoading: true,
  signOut: async () => {},
});

export function AuthProvider({
  children,
  supabase,
}: {
  children: React.ReactNode;
  supabase: SupabaseClient<Database> | null;
}) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    const fetchProfile = async (userId: string) => {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
      setProfile(data);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const authUser = session?.user ?? null;
        setUser(authUser);

        if (authUser) {
          fetchProfile(authUser.id);
        } else {
          setProfile(null);
        }

        setIsLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [supabase]);

  const handleSignOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    window.location.href = '/login';
  }, [supabase]);

  return (
    <Context.Provider value={{ user, profile, isLoading, signOut: handleSignOut }}>
      {children}
    </Context.Provider>
  );
}

export function useAuth() {
  return useContext(Context);
}
