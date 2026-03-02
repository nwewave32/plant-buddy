import type { ReactNode } from 'react';
import type { Plant } from '@/shared/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui/card';
import { cn } from '@/shared/lib/utils';
import { StatusBadge } from './StatusBadge';

const METHOD_LABELS: Record<string, string> = {
  top: '위에서 뿌리기',
  bottom: '저면관수',
  mist: '분무',
  other: '기타',
};

interface PlantCardProps {
  plant: Plant;
  children?: ReactNode;
  className?: string;
}

export function PlantCard({ plant, children, className }: PlantCardProps) {
  const description = [plant.species, plant.location].filter(Boolean).join(' · ');

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{plant.name}</CardTitle>
          <StatusBadge status={plant.status} />
        </div>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <dt className="text-muted-foreground">급수 주기</dt>
          <dd>{plant.watering_interval_days}일</dd>
          {plant.water_amount_ml != null && (
            <>
              <dt className="text-muted-foreground">급수량</dt>
              <dd>{plant.water_amount_ml}ml</dd>
            </>
          )}
          {plant.watering_method && (
            <>
              <dt className="text-muted-foreground">급수 방법</dt>
              <dd>{METHOD_LABELS[plant.watering_method] ?? plant.watering_method}</dd>
            </>
          )}
        </dl>
        {children}
      </CardContent>
    </Card>
  );
}
