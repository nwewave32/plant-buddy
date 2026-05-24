'use client';

import { ArrowLeft, LogOut } from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { useGoBack } from '@/shared/lib/useGoBack';
import { Button } from '@/shared/ui/button';
import { PushToggle } from '@/features/subscribe-push';

export default function SettingsPage() {
  const goBack = useGoBack();
  const { signOut } = useAuth();

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" aria-label="뒤로 가기" onClick={goBack}>
          <ArrowLeft className="size-5" />
        </Button>
        <h1 className="text-2xl font-bold">설정</h1>
      </div>

      <div className="flex flex-col gap-4">
        <div className="rounded-lg border p-4">
          <h2 className="mb-3 text-lg font-semibold">알림</h2>
          <PushToggle />
        </div>

        <Button
          variant="outline"
          className="justify-start"
          onClick={signOut}
        >
          <LogOut className="mr-2 size-4" />
          로그아웃
        </Button>
      </div>
    </div>
  );
}
