'use client';

import type { Delegation } from '@/shared/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/lib/utils';

export interface DelegationWithDetails extends Delegation {
  fromUserName: string;
  toUserName: string;
  plantName: string;
}

const STATUS_MAP: Record<string, { label: string; variant: 'outline' | 'default' | 'destructive' }> = {
  pending: { label: '대기 중', variant: 'outline' },
  accepted: { label: '수락됨', variant: 'default' },
  declined: { label: '거절됨', variant: 'destructive' },
};

function getStatus(accepted: boolean | null) {
  if (accepted === null) return STATUS_MAP.pending;
  return accepted ? STATUS_MAP.accepted : STATUS_MAP.declined;
}

interface DelegationCardProps {
  delegation: DelegationWithDetails;
  isReceiver: boolean;
  onAccept?: () => void;
  onDecline?: () => void;
  className?: string;
}

export function DelegationCard({
  delegation,
  isReceiver,
  onAccept,
  onDecline,
  className,
}: DelegationCardProps) {
  const status = getStatus(delegation.accepted);
  const showActions = isReceiver && delegation.accepted === null;

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{delegation.plantName}</CardTitle>
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <dt className="text-muted-foreground">요청자</dt>
          <dd>{delegation.fromUserName}</dd>
          <dt className="text-muted-foreground">대리인</dt>
          <dd>{delegation.toUserName}</dd>
          <dt className="text-muted-foreground">기간</dt>
          <dd>
            {delegation.start_date} ~ {delegation.end_date}
          </dd>
        </dl>
        {showActions && (
          <div className="mt-4 flex gap-2">
            <Button size="sm" onClick={onAccept}>
              수락
            </Button>
            <Button size="sm" variant="outline" onClick={onDecline}>
              거절
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
