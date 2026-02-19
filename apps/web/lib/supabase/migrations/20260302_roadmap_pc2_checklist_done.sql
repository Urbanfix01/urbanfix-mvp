-- PC2 roadmap closure:
-- Checklist pre-push obligatorio (PC2)

with target_update as (
  select id
  from public.roadmap_updates
  where lower(title) = lower('Checklist pre-push obligatorio (PC2)')
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
  where lower(title) = lower('Checklist pre-push obligatorio (PC2)')
  limit 1
),
feedback_seed (body, sentiment) as (
  values
    (
      '[PC2] in_progress: implementando enforcement del checklist pre-push para no depender solo de validacion manual.',
      'neutral'
    ),
    (
      '[PC2] done: hook pre-push ahora bloquea push si apps/web falla lint/build y mantiene sincronizacion/rebase segura.',
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

