-- Invite-only access codes for temporary signup control

create table if not exists public.access_codes (
  code text primary key,
  active boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  note text
);

alter table public.access_codes enable row level security;

create or replace function public.require_access_code()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  provided text;
  valid boolean;
begin
  provided := nullif(trim(coalesce(new.raw_user_meta_data->>'access_code', '')), '');
  if provided is null then
    raise exception 'Codigo de acceso requerido';
  end if;

  select true into valid
  from public.access_codes
  where upper(code) = upper(provided)
    and active = true
    and (expires_at is null or expires_at > now())
  limit 1;

  if not valid then
    raise exception 'Codigo de acceso invalido';
  end if;

  if new.raw_user_meta_data is not null and new.raw_user_meta_data ? 'access_code' then
    new.raw_user_meta_data = new.raw_user_meta_data - 'access_code';
  end if;

  return new;
end;
$$;

drop trigger if exists require_access_code on auth.users;

create trigger require_access_code
before insert on auth.users
for each row execute function public.require_access_code();
