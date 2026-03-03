'use client';

import { useCallback, useEffect, useState } from 'react';
import type { SeasonalPreset } from '@/shared/types';
import { fetchPresets, upsertPresets } from '../api/presets';

export function useSeasonalPresets(plantId: string) {
  const [presets, setPresets] = useState<SeasonalPreset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchPresets(plantId);
      setPresets(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch presets'));
    } finally {
      setIsLoading(false);
    }
  }, [plantId]);

  useEffect(() => {
    load();
  }, [load]);

  const savePresets = useCallback(
    async (
      presetsData: Array<{
        season: string;
        enabled: boolean;
        watering_interval_days: number;
        water_amount_ml?: number;
        watering_method?: string;
        care_notes?: string;
      }>,
    ) => {
      const result = await upsertPresets(plantId, presetsData);
      await load();
      return result;
    },
    [plantId, load],
  );

  return { presets, isLoading, error, refetch: load, savePresets };
}
