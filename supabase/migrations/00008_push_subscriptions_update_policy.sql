-- ============================================
-- push_subscriptions UPDATE 정책 추가
-- ============================================
-- 구독 등록은 .upsert(onConflict: user_id,fcm_token) = INSERT ... ON CONFLICT DO UPDATE.
-- upsert의 DO UPDATE 경로는 UPDATE 정책의 USING 식을 평가하는데, 기존엔 UPDATE
-- 정책이 없어 RLS(42501, "USING expression") 위반으로 저장이 실패했다.
CREATE POLICY "push_subscriptions_update_own" ON push_subscriptions
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
