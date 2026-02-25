-- Access gate after sign-in (allow signup, require code on entry)

alter table if exists public.profiles
  add column if not exists access_granted boolean not null default false,
  add column if not exists access_granted_at timestamptz;

drop trigger if exists require_access_code on auth.users;

create or replace function public.redeem_access_code(p_code text)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  uid uuid := auth.uid();
  valid boolean;
begin
  if uid is null then
    raise exception 'No autenticado';
  end if;

  if p_code is null or trim(p_code) = '' then
    raise exception 'Codigo requerido';
  end if;

  select true into valid
  from public.access_codes
  where upper(code) = upper(trim(p_code))
    and active = true
    and (expires_at is null or expires_at > now())
  limit 1;

  if not valid then
    raise exception 'Codigo de acceso invalido';
  end if;

  insert into public.profiles (id, access_granted, access_granted_at)
  values (uid, true, now())
  on conflict (id)
  do update set access_granted = true, access_granted_at = now();

  return true;
end;
$$;

grant execute on function public.redeem_access_code(text) to authenticated;

do $$
begin
  if to_regclass('public.profiles') is not null then
    execute 'revoke update (access_granted, access_granted_at) on public.profiles from authenticated';
    execute 'revoke update (access_granted, access_granted_at) on public.profiles from anon';
  end if;
end $$;
