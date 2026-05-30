-- Public quote approval now goes through /api/public/quotes/:id/approve.
-- Keep the legacy RPC away from browser roles so quote approval rules stay server-side.
do $$
begin
  revoke execute on function public.approve_quote(uuid) from public;
  revoke execute on function public.approve_quote(uuid) from anon;
  revoke execute on function public.approve_quote(uuid) from authenticated;
exception
  when undefined_function then
    null;
end $$;
