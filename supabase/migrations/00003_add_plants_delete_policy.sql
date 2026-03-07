-- plants 테이블에 DELETE RLS 정책 추가 (admin만 삭제 가능)
CREATE POLICY "plants_delete_admin" ON plants FOR DELETE
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
