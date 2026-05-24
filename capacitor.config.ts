import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.plantbuddy',
  appName: 'Plant Buddy',
  // 서버(Remote URL) 모드: 네이티브 WebView가 배포된 웹앱을 로드한다.
  // webDir은 CLI 요구사항이라 placeholder로 둔다 (서버 모드에선 미사용).
  webDir: 'public',
  server: {
    url: 'https://plant-buddy.vercel.app',
    cleartext: false,
    allowNavigation: ['*.vercel.app', '*.supabase.co'],
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
