-- Trial access for new users

alter table public.profiles
  add column if not exists trial_started_at timestamptz,
  add column if not exists trial_ends_at timestamptz;

create or replace function public.start_free_trial()
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'No autenticado';
  end if;

  if exists (
    select 1
    from public.profiles
    where id = uid
      and trial_started_at is not null
  ) then
    raise exception 'La prueba gratuita ya fue utilizada';
  end if;

  insert into public.profiles (id, trial_started_at, trial_ends_at)
  values (uid, now(), now() + interval '7 days')
  on conflict (id)
  do update set
    trial_started_at = coalesce(public.profiles.trial_started_at, now()),
    trial_ends_at = now() + interval '7 days';

  return true;
end;
$$;

grant execute on function public.start_free_trial() to authenticated;
