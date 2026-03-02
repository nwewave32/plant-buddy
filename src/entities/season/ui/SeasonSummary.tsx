import type { Season, SeasonalPreset } from '@/shared/types';
import { SEASON_ICONS, SEASON_LABELS } from '@/shared/config/seasons';
import { cn } from '@/shared/lib/utils';

const SEASONS: Season[] = ['spring', 'summer', 'autumn', 'winter'];

interface SeasonSummaryProps {
  presets: SeasonalPreset[];
  currentSeason: Season;
  className?: string;
}

export function SeasonSummary({
  presets,
  currentSeason,
  className,
}: SeasonSummaryProps) {
  const presetMap = new Map(presets.map((p) => [p.season, p]));

  return (
    <ul className={cn('space-y-1 text-sm', className)}>
      {SEASONS.map((season) => {
        const preset = presetMap.get(season);
        const isCurrent = season === currentSeason;

        return (
          <li
            key={season}
            className={cn(
              'flex items-center gap-2 rounded-md px-2 py-1',
              isCurrent && 'bg-accent',
            )}
          >
            <span>{SEASON_ICONS[season]}</span>
            <span className="font-medium">{SEASON_LABELS[season]}</span>
            {preset ? (
              <span className="text-muted-foreground">
                {preset.watering_interval_days}일 / {preset.water_amount_ml ?? '–'}ml
              </span>
            ) : (
              <span className="text-muted-foreground">미설정</span>
            )}
            {isCurrent && (
              <span className="ml-auto text-xs text-muted-foreground">
                ← 현재
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
