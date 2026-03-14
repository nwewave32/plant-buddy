import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { createMockSupabaseClient, mockPlant, createRequest } from '../../helpers/supabase-mock';

// createClient mock — 각 테스트에서 다른 supabase client를 반환
const mockCreateClient = vi.fn();
vi.mock('@/shared/api/supabase/server', () => ({
  createClient: () => mockCreateClient(),
}));

// dynamic import로 mock 적용 후 route 로드
const { POST } = await import('@/app/api/plants/[id]/water/route');

const VALID_PLANT_ID = mockPlant.id;
const BASE_URL = `http://localhost:3000/api/plants/${VALID_PLANT_ID}/water`;

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('POST /api/plants/[id]/water', () => {
  let mock: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    vi.clearAllMocks();
    mock = createMockSupabaseClient();
    mock.setQueryResult('plants', mockPlant);
    mock.setRpcResult({
      log: { id: 'log-1', plant_id: VALID_PLANT_ID, was_late: false },
      plant: { ...mockPlant, next_watering_date: '2026-03-21' },
      next_watering_date: '2026-03-21',
    });
    mockCreateClient.mockResolvedValue(mock.client);
  });

  // --- 인증 ---

  it('비로그인 시 401 반환', async () => {
    mock = createMockSupabaseClient({ user: null, authError: new Error('no session') });
    mockCreateClient.mockResolvedValue(mock.client);

    const req = new NextRequest(createRequest(BASE_URL, { method: 'POST', body: {} }));
    const res = await POST(req, makeParams(VALID_PLANT_ID));

    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe('인증이 필요합니다');
  });

  // --- ID 검증 ---

  it('잘못된 UUID 시 400 반환', async () => {
    const req = new NextRequest(createRequest(BASE_URL, { method: 'POST', body: {} }));
    const res = await POST(req, makeParams('not-a-uuid'));

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('잘못된 식물 ID입니다');
  });

  // --- 식물 조회 ---

  it('존재하지 않는 식물 ID 시 404 반환', async () => {
    mock.setQueryResult('plants', null, { message: 'not found' });
    mockCreateClient.mockResolvedValue(mock.client);

    const req = new NextRequest(createRequest(BASE_URL, { method: 'POST', body: {} }));
    const res = await POST(req, makeParams(VALID_PLANT_ID));

    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe('식물을 찾을 수 없습니다');
  });

  // --- 권한 ---

  it('담당자도 위임 대리자도 아닌 사용자 시 403 반환', async () => {
    const otherPlant = { ...mockPlant, assigned_user_id: 'other-user' };
    mock.setQueryResult('plants', otherPlant);
    mock.setQueryResult('delegations', null, { message: 'not found' });
    mockCreateClient.mockResolvedValue(mock.client);

    const req = new NextRequest(createRequest(BASE_URL, { method: 'POST', body: {} }));
    const res = await POST(req, makeParams(VALID_PLANT_ID));

    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe('물주기 권한이 없습니다');
  });

  // --- Body 검증 ---

  it('잘못된 JSON body 시 400 반환', async () => {
    const req = new NextRequest(
      new Request(BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not json',
      }),
    );
    const res = await POST(req, makeParams(VALID_PLANT_ID));

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('잘못된 요청 형식입니다');
  });

  it('memo 500자 초과 시 400 반환', async () => {
    const longMemo = 'a'.repeat(501);
    const req = new NextRequest(createRequest(BASE_URL, { method: 'POST', body: { memo: longMemo } }));
    const res = await POST(req, makeParams(VALID_PLANT_ID));

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('입력값이 올바르지 않습니다');
  });

  // --- 정상 케이스 ---

  it('담당자가 물주기 완료 시 200 반환', async () => {
    const req = new NextRequest(createRequest(BASE_URL, { method: 'POST', body: { memo: '테스트' } }));
    const res = await POST(req, makeParams(VALID_PLANT_ID));

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.plant).toBeDefined();
    expect(data.log).toBeDefined();
    expect(data.next_watering_date).toBeDefined();
  });

  it('memo 없이도 물주기 완료 가능', async () => {
    const req = new NextRequest(createRequest(BASE_URL, { method: 'POST', body: {} }));
    const res = await POST(req, makeParams(VALID_PLANT_ID));

    expect(res.status).toBe(200);
  });

  it('담당자 물주기 시 rpc가 올바른 인자로 호출됨', async () => {
    const req = new NextRequest(createRequest(BASE_URL, { method: 'POST', body: { memo: '메모' } }));
    await POST(req, makeParams(VALID_PLANT_ID));

    expect(mock.client.rpc).toHaveBeenCalledWith(
      'complete_watering',
      expect.objectContaining({
        p_plant_id: VALID_PLANT_ID,
        p_user_id: 'user-1',
        p_memo: '메모',
        p_season: 'spring',
      }),
    );
  });

  // --- was_late 계산 ---

  it('오늘이 예정일 이전이면 was_late = false', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const futurePlant = { ...mockPlant, next_watering_date: tomorrow.toISOString().split('T')[0] };
    mock.setQueryResult('plants', futurePlant);
    mockCreateClient.mockResolvedValue(mock.client);

    const req = new NextRequest(createRequest(BASE_URL, { method: 'POST', body: {} }));
    await POST(req, makeParams(VALID_PLANT_ID));

    expect(mock.client.rpc).toHaveBeenCalledWith(
      'complete_watering',
      expect.objectContaining({ p_was_late: false }),
    );
  });

  it('오늘이 예정일 이후이면 was_late = true', async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const latePlant = { ...mockPlant, next_watering_date: yesterday.toISOString().split('T')[0] };
    mock.setQueryResult('plants', latePlant);
    mockCreateClient.mockResolvedValue(mock.client);

    const req = new NextRequest(createRequest(BASE_URL, { method: 'POST', body: {} }));
    await POST(req, makeParams(VALID_PLANT_ID));

    expect(mock.client.rpc).toHaveBeenCalledWith(
      'complete_watering',
      expect.objectContaining({ p_was_late: true }),
    );
  });

  // --- RPC 실패 ---

  it('RPC 실패 시 500 반환', async () => {
    mock.setRpcResult(null, { message: 'db error' });
    mockCreateClient.mockResolvedValue(mock.client);

    const req = new NextRequest(createRequest(BASE_URL, { method: 'POST', body: {} }));
    const res = await POST(req, makeParams(VALID_PLANT_ID));

    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe('물주기 기록에 실패했습니다');
  });
});
