-- Beta support attachments (images)

alter table public.beta_support_messages
  add column if not exists image_urls text[];

insert into storage.buckets (id, name, public)
values ('beta-support', 'beta-support', true)
on conflict (id) do nothing;

alter table storage.objects enable row level security;

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
