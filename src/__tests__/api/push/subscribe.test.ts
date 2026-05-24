import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { createMockSupabaseClient, createRequest } from '../../helpers/supabase-mock';

const mockCreateClient = vi.fn();
vi.mock('@/shared/api/supabase/server', () => ({
  createClient: () => mockCreateClient(),
}));

const { POST, DELETE } = await import('@/app/api/push/subscribe/route');

const BASE_URL = 'http://localhost:3000/api/push/subscribe';

const validSubscription = {
  fcm_token: 'fcm-token-abc123',
  platform: 'android',
};

describe('POST /api/push/subscribe', () => {
  let mock: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    vi.clearAllMocks();
    mock = createMockSupabaseClient();
    mock.setQueryResult('push_subscriptions', { id: 'sub-1' });
    mockCreateClient.mockResolvedValue(mock.client);
  });

  it('비로그인 시 401 반환', async () => {
    mock = createMockSupabaseClient({ user: null, authError: new Error('no session') });
    mockCreateClient.mockResolvedValue(mock.client);

    const req = new NextRequest(createRequest(BASE_URL, { method: 'POST', body: validSubscription }));
    const res = await POST(req);

    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe('인증이 필요합니다');
  });

  it('잘못된 JSON body 시 400 반환', async () => {
    const req = new NextRequest(
      new Request(BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not json',
      }),
    );
    const res = await POST(req);

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('잘못된 요청 형식입니다');
  });

  it('fcm_token 누락 시 400 반환', async () => {
    const req = new NextRequest(
      createRequest(BASE_URL, { method: 'POST', body: { platform: 'android' } }),
    );
    const res = await POST(req);

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('입력값이 올바르지 않습니다');
  });

  it('잘못된 platform 시 400 반환', async () => {
    const req = new NextRequest(
      createRequest(BASE_URL, {
        method: 'POST',
        body: { fcm_token: 'tok', platform: 'windows' },
      }),
    );
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it('정상 구독 시 201 반환', async () => {
    const req = new NextRequest(createRequest(BASE_URL, { method: 'POST', body: validSubscription }));
    const res = await POST(req);

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  it('구독 시 from("push_subscriptions") 호출됨', async () => {
    const req = new NextRequest(createRequest(BASE_URL, { method: 'POST', body: validSubscription }));
    await POST(req);

    expect(mock.client.from).toHaveBeenCalledWith('push_subscriptions');
  });

  it('DB 에러 시 500 반환', async () => {
    mock.setQueryResult('push_subscriptions', null, { message: 'db error' });
    mockCreateClient.mockResolvedValue(mock.client);

    const req = new NextRequest(createRequest(BASE_URL, { method: 'POST', body: validSubscription }));
    const res = await POST(req);

    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe('구독 저장에 실패했습니다');
  });
});

describe('DELETE /api/push/subscribe', () => {
  let mock: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    vi.clearAllMocks();
    mock = createMockSupabaseClient();
    mock.setQueryResult('push_subscriptions', null);
    mockCreateClient.mockResolvedValue(mock.client);
  });

  it('비로그인 시 401 반환', async () => {
    mock = createMockSupabaseClient({ user: null, authError: new Error('no session') });
    mockCreateClient.mockResolvedValue(mock.client);

    const req = new NextRequest(
      createRequest(BASE_URL, { method: 'DELETE', body: { fcm_token: 'tok' } }),
    );
    const res = await DELETE(req);

    expect(res.status).toBe(401);
  });

  it('fcm_token 누락 시 400 반환', async () => {
    const req = new NextRequest(
      createRequest(BASE_URL, { method: 'DELETE', body: {} }),
    );
    const res = await DELETE(req);

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('입력값이 올바르지 않습니다');
  });

  it('정상 해제 시 200 반환', async () => {
    const req = new NextRequest(
      createRequest(BASE_URL, { method: 'DELETE', body: { fcm_token: 'fcm-token-abc123' } }),
    );
    const res = await DELETE(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  it('DB 에러 시 500 반환', async () => {
    mock.setQueryResult('push_subscriptions', null, { message: 'db error' });
    mockCreateClient.mockResolvedValue(mock.client);

    const req = new NextRequest(
      createRequest(BASE_URL, { method: 'DELETE', body: { fcm_token: 'fcm-token-abc123' } }),
    );
    const res = await DELETE(req);

    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe('구독 해제에 실패했습니다');
  });
});
