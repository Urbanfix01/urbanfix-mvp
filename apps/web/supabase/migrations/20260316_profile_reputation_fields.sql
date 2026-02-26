-- Reputation and references fields for technician public profile
-- Safe to run multiple times

alter table if exists public.profiles
  add column if not exists public_rating numeric(3,2),
  add column if not exists public_reviews_count integer not null default 0,
  add column if not exists completed_jobs_total integer not null default 0,
  add column if not exists references_summary text,
  add column if not exists client_recommendations text,
  add column if not exists achievement_badges text[] not null default '{}';

do $$
begin
  if to_regclass('public.profiles') is null then
    return;
  end if;

  begin
    alter table public.profiles
      add constraint profiles_public_rating_range_chk
      check (public_rating is null or (public_rating >= 0 and public_rating <= 5));
  exception
    when duplicate_object then null;
  end;

  begin
    alter table public.profiles
      add constraint profiles_public_reviews_count_nonneg_chk
      check (public_reviews_count >= 0);
  exception
    when duplicate_object then null;
  end;

  begin
    alter table public.profiles
      add constraint profiles_completed_jobs_total_nonneg_chk
      check (completed_jobs_total >= 0);
  exception
    when duplicate_object then null;
  end;
end $$;
