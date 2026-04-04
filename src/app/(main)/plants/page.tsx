'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import type { Plant } from '@/shared/types';
import { useSupabase } from '@/app/providers/SupabaseProvider';
import { useAuth } from '@/app/providers/AuthProvider';
import { fetchPlants, PlantCard } from '@/entities/plant';
import { Button } from '@/shared/ui/button';

export default function PlantsPage() {
  const { supabase } = useSupabase();
  const { profile } = useAuth();
  const [plants, setPlants] = useState<Plant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mineOnly, setMineOnly] = useState(false);

  const isAdmin = profile?.role === 'admin';

  const load = useCallback(async () => {
    if (!supabase) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchPlants(
        supabase,
        mineOnly && profile ? { assignedUserId: profile.id } : undefined,
      );
      setPlants(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '식물 목록을 불러오지 못했습니다');
    } finally {
      setIsLoading(false);
    }
  }, [supabase, mineOnly, profile]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">식물 목록</h1>
        {isAdmin && (
          <Button size="sm" asChild>
            <Link href="/plants/new">
              <Plus className="mr-1 size-4" />
              등록
            </Link>
          </Button>
        )}
      </div>

      {/* 필터 */}
      <div className="flex gap-2">
        <Button
          variant={mineOnly ? 'outline' : 'default'}
          size="sm"
          onClick={() => setMineOnly(false)}
        >
          전체 보기
        </Button>
        <Button
          variant={mineOnly ? 'default' : 'outline'}
          size="sm"
          onClick={() => setMineOnly(true)}
        >
          내 담당만
        </Button>
      </div>

      {/* 목록 */}
      {isLoading ? (
        <p className="text-center text-muted-foreground">로딩 중...</p>
      ) : error ? (
        <p className="text-center text-sm text-destructive">{error}</p>
      ) : plants.length === 0 ? (
        <p className="text-center text-muted-foreground">
          {mineOnly ? '담당 중인 식물이 없습니다' : '등록된 식물이 없습니다'}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {plants.map((plant) => (
            <Link key={plant.id} href={`/plants/${plant.id}`}>
              <PlantCard plant={plant} className="transition-shadow hover:shadow-md" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
