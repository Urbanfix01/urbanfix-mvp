alter table public.roadmap_updates
  add column if not exists source_key text,
  add column if not exists source_branch text,
  add column if not exists source_commit text,
  add column if not exists source_files jsonb not null default '[]'::jsonb;

with target as (
  select id
  from public.roadmap_updates
  where source_key = 'manual:pc2:web-homepage-imagenes-v1'
     or lower(title) = lower('Web: homepage con mas imagenes para mejorar atraccion')
  order by updated_at desc nulls last, created_at desc nulls last
  limit 1
),
updated as (
  update public.roadmap_updates ru
  set
    title = 'Web: homepage con mas imagenes para mejorar atraccion',
    description = 'Se agregan mas recursos visuales en apps/web/app/page.tsx: tarjetas de segmentos con imagen, galeria visual dedicada y bloques de comparativa/testimonios con imagenes para reforzar percepcion profesional.',
    status = 'done',
    area = 'web',
    priority = 'high',
    owner = 'PC2',
    eta_date = date '2026-02-20',
    source_key = 'manual:pc2:web-homepage-imagenes-v1',
    source_branch = 'web/pc2-landing-profesional-v1',
    source_files = jsonb_build_array('apps/web/app/page.tsx')
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
    'Web: homepage con mas imagenes para mejorar atraccion',
    'Se agregan mas recursos visuales en apps/web/app/page.tsx: tarjetas de segmentos con imagen, galeria visual dedicada y bloques de comparativa/testimonios con imagenes para reforzar percepcion profesional.',
    'done',
    'web',
    'high',
    'PC2',
    date '2026-02-20',
    'manual:pc2:web-homepage-imagenes-v1',
    'web/pc2-landing-profesional-v1',
    jsonb_build_array('apps/web/app/page.tsx')
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
    '[PC2] in_progress: Se inicia mejora visual de homepage agregando imagenes en secciones comerciales.'::text as body,
    'neutral'::text as sentiment
  union all
  select
    '[PC2] done: Homepage con galeria y tarjetas con imagenes, validada con npm run lint + npm run build en apps/web.'::text,
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
