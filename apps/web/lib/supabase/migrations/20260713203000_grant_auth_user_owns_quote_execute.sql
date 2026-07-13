-- auth_user_owns_quote is referenced by quote RLS policies in existing databases.
-- Keep it callable by authenticated users while avoiding anonymous/public execution.

do $$
begin
  grant execute on function public.auth_user_owns_quote(uuid) to authenticated;
exception when undefined_function then null;
end $$;

notify pgrst, 'reload schema';
