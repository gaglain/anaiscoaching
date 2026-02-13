
-- Table to store OAuth provider credentials (entered by admin)
CREATE TABLE public.calendar_credentials (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider text NOT NULL CHECK (provider IN ('google', 'outlook')),
  client_id text NOT NULL,
  client_secret text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(provider)
);

ALTER TABLE public.calendar_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admin can manage calendar credentials"
  ON public.calendar_credentials FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Table to store connected calendar accounts (tokens after OAuth)
CREATE TABLE public.calendar_connections (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  provider text NOT NULL CHECK (provider IN ('google', 'outlook')),
  access_token text NOT NULL,
  refresh_token text,
  token_expires_at timestamp with time zone,
  calendar_id text DEFAULT 'primary',
  email text,
  connected_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, provider)
);

ALTER TABLE public.calendar_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage own calendar connections"
  ON public.calendar_connections FOR ALL
  USING (is_admin() AND user_id = auth.uid())
  WITH CHECK (is_admin() AND user_id = auth.uid());

-- Sync log for debugging
CREATE TABLE public.calendar_sync_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  connection_id uuid REFERENCES public.calendar_connections(id) ON DELETE CASCADE,
  direction text NOT NULL CHECK (direction IN ('push', 'pull')),
  status text NOT NULL CHECK (status IN ('success', 'error')),
  details text,
  synced_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.calendar_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view sync logs"
  ON public.calendar_sync_log FOR SELECT
  USING (is_admin());

CREATE POLICY "System can insert sync logs"
  ON public.calendar_sync_log FOR INSERT
  WITH CHECK (true);

-- Triggers for updated_at
CREATE TRIGGER update_calendar_credentials_updated_at
  BEFORE UPDATE ON public.calendar_credentials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_calendar_connections_updated_at
  BEFORE UPDATE ON public.calendar_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
