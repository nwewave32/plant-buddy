'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Capacitor, type PluginListenerHandle, type PermissionState } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import type { PushPlatform } from '@/shared/types';
import { subscribePush, unsubscribePush } from '../api/pushApi';

type PermState = PermissionState | null;

export function usePushSubscription() {
  // 네이티브 앱(Capacitor)에서만 푸시를 지원한다. 브라우저는 미지원 → 앱 설치 안내.
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);
  const [permissionState, setPermissionState] = useState<PermState>(null);
  const [error, setError] = useState<Error | null>(null);

  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      setIsSupported(false);
      setIsLoading(false);
      return;
    }

    setIsSupported(true);
    const platform = Capacitor.getPlatform() as PushPlatform;
    const handles: PluginListenerHandle[] = [];

    (async () => {
      // FCM 토큰 수신 → 서버에 등록
      handles.push(
        await PushNotifications.addListener('registration', async (token) => {
          tokenRef.current = token.value;
          try {
            await subscribePush({ fcm_token: token.value, platform });
            setIsSubscribed(true);
          } catch (err) {
            setError(err instanceof Error ? err : new Error('구독 등록 실패'));
          }
        }),
      );

      handles.push(
        await PushNotifications.addListener('registrationError', (err) => {
          setError(new Error(`푸시 등록 오류: ${err.error}`));
        }),
      );

      // 알림 탭 → 해당 식물 페이지로 이동
      handles.push(
        await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
          const url = action.notification.data?.url;
          if (typeof url === 'string') {
            window.location.assign(url);
          }
        }),
      );

      // 현재 권한 상태 반영
      const perm = await PushNotifications.checkPermissions();
      setPermissionState(perm.receive);
      setIsLoading(false);
    })();

    return () => {
      handles.forEach((h) => h.remove());
    };
  }, []);

  const toggle = useCallback(async () => {
    if (!isSupported) return;
    setIsToggling(true);
    setError(null);

    try {
      if (isSubscribed) {
        // 해제: 서버 row 삭제 (네이티브 토큰 자체 폐기 API는 없음)
        if (tokenRef.current) {
          await unsubscribePush(tokenRef.current);
        }
        setIsSubscribed(false);
      } else {
        let perm = await PushNotifications.checkPermissions();
        if (perm.receive === 'prompt') {
          perm = await PushNotifications.requestPermissions();
        }
        setPermissionState(perm.receive);

        if (perm.receive !== 'granted') {
          return;
        }

        // register() → 'registration' 리스너가 토큰을 받아 subscribePush 수행
        await PushNotifications.register();
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('알 수 없는 오류가 발생했습니다'));
    } finally {
      setIsToggling(false);
    }
  }, [isSupported, isSubscribed]);

  return { isSupported, isSubscribed, isLoading, isToggling, permissionState, error, toggle };
}
