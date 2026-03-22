'use client';

import Link from 'next/link';
import type { Plant, PlantStatus } from '@/shared/types';
import { PlantCard, StatusBadge } from '@/entities/plant';

interface MyPlantsOverviewProps {
  plants: Plant[];
}

const STATUSES: PlantStatus[] = ['healthy', 'caution', 'danger'];

export function MyPlantsOverview({ plants }: MyPlantsOverviewProps) {
  if (plants.length === 0) {
    return (
      <section>
        <h2 className="mb-3 text-lg font-semibold">내 식물</h2>
        <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-center text-sm">
          담당 식물이 없습니다
        </p>
      </section>
    );
  }

  const counts = plants.reduce(
    (acc, p) => {
      acc[p.status] = (acc[p.status] || 0) + 1;
      return acc;
    },
    {} as Record<PlantStatus, number>,
  );

  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">내 식물 ({plants.length})</h2>

      {/* 요약 통계 */}
      <div className="mb-4 flex gap-2">
        {STATUSES.map((status) =>
          counts[status] ? (
            <div key={status} className="flex items-center gap-1">
              <StatusBadge status={status} />
              <span className="text-muted-foreground text-sm">{counts[status]}</span>
            </div>
          ) : null,
        )}
      </div>

      {/* 식물 카드 리스트 */}
      <div className="flex flex-col gap-3">
        {plants.map((plant) => (
          <Link key={plant.id} href={`/plants/${plant.id}`}>
            <PlantCard plant={plant} className="transition-colors hover:bg-accent/50" />
          </Link>
        ))}
      </div>
    </section>
  );
}
