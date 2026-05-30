-- Prevent browser clients from granting their own technician access.
-- Admin and service-role flows can still manage access_granted.

do $$
begin
  if to_regclass('public.profiles') is null then
    return;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'access_granted'
  ) then
    execute 'revoke insert (access_granted) on public.profiles from anon, authenticated';
    execute 'revoke update (access_granted) on public.profiles from anon, authenticated';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'access_granted_at'
  ) then
    execute 'revoke insert (access_granted_at) on public.profiles from anon, authenticated';
    execute 'revoke update (access_granted_at) on public.profiles from anon, authenticated';
  end if;
end $$;
