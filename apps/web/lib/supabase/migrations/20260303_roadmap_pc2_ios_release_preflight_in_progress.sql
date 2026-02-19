-- PC2 roadmap update:
-- Release iOS 1.3.0 a TestFlight (preflight en progreso)

with target_update as (
  select id
  from public.roadmap_updates
  where lower(title) = lower('Release iOS 1.3.0 a TestFlight')
  limit 1
)
update public.roadmap_updates ru
set
  status = 'in_progress',
  updated_at = timezone('utc', now())
from target_update tu
where ru.id = tu.id;

with target_update as (
  select id
  from public.roadmap_updates
  where lower(title) = lower('Release iOS 1.3.0 a TestFlight')
  limit 1
),
feedback_seed (body, sentiment) as (
  values
    (
      '[PC2] in_progress: preflight iOS listo (script + checklist) para validar version/build antes de compilar.',
      'positive'
    ),
    (
      '[PC2] pendiente Owner+PC1: ejecutar build y submit en EAS/TestFlight cuando cierren blockers de Places y JobConfig.',
      'neutral'
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
