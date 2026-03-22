'use client';

import { useAuth } from '@/app/providers/AuthProvider';
import { SeasonBadge } from '@/entities/season';
import { Button } from '@/shared/ui/button';
import { MyPlantsOverview } from '@/widgets/my-plants-overview';
import { TodayTasks, useDashboard } from '@/widgets/today-tasks';
import { LogOut } from 'lucide-react';
import Link from 'next/link';

export function HomePage() {
  const { signOut } = useAuth();
  const {
    overdue,
    today,
    upcoming,
    allPlants,
    season,
    isLoading,
    error,
    refetch,
  } = useDashboard();

  return (
    <div className='flex flex-col gap-6 p-4'>
      {/* 헤더 */}
      <div className='flex items-center justify-between'>
        <h1 className='text-2xl font-bold'>Plant Buddy</h1>
        <div className='flex items-center gap-2'>
          <SeasonBadge season={season} />
          <Button variant='ghost' size='icon' onClick={signOut} title='로그아웃'>
            <LogOut className='size-4' />
          </Button>
        </div>
      </div>

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

          <Button asChild size='lg' className='w-full'>
            <Link href='/plants'>식물 목록 보기</Link>
          </Button>
        </>
      )}
    </div>
  );
}
