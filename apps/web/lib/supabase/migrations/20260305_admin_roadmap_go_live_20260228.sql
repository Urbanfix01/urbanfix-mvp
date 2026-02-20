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
      'GO-LIVE WEB 28/02: cierre operativo total',
      'Objetivo principal: web operativa, estable y competitiva en produccion para el 28/02/2026.',
      'in_progress',
      'ops',
      'high',
      'Owner + PC1 + PC2',
      date '2026-02-28'
    ),
    (
      '20/02 - Scope freeze + criterios de salida',
      'Cerrar alcance final, definir P0/P1 y confirmar checklist de salida de release.',
      'in_progress',
      'ops',
      'high',
      'Owner + PC1',
      date '2026-02-20'
    ),
    (
      '21/02 - Cierre bugs P0/P1 en flujos criticos',
      'Resolver errores en landing, auth, presupuesto y admin/roadmap para garantizar operacion.',
      'planned',
      'web',
      'high',
      'PC1 + PC2',
      date '2026-02-21'
    ),
    (
      '22/02 - Pulido visual home (impacto y confianza)',
      'Alinear jerarquia visual, copy de conversion, casos reales e imagenes finales de alta calidad.',
      'planned',
      'web',
      'high',
      'PC2',
      date '2026-02-22'
    ),
    (
      '23/02 - Pulido UX admin + reportes roadmap',
      'Mejorar lectura de estado, pendientes y avance para seguimiento ejecutivo rapido.',
      'planned',
      'web',
      'medium',
      'PC1',
      date '2026-02-23'
    ),
    (
      '24/02 - Hardening tecnico y seguridad base',
      'Validar roles/RLS sensibles, rutas admin y configuracion de entorno para minimizar riesgo.',
      'planned',
      'backend',
      'high',
      'PC1',
      date '2026-02-24'
    ),
    (
      '25/02 - Performance web (Core Web Vitals)',
      'Optimizar LCP/CLS/INP con foco en carga inicial, imagenes, scripts y recursos criticos.',
      'planned',
      'web',
      'medium',
      'PC1',
      date '2026-02-25'
    ),
    (
      '26/02 - QA integral cross-device/cross-browser',
      'Ejecutar regresion completa en mobile/desktop con Safari, Chrome y Edge.',
      'planned',
      'ops',
      'high',
      'PC1 + PC2 + Owner',
      date '2026-02-26'
    ),
    (
      '27/02 - Release Candidate (solo hotfix)',
      'Congelar features, publicar RC y aceptar unicamente fixes criticos de ultima milla.',
      'planned',
      'ops',
      'high',
      'Owner + PC1',
      date '2026-02-27'
    ),
    (
      '28/02 - Deploy final + monitoreo activo 24h',
      'Publicar release final y monitorear estabilidad, conversion y errores durante el primer dia.',
      'planned',
      'ops',
      'high',
      'Owner + PC1 + PC2',
      date '2026-02-28'
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
all_target_updates as (
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
      'GO-LIVE WEB 28/02: cierre operativo total',
      '[Owner] Meta acordada: llegar al 28/02 con release competitivo y estable en produccion.',
      'positive'
    ),
    (
      '20/02 - Scope freeze + criterios de salida',
      '[PC1] Alcance cerrado por prioridad; todo lo fuera de P0/P1 pasa a post-release.',
      'neutral'
    ),
    (
      '21/02 - Cierre bugs P0/P1 en flujos criticos',
      '[PC1/PC2] Registrar cada fix con evidencia y validacion funcional.',
      'neutral'
    ),
    (
      '22/02 - Pulido visual home (impacto y confianza)',
      '[PC2] Priorizar claridad de mensaje, confianza y conversion.',
      'positive'
    ),
    (
      '23/02 - Pulido UX admin + reportes roadmap',
      '[PC1] Asegurar lectura ejecutiva simple de avance, bloqueos y pendientes.',
      'neutral'
    ),
    (
      '24/02 - Hardening tecnico y seguridad base',
      '[PC1] Validar permisos, rutas sensibles y configuracion de produccion.',
      'neutral'
    ),
    (
      '25/02 - Performance web (Core Web Vitals)',
      '[PC1] Objetivo: mejorar carga inicial y estabilidad visual percibida.',
      'neutral'
    ),
    (
      '26/02 - QA integral cross-device/cross-browser',
      '[PC1/PC2/Owner] QA de regresion completa antes del RC.',
      'neutral'
    ),
    (
      '27/02 - Release Candidate (solo hotfix)',
      '[Owner] Desde RC no entran features nuevas; solo correcciones criticas.',
      'neutral'
    ),
    (
      '28/02 - Deploy final + monitoreo activo 24h',
      '[Owner + PC1] Seguimiento de errores y metricas durante las primeras 24 horas.',
      'positive'
    )
)
insert into public.roadmap_feedback (
  roadmap_id,
  body,
  sentiment
)
select
  atu.id,
  sf.body,
  sf.sentiment
from all_target_updates atu
join seed_feedback sf
  on lower(sf.title) = lower(atu.title)
where not exists (
  select 1
  from public.roadmap_feedback rf
  where rf.roadmap_id = atu.id
    and rf.body = sf.body
);
