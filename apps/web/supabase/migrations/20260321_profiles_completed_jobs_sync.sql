create or replace function public.sync_profile_completed_jobs_total(target_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if target_profile_id is null then
    return;
  end if;

  update public.profiles p
  set completed_jobs_total = coalesce((
    select count(*)::integer
    from public.quotes q
    where q.user_id = target_profile_id
      and (
        q.archived_at is not null
        or q.completed_at is not null
        or q.paid_at is not null
        or lower(coalesce(q.status::text, '')) in (
          'completed',
          'completado',
          'finalizado',
          'finalizados',
          'paid',
          'pagado',
          'pagados',
          'cobrado',
          'cobrados',
          'charged'
        )
      )
  ), 0)
  where p.id = target_profile_id;
end;
$$;
create or replace function public.handle_quote_completed_jobs_sync()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.sync_profile_completed_jobs_total(old.user_id);
    return old;
  end if;

  perform public.sync_profile_completed_jobs_total(new.user_id);

  if tg_op = 'UPDATE' and new.user_id is distinct from old.user_id then
    perform public.sync_profile_completed_jobs_total(old.user_id);
  end if;

  return new;
end;
$$;
drop trigger if exists trg_sync_profile_completed_jobs_total on public.quotes;
create trigger trg_sync_profile_completed_jobs_total
after insert or update or delete
on public.quotes
for each row
execute function public.handle_quote_completed_jobs_sync();
update public.profiles p
set completed_jobs_total = coalesce(snapshot.closed_quotes_count, 0)
from (
  select
    q.user_id as profile_id,
    count(*)::integer as closed_quotes_count
  from public.quotes q
  where q.user_id is not null
    and (
      q.archived_at is not null
      or q.completed_at is not null
      or q.paid_at is not null
      or lower(coalesce(q.status::text, '')) in (
        'completed',
        'completado',
        'finalizado',
        'finalizados',
        'paid',
        'pagado',
        'pagados',
        'cobrado',
        'cobrados',
        'charged'
      )
    )
  group by q.user_id
) snapshot
where p.id = snapshot.profile_id;
update public.profiles p
set completed_jobs_total = 0
where coalesce(p.completed_jobs_total, 0) <> 0
  and not exists (
    select 1
    from public.quotes q
    where q.user_id = p.id
      and (
        q.archived_at is not null
        or q.completed_at is not null
        or q.paid_at is not null
        or lower(coalesce(q.status::text, '')) in (
          'completed',
          'completado',
          'finalizado',
          'finalizados',
          'paid',
          'pagado',
          'pagados',
          'cobrado',
          'cobrados',
          'charged'
        )
      )
  );
