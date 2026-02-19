-- PC2 roadmap closure:
-- Habilitar acceso a todos los usuarios nuevos

with target_update as (
  select id
  from public.roadmap_updates
  where lower(title) = lower('Habilitar acceso a todos los usuarios nuevos')
  limit 1
)
update public.roadmap_updates ru
set
  status = 'done',
  updated_at = timezone('utc', now())
from target_update tu
where ru.id = tu.id;

with target_update as (
  select id
  from public.roadmap_updates
  where lower(title) = lower('Habilitar acceso a todos los usuarios nuevos')
  limit 1
),
feedback_seed (body, sentiment) as (
  values
    (
      '[PC2] in_progress: eliminando necesidad de habilitacion manual y reforzando visibilidad de registros recientes en admin.',
      'neutral'
    ),
    (
      '[PC2] done: acceso abierto por defecto para usuarios nuevos + backfill de perfiles existentes + tab Registros con altas/ingresos recientes.',
      'positive'
    )
)
insert into public.roadmap_feedback (
  roadmap_id,
  body,
  sentiment
)
select
  tu.id,
  fs.body,
  fs.sentiment
from target_update tu
cross join feedback_seed fs
where not exists (
  select 1
  from public.roadmap_feedback rf
  where rf.roadmap_id = tu.id
    and rf.body = fs.body
);

insert into public.roadmap_updates (
  title,
  description,
  status,
  area,
  priority,
  owner,
  eta_date
)
select
  'Web lint fallback para push con migraciones',
  'Se elimina eslint.config.mjs no compatible para restaurar lint y permitir push de ramas con migraciones.',
  'done',
  'web',
  'medium',
  'PC2',
  current_date
where not exists (
  select 1
  from public.roadmap_updates ru
  where lower(ru.title) = lower('Web lint fallback para push con migraciones')
);

with target_update as (
  select id
  from public.roadmap_updates
  where lower(title) = lower('Web lint fallback para push con migraciones')
  limit 1
)
update public.roadmap_updates ru
set
  status = 'done',
  updated_at = timezone('utc', now())
from target_update tu
where ru.id = tu.id;

with target_update as (
  select id
  from public.roadmap_updates
  where lower(title) = lower('Web lint fallback para push con migraciones')
  limit 1
),
feedback_seed (body, sentiment) as (
  values
    (
      '[PC2] in_progress: lint web bloqueado por config incompatible al subir cambios de roadmap.',
      'neutral'
    ),
    (
      '[PC2] done: fallback .eslintrc.js activo y lint/build vuelve a pasar en pre-push.',
      'positive'
    )
)
insert into public.roadmap_feedback (
  roadmap_id,
  body,
  sentiment
)
select
  tu.id,
  fs.body,
  fs.sentiment
from target_update tu
cross join feedback_seed fs
where not exists (
  select 1
  from public.roadmap_feedback rf
  where rf.roadmap_id = tu.id
    and rf.body = fs.body
);
