alter table public.roadmap_updates
  add column if not exists source_key text,
  add column if not exists source_branch text,
  add column if not exists source_commit text,
  add column if not exists source_files jsonb not null default '[]'::jsonb;

with target as (
  select id
  from public.roadmap_updates
  where source_key = 'manual:pc2:web-tecnicos-login-visual-v1'
     or lower(title) = lower('Web: mejora visual login panel tecnicos')
  order by updated_at desc nulls last, created_at desc nulls last
  limit 1
),
updated as (
  update public.roadmap_updates ru
  set
    title = 'Web: mejora visual login panel tecnicos',
    description = 'Rediseno visual del bloque de acceso en apps/web/app/tecnicos/page.tsx: cabecera mas clara, tabs ingresar/crear cuenta, labels en campos, mensajes con fondo y jerarquia visual mas profesional sin tocar logica auth.',
    status = 'done',
    area = 'web',
    priority = 'high',
    owner = 'PC2',
    eta_date = date '2026-02-20',
    source_key = 'manual:pc2:web-tecnicos-login-visual-v1',
    source_branch = 'web/pc2-landing-profesional-v1',
    source_files = jsonb_build_array('apps/web/app/tecnicos/page.tsx')
  where ru.id in (select id from target)
  returning ru.id
),
inserted as (
  insert into public.roadmap_updates (
    title,
    description,
    status,
    area,
    priority,
    owner,
    eta_date,
    source_key,
    source_branch,
    source_files
  )
  select
    'Web: mejora visual login panel tecnicos',
    'Rediseno visual del bloque de acceso en apps/web/app/tecnicos/page.tsx: cabecera mas clara, tabs ingresar/crear cuenta, labels en campos, mensajes con fondo y jerarquia visual mas profesional sin tocar logica auth.',
    'done',
    'web',
    'high',
    'PC2',
    date '2026-02-20',
    'manual:pc2:web-tecnicos-login-visual-v1',
    'web/pc2-landing-profesional-v1',
    jsonb_build_array('apps/web/app/tecnicos/page.tsx')
  where not exists (select 1 from target)
  returning id
),
upsert_item as (
  select id from updated
  union all
  select id from inserted
  union all
  select id from target
),
feedback_rows as (
  select
    '[PC2] in_progress: Se inicia mejora visual del login de panel tecnicos con foco en claridad y conversion.'::text as body,
    'neutral'::text as sentiment
  union all
  select
    '[PC2] done: Login de panel tecnicos redisenado y validado con npm run lint + npm run build en apps/web.'::text,
    'positive'::text
)
insert into public.roadmap_feedback (roadmap_id, body, sentiment)
select ui.id, fr.body, fr.sentiment
from upsert_item ui
cross join feedback_rows fr
where not exists (
  select 1
  from public.roadmap_feedback rf
  where rf.roadmap_id = ui.id
    and rf.body = fr.body
);
