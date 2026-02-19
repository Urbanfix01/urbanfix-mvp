-- Roadmap log for PC2 mobile tasks:
-- 1) Perfil: logica de Base Operativa y guardado
-- 2) Version visible dentro de app (semver + build)

with target_updates as (
  select id, title
  from public.roadmap_updates
  where lower(title) in (
    lower('Perfil: logica de Base Operativa y guardado'),
    lower('Version visible dentro de app (semver + build)')
  )
)
update public.roadmap_updates ru
set
  status = 'done',
  updated_at = timezone('utc', now())
from target_updates tu
where ru.id = tu.id;

with target_updates as (
  select id, title
  from public.roadmap_updates
  where lower(title) in (
    lower('Perfil: logica de Base Operativa y guardado'),
    lower('Version visible dentro de app (semver + build)')
  )
),
feedback_seed (title, body, sentiment) as (
  values
    (
      'Perfil: logica de Base Operativa y guardado',
      '[PC2] in_progress: tomando tarea de perfil para estabilizar Base Operativa y guardado.',
      'neutral'
    ),
    (
      'Perfil: logica de Base Operativa y guardado',
      '[PC2] done: guardado robusto de direccion/base operativa + mejor manejo de carga/error.',
      'positive'
    ),
    (
      'Version visible dentro de app (semver + build)',
      '[PC2] in_progress: tomando tarea para mostrar version visible en Perfil/Ajustes.',
      'neutral'
    ),
    (
      'Version visible dentro de app (semver + build)',
      '[PC2] done: ahora se muestra UrbanFix App vX.Y.Z (build) en Perfil.',
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
from target_updates tu
join feedback_seed fs
  on lower(tu.title) = lower(fs.title)
where not exists (
  select 1
  from public.roadmap_feedback rf
  where rf.roadmap_id = tu.id
    and rf.body = fs.body
);

