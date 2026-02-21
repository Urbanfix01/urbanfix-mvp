import type { Metadata } from 'next';
import { Sora } from 'next/font/google';
import HomepageVisualShell from '../../components/HomepageVisualShell';

const sora = Sora({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title:
    'Gestion de presupuestos y MANO DE OBRA en construccion | UrbanFix Argentina',
  description:
    'Gestiona presupuestos, clientes, materiales de obra y mano de obra para construccion en Argentina. Centraliza tarifas, rubros y presupuestos con una experiencia clara para clientes.',
  alternates: { canonical: '/precios-mano-de-obra' },
};

const focusAreas = [
  {
    title: 'Tarifas por rubro',
    description: 'Organiza precios de mano de obra por especialidad, tipo de obra y complejidad.',
  },
  {
    title: 'Gestion de clientes',
    description: 'Mantene el historial de clientes, obras y presupuestos en un solo lugar.',
  },
  {
    title: 'Materiales y consumos',
    description: 'Actualiza materiales en segundos y evita diferencias entre presupuesto y trabajo real.',
  },
  {
    title: 'Margenes e impuestos',
    description: 'Define margenes, impuestos o descuentos para mostrar totales claros al cliente.',
  },
];

const benefits = [
  'Presupuestos listos para enviar desde el celular.',
  'Gestion de clientes y obras con historial completo.',
  'Estados claros: presentado, aprobado, finalizado y cobrado.',
  'Gestion de materiales de obra y rubros de construccion.',
  'Historial de precios y MANO DE OBRA para volver a cotizar mas rapido.',
  'Visualizacion profesional para clientes.',
];

export default function PreciosManoDeObraPage() {
  return (
    <div className={sora.className}>
      <HomepageVisualShell audience="tecnicos" activeSection="guias" width="narrow">
        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Gestion de presupuestos y mano de obra</p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-900 sm:text-4xl">
            Gestion de presupuestos, clientes y MANO DE OBRA en construccion en Argentina
          </h1>
          <p className="mt-4 text-sm text-slate-600">
            UrbanFix te ayuda a centralizar tarifas, materiales de obra, rubros de construccion y gestion de
            presupuestos en un solo lugar, con una experiencia clara para clientes y equipos. Ideal para tecnicos,
            instaladores y mantenimiento de obra.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="/tecnicos"
              className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
            >
              Crear mi primer presupuesto
            </a>
            <a
              href="/rubros"
              className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
            >
              Ver rubros de construccion
            </a>
            <a
              href="/ciudades"
              className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
            >
              Ver ciudades
            </a>
            <a
              href="/guias-precios"
              className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
            >
              Ver guias y precios
            </a>
            <a
              href="/urbanfix"
              className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
            >
              Conocer UrbanFix
            </a>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {focusAreas.map((area) => (
            <div key={area.title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold text-slate-900">{area.title}</p>
              <p className="mt-2 text-xs text-slate-500">{area.description}</p>
            </div>
          ))}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Beneficios para construccion</p>
          <ul className="mt-4 space-y-3 text-sm text-slate-600">
            {benefits.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
          UrbanFix no publica una lista fija de precios: te permite configurar tus valores de MANO DE OBRA, materiales
          de obra y rubros segun tu tipo de construccion y zona en Argentina.
        </section>
      </HomepageVisualShell>
    </div>
  );
}
