self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title || '🌱 Plant Buddy', {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/badge-72.png',
      data: { url: data.data?.url || '/', plantId: data.data?.plantId },
      actions: [
        { action: 'water', title: '✅ 물주기 완료' },
        { action: 'snooze', title: '⏰ 나중에' },
      ],
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'water') {
    event.waitUntil(
      fetch(`/api/plants/${event.notification.data.plantId}/water`, {
        method: 'POST',
      })
    );
  }
  event.waitUntil(self.clients.openWindow(event.notification.data.url));
});
