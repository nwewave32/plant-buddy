'use client';

import { PlantCard } from '@/entities/plant';
import { WateringButton } from '@/features/complete-watering';
import type { Plant } from '@/shared/types';
import { Badge } from '@/shared/ui/badge';

interface TodayTasksProps {
  overdue: Plant[];
  today: Plant[];
  upcoming: Plant[];
  onWateringComplete: () => void;
}

function getLocalDateOnly(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function daysOverdue(nextWateringDate: string): number {
  const today = getLocalDateOnly(new Date());
  const [y, m, d] = nextWateringDate.slice(0, 10).split('-').map(Number);
  const target = new Date(y, m - 1, d);
  return Math.floor(
    (today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24)
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

export function TodayTasks({
  overdue,
  today,
  upcoming,
  onWateringComplete,
}: TodayTasksProps) {
  return (
    <div className='flex flex-col gap-6'>
      {/* 연체된 식물 */}
      {overdue.length > 0 && (
        <section>
          <h2 className='mb-3 text-lg font-semibold text-destructive'>
            연체된 식물 ({overdue.length})
          </h2>
          <div className='flex flex-col gap-3'>
            {overdue.map((plant) => (
              <PlantCard
                key={plant.id}
                plant={plant}
                className='border-destructive/50'
              >
                <div className='mt-3 flex items-center gap-2'>
                  <Badge variant='destructive'>
                    ⚠️ {daysOverdue(plant.next_watering_date)}일 지남
                  </Badge>
                </div>
                <div className='mt-3'>
                  <WateringButton
                    plantId={plant.id}
                    onSuccess={onWateringComplete}
                  />
                </div>
              </PlantCard>
            ))}
          </div>
        </section>
      )}

      {/* 오늘의 할 일 */}
      <section>
        <h2 className='mb-3 text-lg font-semibold'>
          오늘의 할 일 ({today.length})
        </h2>
        {today.length > 0 ? (
          <div className='flex flex-col gap-3'>
            {today.map((plant) => (
              <PlantCard key={plant.id} plant={plant}>
                <div className='mt-3'>
                  <WateringButton
                    plantId={plant.id}
                    onSuccess={onWateringComplete}
                  />
                </div>
              </PlantCard>
            ))}
          </div>
        ) : (
          <p className='text-muted-foreground rounded-lg border border-dashed p-4 text-center text-sm'>
            오늘은 물 줄 식물이 없습니다
          </p>
        )}
      </section>

      {/* 다음 예정 */}
      {upcoming.length > 0 && (
        <section>
          <h2 className='mb-3 text-lg font-semibold'>다음 예정</h2>
          <div className='flex flex-col gap-3'>
            {upcoming.map((plant) => (
              <PlantCard key={plant.id} plant={plant}>
                <div className='mt-2'>
                  <Badge variant='outline'>
                    📅 {formatDate(plant.next_watering_date)} 예정
                  </Badge>
                </div>
              </PlantCard>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
