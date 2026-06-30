-- Hardening from Supabase Advisors:
-- feedback request records are created by trusted server routes using the service role.
-- Anonymous/authenticated clients should not insert rows directly.

drop policy if exists "allow public insert feedback requests"
  on public.quote_feedback_requests;
