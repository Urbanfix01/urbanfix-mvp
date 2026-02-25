with seed_updates (
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
      'Acceso diferencial para Empresas (web)',
      'Separar flujo de acceso y onboarding para cuentas de empresa: copy, credenciales, y vista inicial orientada a gestión comercial/equipos.',
      'planned',
      'web',
      'high',
      'PC1 + PC2',
      date '2026-02-22'
    ),
    (
      'Acceso diferencial para Clientes (web)',
      'Crear flujo específico para clientes finales que llegan a cotizar una reparación: entrada simple, contexto de solicitud y seguimiento de presupuesto.',
      'planned',
      'web',
      'high',
      'PC1 + PC2',
      date '2026-02-22'
    )
),
inserted_updates as (
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
    su.title,
    su.description,
    su.status,
    su.area,
    su.priority,
    su.owner,
    su.eta_date
  from seed_updates su
  where not exists (
    select 1
    from public.roadmap_updates ru
    where lower(ru.title) = lower(su.title)
  )
  returning id, title
),
target_updates as (
  select id, title
  from inserted_updates
  union
  select id, title
  from public.roadmap_updates
  where lower(title) in (
    select lower(title) from seed_updates
  )
),
seed_feedback (
  title,
  body,
  sentiment
) as (
  values
    (
      'Acceso diferencial para Empresas (web)',
      '[PC1] Se registra iniciativa para diferenciar acceso de empresas respecto de técnicos, con foco en operación comercial.',
      'neutral'
    ),
    (
      'Acceso diferencial para Clientes (web)',
      '[PC1] Se registra iniciativa para diferenciar acceso de clientes y reducir abandono en primer contacto.',
      'neutral'
    )
)
insert into public.roadmap_feedback (
  roadmap_id,
  body,
  sentiment
)
select
  tu.id,
  sf.body,
  sf.sentiment
from target_updates tu
join seed_feedback sf
  on lower(sf.title) = lower(tu.title)
where not exists (
  select 1
  from public.roadmap_feedback rf
  where rf.roadmap_id = tu.id
    and rf.body = sf.body
);
