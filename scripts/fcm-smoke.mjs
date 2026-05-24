// FCM 자격증명 스모크 테스트
// 실행: node --env-file=.env.local scripts/fcm-smoke.mjs
//
// 더미 토큰으로 FCM 발송을 시도해 서비스 계정 자격증명이 유효한지 확인한다.
// - messaging/invalid-argument | invalid-registration-token | registration-token-not-registered
//   → 자격증명 정상 (토큰만 무효, 예상된 결과) ✅
// - app/invalid-credential 등 → 서비스 계정 설정 문제 ❌

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!raw) {
  console.error('❌ FIREBASE_SERVICE_ACCOUNT 환경변수가 없습니다. .env.local에 추가하세요.');
  process.exit(1);
}

let serviceAccount;
try {
  const json = raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
  serviceAccount = JSON.parse(json);
} catch (e) {
  console.error('❌ FIREBASE_SERVICE_ACCOUNT 파싱 실패 (base64 또는 JSON 형식 확인):', e.message);
  process.exit(1);
}

const app = getApps()[0] ?? initializeApp({ credential: cert(serviceAccount) });
console.log('✅ firebase-admin 초기화 성공 / project_id:', serviceAccount.project_id);

try {
  await getMessaging(app).send({
    token: 'dummy-invalid-token',
    notification: { title: 'smoke', body: 'test' },
  });
  console.log('⚠️  전송이 성공했습니다 (예상 밖 — 더미 토큰인데 성공?)');
} catch (e) {
  const okCodes = [
    'messaging/invalid-argument',
    'messaging/invalid-registration-token',
    'messaging/registration-token-not-registered',
  ];
  if (okCodes.includes(e.code)) {
    console.log(`✅ 자격증명 정상 — 토큰만 무효 (${e.code}). FCM 발송 준비 완료.`);
  } else {
    console.log(`❌ 자격증명/설정 문제일 수 있음: ${e.code ?? '(코드 없음)'}`);
    console.log('   메시지:', e.message);
  }
}
