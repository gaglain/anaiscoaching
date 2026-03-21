-- Allow authenticated clients to read contact_requests matching their email
CREATE POLICY "Clients can view own contact requests by email"
ON public.contact_requests
FOR SELECT
TO authenticated
USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Allow authenticated clients to read contact_replies for their own contact_requests
CREATE POLICY "Clients can view replies to own contact requests"
ON public.contact_replies
FOR SELECT
TO authenticated
USING (
  contact_request_id IN (
    SELECT id FROM public.contact_requests
    WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);
