with inserted_facturacion_item as (
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
    'Facturación admin v1: periodo, KPIs ejecutivos y top zonas',
    'Se mejora la vista de Facturación con selector 7d/30d/90d/YTD, KPIs con variación, evolución temporal y ranking visual por zona.',
    'done',
    'web',
    'high',
    'PC1',
    date '2026-02-21'
  where not exists (
    select 1
    from public.roadmap_updates ru
    where lower(ru.title) = lower('Facturación admin v1: periodo, KPIs ejecutivos y top zonas')
  )
  returning id
),
facturacion_item as (
  select id
  from inserted_facturacion_item
  union
  select id
  from public.roadmap_updates
  where lower(title) = lower('Facturación admin v1: periodo, KPIs ejecutivos y top zonas')
),
base_admin_item as (
  select id
  from public.roadmap_updates
  where lower(title) = lower('23/02 - Pulido UX admin + reportes roadmap')
),
feedback_rows (
  roadmap_id,
  body,
  sentiment
) as (
  select
    fi.id,
    '[PC1] Entregado V1 en Facturación: toolbar con periodo activo, export unificado, KPIs con delta, gráfico de evolución y top zonas.',
    'positive'
  from facturacion_item fi
  union all
  select
    bai.id,
    '[PC1] Se integra mejora ejecutiva de Facturación al frente de Admin para lectura rápida de avance, foco comercial y pendientes por zona.',
    'positive'
  from base_admin_item bai
)
insert into public.roadmap_feedback (
  roadmap_id,
  body,
  sentiment
)
select
  fr.roadmap_id,
  fr.body,
  fr.sentiment
from feedback_rows fr
where not exists (
  select 1
  from public.roadmap_feedback rf
  where rf.roadmap_id = fr.roadmap_id
    and rf.body = fr.body
);
