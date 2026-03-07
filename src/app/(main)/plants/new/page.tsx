'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/providers/AuthProvider';
import { PlantFormPage } from '@/views/plant-form';

export default function PlantNewRoute() {
  const router = useRouter();
  const { profile, isLoading } = useAuth();
  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    if (!isLoading && !isAdmin) {
      router.replace('/plants');
    }
  }, [isLoading, isAdmin, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">로딩 중...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center gap-4 p-8">
        <p className="text-sm font-medium text-destructive">
          관리자 권한이 필요합니다
        </p>
      </div>
    );
  }

  return <PlantFormPage />;
}
