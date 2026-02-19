alter table public.roadmap_updates
  add column if not exists source_key text,
  add column if not exists source_branch text,
  add column if not exists source_commit text,
  add column if not exists source_files jsonb not null default '[]'::jsonb;

create unique index if not exists roadmap_updates_source_key_uidx
  on public.roadmap_updates (source_key)
  where source_key is not null;

create or replace function public.roadmap_seed_auto_feedback()
returns trigger
language plpgsql
as $$
begin
  if new.source_key is null then
    return new;
  end if;

  if not exists (
    select 1
    from public.roadmap_feedback rf
    where rf.roadmap_id = new.id
  ) then
    insert into public.roadmap_feedback (
      roadmap_id,
      body,
      sentiment
    )
    values (
      new.id,
      '[AUTO] Tarjeta creada por sincronizacion de codigo. Agregar feedback tecnico/manual.',
      'neutral'
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_roadmap_seed_auto_feedback on public.roadmap_updates;

create trigger trg_roadmap_seed_auto_feedback
after insert on public.roadmap_updates
for each row
execute function public.roadmap_seed_auto_feedback();
