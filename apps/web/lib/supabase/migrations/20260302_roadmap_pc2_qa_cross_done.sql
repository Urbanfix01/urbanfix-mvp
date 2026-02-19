-- PC2 roadmap update:
-- QA cruzado entre 3 PCs/dispositivos

with target_update as (
  select id
  from public.roadmap_updates
  where lower(title) = lower('QA cruzado entre 3 PCs/dispositivos')
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
  where lower(title) = lower('QA cruzado entre 3 PCs/dispositivos')
  limit 1
),
feedback_seed (body, sentiment) as (
  values
    (
      '[PC2] in_progress: armando protocolo de QA cruzado para release con trazabilidad por rol.',
      'neutral'
    ),
    (
      '[PC2] done: checklist de QA cruzado definido y documentado (PC1/PC2/Owner) para usar antes de cada release.',
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

