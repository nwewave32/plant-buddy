'use client';

import { Switch } from '@/shared/ui/switch';
import { usePushSubscription } from '../model/usePushSubscription';

export function PushToggle() {
  const {
    isSupported,
    isSubscribed,
    isLoading,
    isToggling,
    permissionState,
    error,
    toggle,
  } = usePushSubscription();

  if (!isSupported) {
    return (
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium">알림 받기</span>
        <p className="text-sm text-muted-foreground">
          이 브라우저에서 알림을 지원하지 않습니다.
        </p>
      </div>
    );
  }

  const isDenied = permissionState === 'denied';

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">알림 받기</span>
        <Switch
          checked={isSubscribed}
          onCheckedChange={toggle}
          disabled={isLoading || isToggling || isDenied}
          aria-label="푸시 알림 토글"
        />
      </div>

      {isDenied && (
        <p className="text-sm text-destructive">
          알림이 차단되었습니다. 브라우저 주소창 왼쪽의 자물쇠 아이콘을 클릭하고,
          알림을 &quot;허용&quot;으로 변경해주세요.
        </p>
      )}

      {error && !isDenied && (
        <p className="text-sm text-destructive">{error.message}</p>
      )}
    </div>
  );
}
