import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { createMockSupabaseClient, mockPlant, createRequest } from '../../helpers/supabase-mock';

const mockCreateClient = vi.fn();
vi.mock('@/shared/api/supabase/server', () => ({
  createClient: () => mockCreateClient(),
}));

const { GET, PATCH, DELETE } = await import('@/app/api/plants/[id]/route');

const VALID_PLANT_ID = mockPlant.id;
const BASE_URL = `http://localhost:3000/api/plants/${VALID_PLANT_ID}`;

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

// ──────────────────────────────────────────────
// GET /api/plants/[id]
// ──────────────────────────────────────────────

describe('GET /api/plants/[id]', () => {
  let mock: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    vi.clearAllMocks();
    mock = createMockSupabaseClient();
    mock.setQueryResult('plants', mockPlant);
    mock.setQueryResult('seasonal_presets', []);
    mock.setQueryResult('watering_logs', []);
    mockCreateClient.mockResolvedValue(mock.client);
  });

  it('잘못된 UUID 시 400 반환', async () => {
    const req = new NextRequest(createRequest(BASE_URL));
    const res = await GET(req, makeParams('not-a-uuid'));

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('잘못된 식물 ID입니다');
  });

  it('비로그인 시 401 반환', async () => {
    mock = createMockSupabaseClient({ user: null, authError: new Error('no session') });
    mockCreateClient.mockResolvedValue(mock.client);

    const req = new NextRequest(createRequest(BASE_URL));
    const res = await GET(req, makeParams(VALID_PLANT_ID));

    expect(res.status).toBe(401);
  });

  it('존재하지 않는 식물 ID 시 404 반환', async () => {
    mock.setQueryResult('plants', null, { message: 'not found' });
    mockCreateClient.mockResolvedValue(mock.client);

    const req = new NextRequest(createRequest(BASE_URL));
    const res = await GET(req, makeParams(VALID_PLANT_ID));

    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe('식물을 찾을 수 없습니다');
  });

  it('식물 상세 정보 반환', async () => {
    const req = new NextRequest(createRequest(BASE_URL));
    const res = await GET(req, makeParams(VALID_PLANT_ID));

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.plant.id).toBe(VALID_PLANT_ID);
    expect(data.plant.name).toBe(mockPlant.name);
    expect(data.plant.presets).toEqual([]);
    expect(data.plant.recentLogs).toEqual([]);
  });

  it('담당자가 있으면 assignedUser 이름 포함', async () => {
    mock.setQueryResult('users', { name: '김담당' });
    mockCreateClient.mockResolvedValue(mock.client);

    const req = new NextRequest(createRequest(BASE_URL));
    const res = await GET(req, makeParams(VALID_PLANT_ID));

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.plant.assignedUser).toBe('김담당');
  });
});

// ──────────────────────────────────────────────
// PATCH /api/plants/[id]
// ──────────────────────────────────────────────

