with targets as (
  select
    id,
    case
      when source_key is not null then 'done'
      else 'planned'
    end as next_status
  from public.roadmap_updates
  where status = 'in_progress'
),
updated as (
  update public.roadmap_updates ru
  set
    status = targets.next_status,
    updated_at = now()
  from targets
  where ru.id = targets.id
  returning ru.id, ru.status
),
feedback_payload as (
  select
    updated.id as roadmap_id,
    case
      when updated.status = 'done'
        then '[AUTO] Limpieza de tablero: se cerro este item en proceso por provenir de sync de codigo.'
      else '[AUTO] Limpieza de tablero: este item en proceso volvio a planned para re-priorizacion.'
    end as body,
    'neutral'::text as sentiment
  from updated
)
insert into public.roadmap_feedback (
  roadmap_id,
  body,
  sentiment
)
select
  fp.roadmap_id,
  fp.body,
  fp.sentiment
from feedback_payload fp
where not exists (
  select 1
  from public.roadmap_feedback rf
  where rf.roadmap_id = fp.roadmap_id
    and rf.body = fp.body
);
