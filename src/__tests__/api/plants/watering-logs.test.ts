import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { createMockSupabaseClient } from '../../helpers/supabase-mock';

const mockCreateClient = vi.fn();
vi.mock('@/shared/api/supabase/server', () => ({
  createClient: () => mockCreateClient(),
}));

const { GET } = await import('@/app/api/plants/[id]/watering-logs/route');

const VALID_PLANT_ID = '10b361c1-b652-4916-baa1-01902dff5118';
const BASE_URL = `http://localhost:3000/api/plants/${VALID_PLANT_ID}/watering-logs`;

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('GET /api/plants/[id]/watering-logs', () => {
  let mock: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    vi.clearAllMocks();
    mock = createMockSupabaseClient();
    mockCreateClient.mockResolvedValue(mock.client);
  });

  // --- 인증 ---

  it('비로그인 시 401 반환', async () => {
    mock = createMockSupabaseClient({ user: null, authError: new Error('no session') });
    mockCreateClient.mockResolvedValue(mock.client);

    const req = new NextRequest(new Request(BASE_URL));
    const res = await GET(req, makeParams(VALID_PLANT_ID));

    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe('인증이 필요합니다');
  });

  // --- ID 검증 ---

  it('잘못된 UUID 시 400 반환', async () => {
    const req = new NextRequest(new Request(`http://localhost:3000/api/plants/bad-id/watering-logs`));
    const res = await GET(req, makeParams('bad-id'));

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('잘못된 식물 ID입니다');
  });

  // --- 정상 조회 ---

  it('로그 목록과 user_name을 반환', async () => {
    const mockLogs = [
      {
        id: 'log-1',
        plant_id: VALID_PLANT_ID,
        user_id: 'user-1',
        watered_at: '2026-03-14T10:00:00Z',
        scheduled_date: '2026-03-14',
        was_late: false,
        season: 'spring',
        memo: null,
        users: { name: '홍길동' },
      },
    ];
    mock.setQueryResult('watering_logs', mockLogs);
    // watering_logs는 .single()이 아니라 배열 반환이므로 chainable을 커스텀
    // 기본 mock의 from().select()...가 Promise.resolve({data: mockLogs})를 반환하도록
    const originalFrom = mock.client.from;
    mock.client.from = vi.fn((table: string) => {
      if (table === 'watering_logs') {
        const chain: Record<string, unknown> = {};
        const methods = ['select', 'eq', 'order', 'limit'];
        for (const m of methods) {
          chain[m] = vi.fn(() => chain);
        }
        chain.then = (resolve: (v: unknown) => void) =>
          resolve({ data: mockLogs, error: null });
        return chain;
      }
      return originalFrom(table);
    }) as typeof mock.client.from;
    mockCreateClient.mockResolvedValue(mock.client);

    const req = new NextRequest(new Request(BASE_URL));
    const res = await GET(req, makeParams(VALID_PLANT_ID));

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.logs).toHaveLength(1);
    expect(data.logs[0].user_name).toBe('홍길동');
    // users 필드는 제거되어야 함
    expect(data.logs[0].users).toBeUndefined();
  });

  // --- limit 파라미터 ---

  it('limit 파라미터가 적용됨', async () => {
    const limitFn = vi.fn(() => ({
      then: (resolve: (v: unknown) => void) =>
        resolve({ data: [], error: null }),
    }));

    mock.client.from = vi.fn(() => {
      const chain: Record<string, unknown> = {};
      chain.select = vi.fn(() => chain);
      chain.eq = vi.fn(() => chain);
      chain.order = vi.fn(() => chain);
      chain.limit = limitFn;
      return chain;
    }) as typeof mock.client.from;
    mockCreateClient.mockResolvedValue(mock.client);

    const req = new NextRequest(new Request(`${BASE_URL}?limit=5`));
    await GET(req, makeParams(VALID_PLANT_ID));

    expect(limitFn).toHaveBeenCalledWith(5);
  });

  it('limit 100 초과 시 100으로 제한', async () => {
    const limitFn = vi.fn(() => ({
      then: (resolve: (v: unknown) => void) =>
        resolve({ data: [], error: null }),
    }));

    mock.client.from = vi.fn(() => {
      const chain: Record<string, unknown> = {};
      chain.select = vi.fn(() => chain);
      chain.eq = vi.fn(() => chain);
      chain.order = vi.fn(() => chain);
      chain.limit = limitFn;
      return chain;
    }) as typeof mock.client.from;
    mockCreateClient.mockResolvedValue(mock.client);

    const req = new NextRequest(new Request(`${BASE_URL}?limit=999`));
    await GET(req, makeParams(VALID_PLANT_ID));

    expect(limitFn).toHaveBeenCalledWith(100);
  });

  // --- DB 에러 ---

  it('DB 에러 시 500 반환 (에러 메시지 미노출)', async () => {
    mock.client.from = vi.fn(() => {
      const chain: Record<string, unknown> = {};
      chain.select = vi.fn(() => chain);
      chain.eq = vi.fn(() => chain);
      chain.order = vi.fn(() => chain);
      chain.limit = vi.fn(() => chain);
      chain.then = (resolve: (v: unknown) => void) =>
        resolve({ data: null, error: { message: 'relation "watering_logs" does not exist' } });
      return chain;
    }) as typeof mock.client.from;
    mockCreateClient.mockResolvedValue(mock.client);

    const req = new NextRequest(new Request(BASE_URL));
    const res = await GET(req, makeParams(VALID_PLANT_ID));

    expect(res.status).toBe(500);
    const data = await res.json();
    // DB 내부 에러 메시지가 아닌 일반 메시지 반환
    expect(data.error).toBe('물주기 이력을 불러오지 못했습니다');
    expect(data.error).not.toContain('relation');
  });
});
