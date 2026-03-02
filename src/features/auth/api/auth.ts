import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types';

export async function signInWithMagicLink(
  supabase: SupabaseClient<Database>,
  email: string,
) {
  return supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  });
}

export async function signOut(supabase: SupabaseClient<Database>) {
  return supabase.auth.signOut();
}
