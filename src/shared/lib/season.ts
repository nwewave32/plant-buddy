import type { Season } from '@/shared/types';
import { SEASON_BOUNDARIES } from '@/shared/config/seasons';

export function getCurrentSeason(date: Date = new Date()): Season {
  const m = date.getMonth() + 1;
  if (m >= 3 && m <= 5) return 'spring';
  if (m >= 6 && m <= 8) return 'summer';
  if (m >= 9 && m <= 11) return 'autumn';
  return 'winter';
}

export function isSeasonTransitionDate(date: Date = new Date()): boolean {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return Object.values(SEASON_BOUNDARIES).some(
    (b) => b.month === m && b.day === d
  );
}
