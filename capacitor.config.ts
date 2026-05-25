import type { CapacitorConfig } from '@capacitor/cli';

// 로컬 에뮬레이터 테스트: CAP_LOCAL=1 로 cap sync 시 로컬 dev 서버를 로드한다.
// Android 에뮬레이터는 호스트 PC를 10.0.2.2로 접근한다.
const LOCAL_DEV = process.env.CAP_LOCAL === '1';

const config: CapacitorConfig = {
  appId: 'app.plantbuddy',
  appName: 'Plant Buddy',
  // 서버(Remote URL) 모드: 네이티브 WebView가 배포된 웹앱을 로드한다.
  // webDir은 CLI 요구사항이라 placeholder로 둔다 (서버 모드에선 미사용).
  webDir: 'public',
  server: {
    url: LOCAL_DEV
      ? 'http://10.0.2.2:3000'
      : 'https://plant-buddy-nine.vercel.app',
    // 로컬 dev는 평문 HTTP이므로 cleartext 허용
    cleartext: LOCAL_DEV,
    allowNavigation: ['plant-buddy-nine.vercel.app', '10.0.2.2', '*.supabase.co'],
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    FirebaseMessaging: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
