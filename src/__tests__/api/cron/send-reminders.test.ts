import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { createMockSupabaseClient } from '../../helpers/supabase-mock';

// firebase-admin messaging mock (헬퍼 모듈을 모킹)
const mockSendEach = vi.fn();
vi.mock('@/shared/lib/firebaseAdmin', () => ({
  getFcmMessaging: () => ({ sendEach: (...args: unknown[]) => mockSendEach(...args) }),
}));

// Admin client mock
const mockAdminClient = vi.fn();
vi.mock('@/shared/api/supabase/admin', () => ({
  createAdminClient: () => mockAdminClient(),
}));

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
  { id: 'sub-1', user_id: 'user-1', fcm_token: 'tok-1', platform: 'android' },
  { id: 'sub-2', user_id: 'user-2', fcm_token: 'tok-2', platform: 'ios' },
];

// sendEach 기본: 모든 메시지 성공
function allSuccess(msgs: { token: string }[]) {
  return Promise.resolve({
    responses: msgs.map(() => ({ success: true })),
    successCount: msgs.length,
    failureCount: 0,
  });
}

describe('POST /api/cron/send-reminders', () => {
  let mock: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    vi.clearAllMocks();
    mock = createMockSupabaseClient();
    mockAdminClient.mockReturnValue(mock.client);
    mockSendEach.mockImplementation(allSuccess);
  });

  // --- 인증 ---

  it('CRON_SECRET 없으면 401 반환', async () => {
    const req = new NextRequest(new Request(BASE_URL, { method: 'POST' }));
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

  // --- 식물/구독 없음 ---

  it('예정된 식물 없으면 sent: 0 반환', async () => {
    mock.setQueryResult('plants', []);
    const res = await POST(makeAuthRequest());

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.sent).toBe(0);
    expect(mockSendEach).not.toHaveBeenCalled();
  });

  it('구독 없으면 sent: 0 반환', async () => {
    mock.setQueryResult('plants', mockPlants);
    mock.setQueryResult('push_subscriptions', []);
    const res = await POST(makeAuthRequest());

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.sent).toBe(0);
    expect(mockSendEach).not.toHaveBeenCalled();
  });

  // --- 정상 발송 ---

  it('식물과 구독 있으면 FCM 발송', async () => {
    mock.setQueryResult('plants', mockPlants);
    mock.setQueryResult('push_subscriptions', mockSubscriptions);

    const res = await POST(makeAuthRequest());

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.sent).toBe(2);
    expect(data.failed).toBe(0);
    expect(mockSendEach).toHaveBeenCalledTimes(1);
    // 2개 메시지 전달
    const messages = mockSendEach.mock.calls[0][0];
    expect(messages).toHaveLength(2);
  });

  it('메시지에 올바른 token과 data 포함', async () => {
    mock.setQueryResult('plants', [mockPlants[0]]);
    mock.setQueryResult('push_subscriptions', [mockSubscriptions[0]]);

    await POST(makeAuthRequest());

    const messages = mockSendEach.mock.calls[0][0];
    expect(messages[0].token).toBe('tok-1');
    expect(messages[0].data.plantId).toBe('plant-1');
    expect(messages[0].data.url).toBe('/plants/plant-1');
    expect(messages[0].notification.title).toContain('몬스테라');
  });

  // --- 발송 실패 ---

  it('발송 실패 시 failed 카운트 증가', async () => {
    mock.setQueryResult('plants', [mockPlants[0]]);
    mock.setQueryResult('push_subscriptions', [mockSubscriptions[0]]);
    mockSendEach.mockResolvedValue({
      responses: [{ success: false, error: { code: 'messaging/internal-error' } }],
      successCount: 0,
      failureCount: 1,
    });

    const res = await POST(makeAuthRequest());

    const data = await res.json();
    expect(data.sent).toBe(0);
    expect(data.failed).toBe(1);
  });

  // --- 무효 토큰 정리 ---

  it('무효 토큰 응답 시 구독 정리', async () => {
    mock.setQueryResult('plants', [mockPlants[0]]);
    mock.setQueryResult('push_subscriptions', [mockSubscriptions[0]]);
    mockSendEach.mockResolvedValue({
      responses: [
        { success: false, error: { code: 'messaging/registration-token-not-registered' } },
      ],
      successCount: 0,
      failureCount: 1,
    });

    const res = await POST(makeAuthRequest());

    const data = await res.json();
    expect(data.failed).toBe(1);
    // 정리를 위해 push_subscriptions 삭제 시도
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
