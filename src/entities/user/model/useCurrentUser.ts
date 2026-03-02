'use client';

import { useAuth } from '@/app/providers/AuthProvider';
import type { User } from '@/shared/types';

export function useCurrentUser(): { currentUser: User | null; isLoading: boolean } {
  const { profile, isLoading } = useAuth();
  return { currentUser: profile, isLoading };
}
