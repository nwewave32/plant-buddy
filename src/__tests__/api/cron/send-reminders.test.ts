import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { createMockSupabaseClient, createRequest } from '../../helpers/supabase-mock';

// web-push mock
const mockSendNotification = vi.fn(() => Promise.resolve({}));
vi.mock('web-push', () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: (...args: unknown[]) => mockSendNotification(...args),
  },
}));

// Admin client mock
const mockAdminClient = vi.fn();
vi.mock('@/shared/api/supabase/admin', () => ({
  createAdminClient: () => mockAdminClient(),
}));

// VAPID 환경변수 설정
vi.stubEnv('NEXT_PUBLIC_VAPID_PUBLIC_KEY', 'test-public-key');
vi.stubEnv('VAPID_PRIVATE_KEY', 'test-private-key');
vi.stubEnv('VAPID_SUBJECT', 'mailto:test@example.com');
vi.stubEnv('CRON_SECRET', 'test-cron-secret');

const { POST } = await import('@/app/api/cron/send-reminders/route');

const BASE_URL = 'http://localhost:3000/api/cron/send-reminders';
const CRON_SECRET = 'test-cron-secret';

function makeAuthRequest() {
  return new NextRequest(
    new Request(BASE_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${CRON_SECRET}` },
    }),
  );
}

const today = (() => {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
})();

const mockPlants = [
  { id: 'plant-1', name: '몬스테라', assigned_user_id: 'user-1', next_watering_date: today },
  { id: 'plant-2', name: '스투키', assigned_user_id: 'user-2', next_watering_date: today },
];

const mockSubscriptions = [
  { id: 'sub-1', user_id: 'user-1', endpoint: 'https://push.example.com/1', keys_p256dh: 'key1', keys_auth: 'auth1' },
  { id: 'sub-2', user_id: 'user-2', endpoint: 'https://push.example.com/2', keys_p256dh: 'key2', keys_auth: 'auth2' },
];

describe('POST /api/cron/send-reminders', () => {
  let mock: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    vi.clearAllMocks();
    mock = createMockSupabaseClient();
    mockAdminClient.mockReturnValue(mock.client);
  });

  // --- 인증 ---

  it('CRON_SECRET 없으면 401 반환', async () => {
    const req = new NextRequest(
      new Request(BASE_URL, { method: 'POST' }),
    );
    const res = await POST(req);

    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('잘못된 CRON_SECRET 시 401 반환', async () => {
    const req = new NextRequest(
      new Request(BASE_URL, {
        method: 'POST',
        headers: { Authorization: 'Bearer wrong-secret' },
      }),
    );
    const res = await POST(req);

    expect(res.status).toBe(401);
  });

  // --- 식물 없음 ---

  it('예정된 식물 없으면 sent: 0 반환', async () => {
    mock.setQueryResult('plants', []);
    const res = await POST(makeAuthRequest());

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.sent).toBe(0);
  });

  // --- 구독 없음 ---

  it('구독 없으면 sent: 0 반환', async () => {
    mock.setQueryResult('plants', mockPlants);
    mock.setQueryResult('push_subscriptions', []);
    const res = await POST(makeAuthRequest());

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.sent).toBe(0);
  });

  // --- 정상 발송 ---

  it('식물과 구독 있으면 알림 발송', async () => {
    mock.setQueryResult('plants', mockPlants);
    mock.setQueryResult('push_subscriptions', mockSubscriptions);
    mockSendNotification.mockResolvedValue({});

    const res = await POST(makeAuthRequest());

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.sent).toBe(2);
    expect(data.failed).toBe(0);
    expect(mockSendNotification).toHaveBeenCalledTimes(2);
  });

  it('sendNotification에 올바른 구독 정보 전달', async () => {
    mock.setQueryResult('plants', [mockPlants[0]]);
    mock.setQueryResult('push_subscriptions', [mockSubscriptions[0]]);
    mockSendNotification.mockResolvedValue({});

    await POST(makeAuthRequest());

    expect(mockSendNotification).toHaveBeenCalledWith(
      {
        endpoint: 'https://push.example.com/1',
        keys: { p256dh: 'key1', auth: 'auth1' },
      },
      expect.any(String),
    );

    // payload 검증
    const payload = JSON.parse(mockSendNotification.mock.calls[0][1] as string);
    expect(payload.data.plantId).toBe('plant-1');
    expect(payload.data.url).toBe('/plants/plant-1');
  });

  // --- 발송 실패 ---

  it('sendNotification 실패 시 failed 카운트 증가', async () => {
    mock.setQueryResult('plants', [mockPlants[0]]);
    mock.setQueryResult('push_subscriptions', [mockSubscriptions[0]]);
    mockSendNotification.mockRejectedValue({ statusCode: 500 });

    const res = await POST(makeAuthRequest());

    const data = await res.json();
    expect(data.sent).toBe(0);
    expect(data.failed).toBe(1);
  });

  // --- 만료 구독 정리 ---

  it('410 에러 시 만료 구독 정리', async () => {
    mock.setQueryResult('plants', [mockPlants[0]]);
    mock.setQueryResult('push_subscriptions', [mockSubscriptions[0]]);
    mockSendNotification.mockRejectedValue({ statusCode: 410 });

    const res = await POST(makeAuthRequest());

    const data = await res.json();
    expect(data.failed).toBe(1);
    // delete가 호출되었는지 확인 (from이 push_subscriptions로 두 번 호출됨)
    expect(mock.client.from).toHaveBeenCalledWith('push_subscriptions');
  });

  // --- DB 에러 ---

  it('식물 조회 실패 시 500 반환', async () => {
    mock.setQueryResult('plants', null, { message: 'db error' });

    const res = await POST(makeAuthRequest());

    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe('식물 조회 실패');
  });

  it('구독 조회 실패 시 500 반환', async () => {
    mock.setQueryResult('plants', mockPlants);
    mock.setQueryResult('push_subscriptions', null, { message: 'db error' });

    const res = await POST(makeAuthRequest());

    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe('푸시 구독 조회 실패');
  });
});
