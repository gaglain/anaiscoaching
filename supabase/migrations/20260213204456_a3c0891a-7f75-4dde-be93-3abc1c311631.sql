
-- Fix overly permissive insert policy on calendar_sync_log
DROP POLICY "System can insert sync logs" ON public.calendar_sync_log;

CREATE POLICY "Admin can insert sync logs"
  ON public.calendar_sync_log FOR INSERT
  WITH CHECK (is_admin());
