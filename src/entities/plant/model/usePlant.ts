'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSupabase } from '@/app/providers/SupabaseProvider';
import { fetchPlantById, type PlantWithDetails } from '../api/plantApi';

export function usePlant(plantId: string) {
  const { supabase } = useSupabase();
  const [plant, setPlant] = useState<PlantWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchPlantById(supabase, plantId);
      setPlant(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch plant'));
    } finally {
      setIsLoading(false);
    }
  }, [supabase, plantId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { plant, isLoading, error, refetch };
}
