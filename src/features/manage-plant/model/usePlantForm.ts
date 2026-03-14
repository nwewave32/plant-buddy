'use client';

import { useCallback, useState } from 'react';
import { createPlantSchema } from '@/shared/lib/validation';
import { useSupabase } from '@/app/providers/SupabaseProvider';
import type { Plant } from '@/shared/types';
import { createPlant, updatePlant, uploadPlantImage } from '../api/managePlant';

type FormMode = 'create' | 'edit';

export type PlantFormData = {
  name: string;
  species: string;
  location: string;
  watering_interval_days: number;
  water_amount_ml: string;
  watering_method: string;
  sunlight: string;
  care_notes: string;
  next_watering_date: string;
  assigned_user_id: string;
  photo_url: string;
};

const INITIAL_FORM: PlantFormData = {
  name: '',
  species: '',
  location: '',
  watering_interval_days: 7,
  water_amount_ml: '',
  watering_method: '',
  sunlight: '',
  care_notes: '',
  next_watering_date: '',
  assigned_user_id: '',
  photo_url: '',
};

function buildInput(formData: PlantFormData, photoUrl?: string): Record<string, unknown> {
  const input: Record<string, unknown> = {
    name: formData.name,
    next_watering_date: formData.next_watering_date,
    watering_interval_days: formData.watering_interval_days,
  };

  if (formData.species) input.species = formData.species;
  if (formData.location) input.location = formData.location;
  if (formData.water_amount_ml) input.water_amount_ml = Number(formData.water_amount_ml);
  if (formData.watering_method) input.watering_method = formData.watering_method;
  if (formData.sunlight) input.sunlight = formData.sunlight;
  if (formData.care_notes) input.care_notes = formData.care_notes;
  if (formData.assigned_user_id) input.assigned_user_id = formData.assigned_user_id;

  const url = photoUrl ?? formData.photo_url;
  if (url) input.photo_url = url;

  return input;
}

function plantToFormData(plant: Plant): PlantFormData {
  return {
    name: plant.name,
    species: plant.species ?? '',
    location: plant.location ?? '',
    watering_interval_days: plant.watering_interval_days,
    water_amount_ml: plant.water_amount_ml?.toString() ?? '',
    watering_method: plant.watering_method ?? '',
    sunlight: plant.sunlight ?? '',
    care_notes: plant.care_notes ?? '',
    next_watering_date: plant.next_watering_date,
    assigned_user_id: plant.assigned_user_id ?? '',
    photo_url: plant.photo_url ?? '',
  };
}

interface UsePlantFormOptions {
  mode: FormMode;
  plantId?: string;
  initialData?: Plant;
  onSuccess?: (plant: Plant) => void;
}

export function usePlantForm({ mode, plantId, initialData, onSuccess }: UsePlantFormOptions) {
  const { supabase } = useSupabase();
  const [formData, setFormData] = useState<PlantFormData>(
    initialData ? plantToFormData(initialData) : INITIAL_FORM,
  );
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(
    initialData?.photo_url ?? null,
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField = useCallback(
    <K extends keyof PlantFormData>(key: K, value: PlantFormData[K]) => {
      setFormData((prev) => ({ ...prev, [key]: value }));
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    },
    [],
  );

  const handleImageChange = useCallback((file: File | null) => {
    setImageFile(file);
    setImagePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return file ? URL.createObjectURL(file) : null;
    });
  }, []);

  const validate = useCallback((): boolean => {
    const input = buildInput(formData);
    const schema = mode === 'edit' ? createPlantSchema.partial() : createPlantSchema;
    const result = schema.safeParse(input);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0]?.toString();
        if (key && !fieldErrors[key]) {
          fieldErrors[key] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return false;
    }

    setErrors({});
    return true;
  }, [formData, mode]);

  const submit = useCallback(async () => {
    if (!validate()) return;
    setIsSubmitting(true);

    try {
      let photoUrl: string | undefined;

      // 이미지 파일이 있으면 업로드
      if (imageFile && supabase) {
        photoUrl = await uploadPlantImage(supabase, imageFile);
      }

      const input = buildInput(formData, photoUrl);

      let plant: Plant;
      if (mode === 'create') {
        plant = await createPlant(input);
      } else {
        plant = await updatePlant(plantId!, input);
      }

      onSuccess?.(plant);
    } catch (err) {
      setErrors({
        _form: err instanceof Error ? err.message : '저장에 실패했습니다',
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, imageFile, supabase, mode, plantId, onSuccess, validate]);

  return {
    formData,
    updateField,
    imageFile,
    imagePreview,
    handleImageChange,
    errors,
    isSubmitting,
    submit,
  };
}
