import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types';
import { requestEmailOtp, verifyEmailOtp, signOut } from '@/features/auth';

type AuthResult = { data: unknown; error: unknown };

const emptyAuthData = { user: null, session: null };

// auth 메서드만 가진 최소 mock. 함수 인자로 넘길 supabase(타입 캐스팅)와
// 단언/오버라이드용 loose-typed auth 객체를 함께 돌려준다.
function createAuthMock() {
  const auth = {
    signInWithOtp: vi.fn(
      (): Promise<AuthResult> =>
        Promise.resolve({ data: emptyAuthData, error: null }),
    ),
    verifyOtp: vi.fn(
      (): Promise<AuthResult> =>
        Promise.resolve({ data: emptyAuthData, error: null }),
    ),
    signOut: vi.fn(
      (): Promise<{ error: unknown }> => Promise.resolve({ error: null }),
    ),
  };
  const supabase = { auth } as unknown as SupabaseClient<Database>;
  return { supabase, auth };
}

describe('requestEmailOtp', () => {
  beforeEach(() => {
    // node 환경에는 window가 없으므로 origin을 stub
    vi.stubGlobal('window', { location: { origin: 'https://app.example.com' } });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('signInWithOtp를 email + emailRedirectTo로 호출한다', async () => {
    const { supabase, auth } = createAuthMock();

    await requestEmailOtp(supabase, 'user@example.com');

    expect(auth.signInWithOtp).toHaveBeenCalledWith({
      email: 'user@example.com',
      options: {
        emailRedirectTo: 'https://app.example.com/auth/callback',
      },
    });
  });

  it('Supabase 에러를 그대로 반환한다', async () => {
    const { supabase, auth } = createAuthMock();
    const error = { message: 'rate limited' };
    auth.signInWithOtp.mockResolvedValue({ data: emptyAuthData, error });

    const result = await requestEmailOtp(supabase, 'user@example.com');

    expect(result.error).toBe(error);
  });
});

describe('verifyEmailOtp', () => {
  it("verifyOtp를 email + token + type:'email'로 호출한다", async () => {
    const { supabase, auth } = createAuthMock();

    await verifyEmailOtp(supabase, 'user@example.com', '123456');

    expect(auth.verifyOtp).toHaveBeenCalledWith({
      email: 'user@example.com',
      token: '123456',
      type: 'email',
    });
  });

  it('잘못된 코드 에러를 그대로 반환한다', async () => {
    const { supabase, auth } = createAuthMock();
    const error = { message: 'Token has expired or is invalid' };
    auth.verifyOtp.mockResolvedValue({ data: emptyAuthData, error });

    const result = await verifyEmailOtp(supabase, 'user@example.com', '000000');

    expect(result.error).toBe(error);
  });
});

describe('signOut', () => {
  it('auth.signOut을 호출한다', async () => {
    const { supabase, auth } = createAuthMock();

    await signOut(supabase);

    expect(auth.signOut).toHaveBeenCalledOnce();
  });
});
