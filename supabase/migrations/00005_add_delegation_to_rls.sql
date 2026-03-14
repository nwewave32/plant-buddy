-- ============================================
-- plants, watering_logs RLS 정책에 위임 대리자(delegation) 조건 추가
--
-- 배경:
--   물주기 완료(POST /api/plants/[id]/water)에서 위임 대리자가
--   plants.next_watering_date를 UPDATE하고 watering_logs를 INSERT해야 하는데,
--   기존 RLS 정책은 assigned_user_id 또는 admin만 허용했다.
--   service_role key로 우회하는 대신, RLS 자체에 위임 조건을 추가하여
--   DB 레벨 보안을 유지한다.
--
-- 위임 조건:
--   delegations 테이블에서 해당 식물에 대해
--   to_user_id = 현재 사용자, accepted = true, 오늘이 start_date~end_date 범위 내
-- ============================================

-- 1. plants UPDATE 정책: 기존 정책 삭제 후 위임 조건 포함하여 재생성
DROP POLICY IF EXISTS "plants_update_admin_or_assigned" ON plants;

CREATE POLICY "plants_update_authorized" ON plants FOR UPDATE
  USING (
    assigned_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    OR EXISTS (
      SELECT 1 FROM delegations
      WHERE delegations.plant_id = plants.id
        AND delegations.to_user_id = auth.uid()
        AND delegations.accepted = true
        AND delegations.start_date <= CURRENT_DATE
        AND delegations.end_date >= CURRENT_DATE
    )
  );

-- 2. watering_logs INSERT 정책: 기존 정책 삭제 후 위임 조건 포함하여 재생성
--    기존 logs_insert_own은 user_id = auth.uid()만 확인했는데,
--    위임 대리자가 해당 식물에 대해 로그를 남길 수 있도록 plant_id 기반 조건 추가
DROP POLICY IF EXISTS "logs_insert_own" ON watering_logs;

CREATE POLICY "logs_insert_authorized" ON watering_logs FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM plants
      WHERE plants.id = watering_logs.plant_id
        AND (
          plants.assigned_user_id = auth.uid()
          OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
          OR EXISTS (
            SELECT 1 FROM delegations
            WHERE delegations.plant_id = plants.id
              AND delegations.to_user_id = auth.uid()
              AND delegations.accepted = true
              AND delegations.start_date <= CURRENT_DATE
              AND delegations.end_date >= CURRENT_DATE
          )
        )
    )
  );
