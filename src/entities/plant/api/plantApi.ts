import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Database,
  Plant,
  SeasonalPreset,
  WateringLog,
} from '@/shared/types';

export interface PlantWithDetails extends Plant {
  presets: SeasonalPreset[];
  recentLogs: WateringLog[];
  assignedUser: string | null;
}

export async function fetchPlants(
  supabase: SupabaseClient<Database>,
  options?: { assignedUserId?: string },
) {
  let query = supabase.from('plants').select('*').order('name');

  if (options?.assignedUserId) {
    query = query.eq('assigned_user_id', options.assignedUserId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as Plant[];
}

export async function fetchPlantById(
  supabase: SupabaseClient<Database>,
  plantId: string,
): Promise<PlantWithDetails> {
  const [plantResult, presetsResult, logsResult] = await Promise.all([
    supabase.from('plants').select('*').eq('id', plantId).single(),
    supabase
      .from('seasonal_presets')
      .select('*')
      .eq('plant_id', plantId)
      .order('season'),
    supabase
      .from('watering_logs')
      .select('*')
      .eq('plant_id', plantId)
      .order('watered_at', { ascending: false })
      .limit(10),
  ]);

  if (plantResult.error) throw plantResult.error;

  const plant = plantResult.data as Plant;

  let assignedUser: string | null = null;
  if (plant.assigned_user_id) {
    const { data: userData } = await supabase
      .from('users')
      .select('name')
      .eq('id', plant.assigned_user_id)
      .single<{ name: string }>();
    assignedUser = userData?.name ?? null;
  }

  return {
    ...plant,
    presets: (presetsResult.data ?? []) as SeasonalPreset[],
    recentLogs: (logsResult.data ?? []) as WateringLog[],
    assignedUser,
  };
}
