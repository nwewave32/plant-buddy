'use client';

import { useAuth } from '@/app/providers/AuthProvider';
import { Button } from '@/shared/ui/button';

export default function HomePage() {
  const { user, profile, isLoading, signOut } = useAuth();

  return (
    <div className="flex flex-col gap-6 p-4">
      <h1 className="text-2xl font-bold">Plant Buddy</h1>
      {/* TODO: TodayTasks, MyPlantsOverview from @/views/home */}

      {/* 임시 인증 확인 영역 — 대시보드 구현 시 제거 */}
      <div className="rounded-lg border p-4 text-sm">
        <p className="font-medium">Auth 상태 확인</p>
        {isLoading ? (
          <p className="text-muted-foreground">로딩 중...</p>
        ) : (
          <div className="mt-2 flex flex-col gap-1">
            <p>auth.user: {user?.email ?? 'null'}</p>
            <p>profile: {profile ? `${profile.name} (${profile.role})` : 'null'}</p>
            {user && (
              <Button variant="outline" size="sm" className="mt-2 w-fit" onClick={signOut}>
                로그아웃
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
