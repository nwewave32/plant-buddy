import { getApps, initializeApp, cert, type App } from 'firebase-admin/app';
import { getMessaging, type Messaging } from 'firebase-admin/messaging';

let messaging: Messaging | null = null;

/**
 * FCM 발송용 firebase-admin Messaging 싱글톤.
 * 서버리스 환경에서 핫리로드/람다 재사용 시 중복 초기화를 방지한다.
 *
 * FIREBASE_SERVICE_ACCOUNT 는 서비스 계정 JSON을 base64로 인코딩한 값(권장)
 * 또는 raw JSON 문자열을 받는다.
 */
export function getFcmMessaging(): Messaging {
  if (messaging) return messaging;

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT 환경변수가 설정되지 않았습니다');
  }

  const json = raw.trim().startsWith('{')
    ? raw
    : Buffer.from(raw, 'base64').toString('utf8');
  const serviceAccount = JSON.parse(json);

  const app: App = getApps()[0] ?? initializeApp({ credential: cert(serviceAccount) });
  messaging = getMessaging(app);
  return messaging;
}
