import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/shared/api/supabase/server';

type RouteContext = { params: Promise<{ id: string }> };

const uuidSchema = z.string().uuid();

// GET /api/plants/[id]/watering-logs — 물주기 이력
export async function GET(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;

  // [HIGH] id 파라미터 UUID 검증
  if (!uuidSchema.safeParse(id).success) {
    return NextResponse.json({ error: '잘못된 식물 ID입니다' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10) || 20, 100);

  const { data: logs, error } = await supabase
    .from('watering_logs')
    .select('*, users!watering_logs_user_id_fkey(name)')
    .eq('plant_id', id)
    .order('watered_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('watering_logs query failed:', error);
    return NextResponse.json({ error: '물주기 이력을 불러오지 못했습니다' }, { status: 500 });
  }

  const logsWithUser = (logs ?? []).map((log) => {
    const { users, ...rest } = log as Record<string, unknown>;
    return {
      ...rest,
      user_name: (users as { name: string } | null)?.name ?? null,
    };
  });

  return NextResponse.json({ logs: logsWithUser });
}
