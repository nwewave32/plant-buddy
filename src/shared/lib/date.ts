import { addDays, startOfDay, isBefore } from 'date-fns';
import type { Plant } from '@/shared/types';

export function calcNextWateringDate(
  plant: Pick<Plant, 'watering_interval_days'>,
  wateredAt: Date = new Date()
): Date {
  return addDays(startOfDay(wateredAt), plant.watering_interval_days);
}

export function recalcNextDate(
  lastWateredDate: Date,
  newInterval: number,
  today: Date
): Date {
  const ideal = addDays(lastWateredDate, newInterval);
  return isBefore(ideal, today) ? addDays(today, 1) : ideal;
}
