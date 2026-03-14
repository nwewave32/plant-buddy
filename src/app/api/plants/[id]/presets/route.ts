import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/shared/api/supabase/server';
import { upsertPresetsSchema, uuidSchema } from '@/shared/lib/validation';
import { getCurrentSeason } from '@/shared/lib/season';

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/plants/[id]/presets — 4계절 프리셋 조회
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

  const { data, error } = await supabase
    .from('seasonal_presets')
    .select('*')
    .eq('plant_id', id)
    .order('season');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ presets: data });
}

// PUT /api/plants/[id]/presets — 프리셋 일괄 upsert (admin)
export async function PUT(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  if (!uuidSchema.safeParse(id).success) {
    return NextResponse.json({ error: '잘못된 식물 ID입니다' }, { status: 400 });
  }
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
  }

  // admin 체크
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single<{ role: string }>();
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '잘못된 요청 형식입니다' }, { status: 400 });
  }

  const parsed = upsertPresetsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: '입력값이 올바르지 않습니다', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const currentSeason = getCurrentSeason();
  const results: unknown[] = [];

  for (const preset of parsed.data.presets) {
    if (preset.enabled) {
      // 기존 프리셋 삭제 후 삽입 (upsert 대신 delete+insert 사용)
      await supabase
        .from('seasonal_presets')
        .delete()
        .eq('plant_id', id)
        .eq('season', preset.season);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('seasonal_presets') as any)
        .insert({
          plant_id: id,
          season: preset.season,
          watering_interval_days: preset.watering_interval_days,
          water_amount_ml: preset.water_amount_ml ?? null,
          watering_method: preset.watering_method ?? null,
          care_notes: preset.care_notes ?? null,
        })
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      results.push(data);

      // 현재 계절 프리셋이 변경되었으면 plants 테이블 즉시 반영
      if (preset.season === currentSeason) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('plants') as any)
          .update({
            watering_interval_days: preset.watering_interval_days,
            water_amount_ml: preset.water_amount_ml ?? null,
            watering_method: preset.watering_method ?? null,
            care_notes: preset.care_notes ?? null,
          })
          .eq('id', id);
      }
    } else {
      // enabled=false → 해당 계절 프리셋 삭제
      await supabase
        .from('seasonal_presets')
        .delete()
        .eq('plant_id', id)
        .eq('season', preset.season);
    }
  }

  return NextResponse.json({ presets: results });
}
