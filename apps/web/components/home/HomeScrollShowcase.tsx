'use client';

import { useEffect } from 'react';
import Link from 'next/link';

const flowSteps = [
  {
    title: '1. Ingreso correcto',
    description:
      'UrbanFix ordena la entrada de tecnico, empresa o cliente para que cada actor caiga en el flujo que le corresponde.',
  },
  {
    title: '2. Presupuesto estructurado',
    description:
      'La propuesta se arma con cliente, rubro, mano de obra, materiales y observaciones tecnicas en una misma capa operativa.',
  },
  {
    title: '3. Envio y respuesta',
    description:
      'El presupuesto puede salir por link o WhatsApp, y el cliente revisa la propuesta dentro de una experiencia mas clara.',
  },
  {
    title: '4. Visibilidad y continuidad',
    description:
      'Perfil publico, rubros indexables, mapa y soporte completan una presencia mas ordenada para seguir creciendo.',
  },
];

const moduleCards = [
  {
    title: 'Panel tecnico',
    description: 'Cotizacion, items, estados y lectura operativa dentro de una sola interfaz.',
  },
  {
    title: 'Portal cliente',
    description: 'Ingreso para publicar pedidos, revisar propuestas y responder con menos friccion.',
  },
  {
    title: 'Base de rubros',
    description: 'Mano de obra, variantes tecnicas y referencias para cotizar con mas criterio.',
  },
  {
    title: 'Presupuesto compartible',
    description: 'Salida por link y presentacion mas prolija para el cliente final.',
  },
  {
    title: 'Vidriera y mapa',
    description: 'Perfiles visibles, cobertura por zona y descubrimiento comercial sin login.',
  },
  {
    title: 'Admin y soporte',
    description: 'Lectura general, seguimiento, feedback y continuidad para el producto.',
  },
];

const impactStats = [
  { label: 'Panel tecnico y portal cliente', value: '2 frentes' },
  { label: 'Visibilidad publica', value: '24/7' },
  { label: 'Presupuesto y respuesta', value: 'Link + PDF' },
  { label: 'Base operativa', value: '1 plataforma' },
];

export default function HomeScrollShowcase() {
  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>('[data-ufx-reveal]'));
    if (!nodes.length) return;

    if (typeof IntersectionObserver === 'undefined') {
      nodes.forEach((node) => node.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        });
      },
      {
        threshold: 0.18,
        rootMargin: '0px 0px -12% 0px',
      }
    );

    nodes.forEach((node, index) => {
      node.style.setProperty('--reveal-delay', `${Math.min(index * 55, 360)}ms`);
      observer.observe(node);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <section className="relative overflow-hidden pb-16 pt-10 sm:pt-14">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[860px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,143,31,0.16)_0%,rgba(255,143,31,0)_68%)]" />
      <div className="pointer-events-none absolute -left-24 top-48 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(143,74,255,0.2)_0%,rgba(143,74,255,0)_70%)]" />
      <div className="pointer-events-none absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(32,153,255,0.16)_0%,rgba(32,153,255,0)_72%)]" />

      <div className="mx-auto w-full max-w-7xl space-y-8 px-4 sm:px-6 lg:px-8">
        <article
          data-ufx-reveal
          className="ufx-reveal rounded-[30px] border border-white/15 bg-white/[0.05] p-6 shadow-[0_36px_85px_-52px_rgba(0,0,0,0.9)] sm:p-8"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.23em] text-white/60">Plataforma UrbanFix</p>
          <h2 className="mt-3 max-w-4xl text-3xl font-semibold leading-tight text-white sm:text-4xl">
            La home ahora explica lo mismo que UrbanFix ya ofrece dentro de la plataforma y en sus capas publicas.
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-white/80">
            Presupuestos compartibles, base tecnica de rubros, portal cliente, perfiles publicos, mapa de tecnicos y
            lectura administrativa en un mismo ecosistema.
          </p>
        </article>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {impactStats.map((item) => (
            <article
              key={item.label}
              data-ufx-reveal
              className="ufx-reveal rounded-2xl border border-white/15 bg-black/20 px-4 py-4 backdrop-blur-sm"
            >
              <p className="text-2xl font-extrabold text-[#ffb14d]">{item.value}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.15em] text-white/65">{item.label}</p>
            </article>
          ))}
        </div>

        <article
          data-ufx-reveal
          className="ufx-reveal rounded-[30px] border border-white/15 bg-white/[0.04] p-6 sm:p-8"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/60">Flujo de trabajo</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {flowSteps.map((step) => (
              <div
                key={step.title}
                className="rounded-2xl border border-white/15 bg-black/20 px-4 py-4 transition duration-300 hover:-translate-y-1 hover:border-[#ff8f1f]/60"
              >
                <h3 className="text-base font-semibold text-white">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/75">{step.description}</p>
              </div>
            ))}
          </div>
        </article>

        <article
          data-ufx-reveal
          className="ufx-reveal rounded-[30px] border border-white/15 bg-white/[0.04] p-6 sm:p-8"
        >
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/60">Modulos clave</p>
              <h3 className="mt-2 text-2xl font-semibold text-white">Todo conectado para operar y presentarte mejor</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/urbanfix"
                className="rounded-full border border-white/35 px-4 py-2 text-xs font-semibold text-white/90 transition hover:border-white hover:text-white"
              >
                Ver servicios
              </Link>
              <Link
                href="/tecnicos"
                className="rounded-full border border-white/35 px-4 py-2 text-xs font-semibold text-white/90 transition hover:border-white hover:text-white"
              >
                Entrar a la plataforma
              </Link>
            </div>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {moduleCards.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-white/15 bg-black/20 px-4 py-4 transition duration-300 hover:-translate-y-1 hover:border-[#7b61ff]/60"
              >
                <h4 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#ffd28f]">{item.title}</h4>
                <p className="mt-2 text-sm leading-relaxed text-white/75">{item.description}</p>
              </div>
            ))}
          </div>
        </article>

        <article
          data-ufx-reveal
          className="ufx-reveal rounded-[30px] border border-white/15 bg-gradient-to-r from-[#3a0b4f]/85 via-[#2f0a44]/85 to-[#230535]/85 p-6 shadow-[0_30px_70px_-45px_rgba(0,0,0,0.95)] sm:p-8"
        >
          <h3 className="text-2xl font-semibold text-white sm:text-3xl">Listo para escalar la operacion diaria</h3>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-white/80">
            Desde un tecnico independiente hasta una operacion con multiples actores, UrbanFix junta presupuesto,
            cliente, vidriera publica, mapa y soporte en una misma estructura.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/urbanfix"
              className="rounded-full bg-[#ff8f1f] px-5 py-2.5 text-xs font-semibold text-[#2a0338] transition hover:bg-[#ffb14d]"
            >
              Ver todo lo que ofrece
            </Link>
            <Link
              href="/vidriera"
              className="rounded-full border border-white/35 px-5 py-2.5 text-xs font-semibold text-white/90 transition hover:border-white hover:text-white"
            >
              Ver tecnicos por zona
            </Link>
          </div>
        </article>
      </div>
    </section>
  );
}
