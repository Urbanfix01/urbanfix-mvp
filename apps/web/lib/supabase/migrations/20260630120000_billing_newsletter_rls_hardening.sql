-- Hardening for Supabase advisor: rls_disabled_in_public.
-- These tables are used through server-side API routes with the service role.
-- Direct client access is limited to beta admins.

alter table if exists public.coupons enable row level security;
alter table if exists public.coupon_redemptions enable row level security;
alter table if exists public.newsletter_campaigns enable row level security;
alter table if exists public.newsletter_campaign_recipients enable row level security;

drop policy if exists "Coupons beta admins only" on public.coupons;
create policy "Coupons beta admins only"
  on public.coupons for all
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

drop policy if exists "Coupon redemptions beta admins only" on public.coupon_redemptions;
create policy "Coupon redemptions beta admins only"
  on public.coupon_redemptions for all
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

drop policy if exists "Newsletter campaigns beta admins only" on public.newsletter_campaigns;
create policy "Newsletter campaigns beta admins only"
  on public.newsletter_campaigns for all
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

drop policy if exists "Newsletter recipients beta admins only" on public.newsletter_campaign_recipients;
create policy "Newsletter recipients beta admins only"
  on public.newsletter_campaign_recipients for all
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
