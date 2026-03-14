import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/shared/api/supabase/server';
import { createPlantSchema, uuidSchema } from '@/shared/lib/validation';
import type { Plant, SeasonalPreset, WateringLog } from '@/shared/types';

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/plants/[id] — 식물 상세
export async function GET(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  if (!uuidSchema.safeParse(id).success) {
    return NextResponse.json({ error: '잘못된 식물 ID입니다' }, { status: 400 });
  }
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
  }

  const [plantResult, presetsResult, logsResult] = await Promise.all([
    supabase.from('plants').select('*').eq('id', id).single<Plant>(),
    supabase
      .from('seasonal_presets')
      .select('*')
      .eq('plant_id', id)
      .order('season')
      .returns<SeasonalPreset[]>(),
    supabase
      .from('watering_logs')
      .select('*')
      .eq('plant_id', id)
      .order('watered_at', { ascending: false })
      .limit(10)
      .returns<WateringLog[]>(),
  ]);

  if (plantResult.error) {
    return NextResponse.json({ error: '식물을 찾을 수 없습니다' }, { status: 404 });
  }

  const plant = plantResult.data;
  let assignedUser: string | null = null;
  if (plant.assigned_user_id) {
    const { data: userData } = await supabase
      .from('users')
      .select('name')
      .eq('id', plant.assigned_user_id)
      .single<{ name: string }>();
    assignedUser = userData?.name ?? null;
  }

  return NextResponse.json({
    plant: {
      ...plant,
      presets: presetsResult.data ?? [],
      recentLogs: logsResult.data ?? [],
      assignedUser,
    },
  });
}

// PATCH /api/plants/[id] — 식물 수정
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  if (!uuidSchema.safeParse(id).success) {
    return NextResponse.json({ error: '잘못된 식물 ID입니다' }, { status: 400 });
  }
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
  }

  // admin 또는 담당자 확인
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single<{ role: string }>();

  const { data: existingPlant } = await supabase
    .from('plants')
    .select('assigned_user_id')
    .eq('id', id)
    .single<{ assigned_user_id: string | null }>();

  if (!existingPlant) {
    return NextResponse.json({ error: '식물을 찾을 수 없습니다' }, { status: 404 });
  }

  const isAdmin = profile?.role === 'admin';
  const isAssigned = existingPlant.assigned_user_id === user.id;
  if (!isAdmin && !isAssigned) {
    return NextResponse.json({ error: '수정 권한이 없습니다' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '잘못된 요청 형식입니다' }, { status: 400 });
  }

  const parsed = createPlantSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: '입력값이 올바르지 않습니다', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('plants') as any)
    .update(parsed.data)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ plant: data });
}

// DELETE /api/plants/[id] — 식물 삭제 (admin)
export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  if (!uuidSchema.safeParse(id).success) {
    return NextResponse.json({ error: '잘못된 식물 ID입니다' }, { status: 400 });
  }
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single<{ role: string }>();
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 });
  }

  const { error } = await supabase.from('plants').delete().eq('id', id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
