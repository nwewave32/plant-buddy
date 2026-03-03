'use client';

import { usePlant } from '@/entities/plant';
import { PlantForm } from '@/features/manage-plant';

function PlantFormPageCreate() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">식물 등록</h1>
      <PlantForm mode="create" />
    </div>
  );
}

function PlantFormPageEdit({ plantId }: { plantId: string }) {
  const { plant, isLoading, error } = usePlant(plantId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">로딩 중...</p>
      </div>
    );
  }

  if (error || !plant) {
    return (
      <div className="flex flex-col items-center gap-4 p-8">
        <p className="text-destructive">
          {error?.message ?? '식물을 찾을 수 없습니다'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">식물 수정</h1>
      <PlantForm mode="edit" plantId={plantId} initialData={plant} />
    </div>
  );
}

interface PlantFormPageProps {
  plantId?: string;
}

export function PlantFormPage({ plantId }: PlantFormPageProps) {
  if (plantId) {
    return <PlantFormPageEdit plantId={plantId} />;
  }
  return <PlantFormPageCreate />;
}
