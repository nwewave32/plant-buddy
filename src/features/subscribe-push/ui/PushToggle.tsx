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

  // 브라우저: 푸시 미지원 → 앱 설치 안내
  if (!isSupported) {
    return (
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium">알림 받기</span>
        <p className="text-sm text-muted-foreground">
          푸시 알림은 모바일 앱에서 받을 수 있어요. 앱을 설치한 뒤 알림을 켜주세요.
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
          알림이 차단되었습니다. 기기 설정 → Plant Buddy → 알림에서 허용해주세요.
        </p>
      )}

      {error && !isDenied && (
        <p className="text-sm text-destructive">{error.message}</p>
      )}
    </div>
  );
}
