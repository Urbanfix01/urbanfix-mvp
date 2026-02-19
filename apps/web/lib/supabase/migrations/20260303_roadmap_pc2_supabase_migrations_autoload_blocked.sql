-- PC2 roadmap update:
-- Automatizar carga de migraciones Supabase

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
  'Automatizar carga de migraciones Supabase (PC2)',
  'Agregar comando unico para aplicar apps/web/lib/supabase/migrations sin carga manual de SQL.',
  'blocked',
  'ops',
  'high',
  'PC2 + Owner',
  current_date
where not exists (
  select 1
  from public.roadmap_updates ru
  where lower(ru.title) = lower('Automatizar carga de migraciones Supabase (PC2)')
);

with target_update as (
  select id
  from public.roadmap_updates
  where lower(title) = lower('Automatizar carga de migraciones Supabase (PC2)')
  limit 1
)
update public.roadmap_updates ru
set
  status = 'blocked',
  updated_at = timezone('utc', now())
from target_update tu
where ru.id = tu.id;

with target_update as (
  select id
  from public.roadmap_updates
  where lower(title) = lower('Automatizar carga de migraciones Supabase (PC2)')
  limit 1
),
feedback_seed (body, sentiment) as (
  values
    (
      '[PC2] in_progress: implementado npm run migrations:push para aplicar migraciones de apps/web/lib/supabase/migrations.',
      'positive'
    ),
    (
      '[PC2] in_progress: workflow .github/workflows/supabase-migrations-push.yml listo para ejecutar carga automatica en master.',
      'positive'
    ),
    (
      '[PC2] blocked: esta terminal no tiene SUPABASE_DB_URL ni SUPABASE_ACCESS_TOKEN/DB_PASSWORD para ejecutar db push remoto.',
      'negative'
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
