-- ============================================
-- complete_watering RPC: 물주기 완료를 단일 트랜잭션으로 처리
--
-- 배경:
--   watering_logs INSERT와 plants.next_watering_date UPDATE가
--   별도 쿼리로 실행되면, 중간 실패 시 데이터 불일치가 발생할 수 있다.
--   (예: 로그는 기록됐는데 next_watering_date는 갱신 안 됨)
--   이 함수는 두 작업을 하나의 트랜잭션으로 묶어 원자성을 보장한다.
--
-- 호출: supabase.rpc('complete_watering', { ... })
-- 반환: { log: watering_log, plant: updated_plant, next_watering_date: string }
-- ============================================

CREATE OR REPLACE FUNCTION complete_watering(
  p_plant_id UUID,
  p_user_id UUID,
  p_scheduled_date DATE,
  p_was_late BOOLEAN,
  p_season TEXT,
  p_memo TEXT,
  p_next_watering_date DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER  -- RLS 정책을 그대로 적용 (SECURITY DEFINER가 아님)
AS $$
DECLARE
  v_log watering_logs%ROWTYPE;
  v_plant plants%ROWTYPE;
BEGIN
  -- 1. watering_logs INSERT
  INSERT INTO watering_logs (plant_id, user_id, scheduled_date, was_late, season, memo)
  VALUES (p_plant_id, p_user_id, p_scheduled_date, p_was_late, p_season, p_memo)
  RETURNING * INTO v_log;

  -- 2. plants.next_watering_date UPDATE
  UPDATE plants
  SET next_watering_date = p_next_watering_date
  WHERE id = p_plant_id
  RETURNING * INTO v_plant;

  -- 두 작업 모두 성공해야 커밋됨 (하나라도 실패 시 자동 롤백)
  RETURN jsonb_build_object(
    'log', to_jsonb(v_log),
    'plant', to_jsonb(v_plant),
    'next_watering_date', p_next_watering_date::TEXT
  );
END;
$$;
