import { describe, it, expect } from 'vitest';
import { loginSchema, otpSchema } from '@/shared/lib/validation';

describe('loginSchema', () => {
  it('유효한 이메일을 통과시킨다', () => {
    const result = loginSchema.safeParse({ email: 'user@example.com' });
    expect(result.success).toBe(true);
  });

  it('잘못된 이메일을 거부한다', () => {
    const result = loginSchema.safeParse({ email: 'not-an-email' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('유효한 이메일을 입력해주세요');
    }
  });
});

describe('otpSchema', () => {
  it.each([
    ['6자리', '123456'],
    ['7자리', '1234567'],
    ['8자리', '12345678'],
    ['10자리', '1234567890'],
  ])('%s 숫자를 통과시킨다 (%s)', (_label, token) => {
    const result = otpSchema.safeParse({ token });
    expect(result.success).toBe(true);
  });

  it('앞뒤 공백을 trim 후 통과시킨다', () => {
    const result = otpSchema.safeParse({ token: '  12345678  ' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.token).toBe('12345678');
    }
  });

  it.each([
    ['5자리', '12345'],
    ['11자리', '12345678901'],
    ['문자 포함', '12a456'],
    ['빈 문자열', ''],
    ['공백만', '      '],
  ])('%s는 거부한다 (%s)', (_label, token) => {
    const result = otpSchema.safeParse({ token });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('인증 코드를 정확히 입력해주세요');
    }
  });
});
