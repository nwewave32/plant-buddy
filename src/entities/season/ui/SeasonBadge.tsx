import type { Season } from '@/shared/types';
import { SEASON_ICONS, SEASON_LABELS } from '@/shared/config/seasons';
import { Badge } from '@/shared/ui/badge';
import { cn } from '@/shared/lib/utils';

interface SeasonBadgeProps {
  season: Season;
  className?: string;
}

export function SeasonBadge({ season, className }: SeasonBadgeProps) {
  return (
    <Badge variant="outline" className={cn(className)}>
      {SEASON_ICONS[season]} {SEASON_LABELS[season]}
    </Badge>
  );
}
