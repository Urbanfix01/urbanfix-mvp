create extension if not exists pgcrypto;

create table if not exists public.profile_public_reviews (
  id uuid primary key default gen_random_uuid(),
  technician_id uuid not null references public.profiles(id) on delete cascade,
  session_key text not null,
  visitor_name text,
  rating integer not null default 5,
  comment text not null,
  is_public boolean not null default true,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  referrer text,
  user_agent text
);

create unique index if not exists profile_public_reviews_technician_session_uidx
  on public.profile_public_reviews (technician_id, session_key);

create index if not exists profile_public_reviews_technician_idx
  on public.profile_public_reviews (technician_id, submitted_at desc);

do $$
begin
  begin
    alter table public.profile_public_reviews
      add constraint profile_public_reviews_rating_chk
      check (rating >= 1 and rating <= 5);
  exception
    when duplicate_object then null;
  end;
end $$;

alter table public.profile_public_reviews enable row level security;

create or replace function public.touch_profile_public_review_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_touch_profile_public_review_updated_at on public.profile_public_reviews;

create trigger trg_touch_profile_public_review_updated_at
before update on public.profile_public_reviews
for each row
execute function public.touch_profile_public_review_updated_at();

create or replace function public.sync_profile_public_reputation_from_quote_feedback()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_technician_id uuid;
  next_rating numeric;
  next_reviews_count integer;
begin
  target_technician_id := coalesce(new.technician_id, old.technician_id);

  if target_technician_id is null then
    return coalesce(new, old);
  end if;

  select
    round(avg(all_reviews.rating)::numeric, 2),
    count(*)::integer
  into next_rating, next_reviews_count
  from (
    select rating
    from public.quote_feedback_reviews
    where technician_id = target_technician_id
      and is_public = true
    union all
    select rating
    from public.profile_public_reviews
    where technician_id = target_technician_id
      and is_public = true
  ) all_reviews;

  if coalesce(next_reviews_count, 0) > 0 then
    update public.profiles
    set
      public_rating = next_rating,
      public_reviews_count = next_reviews_count
    where id = target_technician_id;
  else
    update public.profiles
    set
      public_rating = null,
      public_reviews_count = 0
    where id = target_technician_id;
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_sync_profile_public_reputation_from_profile_reviews on public.profile_public_reviews;

create trigger trg_sync_profile_public_reputation_from_profile_reviews
after insert or update or delete on public.profile_public_reviews
for each row
execute function public.sync_profile_public_reputation_from_quote_feedback();
