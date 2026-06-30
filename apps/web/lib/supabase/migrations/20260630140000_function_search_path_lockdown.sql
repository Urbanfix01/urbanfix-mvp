-- Hardening from Supabase Advisors:
-- make public functions independent from role-level mutable search_path.

alter function public.backup_profile_changes()
  set search_path = public;

alter function public.canonical_quote_status(text)
  set search_path = public;

alter function public.client_request_touch_updated_at()
  set search_path = public;

alter function public.client_requests_touch_updated_at()
  set search_path = public;

alter function public.flow_diagram_states_set_updated_at()
  set search_path = public;

alter function public.quote_process_transition_allowed(text, text)
  set search_path = public;

alter function public.roadmap_seed_auto_feedback()
  set search_path = public;

alter function public.roadmap_updates_set_updated_at()
  set search_path = public;

alter function public.set_profiles_updated_at()
  set search_path = public;

alter function public.touch_demo_requests_updated_at()
  set search_path = public;

alter function public.touch_newsletter_campaigns_updated_at()
  set search_path = public;

alter function public.touch_quote_feedback_review_updated_at()
  set search_path = public;
