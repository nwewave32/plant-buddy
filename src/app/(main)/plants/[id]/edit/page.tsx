'use client';

import { use } from 'react';
import { PlantFormPage } from '@/views/plant-form';

export default function PlantEditRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <PlantFormPage plantId={id} />;
}
