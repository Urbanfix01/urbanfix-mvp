-- Storage buckets used by technician profiles, quote attachments, certificates,
-- and support images.

insert into storage.buckets (id, name, public)
values
  ('urbanfix-assets', 'urbanfix-assets', true),
  ('beta-support', 'beta-support', true)
on conflict (id) do update
set public = excluded.public;

alter table storage.objects enable row level security;

drop policy if exists "UrbanFix assets public read" on storage.objects;
create policy "UrbanFix assets public read"
  on storage.objects for select
  using (bucket_id = 'urbanfix-assets');

drop policy if exists "UrbanFix assets user insert" on storage.objects;
create policy "UrbanFix assets user insert"
  on storage.objects for insert
  with check (
    bucket_id = 'urbanfix-assets'
    and auth.uid() is not null
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "UrbanFix assets user update" on storage.objects;
create policy "UrbanFix assets user update"
  on storage.objects for update
  using (
    bucket_id = 'urbanfix-assets'
    and auth.uid() is not null
    and auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'urbanfix-assets'
    and auth.uid() is not null
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "UrbanFix assets user delete" on storage.objects;
create policy "UrbanFix assets user delete"
  on storage.objects for delete
  using (
    bucket_id = 'urbanfix-assets'
    and auth.uid() is not null
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Beta support images insert" on storage.objects;
create policy "Beta support images insert"
  on storage.objects for insert
  with check (
    bucket_id = 'beta-support'
    and (
      auth.uid()::text = (storage.foldername(name))[1]
      or exists (
        select 1
        from public.beta_admins ba
        where ba.user_id = auth.uid()
      )
    )
  );

drop policy if exists "Beta support images delete" on storage.objects;
create policy "Beta support images delete"
  on storage.objects for delete
  using (
    bucket_id = 'beta-support'
    and (
      auth.uid()::text = (storage.foldername(name))[1]
      or exists (
        select 1
        from public.beta_admins ba
        where ba.user_id = auth.uid()
      )
    )
  );
