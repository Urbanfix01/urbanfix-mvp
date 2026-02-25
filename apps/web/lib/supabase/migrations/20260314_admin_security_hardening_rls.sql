-- 24/02 - Hardening tecnico y seguridad base
-- Refuerza RLS en tablas sensibles usadas por flujos admin y catalogo.

alter table if exists public.master_items enable row level security;

drop policy if exists "Master items read authenticated" on public.master_items;
create policy "Master items read authenticated"
  on public.master_items for select
  using (auth.role() = 'authenticated');

drop policy if exists "Master items manage beta admins" on public.master_items;
create policy "Master items manage beta admins"
  on public.master_items for all
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

alter table if exists public.roadmap_updates enable row level security;
alter table if exists public.roadmap_feedback enable row level security;

drop policy if exists "Roadmap updates beta admins only" on public.roadmap_updates;
create policy "Roadmap updates beta admins only"
  on public.roadmap_updates for all
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

drop policy if exists "Roadmap feedback beta admins only" on public.roadmap_feedback;
create policy "Roadmap feedback beta admins only"
  on public.roadmap_feedback for all
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
