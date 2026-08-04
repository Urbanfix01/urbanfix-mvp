export const laborPriceIndex = {
  baseLabel: 'Base importada marzo 2026',
  activeLabel: 'Vigente UrbanFix',
  sourceLabel: 'ICC INDEC mano de obra',
  sourceUrl: 'https://www.indec.gob.ar/indec/web/Nivel4-Tema-3-5-33',
  periodLabel: 'Junio 2026',
  publishedAtLabel: '17/07/2026',
  accumulatedPercent: 12.1,
  monthlyPercent: 3.3,
};

export const DIRECT_LABOR_PRICE_SOURCES = ['aaieric_electricidad_2026_07'] as const;

export const isDirectLaborPriceSource = (sourceRef: string | null | undefined) =>
  DIRECT_LABOR_PRICE_SOURCES.includes(
    String(sourceRef || '').trim().toLowerCase() as (typeof DIRECT_LABOR_PRICE_SOURCES)[number]
  );

export const getLaborPriceMultiplier = () => 1 + laborPriceIndex.accumulatedPercent / 100;

export const getUpdatedLaborPrice = (price: number) => {
  if (!Number.isFinite(price) || price <= 0) return 0;
  return Math.round(price * getLaborPriceMultiplier());
};

export const getCatalogLaborPrice = (price: number, sourceRef?: string | null) => {
  if (!Number.isFinite(price) || price <= 0) return 0;
  return isDirectLaborPriceSource(sourceRef) ? Math.round(price) : getUpdatedLaborPrice(price);
};

export const getLaborPriceUpdatePercentLabel = () =>
  `+${laborPriceIndex.accumulatedPercent.toLocaleString('es-AR')}%`;
