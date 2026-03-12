ALTER TABLE public.profiles 
ADD COLUMN notification_preferences jsonb NOT NULL DEFAULT '{"email": true, "push": true}'::jsonb;