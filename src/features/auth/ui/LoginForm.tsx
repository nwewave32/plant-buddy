'use client';

import { useSupabase } from '@/app/providers/SupabaseProvider';
import { loginSchema } from '@/shared/lib/validation';
import { Button } from '@/shared/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { useState } from 'react';
import { signInWithMagicLink } from '../api/auth';

type Status = 'idle' | 'loading' | 'success' | 'error';

export function LoginForm() {
  const { supabase } = useSupabase();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const result = loginSchema.safeParse({ email });
    if (!result.success) {
      setErrorMessage(result.error.issues[0].message);
      setStatus('error');
      return;
    }

    setStatus('loading');

    const { error } = await signInWithMagicLink(supabase, email);
    if (error) {
      setErrorMessage(error.message);
      setStatus('error');
      return;
    }

    setStatus('success');
  };

  return (
    <Card className='w-full max-w-sm'>
      <CardHeader>
        <CardTitle className='text-xl'>Plant Buddy 로그인</CardTitle>
        <CardDescription>
          이메일을 입력하면 로그인 링크를 보내드립니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {status === 'success' ? (
          <p className='text-sm text-green-600'>
            메일함을 확인해주세요! 로그인 링크를 보냈습니다.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className='flex flex-col gap-4'>
            <div className='flex flex-col gap-2'>
              <Input
                type='email'
                placeholder='name@company.com'
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={status === 'loading'}
                aria-invalid={status === 'error' ? true : undefined}
              />
              {status === 'error' && errorMessage && (
                <p className='text-sm text-destructive'>{errorMessage}</p>
              )}
            </div>
            <Button type='submit' disabled={status === 'loading'}>
              {status === 'loading' ? '전송 중...' : '로그인 링크 전송'}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
