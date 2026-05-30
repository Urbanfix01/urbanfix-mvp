-- Planes de suscripcion, cupones y estados de cobro
create table if not exists public.billing_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  period_months int not null,
  price_ars numeric not null,
  is_partner boolean default false,
  trial_days int default 7,
  mp_plan_id text,
  active boolean default true,
  created_at timestamptz default now()
);

create unique index if not exists billing_plans_period_partner_idx
  on public.billing_plans (period_months, is_partner);

create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  description text,
  discount_percent int not null,
  is_partner boolean default false,
  active boolean default true,
  max_redemptions int,
  redeemed_count int default 0,
  expires_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists public.coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid references public.coupons(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  redeemed_at timestamptz default now(),
  unique (coupon_id, user_id)
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  plan_id uuid references public.billing_plans(id),
  coupon_id uuid references public.coupons(id),
  mp_preapproval_id text,
  status text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  trial_end timestamptz,
  canceled_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists subscriptions_user_idx on public.subscriptions(user_id);
create unique index if not exists subscriptions_user_unique on public.subscriptions(user_id);
create index if not exists subscriptions_mp_idx on public.subscriptions(mp_preapproval_id);

create table if not exists public.subscription_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete cascade,
  mp_payment_id text,
  status text,
  amount numeric,
  paid_at timestamptz,
  created_at timestamptz default now()
);

alter table public.billing_plans enable row level security;
drop policy if exists "Public read billing plans" on public.billing_plans;
create policy "Public read billing plans"
  on public.billing_plans for select
  using (true);

alter table public.subscriptions enable row level security;
drop policy if exists "Users select own subscriptions" on public.subscriptions;
create policy "Users select own subscriptions"
  on public.subscriptions for select
  using (auth.uid() = user_id);

alter table public.subscription_payments enable row level security;
drop policy if exists "Users select own subscription payments" on public.subscription_payments;
create policy "Users select own subscription payments"
  on public.subscription_payments for select
  using (auth.uid() = user_id);

-- Seed de planes (ARS) y coupon de socios
insert into public.billing_plans (name, period_months, price_ars, is_partner, trial_days, active)
values
  ('Mensual', 1, 17900, false, 7, true),
  ('Trimestral', 3, 47900, false, 7, true),
  ('Semestral', 6, 89900, false, 7, true),
  ('Anual', 12, 159900, false, 7, true),
  ('Mensual Socios', 1, 8900, true, 7, true),
  ('Trimestral Socios', 3, 23900, true, 7, true),
  ('Semestral Socios', 6, 44900, true, 7, true),
  ('Anual Socios', 12, 79900, true, 7, true)
on conflict (period_months, is_partner) do update
set name = excluded.name,
    price_ars = excluded.price_ars,
    trial_days = excluded.trial_days,
    active = excluded.active;

insert into public.coupons (code, description, discount_percent, is_partner, active)
values ('CIRCULO50', 'Socios Círculo Argentino de Gasistas y Plomeros', 50, true, true)
on conflict (code) do update
set description = excluded.description,
    discount_percent = excluded.discount_percent,
    is_partner = excluded.is_partner,
    active = excluded.active;
