'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Plant, Season } from '@/shared/types';
import { useSupabase } from '@/app/providers/SupabaseProvider';
import { useAuth } from '@/app/providers/AuthProvider';
import { fetchPlants } from '@/entities/plant';
import { getCurrentSeason } from '@/shared/lib/season';

interface DashboardData {
  overdue: Plant[];
  today: Plant[];
  upcoming: Plant[];
  allPlants: Plant[];
  season: Season;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

function getLocalDateStr(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function classifyPlants(plants: Plant[]) {
  const todayStr = getLocalDateStr();

  const overdue: Plant[] = [];
  const today: Plant[] = [];
  const upcoming: Plant[] = [];

  for (const plant of plants) {
    const date = plant.next_watering_date.slice(0, 10);
    if (date < todayStr) {
      overdue.push(plant);
    } else if (date === todayStr) {
      today.push(plant);
    } else {
      upcoming.push(plant);
    }
  }

  // 연체 식물은 오래된 순으로
  overdue.sort((a, b) => a.next_watering_date.localeCompare(b.next_watering_date));
  // 예정 식물은 가까운 순으로, 최대 5개
  upcoming.sort((a, b) => a.next_watering_date.localeCompare(b.next_watering_date));

  return { overdue, today, upcoming: upcoming.slice(0, 5) };
}

export function useDashboard(): DashboardData {
  const { supabase } = useSupabase();
  const { profile } = useAuth();
  const [plants, setPlants] = useState<Plant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    if (!profile) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchPlants(supabase, { assignedUserId: profile.id });
      setPlants(data);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('식물 목록을 불러올 수 없습니다'));
    } finally {
      setIsLoading(false);
    }
  }, [supabase, profile]);

  useEffect(() => {
    load();
  }, [load]);

  const { overdue, today, upcoming } = useMemo(() => classifyPlants(plants), [plants]);

  return {
    overdue,
    today,
    upcoming,
    allPlants: plants,
    season: getCurrentSeason(),
    isLoading,
    error,
    refetch: load,
  };
}
