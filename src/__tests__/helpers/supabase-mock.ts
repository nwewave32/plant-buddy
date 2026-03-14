import { vi } from 'vitest';
import type { Plant } from '@/shared/types';

// Supabase 쿼리 빌더 체이닝을 모사하는 헬퍼
function chainable(finalResult: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {};
  const methods = [
    'select', 'insert', 'update', 'delete',
    'eq', 'neq', 'lte', 'gte', 'lt', 'gt',
    'order', 'limit', 'single', 'maybeSingle',
    'returns',
  ];

  for (const method of methods) {
    chain[method] = vi.fn(() => chain);
  }

  // single()이나 마지막 호출 시 결과 반환
  chain.single = vi.fn(() => Promise.resolve(finalResult));
  chain.then = (resolve: (v: unknown) => void) => resolve(finalResult);

  return chain;
}

export function createMockSupabaseClient(overrides?: {
  user?: { id: string; email: string } | null;
  authError?: Error | null;
}) {
  const user = overrides?.user ?? { id: 'user-1', email: 'test@example.com' };
  const authError = overrides?.authError ?? null;

  const queryResults = new Map<string, { data: unknown; error: unknown }>();

  const client = {
    auth: {
      getUser: vi.fn(() =>
        Promise.resolve({
          data: { user: authError ? null : user },
          error: authError,
        }),
      ),
    },
    from: vi.fn((table: string) => {
      const result = queryResults.get(table) ?? { data: null, error: null };
      return chainable(result);
    }),
    rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
  };

  return {
    client,
    // 테이블별 반환값 설정
    setQueryResult(table: string, data: unknown, error?: unknown) {
      queryResults.set(table, { data, error: error ?? null });
    },
    setRpcResult(data: unknown, error?: unknown) {
      client.rpc = vi.fn(() => Promise.resolve({ data, error: error ?? null }));
    },
  };
}

// 테스트용 식물 데이터
export const mockPlant: Plant = {
  id: '10b361c1-b652-4916-baa1-01902dff5118',
  name: '테스트 식물',
  species: null,
  photo_url: null,
  location: '사무실',
  assigned_user_id: 'user-1',
  watering_interval_days: 7,
  water_amount_ml: null,
  watering_method: null,
  sunlight: null,
  care_notes: null,
  status: 'healthy',
  current_season: 'spring',
  next_watering_date: new Date().toISOString().split('T')[0],
  created_at: '2026-01-01T00:00:00Z',
};

// NextRequest 생성 헬퍼
export function createRequest(
  url: string,
  options?: { method?: string; body?: unknown },
) {
  const { method = 'GET', body } = options ?? {};
  return new Request(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
}
