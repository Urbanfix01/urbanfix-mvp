-- Hardening from Supabase Advisors:
-- prevent anonymous/public execution of SECURITY DEFINER functions.
-- RPCs still used directly by authenticated clients are granted back explicitly.

alter default privileges in schema public revoke execute on functions from public;

do $$
begin
  revoke execute on function public.approve_quote(uuid) from public, anon, authenticated;
exception when undefined_function then null;
end $$;

do $$
begin
  revoke execute on function public.auth_user_owns_quote(uuid) from public, anon, authenticated;
exception when undefined_function then null;
end $$;

do $$
begin
  revoke execute on function public.delete_quote(uuid) from public, anon, authenticated;
  grant execute on function public.delete_quote(uuid) to authenticated;
exception when undefined_function then null;
end $$;

do $$
begin
  revoke execute on function public.get_public_quote_bundle(uuid) from public, anon, authenticated;
exception when undefined_function then null;
end $$;

do $$
begin
  revoke execute on function public.handle_new_user() from public, anon, authenticated;
exception when undefined_function then null;
end $$;

do $$
begin
  revoke execute on function public.handle_quote_completed_jobs_sync() from public, anon, authenticated;
exception when undefined_function then null;
end $$;

do $$
begin
  revoke execute on function public.redeem_access_code(text) from public, anon, authenticated;
exception when undefined_function then null;
end $$;

do $$
begin
  revoke execute on function public.request_quote_revision(uuid, jsonb) from public, anon, authenticated;
exception when undefined_function then null;
end $$;

do $$
begin
  revoke execute on function public.require_access_code() from public, anon, authenticated;
exception when undefined_function then null;
end $$;

do $$
begin
  revoke execute on function public.start_free_trial() from public, anon, authenticated;
exception when undefined_function then null;
end $$;

do $$
begin
  revoke execute on function public.sync_profile_completed_jobs_total(uuid) from public, anon, authenticated;
exception when undefined_function then null;
end $$;

do $$
begin
  revoke execute on function public.sync_profile_like_count() from public, anon, authenticated;
exception when undefined_function then null;
end $$;

do $$
begin
  revoke execute on function public.sync_profile_likes_count() from public, anon, authenticated;
exception when undefined_function then null;
end $$;

do $$
begin
  revoke execute on function public.sync_profile_public_reputation_from_quote_feedback() from public, anon, authenticated;
exception when undefined_function then null;
end $$;

do $$
begin
  revoke execute on function public.update_quote_status(uuid, text) from public, anon, authenticated;
  grant execute on function public.update_quote_status(uuid, text) to authenticated;
exception when undefined_function then null;
end $$;

do $$
begin
  revoke execute on function public.update_quote_status(uuid, text, text, text) from public, anon, authenticated;
  grant execute on function public.update_quote_status(uuid, text, text, text) to authenticated;
exception when undefined_function then null;
end $$;

notify pgrst, 'reload schema';
