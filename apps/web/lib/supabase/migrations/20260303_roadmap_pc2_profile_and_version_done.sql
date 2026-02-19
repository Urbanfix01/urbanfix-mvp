-- PC2 roadmap closure:
-- Perfil base operativa + version visible en app

with target_update as (
  select id
  from public.roadmap_updates
  where lower(title) = lower('Perfil: logica de Base Operativa y guardado')
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
  where lower(title) = lower('Perfil: logica de Base Operativa y guardado')
  limit 1
),
feedback_seed (body, sentiment) as (
  values
    (
      '[PC2] in_progress: reforzando guardado de base operativa con mejor manejo de errores y carga.',
      'neutral'
    ),
    (
      '[PC2] done: perfil guarda direccion/base operativa de forma estable y muestra estados claros de error/reintento.',
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

with target_update as (
  select id
  from public.roadmap_updates
  where lower(title) = lower('Version visible dentro de app (semver + build)')
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
  where lower(title) = lower('Version visible dentro de app (semver + build)')
  limit 1
),
feedback_seed (body, sentiment) as (
  values
    (
      '[PC2] in_progress: exponiendo version real de la app para soporte en Perfil/Ajustes.',
      'neutral'
    ),
    (
      '[PC2] done: Perfil muestra version en formato semver + build para trazabilidad de QA y soporte.',
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
