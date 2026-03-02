import type { WateringLog } from '@/shared/types';
import { SEASON_ICONS } from '@/shared/config/seasons';
import { cn } from '@/shared/lib/utils';

export interface WateringLogWithUser extends WateringLog {
  userName: string;
  isDelegation: boolean;
}

interface LogEntryProps {
  log: WateringLogWithUser;
  className?: string;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function getLateText(log: WateringLogWithUser): string {
  if (!log.was_late) return '정상';
  const watered = new Date(log.watered_at);
  const scheduled = new Date(log.scheduled_date);
  const diffDays = Math.round(
    (watered.getTime() - scheduled.getTime()) / (1000 * 60 * 60 * 24),
  );
  return `${diffDays}일 지남`;
}

export function LogEntry({ log, className }: LogEntryProps) {
  const seasonIcon = log.season ? SEASON_ICONS[log.season] : '';

  return (
    <div className={cn('flex items-center gap-2 text-sm', className)}>
      <span className="text-muted-foreground">{formatDate(log.watered_at)}</span>
      <span>
        {log.userName}
        {log.isDelegation && (
          <span className="text-muted-foreground">(대리)</span>
        )}
      </span>
      <span className={cn(log.was_late ? 'text-amber-600' : 'text-green-600')}>
        {getLateText(log)}
      </span>
      {seasonIcon && <span>{seasonIcon}</span>}
    </div>
  );
}
