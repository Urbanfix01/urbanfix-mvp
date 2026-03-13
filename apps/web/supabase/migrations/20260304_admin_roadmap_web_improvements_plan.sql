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
      'Web: unificar sistema visual (tokens + componentes)',
      'Consolidar tipografia, escalas, espaciados y estilos base para evitar inconsistencias entre home, admin y landing.',
      'planned',
      'web',
      'high',
      'PC1',
      date '2026-03-03'
    ),
    (
      'Home: optimizacion de conversion y confianza',
      'Agregar prueba social, casos reales, propuesta de valor mas directa y CTA principal unico para mejorar conversion.',
      'planned',
      'web',
      'high',
      'PC1 + PC2',
      date '2026-03-04'
    ),
    (
      'Admin Facturacion: mapa de Argentina con zonas reales',
      'Extender el mapa actual con normalizacion de zonas y fallback para nombres no estandar.',
      'in_progress',
      'web',
      'high',
      'PC1',
      date '2026-03-04'
    ),
    (
      'Normalizacion de ubicaciones de perfiles',
      'Estandarizar city/coverage_area para que analytics y mapa agrupen por zona de forma consistente.',
      'planned',
      'backend',
      'high',
      'PC2',
      date '2026-03-05'
    ),
    (
      'Embudo web: tracking de conversion end-to-end',
      'Medir CTA, inicio de registro, alta de tecnico y activacion para detectar cuellos de botella.',
      'planned',
      'web',
      'medium',
      'PC2',
      date '2026-03-05'
    ),
    (
      'Performance web: Core Web Vitals',
      'Optimizar carga de imagenes y recursos criticos para mejorar LCP/CLS y experiencia inicial.',
      'planned',
      'web',
      'medium',
      'PC1',
      date '2026-03-06'
    ),
    (
      'Flujo release web blindado a produccion',
      'Asegurar deploy automatico desde master con checks minimos y sin promociones manuales desde ramas viejas.',
      'in_progress',
      'ops',
      'high',
      'Owner + PC1',
      date '2026-03-03'
    ),
    (
      'QA visual cross-device y cross-browser',
      'Definir checklist visual para desktop/mobile y navegadores clave antes de cada release web.',
      'planned',
      'ops',
      'medium',
      'PC1 + PC2 + Owner',
      date '2026-03-07'
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
      'Web: unificar sistema visual (tokens + componentes)',
      '[PC1] Base visual unica para evitar diferencias entre secciones y acelerar iteraciones.',
      'positive'
    ),
    (
      'Home: optimizacion de conversion y confianza',
      '[PC1] Enfocar la home en conversion: claridad de valor, confianza y CTA principal.',
      'positive'
    ),
    (
      'Admin Facturacion: mapa de Argentina con zonas reales',
      '[PC1] Ya hay primera version; falta mejorar match de zonas no estandar.',
      'neutral'
    ),
    (
      'Normalizacion de ubicaciones de perfiles',
      '[PC2] Revisar city/coverage_area y reglas de normalizacion para reportes consistentes.',
      'neutral'
    ),
    (
      'Embudo web: tracking de conversion end-to-end',
      '[PC2] Definir eventos de embudo y tablero de lectura semanal.',
      'neutral'
    ),
    (
      'Performance web: Core Web Vitals',
      '[PC1] Priorizar carga inicial y optimizacion de assets criticos.',
      'neutral'
    ),
    (
      'Flujo release web blindado a produccion',
      '[Owner/PC1] Cerrar deploy por master y prevenir promociones manuales de ramas desactualizadas.',
      'neutral'
    ),
    (
      'QA visual cross-device y cross-browser',
      '[PC1/PC2/Owner] Checklist comun para evitar regresiones visuales antes de publicar.',
      'neutral'
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
