import type { PushPlatform } from '@/shared/types';

export async function subscribePush(payload: {
  fcm_token: string;
  platform: PushPlatform;
}) {
  const res = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error ?? '푸시 구독에 실패했습니다');
  }

  return res.json();
}

export async function unsubscribePush(fcm_token: string) {
  const res = await fetch('/api/push/subscribe', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fcm_token }),
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error ?? '푸시 구독 해제에 실패했습니다');
  }

  return res.json();
}
