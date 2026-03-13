with target_titles(title) as (
  values
    ('Embudo web: tracking de conversion end-to-end'),
    ('Performance web: Core Web Vitals'),
    ('23/02 - Pulido UX admin + reportes roadmap')
),
updated as (
  update public.roadmap_updates ru
  set status = 'in_progress'
  where lower(ru.title) in (
    select lower(tt.title)
    from target_titles tt
  )
  returning ru.id, ru.title
),
all_targets as (
  select ru.id, ru.title
  from public.roadmap_updates ru
  where lower(ru.title) in (
    select lower(tt.title)
    from target_titles tt
  )
),
seed_feedback(title, body, sentiment) as (
  values
    (
      'Embudo web: tracking de conversion end-to-end',
      '[PC1] Se implemento tracking de embudo en home + API analytics + panel de embudo en Admin/Actividad.',
      'positive'
    ),
    (
      'Performance web: Core Web Vitals',
      '[PC1] Se optimizaron imagenes de home con sizes responsivos para bajar carga innecesaria en mobile.',
      'neutral'
    ),
    (
      '23/02 - Pulido UX admin + reportes roadmap',
      '[PC1] Se agrego modulo visual de embudo con export CSV para lectura ejecutiva rapida.',
      'positive'
    )
)
insert into public.roadmap_feedback (
  roadmap_id,
  body,
  sentiment
)
select
  at.id,
  sf.body,
  sf.sentiment
from all_targets at
join seed_feedback sf
  on lower(sf.title) = lower(at.title)
where not exists (
  select 1
  from public.roadmap_feedback rf
  where rf.roadmap_id = at.id
    and rf.body = sf.body
);
