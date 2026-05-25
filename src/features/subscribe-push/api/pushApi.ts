import type { PushPlatform } from '@/shared/types';

// 현재 유저에 등록된 FCM 토큰 목록 조회 (마운트 시 구독 상태 복원용)
export async function getSubscribedTokens(): Promise<string[]> {
  const res = await fetch('/api/push/subscribe', { method: 'GET' });
  if (!res.ok) {
    return [];
  }
  const data = (await res.json()) as { tokens?: string[] };
  return data.tokens ?? [];
}

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
