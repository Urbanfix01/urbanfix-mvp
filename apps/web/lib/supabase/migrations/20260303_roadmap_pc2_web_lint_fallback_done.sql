-- PC2 roadmap update:
-- Cambio no planificado para destrabar lint web en pre-push

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
  'Se elimina eslint.config.mjs roto para que el fallback .eslintrc.js permita lint/build al empujar migraciones de roadmap.',
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
      '[PC2] in_progress: lint web bloqueado por config no compatible al subir cambios con migraciones.',
      'neutral'
    ),
    (
      '[PC2] done: se usa fallback estable de eslint y vuelve a pasar lint/build en pre-push.',
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
