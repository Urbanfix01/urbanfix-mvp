with moved_to_in_progress as (
  update public.roadmap_updates
  set status = 'in_progress'
  where lower(title) = lower('23/02 - Pulido UX admin + reportes roadmap')
    and status = 'planned'
  returning id
),
target_status_item as (
  select id
  from moved_to_in_progress
  union
  select id
  from public.roadmap_updates
  where lower(title) = lower('23/02 - Pulido UX admin + reportes roadmap')
),
inserted_execution_item as (
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
    'Admin Roadmap: tablero ejecutivo de vencimientos y carga por responsable',
    'Se agrega vista ejecutiva con semaforo de ejecucion, vencimientos de 7 dias y carga abierta por owner.',
    'done',
    'web',
    'medium',
    'PC1',
    date '2026-02-20'
  where not exists (
    select 1
    from public.roadmap_updates ru
    where lower(ru.title) = lower('Admin Roadmap: tablero ejecutivo de vencimientos y carga por responsable')
  )
  returning id
),
target_execution_item as (
  select id
  from inserted_execution_item
  union
  select id
  from public.roadmap_updates
  where lower(title) = lower('Admin Roadmap: tablero ejecutivo de vencimientos y carga por responsable')
),
feedback_rows (
  roadmap_id,
  body,
  sentiment
) as (
  select
    tsi.id,
    '[PC1] Iniciado pulido UX admin: se agregan reportes de riesgo, vencimientos y carga por responsable.',
    'positive'
  from target_status_item tsi
  union all
  select
    tei.id,
    '[PC1] Entregado tablero ejecutivo para lectura rapida de pendientes, riesgo y asignacion por owner.',
    'positive'
  from target_execution_item tei
)
insert into public.roadmap_feedback (
  roadmap_id,
  body,
  sentiment
)
select
  fr.roadmap_id,
  fr.body,
  fr.sentiment
from feedback_rows fr
where not exists (
  select 1
  from public.roadmap_feedback rf
  where rf.roadmap_id = fr.roadmap_id
    and rf.body = fr.body
);
