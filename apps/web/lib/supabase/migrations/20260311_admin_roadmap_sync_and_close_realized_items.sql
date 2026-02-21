with new_updates_seed (
  title,
  description,
  status,
  area,
  priority,
  owner,
  eta_date
) as (
  values
    (
      'Tecnicos web: selector previo de perfil antes de login',
      'Se agrega paso previo de seleccion de perfil (Tecnico/Empresa/Cliente) antes del formulario de acceso.',
      'done',
      'web',
      'high',
      'PC1',
      date '2026-02-21'
    ),
    (
      'Fix Vercel web: remover dependencia expo/tsconfig.base',
      'Se corrige build de apps/web eliminando dependencia a expo/tsconfig.base en contexto de deploy web.',
      'done',
      'ops',
      'high',
      'PC1',
      date '2026-02-21'
    ),
    (
      'Auditoria roadmap: cierre de pendientes ya entregados',
      'Revision de tarjetas abiertas para cerrar items ya implementados y dejar feedback tecnico de estado real.',
      'done',
      'ops',
      'medium',
      'PC1',
      date '2026-02-21'
    )
),
inserted_new_updates as (
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
    nu.title,
    nu.description,
    nu.status,
    nu.area,
    nu.priority,
    nu.owner,
    nu.eta_date
  from new_updates_seed nu
  where not exists (
    select 1
    from public.roadmap_updates ru
    where lower(ru.title) = lower(nu.title)
  )
  returning id, title
),
status_updates (
  title,
  new_status,
  feedback_body,
  feedback_sentiment
) as (
  values
    (
      'Corregir REQUEST_DENIED en Places API',
      'done',
      '[Owner/PC1] Validado con chequeo tecnico: Places Autocomplete y Details responden OK con key actual.',
      'positive'
    ),
    (
      'Embudo web: tracking de conversion end-to-end',
      'done',
      '[PC1] Implementado tracking de embudo y lectura operativa en Admin para seguimiento de conversion.',
      'positive'
    ),
    (
      '23/02 - Pulido UX admin + reportes roadmap',
      'done',
      '[PC1] Entregado modulo ejecutivo de reportes y feedback para seguimiento rapido de avance y pendientes.',
      'positive'
    ),
    (
      '22/02 - Pulido visual home (impacto y confianza)',
      'done',
      '[PC1/PC2] Home actualizada con jerarquia visual, confianza y mejoras orientadas a conversion.',
      'positive'
    ),
    (
      'Deploy web con validacion automatica',
      'done',
      '[PC1] Flujo consolidado con validacion de build antes de promocion de cambios web.',
      'positive'
    ),
    (
      'DEPLOY: desalineacion entre base_latest y copia vieja',
      'done',
      '[PC1] Corregido: se retoma trabajo y release desde base actual de origin/master para evitar visual vieja.',
      'positive'
    ),
    (
      'Acceso diferencial para Empresas (web)',
      'in_progress',
      '[PC1] Ya iniciado en flujo pre-login con selector de perfil y contexto de acceso por audiencia.',
      'neutral'
    ),
    (
      'Acceso diferencial para Clientes (web)',
      'in_progress',
      '[PC1] Ya iniciado en flujo pre-login con entrada diferenciada y derivacion a vista de clientes.',
      'neutral'
    )
),
updated_status as (
  update public.roadmap_updates ru
  set status = su.new_status
  from status_updates su
  where lower(ru.title) = lower(su.title)
    and ru.status <> su.new_status
  returning ru.id
),
status_targets as (
  select
    ru.id,
    su.feedback_body as body,
    su.feedback_sentiment as sentiment
  from public.roadmap_updates ru
  join status_updates su
    on lower(ru.title) = lower(su.title)
),
new_update_feedback (
  title,
  body,
  sentiment
) as (
  values
    (
      'Tecnicos web: selector previo de perfil antes de login',
      '[PC1] Entregado en web: seleccion de perfil antes del login para mejorar direccion y conversion.',
      'positive'
    ),
    (
      'Fix Vercel web: remover dependencia expo/tsconfig.base',
      '[PC1] Entregado: build web estable en Vercel sin dependencia de tsconfig de Expo.',
      'positive'
    ),
    (
      'Auditoria roadmap: cierre de pendientes ya entregados',
      '[PC1] Se analiza backlog abierto y se ajusta estado real de items ya implementados.',
      'positive'
    )
),
new_targets as (
  select
    ru.id,
    nuf.body,
    nuf.sentiment
  from public.roadmap_updates ru
  join new_update_feedback nuf
    on lower(ru.title) = lower(nuf.title)
),
all_feedback as (
  select id as roadmap_id, body, sentiment from status_targets
  union all
  select id as roadmap_id, body, sentiment from new_targets
)
insert into public.roadmap_feedback (
  roadmap_id,
  body,
  sentiment
)
select
  af.roadmap_id,
  af.body,
  af.sentiment
from all_feedback af
where not exists (
  select 1
  from public.roadmap_feedback rf
  where rf.roadmap_id = af.roadmap_id
    and rf.body = af.body
);
