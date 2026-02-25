import type { Metadata } from 'next';
import { DM_Sans } from 'next/font/google';
import { ArrowRight, CheckCircle2, Droplets, GraduationCap, Users } from 'lucide-react';

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
});

export const metadata: Metadata = {
  title: 'AAPSyA | Asociacion Argentina de Plomeros Sanitaristas y Afines',
  description:
    'AAPSyA - Asociacion Argentina de Plomeros Sanitaristas y Afines. Capacitacion, comunidad y valores de referencia para el rubro sanitario.',
  alternates: { canonical: '/nueva' },
};

const highlights = [
  {
    title: 'Capacitacion',
    description: 'Cursos, talleres y actualizacion tecnica para profesionales.',
    icon: GraduationCap,
  },
  {
    title: 'Comunidad',
    description: 'Red de apoyo, intercambio y representacion del sector.',
    icon: Users,
  },
  {
    title: 'Rubro sanitario',
    description: 'Buenas practicas con foco en instalaciones seguras.',
    icon: Droplets,
  },
];

const quickBullets = [
  'Ejes claros para comunicar la asociacion.',
  'Seccion de valores de referencia (opcional).',
  'Bloque de contacto listo para personalizar.',
];

const blocks = [
  {
    title: 'Mision',
    description: 'Impulsar buenas practicas y profesionalizacion del rubro sanitario.',
  },
  {
    title: 'Formacion',
    description: 'Capacitaciones y material tecnico para seguir mejorando.',
  },
  {
    title: 'Vinculos',
    description: 'Comunidad de profesionales, empresas y clientes.',
  },
];

const referenceAreas = [
  'Jornales',
  'Cloacas',
  'Destapaciones',
  'Agua',
  'Tanques',
  'Bombas',
  'Griferias',
  'Varios',
];

const historyCopy = {
  title: 'Nuestra historia',
  foundingDate: 'Mayo de 2019',
  text: 'En mayo de 2019 nace AAPSyA, Asociacion Argentina de Plomeros, Sanitaristas y Afines (Asociacion Civil), con el lema “Sumar para que todos sumemos”, piedra fundamental para lograr jerarquizar tecnica, legal y socialmente nuestra profesion.',
  motto: 'Sumar para que todos sumemos',
};

