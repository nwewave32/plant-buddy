import type { PlantStatus } from '@/shared/types';
import { Badge } from '@/shared/ui/badge';
import { cn } from '@/shared/lib/utils';

const STATUS_CONFIG: Record<
  PlantStatus,
  { label: string; className: string; variant?: 'destructive' }
> = {
  healthy: {
    label: '🟢 건강',
    className: 'bg-green-100 text-green-800 border-green-200',
  },
  caution: {
    label: '🟡 주의',
    className: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  danger: {
    label: '🔴 위험',
    className: '',
    variant: 'destructive',
  },
};

interface StatusBadgeProps {
  status: PlantStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <Badge
      variant={config.variant ?? 'outline'}
      className={cn(config.className, className)}
    >
      {config.label}
    </Badge>
  );
}
