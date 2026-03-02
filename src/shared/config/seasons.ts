import type { Season } from '@/shared/types';

export const SEASON_BOUNDARIES: Record<Season, { month: number; day: number }> = {
  spring: {
    month: parseInt(process.env.SEASON_SPRING_START?.split('-')[0] ?? '3', 10),
    day: parseInt(process.env.SEASON_SPRING_START?.split('-')[1] ?? '1', 10),
  },
  summer: {
    month: parseInt(process.env.SEASON_SUMMER_START?.split('-')[0] ?? '6', 10),
    day: parseInt(process.env.SEASON_SUMMER_START?.split('-')[1] ?? '1', 10),
  },
  autumn: {
    month: parseInt(process.env.SEASON_AUTUMN_START?.split('-')[0] ?? '9', 10),
    day: parseInt(process.env.SEASON_AUTUMN_START?.split('-')[1] ?? '1', 10),
  },
  winter: {
    month: parseInt(process.env.SEASON_WINTER_START?.split('-')[0] ?? '12', 10),
    day: parseInt(process.env.SEASON_WINTER_START?.split('-')[1] ?? '1', 10),
  },
};

export const SEASON_ICONS: Record<Season, string> = {
  spring: '🌸',
  summer: '☀️',
  autumn: '🍂',
  winter: '❄️',
};

export const SEASON_LABELS: Record<Season, string> = {
  spring: '봄',
  summer: '여름',
  autumn: '가을',
  winter: '겨울',
};
