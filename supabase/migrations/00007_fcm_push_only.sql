-- ============================================
-- 00007: web-push → FCM 단일 푸시 전환 (네이티브 전용)
-- ============================================
-- 기존 web-push(VAPID) 구독 스키마를 제거하고 FCM 토큰 기반으로 전환한다.
-- 푸시는 Capacitor 네이티브 앱(@capacitor/push-notifications)에서만 구독한다.

-- 1. 기존 web-push 구독 제거 (앱에서 재구독)
DELETE FROM push_subscriptions;

-- 2. 기존 UNIQUE(user_id, endpoint) 제약 + web-push 컬럼 제거
ALTER TABLE push_subscriptions DROP CONSTRAINT push_subscriptions_user_id_endpoint_key;
ALTER TABLE push_subscriptions
  DROP COLUMN endpoint,
  DROP COLUMN keys_p256dh,
  DROP COLUMN keys_auth;

-- 3. FCM 토큰 + 플랫폼 컬럼 추가
ALTER TABLE push_subscriptions
  ADD COLUMN fcm_token text NOT NULL,
  ADD COLUMN platform text NOT NULL DEFAULT 'android'
    CHECK (platform IN ('ios', 'android'));

-- 4. (user_id, fcm_token) 유니크 — upsert 충돌 키
ALTER TABLE push_subscriptions
  ADD CONSTRAINT push_subscriptions_user_token_uniq UNIQUE (user_id, fcm_token);

-- RLS 정책(00004)은 user_id = auth.uid() 기반이라 컬럼 변경과 무관하게 그대로 적용된다.
