-- PC2 roadmap update:
-- Protocolo de trabajo entre PC1-PC2-Owner

with target_update as (
  select id
  from public.roadmap_updates
  where lower(title) = lower('Protocolo de trabajo entre PC1-PC2-Owner')
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
  where lower(title) = lower('Protocolo de trabajo entre PC1-PC2-Owner')
  limit 1
),
feedback_seed (body, sentiment) as (
  values
    (
      '[PC2] in_progress: consolidando protocolo multi-PC con setup reproducible de hooks y autosync.',
      'neutral'
    ),
    (
      '[PC2] done: protocolo cerrado con scripts de setup por PC y guia de validacion de autosync.',
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

