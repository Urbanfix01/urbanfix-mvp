-- Final quote data lockdown for real-user launch.
-- This migration neutralizes older broad public policies/RPCs while keeping
-- technician-owned quote workflows usable through authenticated sessions.

do $$
begin
  if to_regclass('public.quotes') is not null then
    alter table public.quotes enable row level security;

    drop policy if exists "Public Read Quote by ID" on public.quotes;
    drop policy if exists "Users select own quotes" on public.quotes;
    drop policy if exists "Users insert own quotes" on public.quotes;
    drop policy if exists "Users update own quotes" on public.quotes;
    drop policy if exists "Users delete own quotes" on public.quotes;

    create policy "Users select own quotes"
      on public.quotes for select
      using (auth.uid() = user_id);

    create policy "Users insert own quotes"
      on public.quotes for insert
      with check (auth.uid() = user_id);

    create policy "Users update own quotes"
      on public.quotes for update
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);

    create policy "Users delete own quotes"
      on public.quotes for delete
      using (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if to_regclass('public.quote_items') is not null and to_regclass('public.quotes') is not null then
    alter table public.quote_items enable row level security;

    drop policy if exists "Public Read Items" on public.quote_items;
    drop policy if exists "Users select own quote items" on public.quote_items;
    drop policy if exists "Users insert own quote items" on public.quote_items;
    drop policy if exists "Users update own quote items" on public.quote_items;
    drop policy if exists "Users delete own quote items" on public.quote_items;

    create policy "Users select own quote items"
      on public.quote_items for select
      using (
        exists (
          select 1
          from public.quotes q
          where q.id = quote_items.quote_id
            and q.user_id = auth.uid()
        )
      );

    create policy "Users insert own quote items"
      on public.quote_items for insert
      with check (
        exists (
          select 1
          from public.quotes q
          where q.id = quote_items.quote_id
            and q.user_id = auth.uid()
        )
      );

    create policy "Users update own quote items"
      on public.quote_items for update
      using (
        exists (
          select 1
          from public.quotes q
          where q.id = quote_items.quote_id
            and q.user_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1
          from public.quotes q
          where q.id = quote_items.quote_id
            and q.user_id = auth.uid()
        )
      );

    create policy "Users delete own quote items"
      on public.quote_items for delete
      using (
        exists (
          select 1
          from public.quotes q
          where q.id = quote_items.quote_id
            and q.user_id = auth.uid()
        )
      );
  end if;
end $$;

do $$
begin
  if to_regclass('public.quote_attachments') is not null and to_regclass('public.quotes') is not null then
    alter table public.quote_attachments enable row level security;

    drop policy if exists "Public Read Quote Attachments" on public.quote_attachments;
    drop policy if exists "Users select own quote attachments" on public.quote_attachments;
    drop policy if exists "Insert Quote Attachments" on public.quote_attachments;
    drop policy if exists "Delete Quote Attachments" on public.quote_attachments;
    drop policy if exists "Users insert own quote attachments" on public.quote_attachments;
    drop policy if exists "Users delete own quote attachments" on public.quote_attachments;

    create policy "Users select own quote attachments"
      on public.quote_attachments for select
      using (
        user_id = auth.uid()
        or exists (
          select 1
          from public.quotes q
          where q.id = quote_attachments.quote_id
            and q.user_id = auth.uid()
        )
      );

    create policy "Users insert own quote attachments"
      on public.quote_attachments for insert
      with check (
        user_id = auth.uid()
        and exists (
          select 1
          from public.quotes q
          where q.id = quote_attachments.quote_id
            and q.user_id = auth.uid()
        )
      );

    create policy "Users delete own quote attachments"
      on public.quote_attachments for delete
      using (
        user_id = auth.uid()
        and exists (
          select 1
          from public.quotes q
          where q.id = quote_attachments.quote_id
            and q.user_id = auth.uid()
        )
      );
  end if;
end $$;

do $$
begin
  if to_regclass('public.profiles') is not null then
    drop policy if exists "Public Read Profiles" on public.profiles;
  end if;
end $$;

do $$
begin
  revoke execute on function public.get_public_quote_bundle(uuid) from public;
  revoke execute on function public.get_public_quote_bundle(uuid) from anon;
  revoke execute on function public.get_public_quote_bundle(uuid) from authenticated;
exception
  when undefined_function then
    null;
end $$;

do $$
begin
  revoke execute on function public.request_quote_revision(uuid, jsonb) from public;
  revoke execute on function public.request_quote_revision(uuid, jsonb) from anon;
  revoke execute on function public.request_quote_revision(uuid, jsonb) from authenticated;
exception
  when undefined_function then
    null;
end $$;

do $$
begin
  revoke execute on function public.redeem_access_code(text) from public;
  revoke execute on function public.redeem_access_code(text) from anon;
  revoke execute on function public.redeem_access_code(text) from authenticated;
exception
  when undefined_function then
    null;
end $$;