describe('PATCH /api/plants/[id]', () => {
  let mock: ReturnType<typeof createMockSupabaseClient>;

  const updateBody = { name: '수정된 식물' };

  beforeEach(() => {
    vi.clearAllMocks();
    mock = createMockSupabaseClient();
    mock.setQueryResult('users', { role: 'admin' });
    mock.setQueryResult('plants', mockPlant);
    mockCreateClient.mockResolvedValue(mock.client);
  });

  it('잘못된 UUID 시 400 반환', async () => {
    const req = new NextRequest(createRequest(BASE_URL, { method: 'PATCH', body: updateBody }));
    const res = await PATCH(req, makeParams('not-a-uuid'));

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('잘못된 식물 ID입니다');
  });

  it('비로그인 시 401 반환', async () => {
    mock = createMockSupabaseClient({ user: null, authError: new Error('no session') });
    mockCreateClient.mockResolvedValue(mock.client);

    const req = new NextRequest(createRequest(BASE_URL, { method: 'PATCH', body: updateBody }));
    const res = await PATCH(req, makeParams(VALID_PLANT_ID));

    expect(res.status).toBe(401);
  });

  it('존재하지 않는 식물 시 404 반환', async () => {
    mock.setQueryResult('plants', null);
    mockCreateClient.mockResolvedValue(mock.client);

    const req = new NextRequest(createRequest(BASE_URL, { method: 'PATCH', body: updateBody }));
    const res = await PATCH(req, makeParams(VALID_PLANT_ID));

    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe('식물을 찾을 수 없습니다');
  });

  it('관리자도 담당자도 아니면 403 반환', async () => {
    mock.setQueryResult('users', { role: 'user' });
    mock.setQueryResult('plants', { ...mockPlant, assigned_user_id: 'other-user' });
    mockCreateClient.mockResolvedValue(mock.client);

    const req = new NextRequest(createRequest(BASE_URL, { method: 'PATCH', body: updateBody }));
    const res = await PATCH(req, makeParams(VALID_PLANT_ID));

    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe('수정 권한이 없습니다');
  });

  it('담당자는 수정 가능', async () => {
    mock.setQueryResult('users', { role: 'user' });
    // assigned_user_id가 mock user의 id ('user-1')와 일치
    mock.setQueryResult('plants', mockPlant);
    mockCreateClient.mockResolvedValue(mock.client);

    const req = new NextRequest(createRequest(BASE_URL, { method: 'PATCH', body: updateBody }));
    const res = await PATCH(req, makeParams(VALID_PLANT_ID));

    expect(res.status).toBe(200);
  });

  it('잘못된 JSON body 시 400 반환', async () => {
    const req = new NextRequest(
      new Request(BASE_URL, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: 'not json',
      }),
    );
    const res = await PATCH(req, makeParams(VALID_PLANT_ID));

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('잘못된 요청 형식입니다');
  });

  it('유효성 검증 실패 시 400 반환', async () => {
    const req = new NextRequest(
      createRequest(BASE_URL, { method: 'PATCH', body: { watering_interval_days: -1 } }),
    );
    const res = await PATCH(req, makeParams(VALID_PLANT_ID));

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('입력값이 올바르지 않습니다');
  });

  it('관리자 정상 수정 시 200 반환', async () => {
    const req = new NextRequest(createRequest(BASE_URL, { method: 'PATCH', body: updateBody }));
    const res = await PATCH(req, makeParams(VALID_PLANT_ID));

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.plant).toBeDefined();
  });
});

// ──────────────────────────────────────────────
// DELETE /api/plants/[id]
// ──────────────────────────────────────────────

describe('DELETE /api/plants/[id]', () => {
  let mock: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    vi.clearAllMocks();
    mock = createMockSupabaseClient();
    mock.setQueryResult('users', { role: 'admin' });
    mockCreateClient.mockResolvedValue(mock.client);
  });

  it('잘못된 UUID 시 400 반환', async () => {
    const req = new NextRequest(createRequest(BASE_URL, { method: 'DELETE' }));
    const res = await DELETE(req, makeParams('not-a-uuid'));

    expect(res.status).toBe(400);
  });

  it('비로그인 시 401 반환', async () => {
    mock = createMockSupabaseClient({ user: null, authError: new Error('no session') });
    mockCreateClient.mockResolvedValue(mock.client);

    const req = new NextRequest(createRequest(BASE_URL, { method: 'DELETE' }));
    const res = await DELETE(req, makeParams(VALID_PLANT_ID));

    expect(res.status).toBe(401);
  });

  it('일반 사용자 시 403 반환', async () => {
    mock.setQueryResult('users', { role: 'user' });
    mockCreateClient.mockResolvedValue(mock.client);

    const req = new NextRequest(createRequest(BASE_URL, { method: 'DELETE' }));
    const res = await DELETE(req, makeParams(VALID_PLANT_ID));

    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe('관리자 권한이 필요합니다');
  });

  it('관리자 삭제 성공 시 200 반환', async () => {
    const req = new NextRequest(createRequest(BASE_URL, { method: 'DELETE' }));
    const res = await DELETE(req, makeParams(VALID_PLANT_ID));

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  it('DB 에러 시 500 반환', async () => {
    // delete는 single()이 아닌 .then으로 resolve되므로 에러를 설정
    mock.setQueryResult('plants', null, { message: 'delete error' });
    mockCreateClient.mockResolvedValue(mock.client);

    const req = new NextRequest(createRequest(BASE_URL, { method: 'DELETE' }));
    const res = await DELETE(req, makeParams(VALID_PLANT_ID));

    expect(res.status).toBe(500);
  });
});
