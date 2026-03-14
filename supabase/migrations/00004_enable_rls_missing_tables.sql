-- ============================================
-- Enable RLS on status_logs, delegations, push_subscriptions
-- ============================================

-- status_logs
ALTER TABLE status_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "status_logs_select_all" ON status_logs
  FOR SELECT USING (true);
CREATE POLICY "status_logs_insert_own" ON status_logs
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- delegations
ALTER TABLE delegations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "delegations_select_involved" ON delegations
  FOR SELECT USING (from_user_id = auth.uid() OR to_user_id = auth.uid());
CREATE POLICY "delegations_insert_own" ON delegations
  FOR INSERT WITH CHECK (from_user_id = auth.uid());
CREATE POLICY "delegations_update_recipient" ON delegations
  FOR UPDATE USING (to_user_id = auth.uid());
CREATE POLICY "delegations_delete_own" ON delegations
  FOR DELETE USING (from_user_id = auth.uid());

-- push_subscriptions
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "push_subscriptions_select_own" ON push_subscriptions
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "push_subscriptions_insert_own" ON push_subscriptions
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "push_subscriptions_delete_own" ON push_subscriptions
  FOR DELETE USING (user_id = auth.uid());

-- watering_logs (RLS already enabled, add missing UPDATE/DELETE policies)
CREATE POLICY "logs_update_own" ON watering_logs
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "logs_delete_own" ON watering_logs
  FOR DELETE USING (user_id = auth.uid());
