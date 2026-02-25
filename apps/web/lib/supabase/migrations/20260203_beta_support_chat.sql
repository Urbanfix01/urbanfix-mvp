-- Beta support chat (internal)

create table if not exists public.beta_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.beta_admins enable row level security;
drop policy if exists "Beta admins read own record" on public.beta_admins;
create policy "Beta admins read own record"
  on public.beta_admins for select
  using (auth.uid() = user_id);

create table if not exists public.beta_support_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  sender_id uuid references auth.users(id) on delete set null,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists beta_support_messages_user_created_idx
  on public.beta_support_messages (user_id, created_at desc);

alter table public.beta_support_messages enable row level security;
drop policy if exists "Beta support read" on public.beta_support_messages;
drop policy if exists "Beta support insert" on public.beta_support_messages;

create policy "Beta support read"
  on public.beta_support_messages for select
  using (
    exists (
      select 1
      from public.beta_admins ba
      where ba.user_id = auth.uid()
    )
    or (
      user_id = auth.uid()
      and exists (
        select 1
        from public.profiles p
        where p.id = auth.uid() and p.access_granted = true
      )
    )
  );

create policy "Beta support insert"
  on public.beta_support_messages for insert
  with check (
    sender_id = auth.uid()
    and (
      exists (
        select 1
        from public.beta_admins ba
        where ba.user_id = auth.uid()
      )
      or (
        user_id = auth.uid()
        and exists (
          select 1
          from public.profiles p
          where p.id = auth.uid() and p.access_granted = true
        )
      )
    )
  );
