import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Plant } from '@/shared/types';

export async function uploadPlantImage(
  supabase: SupabaseClient<Database>,
  file: File,
): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg';
  const fileName = `${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from('plant-photos')
    .upload(fileName, file, { contentType: file.type });

  if (error) throw error;

  const { data } = supabase.storage
    .from('plant-photos')
    .getPublicUrl(fileName);

  return data.publicUrl;
}

export async function createPlant(
  input: Record<string, unknown>,
): Promise<Plant> {
  const res = await fetch('/api/plants', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error ?? '식물 등록에 실패했습니다');
  }

  const data = await res.json();
  return data.plant;
}

export async function updatePlant(
  plantId: string,
  input: Record<string, unknown>,
): Promise<Plant> {
  const res = await fetch(`/api/plants/${plantId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error ?? '식물 수정에 실패했습니다');
  }

  const data = await res.json();
  return data.plant;
}

export async function deletePlant(plantId: string): Promise<void> {
  const res = await fetch(`/api/plants/${plantId}`, {
    method: 'DELETE',
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error ?? '식물 삭제에 실패했습니다');
  }
}
