import type { Metadata } from 'next';
import { Sora } from 'next/font/google';
import AuthHashHandler from '../components/AuthHashHandler';

const sora = Sora({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'UrbanFix | Home administrativo',
  description: 'Acceso rapido y vista administrativa para tecnicos, clientes y operacion UrbanFix.',
};

const kpis = [
  { label: 'Solicitudes', value: '24', note: 'Ultimas 24h' },
  { label: 'Presupuestos', value: '18', note: 'En revision' },
  { label: 'Tecnicos online', value: '9', note: 'Con cobertura activa' },
  { label: 'Clientes activos', value: '31', note: 'Con operaciones abiertas' },
];

const modules = [
  { area: 'Operativo', detail: 'Mapa, radio de cobertura y solicitudes por zona.', status: 'Activo' },
  { area: 'Presupuestos', detail: 'Cotizar, enviar y seguir estados de aprobacion.', status: 'Activo' },
  { area: 'Perfil tecnico', detail: 'Datos comerciales, reputacion y publicacion.', status: 'Activo' },
  { area: 'Agenda', detail: 'Planificacion de visitas y tareas por fecha.', status: 'Activo' },
  { area: 'Pagos', detail: 'Control de cobros y trazabilidad de cierre.', status: 'En ajuste' },
  { area: 'Soporte', detail: 'Canal de consulta y seguimiento de incidencias.', status: 'Activo' },
];

const quickItems = [
  'Revisar nuevas solicitudes por geolocalizacion.',
  'Emitir presupuesto desde el cotizador rapido.',
  'Actualizar perfil publico del tecnico.',
];

export default function HomePage() {
  return (
    <div className={sora.className}>
      <AuthHashHandler />
      <main className="fx-page min-h-screen bg-slate-100 text-slate-900">
        <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 lg:py-10">
          <header className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <img src="/icon.png" alt="UrbanFix" className="h-10 w-10 rounded-xl" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">UrbanFix</p>
                  <h1 className="text-lg font-bold text-slate-900">Home administrativo</h1>
                </div>
              </div>
              <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                Estado general: operativo
              </div>
            </div>
          </header>

          <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Acceso rapido</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <a
                  href="/tecnicos"
                  className="rounded-2xl bg-slate-900 px-4 py-4 text-center text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Tecnico
                </a>
                <a
                  href="/cliente"
                  className="rounded-2xl bg-emerald-600 px-4 py-4 text-center text-sm font-semibold text-white transition hover:bg-emerald-500"
                >
                  Cliente
                </a>
                <a
                  href="/admin"
                  className="rounded-2xl border border-slate-300 bg-white px-4 py-4 text-center text-sm font-semibold text-slate-700 transition hover:border-slate-400"
                >
                  Administracion
                </a>
              </div>

              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">Tareas sugeridas</p>
                <ul className="mt-3 space-y-2 text-sm text-slate-600">
                  {quickItems.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="mt-1 inline-block h-2 w-2 rounded-full bg-emerald-500" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Estado operativo</p>
                <span className="text-xs font-medium text-slate-500">Actualizado hace 2 min</span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {kpis.map((item) => (
                  <article key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{item.label}</p>
                    <p className="mt-1 text-2xl font-bold text-slate-900">{item.value}</p>
                    <p className="mt-1 text-xs text-slate-500">{item.note}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-slate-900">Modulos principales</h2>
              <a
                href="/tecnicos"
                className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400"
              >
                Abrir panel tecnico
              </a>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[640px] table-fixed border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-[0.12em] text-slate-400">
                    <th className="py-3 pr-4">Modulo</th>
                    <th className="py-3 pr-4">Uso administrativo</th>
                    <th className="py-3 pr-4">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {modules.map((module) => (
                    <tr key={module.area} className="border-b border-slate-100 align-top">
                      <td className="py-3 pr-4 text-sm font-semibold text-slate-900">{module.area}</td>
                      <td className="py-3 pr-4 text-sm text-slate-600">{module.detail}</td>
                      <td className="py-3 pr-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                            module.status === 'Activo'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {module.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
