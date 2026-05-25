// Supabase Auth 에러를 사용자용 한글 문구로 변환한다.
// code(우선)와 message를 함께 검사해 원문 영문 노출을 막는다.
export function mapAuthError(
  error: { code?: string; message?: string } | null | undefined,
): string {
  if (!error) return '알 수 없는 오류가 발생했어요. 잠시 후 다시 시도해주세요.';

  const code = (error.code ?? '').toLowerCase();
  const text = `${code} ${error.message ?? ''}`.toLowerCase();

  // 요청 과다 (rate limit)
  if (text.includes('rate limit') || code.includes('rate_limit')) {
    return '인증 코드를 너무 자주 요청했어요. 잠시 후 다시 시도해주세요.';
  }

  // 잘못된 자격 증명 (dev 비밀번호 로그인 등) — 'invalid' 일반 분기보다 먼저 검사
  if (text.includes('invalid login credentials') || code === 'invalid_credentials') {
    return '이메일 또는 비밀번호가 올바르지 않아요.';
  }

  // 코드 만료/불일치
  if (
    code === 'otp_expired' ||
    text.includes('expired') ||
    text.includes('invalid')
  ) {
    return '인증 코드가 올바르지 않거나 만료됐어요. 코드를 다시 확인하거나 재전송해주세요.';
  }

  return '문제가 발생했어요. 잠시 후 다시 시도해주세요.';
}
