import Image from 'next/image';
import Link from 'next/link';
import { Plus_Jakarta_Sans, Syne } from 'next/font/google';

const displayFont = Syne({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
});

const bodyFont = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

type AudienceKey = 'tecnicos' | 'empresas' | 'clientes';
type SectionKey = 'personas' | 'guias' | 'ciudades' | 'rubros';
type WidthKey = 'narrow' | 'default' | 'wide';

type HomepageVisualShellProps = {
  children: React.ReactNode;
  audience?: AudienceKey;
  activeSection?: SectionKey;
  width?: WidthKey;
};

const audienceItems: Array<{ key: AudienceKey; label: string; href: string }> = [
  { key: 'tecnicos', label: 'Tecnicos', href: '/tecnicos' },
  { key: 'empresas', label: 'Empresas', href: '/tecnicos?segment=empresas' },
  { key: 'clientes', label: 'Clientes', href: '/tecnicos?segment=clientes' },
];

const sectionItems: Array<{ key: SectionKey; label: string; href: string }> = [
  { key: 'personas', label: 'Personas', href: '/tecnicos?segment=clientes' },
  { key: 'guias', label: 'Guia precios', href: '/guias-precios' },
  { key: 'ciudades', label: 'Ciudades', href: '/ciudades' },
  { key: 'rubros', label: 'Rubros', href: '/rubros' },
];

const widthClassMap: Record<WidthKey, string> = {
  narrow: 'max-w-5xl',
  default: 'max-w-6xl',
  wide: 'max-w-7xl',
};

export default function HomepageVisualShell({
  children,
  audience = 'tecnicos',
  activeSection,
  width = 'default',
}: HomepageVisualShellProps) {
  const audienceIndex = audienceItems.findIndex((item) => item.key === audience);

  return (
    <div className={bodyFont.className}>
      <div className="min-h-screen bg-[#F3F1EA] text-slate-900">
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(245,185,66,0.24),transparent_45%),radial-gradient(circle_at_92%_20%,rgba(56,189,248,0.16),transparent_42%)]" />
          <div className="absolute -left-24 top-24 h-72 w-72 rounded-full bg-[#0F172A]/8 blur-3xl" />
          <div className="absolute -right-24 bottom-20 h-80 w-80 rounded-full bg-[#F59E0B]/15 blur-3xl" />

          <main className={`fx-page home-main relative mx-auto w-full ${widthClassMap[width]} px-6 py-10 md:py-12`}>
            <header className="home-header-shell sticky top-3 z-40 overflow-hidden rounded-2xl border border-slate-200/90 bg-white/90 px-4 py-3 shadow-[0_16px_40px_-30px_rgba(15,23,42,0.72)] backdrop-blur">
              <div className="home-header-row flex items-center justify-between gap-3">
                <div className="home-brand-block flex min-w-0 items-center gap-3">
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-[#071127] via-[#0F172A] to-[#1D366F] shadow-[0_16px_30px_-20px_rgba(10,18,38,0.9)] ring-1 ring-slate-300/45 sm:h-16 sm:w-16">
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute -inset-1 -z-10 rounded-[24px] bg-[radial-gradient(circle_at_30%_0%,rgba(59,130,246,0.35),transparent_62%)] blur-sm"
                    />
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-2 top-1 h-px bg-gradient-to-r from-transparent via-cyan-200/60 to-transparent"
                    />
                    <Image
                      src="/logo-ufx-main.png"
                      alt="UrbanFix logo"
                      fill
                      priority
                      sizes="(max-width: 640px) 56px, 64px"
                      className="object-contain object-center p-[3px]"
                    />
                  </div>
                  <div className="min-w-0">
                    <p
                      className={`${displayFont.className} hidden text-[12px] font-semibold uppercase tracking-[0.34em] text-[#647A9F] sm:block`}
                    >
                      UrbanFix
                    </p>
                    <p
                      className={`${displayFont.className} truncate text-[18px] font-semibold leading-none text-[#18213A] sm:text-[30px]`}
                    >
                      Gestion de <span className="text-[#0D3FA8]">presupuestos</span> de obra
                    </p>
                  </div>
                </div>

                <div className="home-header-actions ml-auto flex shrink-0 items-center justify-end gap-2">
                  <div className="home-audience-toggle audience-toggle relative flex items-center rounded-full border border-slate-200 bg-slate-50 p-1">
                    <span
                      className="audience-toggle-pill absolute bottom-1 left-1 top-1 w-[calc(33.333%-4px)] rounded-full bg-[#0D3FA8] shadow-sm shadow-blue-200/80 transition-transform duration-300 ease-out"
                      style={{ transform: `translateX(${Math.max(0, audienceIndex) * 100}%)` }}
                    />
                    {audienceItems.map((item) => (
                      <Link
                        key={item.key}
                        href={item.href}
                        className={`relative z-10 rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
                          audience === item.key ? 'text-white' : 'text-slate-700 hover:text-slate-900'
                        }`}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                  <Link
                    href="/tecnicos?mode=login"
                    className="home-header-login inline-flex items-center rounded-full bg-[#0F172A] px-3.5 py-1.5 text-[11px] font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800"
                  >
                    Iniciar sesion
                  </Link>
                </div>
              </div>

              <div className="home-secondary-wrap mt-3 border-t border-slate-200/80 pt-3">
                <nav className="home-secondary-nav flex flex-wrap items-center gap-1.5">
                  {sectionItems.map((item) => (
                    <Link
                      key={item.key}
                      href={item.href}
                      className={`cursor-pointer rounded-full px-2.5 py-1.5 text-[11px] font-semibold transition ${
                        activeSection === item.key
                          ? 'bg-slate-200 text-slate-900 shadow-[inset_0_0_0_1px_rgba(148,163,184,0.45)]'
                          : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      {item.label}
                    </Link>
                  ))}
                </nav>
              </div>
            </header>

            <div className="mt-8 space-y-8">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