export default function NuevaPaginaPage() {
  return (
    <div className={dmSans.className}>
      <div className="min-h-screen bg-slate-950 text-white">
        <div className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.25),_transparent_55%)]" />
          <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-cyan-400/15 blur-3xl" />
          <div className="pointer-events-none absolute -right-24 bottom-6 h-80 w-80 rounded-full bg-sky-500/15 blur-3xl" />

          <main className="relative mx-auto w-full max-w-6xl px-6 py-14">
            <header className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-sm backdrop-blur">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/10">
                  <span className="text-sm font-semibold tracking-wide text-white/90">AAP</span>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-white/50">AAPSyA</p>
                  <p className="text-sm font-semibold text-white/80">
                    Asociacion Argentina de Plomeros Sanitaristas y Afines
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href="#contacto"
                  className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs font-semibold text-white/80 transition hover:border-white/30 hover:bg-white/10 hover:text-white"
                >
                  Contacto
                </a>
                <a
                  href="/tecnicos"
                  className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-900 transition hover:bg-white/90"
                >
                  Acceso tecnico
                </a>
              </div>
            </header>

            <section className="mt-10 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-sm backdrop-blur">
                <p className="text-[11px] uppercase tracking-[0.2em] text-white/50">Asociacion</p>
                <h1 className="mt-3 text-3xl font-semibold leading-tight text-white sm:text-4xl">
                  AAPSyA: plomeria sanitaria con enfoque en{' '}
                  <span className="text-cyan-200">capacitacion</span> y comunidad.
                </h1>
                <p className="mt-4 text-sm leading-relaxed text-white/70">
                  Pagina institucional para presentar la asociacion, sus ejes de trabajo y un bloque de contacto.
                  Puedo personalizar secciones como afiliacion, capacitacion, valores de referencia, directorio y
                  novedades.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <a
                    href="#contacto"
                    className="inline-flex items-center gap-2 rounded-full bg-cyan-300 px-5 py-2.5 text-xs font-semibold text-slate-950 transition hover:bg-cyan-200"
                  >
                    Asociarme / Contacto <ArrowRight className="h-4 w-4" />
                  </a>
                  <a
                    href="#valores"
                    className="rounded-full border border-white/20 bg-white/5 px-5 py-2.5 text-xs font-semibold text-white/80 transition hover:border-white/30 hover:bg-white/10 hover:text-white"
                  >
                    Ver valores de referencia
                  </a>
                </div>

                <div className="mt-7 grid gap-3 sm:grid-cols-3">
                  {highlights.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.title}
                        className="rounded-2xl border border-white/10 bg-slate-950/40 p-5"
                      >
                        <div className="flex items-center gap-2 text-sm font-semibold text-white">
                          <Icon className="h-4 w-4 text-cyan-200" />
                          {item.title}
                        </div>
                        <p className="mt-2 text-sm text-white/70">{item.description}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-sm backdrop-blur">
                <p className="text-xs uppercase tracking-[0.2em] text-white/50">Estructura</p>
                <div className="mt-4 space-y-3">
                  {blocks.map((block) => (
                    <div key={block.title} className="rounded-2xl border border-white/10 bg-slate-950/40 p-5">
                      <p className="text-sm font-semibold text-white">{block.title}</p>
                      <p className="mt-2 text-sm leading-relaxed text-white/70">{block.description}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-5 space-y-2">
                  {quickBullets.map((text) => (
                    <div key={text} className="flex items-start gap-2 text-xs text-white/75">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 text-cyan-200" />
                      <span>{text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-8 shadow-sm backdrop-blur">
              <p className="text-[11px] uppercase tracking-[0.2em] text-white/50">Historia</p>
              <h2 className="mt-2 text-xl font-semibold text-white">{historyCopy.title}</h2>
              <p className="mt-1 text-sm text-white/60">{historyCopy.foundingDate}</p>
              <p className="mt-4 text-sm leading-relaxed text-white/75">{historyCopy.text}</p>

              <div className="mt-6 rounded-3xl border border-white/10 bg-slate-950/40 p-6">
                <p className="text-[11px] uppercase tracking-[0.2em] text-white/50">Lema</p>
                <p className="mt-2 text-lg font-semibold text-cyan-100">&ldquo;{historyCopy.motto}&rdquo;</p>
              </div>
            </section>

            <section
              id="valores"
              className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-8 shadow-sm backdrop-blur"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-white/50">Valores</p>
                  <h2 className="mt-2 text-xl font-semibold text-white">Areas de referencia (orientativo)</h2>
                  <p className="mt-2 text-sm text-white/70">
                    Si queres, esta seccion puede listar y filtrar valores desde la base de datos (AAPSyA).
                  </p>
                </div>
                <a
                  href="/tecnicos"
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/5 px-4 py-3 text-sm font-semibold text-white/80 transition hover:border-white/30 hover:bg-white/10 hover:text-white"
                >
                  Ir al panel <ArrowRight className="h-4 w-4" />
                </a>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {referenceAreas.map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-white/10 bg-slate-950/40 p-5 text-sm text-white/80"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </section>

            <section
              id="contacto"
              className="mt-8 grid gap-4 rounded-3xl border border-white/10 bg-white/5 p-8 shadow-sm backdrop-blur lg:grid-cols-[1fr_auto]"
            >
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-white/50">Contacto</p>
                <h2 className="mt-2 text-xl font-semibold text-white">Sumate a AAPSyA</h2>
                <p className="mt-2 text-sm text-white/70">
                  Pasame el email, WhatsApp y redes oficiales y los conecto aca. Tambien puedo agregar un formulario
                  de contacto.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <a
                  href="#"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-white/90"
                >
                  <CheckCircle2 className="h-4 w-4" /> Asociarme
                </a>
                <a
                  href="#"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/5 px-4 py-3 text-sm font-semibold text-white/80 transition hover:border-white/30 hover:bg-white/10 hover:text-white"
                >
                  <ArrowRight className="h-4 w-4" /> Consultas
                </a>
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
