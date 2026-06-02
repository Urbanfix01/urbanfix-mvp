with target as (
  update public.roadmap_updates
  set status = 'done'
  where lower(title) = lower('Flujo App/Web: ramificacion lateral estilo ingenieria')
    and status <> 'done'
  returning id
),
all_targets as (
  select id from target
  union
  select id
  from public.roadmap_updates
  where lower(title) = lower('Flujo App/Web: ramificacion lateral estilo ingenieria')
)
insert into public.roadmap_feedback (
  roadmap_id,
  body,
  sentiment
)
select
  at.id,
  '[PC1] Entregado cierre de ventana Flujos: popup explicativo disponible por proceso en vista normal/fullscreen, cierre por Escape y navegacion limpia desde el detalle.',
  'positive'
from all_targets at
where not exists (
  select 1
  from public.roadmap_feedback rf
  where rf.roadmap_id = at.id
    and rf.body = '[PC1] Entregado cierre de ventana Flujos: popup explicativo disponible por proceso en vista normal/fullscreen, cierre por Escape y navegacion limpia desde el detalle.'
);
