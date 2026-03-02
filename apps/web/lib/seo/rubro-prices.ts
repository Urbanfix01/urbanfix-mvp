import { rubros, type CiudadKey, type RubroKey } from './urbanfix-data';

type PriceReference = {
  label: string;
  unit: string;
  reference: number;
  min: number;
  max: number;
};

const basePriceByRubro: Record<RubroKey, number> = {
  electricidad: 32000,
  plomeria: 30000,
  pintura: 25000,
  albanileria: 28000,
  gasista: 34000,
  impermeabilizacion: 36000,
  techos: 42000,
  carpinteria: 31000,
  herreria: 33000,
  'aire-acondicionado': 38000,
  refrigeracion: 41000,
  cerrajeria: 30000,
  'durlock-yeseria': 29000,
  'pisos-revestimientos': 32000,
  'vidrieria-aberturas': 30000,
  soldadura: 35000,
  'portones-automaticos': 45000,
  'alarmas-camaras': 30000,
  'redes-datos': 29000,
  calefaccion: 36000,
  'energia-solar': 60000,
  'jardineria-poda': 22000,
  'limpieza-post-obra': 20000,
  'control-plagas': 18000,
  'mantenimiento-piletas': 26000,
  'mantenimiento-consorcios': 30000,
  'mantenimiento-comercial': 32000,
  demolicion: 50000,
  excavaciones: 65000,
  'movimiento-suelo': 70000,
  'hormigon-armado': 80000,
  'estructuras-metalicas': 85000,
  'banos-cocinas': 55000,
  'reformas-integrales': 90000,
};

const cityMultiplier: Record<CiudadKey, number> = {
  caba: 1.16,
  cordoba: 1,
  rosario: 1.06,
  mendoza: 1.04,
};

const itemMultiplier = [1, 1.25, 1.55];
const itemUnit = ['visita', 'trabajo', 'trabajo complejo'];

const roundToHundreds = (value: number) => Math.round(value / 100) * 100;

export const formatArs = (value: number) => `$${value.toLocaleString('es-AR')}`;

export const getCityMultiplierLabel = (ciudad: CiudadKey) => {
  const factor = cityMultiplier[ciudad];
  const delta = Math.round((factor - 1) * 100);
  if (delta === 0) return 'Base nacional de referencia';
  if (delta > 0) return `+${delta}% sobre base nacional`;
  return `${delta}% sobre base nacional`;
};

export const getRubroPriceReferences = (
  rubro: RubroKey,
  ciudad?: CiudadKey
): PriceReference[] => {
  const base = basePriceByRubro[rubro];
  const zoneFactor = ciudad ? cityMultiplier[ciudad] : 1;

  return rubros[rubro].services.map((service, index) => {
    const reference = roundToHundreds(base * (itemMultiplier[index] || 1) * zoneFactor);
    return {
      label: service,
      unit: itemUnit[index] || 'servicio',
      reference,
      min: roundToHundreds(reference * 0.85),
      max: roundToHundreds(reference * 1.2),
    };
  });
};
