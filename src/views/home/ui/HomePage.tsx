'use client';

import { MyPlantsOverview } from '@/widgets/my-plants-overview';
import { TodayTasks, useDashboard } from '@/widgets/today-tasks';

export function HomePage() {
  const {
    overdue,
    today,
    upcoming,
    allPlants,
    isLoading,
    error,
    refetch,
  } = useDashboard();

  return (
    <div className='flex flex-col gap-6 p-4'>
      {/* 로딩/에러 */}
      {isLoading && (
        <p className='text-muted-foreground text-center'>불러오는 중...</p>
      )}
      {error && (
        <p className='text-destructive text-center text-sm'>{error.message}</p>
      )}

      {/* 대시보드 */}
      {!isLoading && !error && (
        <>
          <TodayTasks
            overdue={overdue}
            today={today}
            upcoming={upcoming}
            onWateringComplete={refetch}
          />

          <MyPlantsOverview plants={allPlants} />
        </>
      )}
    </div>
  );
}
