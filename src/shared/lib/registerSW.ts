export function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  navigator.serviceWorker.register('/sw.js').catch((err) => {
    console.error('SW 등록 실패:', err);
  });
}
