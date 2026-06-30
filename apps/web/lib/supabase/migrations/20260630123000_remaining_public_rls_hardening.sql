-- Follow-up hardening from Supabase Advisors.
-- Closes public tables found with RLS disabled in production.

alter table if exists public.quote_feedback_reviews enable row level security;

drop policy if exists "Technicians select own feedback reviews" on public.quote_feedback_reviews;
create policy "Technicians select own feedback reviews"
  on public.quote_feedback_reviews for select
  using (auth.uid() = technician_id);

drop policy if exists "Public read published feedback reviews" on public.quote_feedback_reviews;
create policy "Public read published feedback reviews"
  on public.quote_feedback_reviews for select
  using (is_public = true);

alter table if exists public.profiles_backup enable row level security;

drop policy if exists "Profiles backup beta admins only" on public.profiles_backup;
create policy "Profiles backup beta admins only"
  on public.profiles_backup for all
  using (
    exists (
      select 1
      from public.beta_admins ba
      where ba.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.beta_admins ba
      where ba.user_id = auth.uid()
    )
  );
