
-- Add tags column to profiles
ALTER TABLE public.profiles ADD COLUMN tags text[] DEFAULT '{}';

-- Add an index for better performance on tag queries
CREATE INDEX idx_profiles_tags ON public.profiles USING GIN(tags);
