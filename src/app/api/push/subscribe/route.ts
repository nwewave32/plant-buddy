import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/shared/api/supabase/server';

const subscribeSchema = z.object({
  endpoint: z.string().url('올바른 endpoint URL이 필요합니다'),
  keys_p256dh: z.string().min(1, 'p256dh 키가 필요합니다'),
  keys_auth: z.string().min(1, 'auth 키가 필요합니다'),
});

const unsubscribeSchema = z.object({
  endpoint: z.string().url('올바른 endpoint URL이 필요합니다'),
});

// POST /api/push/subscribe — 푸시 구독 등록
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '잘못된 요청 형식입니다' }, { status: 400 });
  }

  const parsed = subscribeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: '입력값이 올바르지 않습니다', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { endpoint, keys_p256dh, keys_auth } = parsed.data;

  const { error: dbError } = await supabase
    .from('push_subscriptions')
    .upsert(
      { user_id: user.id, endpoint, keys_p256dh, keys_auth } as never,
      { onConflict: 'user_id,endpoint' },
    );

  if (dbError) {
    console.error('푸시 구독 저장 실패:', dbError);
    return NextResponse.json({ error: '구독 저장에 실패했습니다' }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 201 });
}

// DELETE /api/push/subscribe — 푸시 구독 해제
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '잘못된 요청 형식입니다' }, { status: 400 });
  }

  const parsed = unsubscribeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: '입력값이 올바르지 않습니다', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { error: dbError } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('user_id', user.id)
    .eq('endpoint', parsed.data.endpoint);

  if (dbError) {
    console.error('푸시 구독 해제 실패:', dbError);
    return NextResponse.json({ error: '구독 해제에 실패했습니다' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
