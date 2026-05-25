'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import type { PushPlatform } from '@/shared/types';
import { subscribePush, unsubscribePush } from '../api/pushApi';

type PermState = 'prompt' | 'prompt-with-rationale' | 'granted' | 'denied' | null;

// firebase SDK는 네이티브에서만 필요하므로 동적 import로 웹 번들에서 분리한다.
async function loadFirebaseMessaging() {
  const { FirebaseMessaging } = await import('@capacitor-firebase/messaging');
  return FirebaseMessaging;
}

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
      const FirebaseMessaging = await loadFirebaseMessaging();

      // FCM 토큰 갱신 수신 → 서버에 등록
      handles.push(
        await FirebaseMessaging.addListener('tokenReceived', async (event) => {
          tokenRef.current = event.token;
          try {
            await subscribePush({ fcm_token: event.token, platform });
            setIsSubscribed(true);
          } catch (err) {
            setError(err instanceof Error ? err : new Error('구독 등록 실패'));
          }
        }),
      );

      // 알림 탭 → 해당 식물 페이지로 이동
      handles.push(
        await FirebaseMessaging.addListener('notificationActionPerformed', (event) => {
          const data = event.notification.data as Record<string, unknown> | undefined;
          const url = data?.url;
          // 앱 내부 상대경로만 허용 (외부/javascript: URL 주입 방지)
          if (typeof url === 'string' && url.startsWith('/')) {
            window.location.assign(url);
          }
        }),
      );

      // 현재 권한 상태 반영
      const perm = await FirebaseMessaging.checkPermissions();
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
      const FirebaseMessaging = await loadFirebaseMessaging();

      if (isSubscribed) {
        // 해제: 서버 row 삭제 + 토큰 폐기
        if (tokenRef.current) {
          await unsubscribePush(tokenRef.current);
        }
        try {
          await FirebaseMessaging.deleteToken();
        } catch {
          // 토큰 삭제 실패는 무시 (서버 row는 이미 제거됨)
        }
        tokenRef.current = null;
        setIsSubscribed(false);
      } else {
        let perm = await FirebaseMessaging.checkPermissions();
        if (perm.receive === 'prompt' || perm.receive === 'prompt-with-rationale') {
          perm = await FirebaseMessaging.requestPermissions();
        }
        setPermissionState(perm.receive);

        if (perm.receive !== 'granted') {
          return;
        }

        // getToken() → FCM 토큰 즉시 획득 → 서버 등록
        const { token } = await FirebaseMessaging.getToken();
        tokenRef.current = token;
        await subscribePush({ fcm_token: token, platform: Capacitor.getPlatform() as PushPlatform });
        setIsSubscribed(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('알 수 없는 오류가 발생했습니다'));
    } finally {
      setIsToggling(false);
    }
  }, [isSupported, isSubscribed]);

  return { isSupported, isSubscribed, isLoading, isToggling, permissionState, error, toggle };
}
