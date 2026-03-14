import { z } from 'zod';

export const uuidSchema = z.string().uuid('잘못된 ID 형식입니다');

export const seasonSchema = z.enum(['spring', 'summer', 'autumn', 'winter']);

export const plantStatusSchema = z.enum(['healthy', 'caution', 'danger']);

export const wateringMethodSchema = z.enum(['top', 'bottom', 'mist', 'other']);

export const sunlightSchema = z.enum(['direct', 'indirect', 'shade']);

export const createPlantSchema = z.object({
  name: z.string().min(1, '식물 이름을 입력해주세요'),
  species: z.string().optional(),
  photo_url: z.string().url().optional(),
  location: z.string().optional(),
  assigned_user_id: z.string().uuid().optional(),
  watering_interval_days: z.number().int().min(1).default(7),
  water_amount_ml: z.number().int().min(1).optional(),
  watering_method: wateringMethodSchema.optional(),
  sunlight: sunlightSchema.optional(),
  care_notes: z.string().optional(),
  next_watering_date: z.string().min(1, '다음 물주기 날짜를 선택해주세요').refine(
    (val) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selected = new Date(val + 'T00:00:00');
      return selected >= today;
    },
    { message: '오늘 이후 날짜를 선택해주세요' },
  ),
});

export const seasonalPresetSchema = z.object({
  season: seasonSchema,
  enabled: z.boolean(),
  watering_interval_days: z.number().int().min(1),
  water_amount_ml: z.number().int().min(1).optional(),
  watering_method: wateringMethodSchema.optional(),
  care_notes: z.string().optional(),
});

export const upsertPresetsSchema = z.object({
  presets: z.array(seasonalPresetSchema),
});

export const waterPlantSchema = z.object({
  memo: z.string().max(500, '메모는 500자 이내로 입력해주세요').optional(),
});

export const changeStatusSchema = z.object({
  status: plantStatusSchema,
  memo: z.string().optional(),
});

export const createDelegationSchema = z.object({
  plant_id: z.string().uuid(),
  to_user_id: z.string().uuid(),
  start_date: z.string(),
  end_date: z.string(),
});

export const loginSchema = z.object({
  email: z.string().email('유효한 이메일을 입력해주세요'),
});
