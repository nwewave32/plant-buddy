import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { createAdminClient } from '@/shared/api/supabase/admin';

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT;

if (vapidPublicKey && vapidPrivateKey && vapidSubject) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

// POST /api/cron/send-reminders — 물주기 알림 발송
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
    return NextResponse.json({ error: 'VAPID 환경변수가 설정되지 않았습니다' }, { status: 500 });
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
  const userPlants = new Map<string, typeof targetPlants>();
  for (const plant of targetPlants) {
    const userId = plant.assigned_user_id!;
    const existing = userPlants.get(userId) ?? [];
    existing.push(plant);
    userPlants.set(userId, existing);
  }

  // 해당 유저들의 푸시 구독 조회
  const userIds = [...userPlants.keys()];
  const { data: subData, error: subError } = await supabase
    .from('push_subscriptions')
    .select('*')
    .in('user_id', userIds);

  if (subError) {
    console.error('푸시 구독 조회 실패:', subError);
    return NextResponse.json({ error: '푸시 구독 조회 실패' }, { status: 500 });
  }

  type Sub = { id: string; user_id: string; endpoint: string; keys_p256dh: string; keys_auth: string };
  const subscriptions = subData as Sub[] | null;

  if (!subscriptions || subscriptions.length === 0) {
    return NextResponse.json({ sent: 0, failed: 0, cleaned: 0 });
  }

  // 알림 발송
  const sendList: { sub: typeof subscriptions[0]; payload: string }[] = [];

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

      sendList.push({
        sub,
        payload: JSON.stringify({
          title,
          body,
          data: { url: `/plants/${plant.id}`, plantId: plant.id },
        }),
      });
    }
  }

  const results = await Promise.allSettled(
    sendList.map(({ sub, payload }) =>
      webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.keys_p256dh, auth: sub.keys_auth },
        },
        payload,
      ),
    ),
  );

  let sent = 0;
  let failed = 0;
  const expiredEndpoints: string[] = [];

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === 'fulfilled') {
      sent++;
    } else {
      failed++;
      const statusCode = (result.reason as { statusCode?: number })?.statusCode;
      if (statusCode === 410 || statusCode === 404) {
        expiredEndpoints.push(sendList[i].sub.endpoint);
      }
    }
  }

  // 만료된 구독 정리
  let cleaned = 0;
  if (expiredEndpoints.length > 0) {
    const uniqueEndpoints = [...new Set(expiredEndpoints)];
    const { count } = await supabase
      .from('push_subscriptions')
      .delete()
      .in('endpoint', uniqueEndpoints);
    cleaned = count ?? 0;
  }

  return NextResponse.json({ sent, failed, cleaned });
}
