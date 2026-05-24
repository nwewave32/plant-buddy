'use client';

import { useState, useEffect, useCallback } from 'react';
import { subscribePush, unsubscribePush } from '../api/pushApi';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

type PermissionState = NotificationPermission | null;

export function usePushSubscription() {
  const [isSupported, setIsSupported] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);
  const [permissionState, setPermissionState] = useState<PermissionState>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setIsSupported(false);
      setIsLoading(false);
      return;
    }

    setPermissionState(Notification.permission);

    navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((subscription) => {
        setIsSubscribed(subscription !== null);
      })
      .catch(() => {
        // SW not registered yet — not subscribed
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const toggle = useCallback(async () => {
    if (!isSupported) return;
    setIsToggling(true);
    setError(null);

    try {
      const registration = await navigator.serviceWorker.ready;

      if (isSubscribed) {
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await subscription.unsubscribe();
          await unsubscribePush(subscription.endpoint);
        }
        setIsSubscribed(false);
      } else {
        const permission = await Notification.requestPermission();
        setPermissionState(permission);

        if (permission === 'denied') {
          return;
        }

        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidPublicKey) {
          throw new Error('VAPID 공개 키가 설정되지 않았습니다');
        }

        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey).buffer as ArrayBuffer,
        });

        const p256dh = subscription.getKey('p256dh');
        const auth = subscription.getKey('auth');
        if (!p256dh || !auth) {
          throw new Error('구독 키를 가져올 수 없습니다');
        }

        const encoder = (buf: ArrayBuffer) =>
          btoa(String.fromCharCode(...new Uint8Array(buf)));

        await subscribePush({
          endpoint: subscription.endpoint,
          keys_p256dh: encoder(p256dh),
          keys_auth: encoder(auth),
        });

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
