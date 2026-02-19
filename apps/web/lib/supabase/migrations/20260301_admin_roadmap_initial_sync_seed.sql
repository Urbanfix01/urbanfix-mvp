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
      'Protocolo de trabajo entre PC1-PC2-Owner',
      'Estandarizar el flujo de ramas, pull/rebase antes de push, y registro de cambios en Admin/Roadmap.',
      'in_progress',
      'ops',
      'high',
      'PC1 + PC2 + Owner',
      date '2026-02-20'
    ),
    (
      'Checklist pre-push obligatorio (PC2)',
      'Antes de push: sync con main, resolver conflictos locales, correr lint/build del modulo tocado y documentar cambio.',
      'planned',
      'ops',
      'high',
      'PC2',
      date '2026-02-21'
    ),
    (
      'Mejora del buscador de direcciones en JobConfig',
      'Hacer autocomplete mas estable y con mas resultados sin frenar el input al escribir 2 letras.',
      'in_progress',
      'mobile',
      'high',
      'PC1',
      date '2026-02-22'
    ),
    (
      'Corregir REQUEST_DENIED en Places API',
      'Revisar Billing, restricciones de API key y servicios habilitados para eliminar errores en direccion de obra.',
      'blocked',
      'ops',
      'high',
      'Owner',
      date '2026-02-20'
    ),
    (
      'Fluidez iOS en slider horizontal',
      'Ajustar inercia, decelerationRate y snapping para una sensacion similar a iOS nativo.',
      'in_progress',
      'mobile',
      'medium',
      'PC1',
      date '2026-02-23'
    ),
    (
      'JobConfig: Presupuestador por m2/ml (UI simplificada)',
      'Eliminar label "Calculadora rapida", mantener Presupuestador m2/ml y limpiar efecto de pastilla dentro de pastilla.',
      'in_progress',
      'mobile',
      'medium',
      'PC1',
      date '2026-02-23'
    ),
    (
      'Perfil: logica de Base Operativa y guardado',
      'Revisar errores de autocompletado en perfil y garantizar guardado consistente de direccion operativa.',
      'planned',
      'mobile',
      'high',
      'PC2',
      date '2026-02-24'
    ),
    (
      'Version visible dentro de app (semver + build)',
      'Mostrar version en algun punto de la app en formato X.Y.Z(build) para soporte y QA.',
      'planned',
      'mobile',
      'medium',
      'PC2',
      date '2026-02-24'
    ),
    (
      'Admin web: pestaña Roadmap + feedback',
      'Modulo para cargar avances y comentarios internos, ya desplegado en produccion.',
      'done',
      'web',
      'high',
      'PC1',
      date '2026-02-19'
    ),
    (
      'Deploy web con validacion automatica',
      'Asegurar que los cambios de web pasen lint/build antes del deploy a produccion.',
      'in_progress',
      'web',
      'medium',
      'PC1',
      date '2026-02-21'
    ),
    (
      'Release iOS 1.3.0 a TestFlight',
      'Generar build nuevo con build number incremental y subir sin duplicados.',
      'planned',
      'ops',
      'high',
      'Owner + PC1',
      date '2026-02-22'
    ),
    (
      'QA cruzado entre 3 PCs/dispositivos',
      'Definir ronda de prueba de regresion antes de cada release grande.',
      'planned',
      'ops',
      'medium',
      'PC1 + PC2 + Owner',
      date '2026-02-25'
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
      'Protocolo de trabajo entre PC1-PC2-Owner',
      '[PC1] Toda actualizacion importante se registra primero en esta pestaña antes de mergear.',
      'neutral'
    ),
    (
      'Protocolo de trabajo entre PC1-PC2-Owner',
      '[Owner] Si un item cambia de prioridad, actualizar estado y ETA el mismo dia.',
      'neutral'
    ),
    (
      'Checklist pre-push obligatorio (PC2)',
      '[PC2] Antes de push: pull --rebase y validacion del modulo tocado.',
      'positive'
    ),
    (
      'Mejora del buscador de direcciones en JobConfig',
      '[PC1] Objetivo: no congelar input y devolver sugerencias progresivas mas rapido.',
      'positive'
    ),
    (
      'Corregir REQUEST_DENIED en Places API',
      '[Owner] Pendiente habilitar Billing y revisar restricciones de la API key de Google Maps/Places.',
      'negative'
    ),
    (
      'Fluidez iOS en slider horizontal',
      '[PC1] Se ajustaran parametros de scroll para sensacion nativa iOS.',
      'neutral'
    ),
    (
      'JobConfig: Presupuestador por m2/ml (UI simplificada)',
      '[PC1] Mantener foco en claridad visual y menos capas de contenedores.',
      'positive'
    ),
    (
      'Perfil: logica de Base Operativa y guardado',
      '[PC2] Revisar ruta de guardado y mensajes de error de Places.',
      'neutral'
    ),
    (
      'Version visible dentro de app (semver + build)',
      '[Owner] Necesario para soporte: poder leer version exacta de usuario en pantalla.',
      'neutral'
    ),
    (
      'Admin web: pestaña Roadmap + feedback',
      '[PC1] Implementado y desplegado en web para seguimiento entre equipos.',
      'positive'
    ),
    (
      'Deploy web con validacion automatica',
      '[PC1] Mantener criterio minimo: lint + build OK antes de publicar.',
      'neutral'
    ),
    (
      'Release iOS 1.3.0 a TestFlight',
      '[Owner] Recordatorio: incrementar build number para evitar rechazo por build duplicado.',
      'neutral'
    ),
    (
      'QA cruzado entre 3 PCs/dispositivos',
      '[PC1/PC2/Owner] Usar esta tarjeta para registrar hallazgos de regresion por release.',
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
