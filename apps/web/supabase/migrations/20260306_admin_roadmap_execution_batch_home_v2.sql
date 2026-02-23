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
      'HOME V2: switch de audiencias Tecnicos/Empresas/Clientes',
      'Se elimino "Para" en el switch principal y se unifico la nomenclatura para una lectura mas clara.',
      'done',
      'web',
      'high',
      'PC1',
      date '2026-02-20'
    ),
    (
      'HOME V2: vista dedicada para Clientes (cotizar reparaciones)',
      'Se implemento una vista principal para clientes finales que necesitan solicitar y confirmar una reparacion.',
      'done',
      'web',
      'high',
      'PC1',
      date '2026-02-20'
    ),
    (
      'HOME V2: flujo adaptativo para Clientes',
      'Se agrego bloque "Flujo para clientes" para que el proceso cambie segun la audiencia seleccionada.',
      'done',
      'web',
      'medium',
      'PC1',
      date '2026-02-20'
    ),
    (
      'HOME V2: CTA de descarga Android/iOS en vistas principales',
      'Se incluyeron botones de descarga para Android e iOS (placeholder) en los paneles principales de la home.',
      'done',
      'web',
      'medium',
      'PC1',
      date '2026-02-20'
    ),
    (
      'HOME V2: logo principal integrado desde carpeta de marca',
      'El header ya usa el logo principal definido por branding para reforzar consistencia visual.',
      'done',
      'web',
      'medium',
      'PC1',
      date '2026-02-20'
    ),
    (
      'DEPLOY: desalineacion entre base_latest y copia vieja',
      'Se detecto que parte del equipo esta validando sobre una copia vieja del proyecto; se requiere unificar base activa.',
      'in_progress',
      'ops',
      'high',
      'PC1 + Owner',
      date '2026-02-20'
    ),
    (
      'DEPLOY: promocionar HOME V2 al entorno productivo vigente',
      'Publicar en el entorno de produccion correcto para que los cambios visibles no queden solo en rama de trabajo.',
      'planned',
      'ops',
      'high',
      'Owner + PC1',
      date '2026-02-21'
    ),
    (
      'ROADMAP: lote consolidado de ejecucion Home V2',
      'Registro unico de cierre parcial con feedback tecnico para mantener trazabilidad entre PCs.',
      'done',
      'ops',
      'medium',
      'PC1',
      date '2026-02-20'
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
      'HOME V2: switch de audiencias Tecnicos/Empresas/Clientes',
      '[PC1] Cambio aplicado y visible en la rama activa de trabajo.',
      'positive'
    ),
    (
      'HOME V2: vista dedicada para Clientes (cotizar reparaciones)',
      '[PC1] Vista clientes creada con propuesta especifica para solicitud de reparaciones.',
      'positive'
    ),
    (
      'HOME V2: flujo adaptativo para Clientes',
      '[PC1] El bloque de flujo ahora cambia a clientes cuando se selecciona esa audiencia.',
      'positive'
    ),
    (
      'HOME V2: CTA de descarga Android/iOS en vistas principales',
      '[PC1] Botones de Android/iOS agregados para reforzar conversion mobile.',
      'neutral'
    ),
    (
      'HOME V2: logo principal integrado desde carpeta de marca',
      '[PC1] Header alineado con branding oficial para mejorar percepcion de producto.',
      'positive'
    ),
    (
      'DEPLOY: desalineacion entre base_latest y copia vieja',
      '[PC1] Bloqueante operativo: validar y desplegar desde la base correcta para evitar regresiones visuales.',
      'negative'
    ),
    (
      'DEPLOY: promocionar HOME V2 al entorno productivo vigente',
      '[Owner] Pendiente merge/deploy sobre el entorno que hoy consumen usuarios.',
      'neutral'
    ),
    (
      'ROADMAP: lote consolidado de ejecucion Home V2',
      '[PC1] Se registra esta bateria para seguimiento comun entre PC1, PC2 y Owner.',
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
