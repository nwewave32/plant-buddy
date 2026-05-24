export async function subscribePush(subscription: {
  endpoint: string;
  keys_p256dh: string;
  keys_auth: string;
}) {
  const res = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subscription),
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error ?? '푸시 구독에 실패했습니다');
  }

  return res.json();
}

export async function unsubscribePush(endpoint: string) {
  const res = await fetch('/api/push/subscribe', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint }),
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error ?? '푸시 구독 해제에 실패했습니다');
  }

  return res.json();
}
