create extension if not exists pgcrypto;

alter table if exists public.profiles
  add column if not exists newsletter_opt_in boolean not null default false,
  add column if not exists newsletter_opt_in_at timestamptz,
  add column if not exists newsletter_unsubscribed_at timestamptz,
  add column if not exists newsletter_source text;

create table if not exists public.newsletter_campaigns (
  id uuid primary key default gen_random_uuid(),
  created_by uuid null references public.profiles(id) on delete set null,
  created_by_label text null,
  subject text not null,
  preview_text text null,
  intro_text text null,
  body_text text not null,
  body_html text not null,
  cta_label text null,
  cta_url text null,
  audience text not null,
  status text not null default 'draft'
    check (status in ('draft', 'sending', 'sent', 'failed')),
  from_email text null,
  provider text null,
  total_recipients integer not null default 0,
  sent_count integer not null default 0,
  failed_count integer not null default 0,
  warning_text text null,
  sent_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists newsletter_campaigns_created_at_idx
  on public.newsletter_campaigns (created_at desc);

create table if not exists public.newsletter_campaign_recipients (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.newsletter_campaigns(id) on delete cascade,
  user_id uuid null references public.profiles(id) on delete set null,
  email text not null,
  audience_role text null,
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'failed', 'skipped')),
  provider_message_id text null,
  error_text text null,
  created_at timestamptz not null default now(),
  sent_at timestamptz null
);

create index if not exists newsletter_campaign_recipients_campaign_idx
  on public.newsletter_campaign_recipients (campaign_id);

create index if not exists newsletter_campaign_recipients_email_idx
  on public.newsletter_campaign_recipients (email);

create or replace function public.touch_newsletter_campaigns_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_newsletter_campaigns_updated_at on public.newsletter_campaigns;

create trigger touch_newsletter_campaigns_updated_at
before update on public.newsletter_campaigns
for each row execute function public.touch_newsletter_campaigns_updated_at();
