-- Open access for all new users (no manual enable required)

alter table if exists public.profiles
  add column if not exists access_granted boolean not null default true,
  add column if not exists access_granted_at timestamptz;

alter table if exists public.profiles
  alter column access_granted set default true;

insert into public.profiles (
  id,
  access_granted,
  access_granted_at
)
select
  u.id,
  true,
  timezone('utc', now())
from auth.users u
left join public.profiles p
  on p.id = u.id
where p.id is null;

update public.profiles
set
  access_granted = true,
  access_granted_at = coalesce(access_granted_at, timezone('utc', now()))
where access_granted is distinct from true;
