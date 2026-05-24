import { NextRequest, NextResponse } from 'next/server';
import type { Message } from 'firebase-admin/messaging';
import { createAdminClient } from '@/shared/api/supabase/admin';
import { getFcmMessaging } from '@/shared/lib/firebaseAdmin';

// FCM 무효 토큰 에러 코드 (해당 구독은 정리한다)
const INVALID_TOKEN_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
  'messaging/invalid-argument',
]);

// POST /api/cron/send-reminders — 물주기 알림 발송 (FCM)
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();

  // KST 기준 오늘 날짜 및 오전/오후 판별
  const now = new Date();
  const kstHour = (now.getUTCHours() + 9) % 24;
  const isMorning = kstHour < 12;
  const kstDate = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const today = kstDate.toISOString().slice(0, 10);

  // 물주기 예정일이 오늘 이하인 식물 조회 (오늘 + 연체)
  type DuePlant = { id: string; name: string; assigned_user_id: string; next_watering_date: string };
  const { data, error: plantError } = await supabase
    .from('plants')
    .select('id, name, assigned_user_id, next_watering_date')
    .lte('next_watering_date', today)
    .not('assigned_user_id', 'is', null);

  const duePlants = data as DuePlant[] | null;

  if (plantError) {
    console.error('식물 조회 실패:', plantError);
    return NextResponse.json({ error: '식물 조회 실패' }, { status: 500 });
  }

  if (!duePlants || duePlants.length === 0) {
    return NextResponse.json({ sent: 0, failed: 0, cleaned: 0 });
  }

  // 오후: 오늘 이미 물 준 식물 제외
  let targetPlants: DuePlant[] = duePlants;
  if (!isMorning) {
    const { data: wateredToday } = await supabase
      .from('watering_logs')
      .select('plant_id')
      .eq('scheduled_date', today) as { data: { plant_id: string }[] | null };

    if (wateredToday && wateredToday.length > 0) {
      const wateredIds = new Set(wateredToday.map((l) => l.plant_id));
      targetPlants = duePlants.filter((p) => !wateredIds.has(p.id));
    }
  }

  if (targetPlants.length === 0) {
    return NextResponse.json({ sent: 0, failed: 0, cleaned: 0 });
  }

  // 식물을 담당자 기준 그룹화
  const userPlants = new Map<string, DuePlant[]>();
  for (const plant of targetPlants) {
    const userId = plant.assigned_user_id;
    const existing = userPlants.get(userId) ?? [];
    existing.push(plant);
    userPlants.set(userId, existing);
  }

  // 해당 유저들의 FCM 구독 조회
  const userIds = [...userPlants.keys()];
  const { data: subData, error: subError } = await supabase
    .from('push_subscriptions')
    .select('*')
    .in('user_id', userIds);

  if (subError) {
    console.error('푸시 구독 조회 실패:', subError);
    return NextResponse.json({ error: '푸시 구독 조회 실패' }, { status: 500 });
  }

  type Sub = { id: string; user_id: string; fcm_token: string; platform: string };
  const subscriptions = subData as Sub[] | null;

  if (!subscriptions || subscriptions.length === 0) {
    return NextResponse.json({ sent: 0, failed: 0, cleaned: 0 });
  }

  // FCM 메시지 목록 구성 (토큰 기준)
  const messages: Message[] = [];
  const messageTokens: string[] = []; // messages와 동일 인덱스의 토큰 (정리용)

  for (const sub of subscriptions) {
    const plants = userPlants.get(sub.user_id);
    if (!plants) continue;

    for (const plant of plants) {
      const isOverdue = plant.next_watering_date < today;

      let title: string;
      let body: string;

      if (isMorning) {
        title = `${plant.name} 물주기 예정일이에요`;
        body = '오늘 물을 줄 시간입니다 🌱';
      } else if (isOverdue) {
        title = `${plant.name} 물주기가 연체되었어요`;
        body = '빨리 물을 주세요 💧';
      } else {
        title = `${plant.name} 아직 물을 주지 않았어요`;
        body = '오늘 안으로 물을 주세요 💧';
      }

      messages.push({
        token: sub.fcm_token,
        notification: { title, body },
        data: { url: `/plants/${plant.id}`, plantId: plant.id },
      });
      messageTokens.push(sub.fcm_token);
    }
  }

  if (messages.length === 0) {
    return NextResponse.json({ sent: 0, failed: 0, cleaned: 0 });
  }

  const batch = await getFcmMessaging().sendEach(messages);

  let sent = 0;
  let failed = 0;
  const expiredTokens = new Set<string>();

  batch.responses.forEach((res, i) => {
    if (res.success) {
      sent++;
    } else {
      failed++;
      const code = res.error?.code;
      if (code && INVALID_TOKEN_CODES.has(code)) {
        expiredTokens.add(messageTokens[i]);
      }
    }
  });

  // 무효 토큰 정리
  let cleaned = 0;
  if (expiredTokens.size > 0) {
    const tokens = [...expiredTokens];
    const { count } = await supabase
      .from('push_subscriptions')
      .delete({ count: 'exact' })
      .in('fcm_token', tokens);
    cleaned = count ?? 0;
  }

  return NextResponse.json({ sent, failed, cleaned });
}
