create extension if not exists pgcrypto;

create table if not exists public.quote_feedback_requests (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  technician_id uuid not null references public.profiles(id) on delete cascade,
  share_token text not null unique,
  client_name_snapshot text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  revoked_at timestamptz
);

create unique index if not exists quote_feedback_requests_quote_uidx
  on public.quote_feedback_requests (quote_id);

create index if not exists quote_feedback_requests_technician_idx
  on public.quote_feedback_requests (technician_id, created_at desc);

create table if not exists public.quote_feedback_reviews (
  id uuid primary key default gen_random_uuid(),
  feedback_request_id uuid not null references public.quote_feedback_requests(id) on delete cascade,
  quote_id uuid not null references public.quotes(id) on delete cascade,
  technician_id uuid not null references public.profiles(id) on delete cascade,
  client_name text,
  rating integer not null,
  comment text,
  is_public boolean not null default true,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists quote_feedback_reviews_request_uidx
  on public.quote_feedback_reviews (feedback_request_id);

create unique index if not exists quote_feedback_reviews_quote_uidx
  on public.quote_feedback_reviews (quote_id);

create index if not exists quote_feedback_reviews_technician_idx
  on public.quote_feedback_reviews (technician_id, submitted_at desc);

do $$
begin
  begin
    alter table public.quote_feedback_reviews
      add constraint quote_feedback_reviews_rating_chk
      check (rating >= 1 and rating <= 5);
  exception
    when duplicate_object then null;
  end;
end $$;

create or replace function public.touch_quote_feedback_review_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_touch_quote_feedback_review_updated_at on public.quote_feedback_reviews;

create trigger trg_touch_quote_feedback_review_updated_at
before update on public.quote_feedback_reviews
for each row
execute function public.touch_quote_feedback_review_updated_at();

create or replace function public.sync_profile_public_reputation_from_quote_feedback()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_technician_id uuid;
begin
  target_technician_id := coalesce(new.technician_id, old.technician_id);

  if target_technician_id is null then
    return coalesce(new, old);
  end if;

  update public.profiles p
  set
    public_rating = stats.avg_rating,
    public_reviews_count = stats.review_count
  from (
    select
      technician_id,
      round(avg(rating)::numeric, 2) as avg_rating,
      count(*)::integer as review_count
    from public.quote_feedback_reviews
    where technician_id = target_technician_id
      and is_public = true
    group by technician_id
  ) stats
  where p.id = stats.technician_id;

  if not exists (
    select 1
    from public.quote_feedback_reviews
    where technician_id = target_technician_id
      and is_public = true
  ) then
    update public.profiles
    set
      public_rating = null,
      public_reviews_count = 0
    where id = target_technician_id;
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_sync_profile_public_reputation_from_quote_feedback on public.quote_feedback_reviews;

create trigger trg_sync_profile_public_reputation_from_quote_feedback
after insert or update or delete on public.quote_feedback_reviews
for each row
execute function public.sync_profile_public_reputation_from_quote_feedback();
