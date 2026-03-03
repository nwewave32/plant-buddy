import type { SeasonalPreset } from '@/shared/types';

export async function fetchPresets(plantId: string): Promise<SeasonalPreset[]> {
  const res = await fetch(`/api/plants/${plantId}/presets`);
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error ?? '프리셋 조회에 실패했습니다');
  }
  const data = await res.json();
  return data.presets;
}

export async function upsertPresets(
  plantId: string,
  presets: Array<{
    season: string;
    enabled: boolean;
    watering_interval_days: number;
    water_amount_ml?: number;
    watering_method?: string;
    care_notes?: string;
  }>,
): Promise<SeasonalPreset[]> {
  const res = await fetch(`/api/plants/${plantId}/presets`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ presets }),
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error ?? '프리셋 저장에 실패했습니다');
  }

  const data = await res.json();
  return data.presets;
}
