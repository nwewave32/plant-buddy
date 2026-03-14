export async function completeWatering(plantId: string, memo?: string) {
  const res = await fetch(`/api/plants/${plantId}/water`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ memo }),
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error ?? '물주기 완료에 실패했습니다');
  }

  return res.json();
}

export async function fetchWateringLogs(plantId: string, limit?: number) {
  const params = limit ? `?limit=${limit}` : '';
  const res = await fetch(`/api/plants/${plantId}/watering-logs${params}`);

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error ?? '물주기 이력을 불러오지 못했습니다');
  }

  return res.json();
}
