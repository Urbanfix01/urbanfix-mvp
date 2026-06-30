-- Hardening from Supabase Advisors:
-- quote status/delete actions now go through server-side API routes.
-- Authenticated clients no longer need direct EXECUTE on SECURITY DEFINER RPCs.

do $$
begin
  if to_regprocedure('public.delete_quote(uuid)') is not null then
    revoke execute on function public.delete_quote(uuid) from public, anon, authenticated;
  end if;

  if to_regprocedure('public.update_quote_status(uuid, text)') is not null then
    revoke execute on function public.update_quote_status(uuid, text) from public, anon, authenticated;
  end if;

  if to_regprocedure('public.update_quote_status(uuid, text, text, text)') is not null then
    revoke execute on function public.update_quote_status(uuid, text, text, text) from public, anon, authenticated;
  end if;
end $$;
