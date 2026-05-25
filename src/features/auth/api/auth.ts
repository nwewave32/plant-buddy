import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types';

// 이메일로 OTP 코드(매직링크 겸용)를 발송한다.
// 네이티브 앱에서는 사용자가 메일의 6자리 코드를 입력해 verifyEmailOtp로 검증한다.
// 웹에서는 동일 메일의 링크 클릭(emailRedirectTo → /auth/callback)도 그대로 동작한다.
export async function requestEmailOtp(
  supabase: SupabaseClient<Database>,
  email: string,
) {
  return supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  });
}

// 메일로 받은 6자리 코드를 검증해 세션을 발급한다.
// WebView 내부에서 직접 세션이 설정되므로 브라우저 왕복/딥링크가 필요 없다.
export async function verifyEmailOtp(
  supabase: SupabaseClient<Database>,
  email: string,
  token: string,
) {
  return supabase.auth.verifyOtp({
    email,
    token,
    type: 'email',
  });
}

export async function signOut(supabase: SupabaseClient<Database>) {
  return supabase.auth.signOut();
}
