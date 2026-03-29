-- Admin review queue fields for incomplete technician profiles
-- Safe to run multiple times

alter table if exists public.profiles
  add column if not exists admin_review_status text,
  add column if not exists admin_review_reason text,
  add column if not exists admin_review_marked_at timestamptz;

do $$
begin
  if to_regclass('public.profiles') is null then
    return;
  end if;

  begin
    alter table public.profiles
      add constraint profiles_admin_review_status_chk
      check (
        admin_review_status is null
        or admin_review_status in ('pending', 'resolved', 'dismissed')
      );
  exception
    when duplicate_object then null;
  end;
end $$;