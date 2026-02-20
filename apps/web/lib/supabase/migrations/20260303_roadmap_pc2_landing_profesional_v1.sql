with upsert_item as (
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
  values (
    'Web: profesionalizar landing principal para conversion',
    'Rediseno de apps/web/app/page.tsx para mejorar presentacion comercial: hero mas fuerte, seccion por segmentos, comparativa antes/despues, prueba social y CTA final optimizado. Incluye fallback de lint removiendo apps/web/eslint.config.mjs por incompatibilidad con ESLint 8 en este repo.',
    'done',
    'web',
    'high',
    'PC2',
    date '2026-02-20',
    'manual:pc2:web-landing-profesional-v1',
    'web/pc2-landing-profesional-v1',
    jsonb_build_array(
      'apps/web/app/page.tsx',
      'apps/web/eslint.config.mjs'
    )
  )
  on conflict (source_key)
  do update set
    title = excluded.title,
    description = excluded.description,
    status = excluded.status,
    area = excluded.area,
    priority = excluded.priority,
    owner = excluded.owner,
    eta_date = excluded.eta_date,
    source_branch = excluded.source_branch,
    source_files = excluded.source_files
  returning id
)
insert into public.roadmap_feedback (
  roadmap_id,
  body,
  sentiment
)
select
  ui.id,
  fb.body,
  fb.sentiment
from upsert_item ui
cross join (
  values
    (
      '[PC2] in_progress: Se inicia profesionalizacion visual/comercial de landing principal para mejorar atraccion y conversion.',
      'neutral'
    ),
    (
      '[PC2] done: Landing principal actualizada y validada con npm run lint + npm run build en apps/web.',
      'positive'
    )
) as fb(body, sentiment)
where not exists (
  select 1
  from public.roadmap_feedback rf
  where rf.roadmap_id = ui.id
    and rf.body = fb.body
);
