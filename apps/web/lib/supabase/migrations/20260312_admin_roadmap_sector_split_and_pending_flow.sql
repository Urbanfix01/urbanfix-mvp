alter table public.roadmap_updates
  add column if not exists sector text;

update public.roadmap_updates
set sector = case
  when lower(coalesce(title, '') || ' ' || coalesce(description, '')) like '%cliente%' then 'clientes'
  when lower(coalesce(title, '') || ' ' || coalesce(description, '')) like '%interfaz%'
    or lower(coalesce(title, '') || ' ' || coalesce(description, '')) like '%visual%'
    or lower(coalesce(title, '') || ' ' || coalesce(description, '')) like '%home%' then 'interfaz'
  when area = 'web' then 'web'
  when area = 'mobile' then 'app'
  when area = 'ops' then 'operativo'
  else 'funcionalidades'
end
where sector is null
   or sector not in ('interfaz', 'operativo', 'clientes', 'web', 'app', 'funcionalidades');

alter table public.roadmap_updates
  alter column sector set default 'funcionalidades';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'roadmap_updates_sector_check'
      and conrelid = 'public.roadmap_updates'::regclass
  ) then
    alter table public.roadmap_updates
      add constraint roadmap_updates_sector_check
      check (sector in ('interfaz', 'operativo', 'clientes', 'web', 'app', 'funcionalidades'));
  end if;
end;
$$;

alter table public.roadmap_updates
  alter column sector set not null;

create index if not exists roadmap_updates_sector_idx
  on public.roadmap_updates(sector);

with pending_item (
  title,
  description,
  status,
  area,
  priority,
  sector,
  owner,
  eta_date
) as (
  values
    (
      'Flujo App/Web: ramificacion lateral estilo ingenieria',
      'Retomar diagrama de flujo con ramificaciones izquierda/derecha por perfil, popup explicativo por proceso, zoom/pan/fullscreen y export PDF estable.',
      'planned',
      'web',
      'high',
      'interfaz',
      'PC1',
      date '2026-03-15'
    )
),
inserted as (
  insert into public.roadmap_updates (
    title,
    description,
    status,
    area,
    priority,
    sector,
    owner,
    eta_date
  )
  select
    p.title,
    p.description,
    p.status,
    p.area,
    p.priority,
    p.sector,
    p.owner,
    p.eta_date
  from pending_item p
  where not exists (
    select 1
    from public.roadmap_updates ru
    where lower(ru.title) = lower(p.title)
  )
  returning id, title
),
target as (
  select id, title
  from public.roadmap_updates
  where lower(title) in (select lower(title) from pending_item)
)
insert into public.roadmap_feedback (
  roadmap_id,
  body,
  sentiment
)
select
  t.id,
  '[PC1] Pedido del owner: dejar asentado para retomar luego con enfoque de diagrama de flujo de ingenieria ramificado por perfil.',
  'neutral'
from target t
where not exists (
  select 1
  from public.roadmap_feedback rf
  where rf.roadmap_id = t.id
    and rf.body = '[PC1] Pedido del owner: dejar asentado para retomar luego con enfoque de diagrama de flujo de ingenieria ramificado por perfil.'
);
