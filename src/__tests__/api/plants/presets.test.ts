import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createMockSupabaseClient,
  createRequest,
  mockPlant,
} from '../../helpers/supabase-mock';

const mockCreateClient = vi.fn();
vi.mock('@/shared/api/supabase/server', () => ({
  createClient: () => mockCreateClient(),
}));

vi.mock('@/shared/lib/season', () => ({
  getCurrentSeason: () => 'spring',
}));

const { GET, PUT } = await import('@/app/api/plants/[id]/presets/route');

const VALID_PLANT_ID = mockPlant.id;
const BASE_URL = `http://localhost:3000/api/plants/${VALID_PLANT_ID}/presets`;

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

// ──────────────────────────────────────────────
// GET /api/plants/[id]/presets
// ──────────────────────────────────────────────

describe('GET /api/plants/[id]/presets', () => {
  let mock: ReturnType<typeof createMockSupabaseClient>;

  const mockPresets = [
    {
      id: 'preset-1',
      plant_id: VALID_PLANT_ID,
      season: 'spring',
      watering_interval_days: 5,
      water_amount_ml: 200,
      watering_method: 'top',
      care_notes: null,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mock = createMockSupabaseClient();
    mock.setQueryResult('seasonal_presets', mockPresets);
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
    mock = createMockSupabaseClient({
      user: null,
      authError: new Error('no session'),
    });
    mockCreateClient.mockResolvedValue(mock.client);

    const req = new NextRequest(createRequest(BASE_URL));
    const res = await GET(req, makeParams(VALID_PLANT_ID));

    expect(res.status).toBe(401);
  });

  it('프리셋 목록 반환', async () => {
    const req = new NextRequest(createRequest(BASE_URL));
    const res = await GET(req, makeParams(VALID_PLANT_ID));

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.presets).toEqual(mockPresets);
  });

  it('DB 에러 시 500 반환', async () => {
    mock.setQueryResult('seasonal_presets', null, { message: 'db error' });
    mockCreateClient.mockResolvedValue(mock.client);

    const req = new NextRequest(createRequest(BASE_URL));
    const res = await GET(req, makeParams(VALID_PLANT_ID));

    expect(res.status).toBe(500);
  });
});

// ──────────────────────────────────────────────
// PUT /api/plants/[id]/presets
// ──────────────────────────────────────────────

describe('PUT /api/plants/[id]/presets', () => {
  let mock: ReturnType<typeof createMockSupabaseClient>;

  const validBody = {
    presets: [
      {
        season: 'spring',
        enabled: true,
        watering_interval_days: 5,
        water_amount_ml: 200,
      },
      {
        season: 'summer',
        enabled: false,
        watering_interval_days: 3,
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mock = createMockSupabaseClient();
    mock.setQueryResult('users', { role: 'admin' });
    mock.setQueryResult('seasonal_presets', {
      id: 'preset-1',
      plant_id: VALID_PLANT_ID,
      season: 'spring',
      watering_interval_days: 5,
    });
    mock.setQueryResult('plants', mockPlant);
    mockCreateClient.mockResolvedValue(mock.client);
  });

  it('잘못된 UUID 시 400 반환', async () => {
    const req = new NextRequest(
      createRequest(BASE_URL, { method: 'PUT', body: validBody })
    );
    const res = await PUT(req, makeParams('not-a-uuid'));

    expect(res.status).toBe(400);
  });

  it('비로그인 시 401 반환', async () => {
    mock = createMockSupabaseClient({
      user: null,
      authError: new Error('no session'),
    });
    mockCreateClient.mockResolvedValue(mock.client);

    const req = new NextRequest(
      createRequest(BASE_URL, { method: 'PUT', body: validBody })
    );
    const res = await PUT(req, makeParams(VALID_PLANT_ID));

    expect(res.status).toBe(401);
  });

  it('일반 사용자 시 403 반환', async () => {
    mock.setQueryResult('users', { role: 'user' });
    mockCreateClient.mockResolvedValue(mock.client);

    const req = new NextRequest(
      createRequest(BASE_URL, { method: 'PUT', body: validBody })
    );
    const res = await PUT(req, makeParams(VALID_PLANT_ID));

    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe('관리자 권한이 필요합니다');
  });

  it('잘못된 JSON body 시 400 반환', async () => {
    const req = new NextRequest(
      new Request(BASE_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: 'not json',
      })
    );
    const res = await PUT(req, makeParams(VALID_PLANT_ID));

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('잘못된 요청 형식입니다');
  });

  it('유효성 검증 실패 시 400 반환', async () => {
    const invalidBody = {
      presets: [
        { season: 'invalid', enabled: true, watering_interval_days: 0 },
      ],
    };

    const req = new NextRequest(
      createRequest(BASE_URL, { method: 'PUT', body: invalidBody })
    );
    const res = await PUT(req, makeParams(VALID_PLANT_ID));

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('입력값이 올바르지 않습니다');
  });

  it('정상 저장 시 200 반환', async () => {
    const req = new NextRequest(
      createRequest(BASE_URL, { method: 'PUT', body: validBody })
    );
    const res = await PUT(req, makeParams(VALID_PLANT_ID));

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.presets).toBeDefined();
    expect(Array.isArray(data.presets)).toBe(true);
  });

  it('enabled=true인 현재 계절 프리셋은 plants 테이블도 업데이트', async () => {
    const springBody = {
      presets: [
        {
          season: 'spring',
          enabled: true,
          watering_interval_days: 3,
          water_amount_ml: 150,
        },
      ],
    };

    const req = new NextRequest(
      createRequest(BASE_URL, { method: 'PUT', body: springBody })
    );
    await PUT(req, makeParams(VALID_PLANT_ID));

    // from('plants')가 호출되었는지 확인 (현재 계절=spring이므로 plants 업데이트 발생)
    const fromCalls = (mock.client.from as ReturnType<typeof vi.fn>).mock.calls;
    const plantsCallExists = fromCalls.some(
      (args: unknown[]) => args[0] === 'plants'
    );
    expect(plantsCallExists).toBe(true);
  });

  it('DB insert 에러 시 500 반환', async () => {
    mock.setQueryResult('seasonal_presets', null, { message: 'insert error' });
    mockCreateClient.mockResolvedValue(mock.client);

    const enabledBody = {
      presets: [{ season: 'spring', enabled: true, watering_interval_days: 5 }],
    };

    const req = new NextRequest(
      createRequest(BASE_URL, { method: 'PUT', body: enabledBody })
    );
    const res = await PUT(req, makeParams(VALID_PLANT_ID));

    expect(res.status).toBe(500);
  });
});
