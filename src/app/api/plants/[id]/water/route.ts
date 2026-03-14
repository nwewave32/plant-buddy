import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/shared/api/supabase/server';
import { waterPlantSchema } from '@/shared/lib/validation';
import type { CompleteWateringArgs, CompleteWateringResult, Plant } from '@/shared/types';

type RouteContext = { params: Promise<{ id: string }> };

const uuidSchema = z.string().uuid();

// POST /api/plants/[id]/water — 물주기 완료
//
// 권한 구조 (2중 보안):
//   1) 앱 레벨: 담당자 또는 활성 위임 대리자인지 확인 → 아니면 403 응답
//   2) DB 레벨: RLS 정책(plants_update_authorized, logs_insert_authorized)이
//      위임 조건을 포함하여 DB 자체에서도 권한 강제
//   → 마이그레이션: 00005_add_delegation_to_rls.sql 참고
export async function POST(request: NextRequest, { params }: RouteContext) {
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

  // 식물 조회
  const { data: plant, error: plantError } = await supabase
    .from('plants')
    .select('*')
    .eq('id', id)
    .single<Plant>();

  if (plantError || !plant) {
    return NextResponse.json({ error: '식물을 찾을 수 없습니다' }, { status: 404 });
  }

  // 앱 레벨 권한 확인: 담당자 또는 활성 위임 대리자
  // (RLS가 DB에서도 동일 조건을 강제하지만, 여기서 먼저 체크하여 명확한 403 에러를 반환)
  const isAssigned = plant.assigned_user_id === user.id;
  const today = new Date().toISOString().split('T')[0];

  let isDelegated = false;
  if (!isAssigned) {
    const { data: delegation } = await supabase
      .from('delegations')
      .select('id')
      .eq('plant_id', id)
      .eq('to_user_id', user.id)
      .eq('accepted', true)
      .lte('start_date', today)
      .gte('end_date', today)
      .limit(1)
      .single();

    isDelegated = !!delegation;
  }

  if (!isAssigned && !isDelegated) {
    return NextResponse.json({ error: '물주기 권한이 없습니다' }, { status: 403 });
  }

  // [HIGH] request.json() 파싱 실패 처리
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '잘못된 요청 형식입니다' }, { status: 400 });
  }

  const parsed = waterPlantSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: '입력값이 올바르지 않습니다', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // was_late 계산 — Date 객체로 비교하여 형식 의존성 제거
  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);
  const scheduledDate = new Date(plant.next_watering_date + 'T00:00:00');
  const wasLate = todayDate > scheduledDate;

  // next_watering_date 재계산
  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + plant.watering_interval_days);
  const nextWateringDate = nextDate.toISOString().split('T')[0];

  // watering_logs INSERT + plants UPDATE를 단일 트랜잭션으로 실행
  // → 마이그레이션: 00006_complete_watering_rpc.sql 참고
  //
  // NOTE: rpc args는 CompleteWateringArgs로 타입 검증됨.
  // .rpc()의 as any는 Supabase 수동 타입 정의가 rpc 제네릭과 호환되지 않아 필요.
  // supabase gen types로 자동 생성하면 제거 가능.
  const rpcArgs: CompleteWateringArgs = {
    p_plant_id: id,
    p_user_id: user.id,
    p_scheduled_date: plant.next_watering_date,
    p_was_late: wasLate,
    p_season: plant.current_season,
    p_memo: parsed.data.memo ?? null,
    p_next_watering_date: nextWateringDate,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error: rpcError } = await (supabase as any)
    .rpc('complete_watering', rpcArgs);

  if (rpcError) {
    console.error('complete_watering rpc failed:', rpcError);
    return NextResponse.json({ error: '물주기 기록에 실패했습니다' }, { status: 500 });
  }

  const result = data as CompleteWateringResult;

  return NextResponse.json({
    plant: result.plant,
    log: result.log,
    next_watering_date: result.next_watering_date,
  });
}
