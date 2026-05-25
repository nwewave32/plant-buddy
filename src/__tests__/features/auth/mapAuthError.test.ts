import { describe, it, expect } from 'vitest';
import { mapAuthError } from '@/features/auth/lib/mapAuthError';

describe('mapAuthError', () => {
  it('null/undefined는 기본 문구를 반환', () => {
    expect(mapAuthError(null)).toContain('알 수 없는 오류');
    expect(mapAuthError(undefined)).toContain('알 수 없는 오류');
  });

  it.each([
    { code: 'over_email_send_rate_limit', message: '' },
    { code: '', message: 'email rate limit exceeded' },
  ])('rate limit 에러를 한글로 매핑 (%o)', (error) => {
    expect(mapAuthError(error)).toBe(
      '인증 코드를 너무 자주 요청했어요. 잠시 후 다시 시도해주세요.',
    );
  });

  it.each([
    { code: 'otp_expired', message: '' },
    { code: '', message: 'Token has expired or is invalid' },
  ])('만료/불일치 에러를 한글로 매핑 (%o)', (error) => {
    expect(mapAuthError(error)).toContain('올바르지 않거나 만료');
  });

  it('잘못된 자격 증명을 한글로 매핑', () => {
    expect(mapAuthError({ message: 'Invalid login credentials' })).toBe(
      '이메일 또는 비밀번호가 올바르지 않아요.',
    );
  });

  it('알 수 없는 에러는 일반 한글 문구로 폴백', () => {
    const result = mapAuthError({ code: 'something_unexpected', message: 'boom' });
    expect(result).toBe('문제가 발생했어요. 잠시 후 다시 시도해주세요.');
  });

  it('원문 영문 메시지를 그대로 노출하지 않는다', () => {
    const result = mapAuthError({ message: 'email rate limit exceeded' });
    expect(result).not.toContain('rate limit');
    expect(result).not.toMatch(/[a-z]{4,}/i);
  });
});
