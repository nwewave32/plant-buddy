'use client';

import { useSupabase } from '@/app/providers/SupabaseProvider';
import { loginSchema, otpSchema } from '@/shared/lib/validation';
import { Button } from '@/shared/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { requestEmailOtp, verifyEmailOtp } from '../api/auth';
import { mapAuthError } from '../lib/mapAuthError';

const isDev = process.env.NODE_ENV === 'development';
const RESEND_COOLDOWN_SEC = 60;

type Status = 'idle' | 'loading' | 'error';
type Step = 'email' | 'code';

export function LoginForm() {
  const { supabase } = useSupabase();
  const router = useRouter();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [cooldown, setCooldown] = useState(0);

  // 재전송 쿨다운 카운트다운
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // 인증 코드 발송 (최초 전송 + 재전송 공용)
  const sendOtp = async () => {
    setErrorMessage('');

    const result = loginSchema.safeParse({ email });
    if (!result.success) {
      setErrorMessage(result.error.issues[0].message);
      setStatus('error');
      return false;
    }

    setStatus('loading');

    const { error } = await requestEmailOtp(supabase, email);
    if (error) {
      setErrorMessage(mapAuthError(error));
      setStatus('error');
      return false;
    }

    setStatus('idle');
    setCooldown(RESEND_COOLDOWN_SEC);
    return true;
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await sendOtp()) {
      setStep('code');
    }
  };

  const handleResendOtp = async () => {
    if (cooldown > 0 || status === 'loading') return;
    await sendOtp();
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const result = otpSchema.safeParse({ token });
    if (!result.success) {
      setErrorMessage(result.error.issues[0].message);
      setStatus('error');
      return;
    }

    setStatus('loading');

    const { error } = await verifyEmailOtp(supabase, email, token.trim());
    if (error) {
      setErrorMessage(mapAuthError(error));
      setStatus('error');
      return;
    }

    router.push('/');
  };

  const handleResetToEmail = () => {
    setStep('email');
    setToken('');
    setStatus('idle');
    setErrorMessage('');
  };

  const handleDevLogin = async () => {
    setErrorMessage('');

    const result = loginSchema.safeParse({ email });
    if (!result.success) {
      setErrorMessage(result.error.issues[0].message);
      setStatus('error');
      return;
    }

    if (!password) {
      setErrorMessage('비밀번호를 입력해주세요');
      setStatus('error');
      return;
    }

    setStatus('loading');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMessage(mapAuthError(error));
      setStatus('error');
      return;
    }

    router.push('/');
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-xl">Plant Buddy 로그인</CardTitle>
        <CardDescription>
          {step === 'email'
            ? '이메일을 입력하면 인증 코드를 보내드립니다.'
            : `${email}로 보낸 인증 코드를 입력해주세요.`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {step === 'email' ? (
          <form onSubmit={handleRequestOtp} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Input
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={status === 'loading'}
                aria-invalid={status === 'error' ? true : undefined}
              />
              {status === 'error' && errorMessage && (
                <p className="text-sm text-destructive">{errorMessage}</p>
              )}
            </div>
            <Button type="submit" disabled={status === 'loading'}>
              {status === 'loading' ? '전송 중...' : '인증 코드 전송'}
            </Button>

            {isDev && (
              <div className="flex flex-col gap-2 border-t pt-4">
                <Label className="text-xs text-muted-foreground">
                  개발 전용 — 비밀번호 로그인
                </Label>
                <Input
                  type="password"
                  placeholder="비밀번호"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={status === 'loading'}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={status === 'loading'}
                  onClick={handleDevLogin}
                >
                  바로 로그인 (dev)
                </Button>
              </div>
            )}
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={10}
                placeholder="인증 코드"
                value={token}
                onChange={(e) =>
                  setToken(e.target.value.replace(/\D/g, '').slice(0, 10))
                }
                disabled={status === 'loading'}
                aria-invalid={status === 'error' ? true : undefined}
                autoFocus
              />
              {status === 'error' && errorMessage && (
                <p className="text-sm text-destructive">{errorMessage}</p>
              )}
            </div>
            <Button type="submit" disabled={status === 'loading'}>
              {status === 'loading' ? '확인 중...' : '로그인'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={cooldown > 0 || status === 'loading'}
              onClick={handleResendOtp}
            >
              {cooldown > 0 ? `코드 재전송 (${cooldown}초)` : '코드 재전송'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={status === 'loading'}
              onClick={handleResetToEmail}
            >
              이메일 다시 입력
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
