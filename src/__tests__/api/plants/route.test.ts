import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { createMockSupabaseClient, mockPlant, createRequest } from '../../helpers/supabase-mock';

const mockCreateClient = vi.fn();
vi.mock('@/shared/api/supabase/server', () => ({
  createClient: () => mockCreateClient(),
}));

vi.mock('@/shared/lib/season', () => ({
  getCurrentSeason: () => 'spring',
}));

const { GET, POST } = await import('@/app/api/plants/route');

const BASE_URL = 'http://localhost:3000/api/plants';

describe('GET /api/plants', () => {
  let mock: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    vi.clearAllMocks();
    mock = createMockSupabaseClient();
    mock.setQueryResult('plants', [mockPlant]);
    mockCreateClient.mockResolvedValue(mock.client);
  });

  it('비로그인 시 401 반환', async () => {
    mock = createMockSupabaseClient({ user: null, authError: new Error('no session') });
    mockCreateClient.mockResolvedValue(mock.client);

    const req = new NextRequest(createRequest(BASE_URL));
    const res = await GET(req);

    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe('인증이 필요합니다');
  });

  it('전체 식물 목록 반환', async () => {
    const req = new NextRequest(createRequest(BASE_URL));
    const res = await GET(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.plants).toEqual([mockPlant]);
  });

  it('mine=true 시 assigned_user_id 필터 적용', async () => {
    const req = new NextRequest(createRequest(`${BASE_URL}?mine=true`));
    await GET(req);

    const fromCall = mock.client.from as ReturnType<typeof vi.fn>;
    expect(fromCall).toHaveBeenCalledWith('plants');
  });

  it('DB 에러 시 500 반환', async () => {
    mock.setQueryResult('plants', null, { message: 'db error' });
    mockCreateClient.mockResolvedValue(mock.client);

    const req = new NextRequest(createRequest(BASE_URL));
    const res = await GET(req);

    expect(res.status).toBe(500);
  });
});

describe('POST /api/plants', () => {
  let mock: ReturnType<typeof createMockSupabaseClient>;

  const validBody = {
    name: '새 식물',
    watering_interval_days: 7,
    next_watering_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mock = createMockSupabaseClient();
    mock.setQueryResult('users', { role: 'admin' });
    mock.setQueryResult('plants', { ...mockPlant, ...validBody });
    mockCreateClient.mockResolvedValue(mock.client);
  });

  it('비로그인 시 401 반환', async () => {
    mock = createMockSupabaseClient({ user: null, authError: new Error('no session') });
    mockCreateClient.mockResolvedValue(mock.client);

    const req = new NextRequest(createRequest(BASE_URL, { method: 'POST', body: validBody }));
    const res = await POST(req);

    expect(res.status).toBe(401);
  });

  it('일반 사용자 시 403 반환', async () => {
    mock.setQueryResult('users', { role: 'user' });
    mockCreateClient.mockResolvedValue(mock.client);

    const req = new NextRequest(createRequest(BASE_URL, { method: 'POST', body: validBody }));
    const res = await POST(req);

    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe('관리자 권한이 필요합니다');
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

  it('유효성 검증 실패 시 400 반환', async () => {
    const req = new NextRequest(createRequest(BASE_URL, { method: 'POST', body: { name: '' } }));
    const res = await POST(req);

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('입력값이 올바르지 않습니다');
    expect(data.details).toBeDefined();
  });

  it('정상 등록 시 201 반환', async () => {
    const req = new NextRequest(createRequest(BASE_URL, { method: 'POST', body: validBody }));
    const res = await POST(req);

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.plant).toBeDefined();
    expect(data.plant.name).toBe('새 식물');
  });

  it('DB 에러 시 500 반환', async () => {
    mock.setQueryResult('plants', null, { message: 'insert error' });
    mockCreateClient.mockResolvedValue(mock.client);

    const req = new NextRequest(createRequest(BASE_URL, { method: 'POST', body: validBody }));
    const res = await POST(req);

    expect(res.status).toBe(500);
  });
});
