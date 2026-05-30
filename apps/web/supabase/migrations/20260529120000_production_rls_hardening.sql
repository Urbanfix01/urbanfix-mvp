-- Production RLS hardening for real-user launch.
-- Safe to run multiple times.

do $$
begin
  if to_regclass('public.profiles') is not null then
    alter table public.profiles enable row level security;

    drop policy if exists "Users select own profiles" on public.profiles;
    create policy "Users select own profiles"
      on public.profiles for select
      using (auth.uid() = id);

    drop policy if exists "Users insert own profiles" on public.profiles;
    create policy "Users insert own profiles"
      on public.profiles for insert
      with check (auth.uid() = id);

    drop policy if exists "Users update own profiles" on public.profiles;
    create policy "Users update own profiles"
      on public.profiles for update
      using (auth.uid() = id)
      with check (auth.uid() = id);

    drop policy if exists "Public read published profiles" on public.profiles;
    create policy "Public read published profiles"
      on public.profiles for select
      using (coalesce(access_granted, false) = true and coalesce(profile_published, false) = true);

    begin
      revoke update (access_granted, access_granted_at) on public.profiles from anon, authenticated;
    exception
      when undefined_column then null;
    end;
  end if;
end $$;

do $$
begin
  if to_regclass('public.quote_feedback_requests') is not null then
    alter table public.quote_feedback_requests enable row level security;

    drop policy if exists "Technicians select own feedback requests" on public.quote_feedback_requests;
    create policy "Technicians select own feedback requests"
      on public.quote_feedback_requests for select
      using (auth.uid() = technician_id);
  end if;

  if to_regclass('public.quote_feedback_reviews') is not null then
    alter table public.quote_feedback_reviews enable row level security;

    drop policy if exists "Technicians select own feedback reviews" on public.quote_feedback_reviews;
    create policy "Technicians select own feedback reviews"
      on public.quote_feedback_reviews for select
      using (auth.uid() = technician_id);
  end if;
end $$;

do $$
begin
  if to_regclass('public.demo_requests') is not null then
    alter table public.demo_requests enable row level security;
  end if;

  if to_regclass('public.analytics_events') is not null then
    alter table public.analytics_events enable row level security;
  end if;

  if to_regclass('public.flow_diagram_states') is not null then
    alter table public.flow_diagram_states enable row level security;
  end if;
end $$;
