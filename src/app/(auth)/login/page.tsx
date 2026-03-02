'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { LoginForm } from '@/features/auth';

function LoginContent() {
  const searchParams = useSearchParams();
  const authError = searchParams.get('error') === 'auth';

  return (
    <div className="flex flex-col items-center gap-4">
      {authError && (
        <p className="text-sm text-destructive">
          인증에 실패했습니다. 다시 시도해주세요.
        </p>
      )}
      <LoginForm />
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Suspense>
        <LoginContent />
      </Suspense>
    </div>
  );
}
