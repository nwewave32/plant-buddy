// Plant Buddy Service Worker
// 푸시 알림은 네이티브 앱(Capacitor + FCM)에서 처리하므로 여기서는 다루지 않는다.
// 이 SW는 PWA 설치 가능성과 향후 오프라인 캐싱(폴백 페이지)을 위해 등록 상태로 둔다.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
