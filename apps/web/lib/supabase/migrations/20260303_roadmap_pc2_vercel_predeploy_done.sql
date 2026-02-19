-- PC2 roadmap update:
-- Guard de pre-deploy para Vercel en produccion

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
  'Pre-deploy check Vercel (master + proyecto correcto)',
  'Bloquear deploy web si no esta en master sincronizado o si no se relinkea al proyecto urbanfix-web.',
  'done',
  'ops',
  'high',
  'PC2',
  current_date
where not exists (
  select 1
  from public.roadmap_updates ru
  where lower(ru.title) = lower('Pre-deploy check Vercel (master + proyecto correcto)')
);

with target_update as (
  select id
  from public.roadmap_updates
  where lower(title) = lower('Pre-deploy check Vercel (master + proyecto correcto)')
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
  where lower(title) = lower('Pre-deploy check Vercel (master + proyecto correcto)')
  limit 1
),
feedback_seed (body, sentiment) as (
  values
    (
      '[PC2] in_progress: agregando guard de pre-deploy para validar master actualizado y proyecto Vercel correcto.',
      'positive'
    ),
    (
      '[PC2] done: npm run deploy:web:precheck + deploy:web:prod bloquean deploy si no coincide con origin/master o falla relink a urbanfix-web.',
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
      '[PC2] in_progress: lint web bloqueado al subir migraciones por config no compatible.',
      'neutral'
    ),
    (
      '[PC2] done: fallback .eslintrc.js operativo, lint/build vuelve a pasar en pre-push.',
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
