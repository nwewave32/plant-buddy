'use client';

import { useCallback, useState } from 'react';
import type { Season, SeasonalPreset } from '@/shared/types';
import { seasonalPresetSchema } from '@/shared/lib/validation';

const SEASONS: Season[] = ['spring', 'summer', 'autumn', 'winter'];

export interface PresetFormEntry {
  enabled: boolean;
  watering_interval_days: number;
  water_amount_ml: string;
  watering_method: string;
  care_notes: string;
}

type PresetFormState = Record<Season, PresetFormEntry>;

const DEFAULT_ENTRY: PresetFormEntry = {
  enabled: false,
  watering_interval_days: 7,
  water_amount_ml: '',
  watering_method: '',
  care_notes: '',
};

function presetsToFormState(existingPresets: SeasonalPreset[]): PresetFormState {
  const state = {} as PresetFormState;
  for (const season of SEASONS) {
    const preset = existingPresets.find((p) => p.season === season);
    if (preset) {
      state[season] = {
        enabled: true,
        watering_interval_days: preset.watering_interval_days,
        water_amount_ml: preset.water_amount_ml?.toString() ?? '',
        watering_method: preset.watering_method ?? '',
        care_notes: preset.care_notes ?? '',
      };
    } else {
      state[season] = { ...DEFAULT_ENTRY };
    }
  }
  return state;
}

export function usePresetForm(existingPresets: SeasonalPreset[]) {
  const [formState, setFormState] = useState<PresetFormState>(
    () => presetsToFormState(existingPresets),
  );
  const [activeSeason, setActiveSeason] = useState<Season>('spring');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateEntry = useCallback(
    <K extends keyof PresetFormEntry>(season: Season, key: K, value: PresetFormEntry[K]) => {
      setFormState((prev) => ({
        ...prev,
        [season]: { ...prev[season], [key]: value },
      }));
      setErrors((prev) => {
        const errorKey = `${season}.${String(key)}`;
        if (!prev[errorKey]) return prev;
        const next = { ...prev };
        delete next[errorKey];
        return next;
      });
    },
    [],
  );

  const validate = useCallback((): boolean => {
    const fieldErrors: Record<string, string> = {};
    for (const season of SEASONS) {
      const entry = formState[season];
      if (!entry.enabled) continue;

      const input = {
        season,
        enabled: true,
        watering_interval_days: entry.watering_interval_days,
        water_amount_ml: entry.water_amount_ml ? Number(entry.water_amount_ml) : undefined,
        watering_method: entry.watering_method || undefined,
        care_notes: entry.care_notes || undefined,
      };

      const result = seasonalPresetSchema.safeParse(input);
      if (!result.success) {
        for (const issue of result.error.issues) {
          const key = `${season}.${String(issue.path[0])}`;
          if (!fieldErrors[key]) {
            fieldErrors[key] = issue.message;
          }
        }
      }
    }

    setErrors(fieldErrors);
    return Object.keys(fieldErrors).length === 0;
  }, [formState]);

  const getPresetsData = useCallback(() => {
    return SEASONS.map((season) => {
      const entry = formState[season];
      return {
        season,
        enabled: entry.enabled,
        watering_interval_days: entry.watering_interval_days,
        water_amount_ml: entry.water_amount_ml ? Number(entry.water_amount_ml) : undefined,
        watering_method: entry.watering_method || undefined,
        care_notes: entry.care_notes || undefined,
      };
    });
  }, [formState]);

  return {
    formState,
    activeSeason,
    setActiveSeason,
    updateEntry,
    errors,
    validate,
    getPresetsData,
  };
}
