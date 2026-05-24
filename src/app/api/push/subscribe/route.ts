import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/shared/api/supabase/server';

const subscribeSchema = z.object({
  fcm_token: z.string().min(1, 'FCM 토큰이 필요합니다'),
  platform: z.enum(['ios', 'android']),
});

const unsubscribeSchema = z.object({
  fcm_token: z.string().min(1, 'FCM 토큰이 필요합니다'),
});

// POST /api/push/subscribe — FCM 푸시 구독 등록
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

  const { fcm_token, platform } = parsed.data;

  const { error: dbError } = await supabase
    .from('push_subscriptions')
    .upsert(
      { user_id: user.id, fcm_token, platform } as never,
      { onConflict: 'user_id,fcm_token' },
    );

  if (dbError) {
    console.error('푸시 구독 저장 실패:', dbError);
    return NextResponse.json({ error: '구독 저장에 실패했습니다' }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 201 });
}

// DELETE /api/push/subscribe — FCM 푸시 구독 해제
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
    .eq('fcm_token', parsed.data.fcm_token);

  if (dbError) {
    console.error('푸시 구독 해제 실패:', dbError);
    return NextResponse.json({ error: '구독 해제에 실패했습니다' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
