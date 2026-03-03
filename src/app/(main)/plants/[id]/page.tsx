'use client';

import { use } from 'react';
import { PlantDetailPage } from '@/views/plant-detail';

export default function PlantDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <PlantDetailPage plantId={id} />;
}
