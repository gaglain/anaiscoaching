-- Create a security definer function to get the current user's email
CREATE OR REPLACE FUNCTION public.get_my_email()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email FROM auth.users WHERE id = auth.uid()
$$;

-- Drop the broken policies
DROP POLICY IF EXISTS "Clients can view own contact requests by email" ON public.contact_requests;
DROP POLICY IF EXISTS "Clients can view replies to own contact requests" ON public.contact_replies;

-- Recreate with the security definer function
CREATE POLICY "Clients can view own contact requests by email"
ON public.contact_requests
FOR SELECT
TO authenticated
USING (email = public.get_my_email());

CREATE POLICY "Clients can view replies to own contact requests"
ON public.contact_replies
FOR SELECT
TO authenticated
USING (
  contact_request_id IN (
    SELECT id FROM public.contact_requests
    WHERE email = public.get_my_email()
  )
);
