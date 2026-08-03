import { GLOBAL_COUNTRY_OPTIONS } from '../global-country-options';

export type TechnicianSeoTrade = {
  slug: string;
  label: string;
  singular: string;
  gremioSlug: string;
};

export type TechnicianSeoCountry = {
  slug: string;
  name: string;
  code: string;
};

export const slugifySeoMarket = (value: string) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const technicianSeoTrades: TechnicianSeoTrade[] = [
  { slug: 'plomeros', label: 'Plomeros', singular: 'plomero', gremioSlug: 'instalaciones-sanitarias' },
  { slug: 'electricistas', label: 'Electricistas', singular: 'electricista', gremioSlug: 'electricidad' },
  { slug: 'pintores', label: 'Pintores', singular: 'pintor', gremioSlug: 'pintura' },
  { slug: 'gasistas', label: 'Gasistas', singular: 'gasista', gremioSlug: 'gas-matriculado' },
  { slug: 'techistas', label: 'Techistas', singular: 'techista', gremioSlug: 'techistas' },
  { slug: 'durlockeros', label: 'Durlockeros', singular: 'durlockero', gremioSlug: 'construccion-en-seco' },
  { slug: 'albaniles', label: 'Albaniles', singular: 'albanil', gremioSlug: 'estructura-y-obra-gruesa' },
  { slug: 'climatizacion', label: 'Climatizacion', singular: 'tecnico en climatizacion', gremioSlug: 'climatizacion' },
];

export const technicianSeoCountries: TechnicianSeoCountry[] = GLOBAL_COUNTRY_OPTIONS.map((country) => ({
  slug: slugifySeoMarket(country.name),
  name: country.name,
  code: country.code,
}));

const launchCountryNames = ['Argentina', 'Uruguay', 'Chile', 'Paraguay', 'Brasil', 'Mexico', 'Espana'];

export const technicianSeoLaunchCountries = launchCountryNames
  .map((name) => technicianSeoCountries.find((country) => country.name === name))
  .filter((country): country is TechnicianSeoCountry => Boolean(country));

export const getTechnicianSeoTrade = (slug: string) =>
  technicianSeoTrades.find((trade) => trade.slug === slug) || null;

export const getTechnicianSeoCountry = (slug: string) =>
  technicianSeoCountries.find((country) => country.slug === slug) || null;

export const technicianSeoStaticParams = technicianSeoLaunchCountries.flatMap((country) =>
  technicianSeoTrades.map((trade) => ({ gremio: trade.slug, pais: country.slug }))
);
