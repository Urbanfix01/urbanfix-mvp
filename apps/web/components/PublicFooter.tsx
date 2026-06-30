'use client';

import Link from 'next/link';

const CONTACT_EMAIL = 'info@urbanfixar.com';
const WHATSAPP_PHONE_LABEL = '+54 9 11 7008-4556';
const WHATSAPP_PHONE_URL = 'https://wa.me/5491170084556';

const platformLinks = [
  { label: 'Servicios', href: '/urbanfix' },
  { label: 'Comunidad', href: '/comunidad' },
  { label: 'Cliente', href: '/cliente' },
  { label: 'Técnicos', href: '/tecnicos' },
  { label: 'Solicitar demo', href: '/descargar-app' },
];

const contactLinks = [
  { label: CONTACT_EMAIL, href: `mailto:${CONTACT_EMAIL}` },
  { label: WHATSAPP_PHONE_LABEL, href: WHATSAPP_PHONE_URL },
  { label: 'Soporte', href: '/soporte' },
];

const legalLinks = [
  { label: 'Políticas', href: '/politicas' },
  { label: 'Términos', href: '/terminos' },
  { label: 'Privacidad', href: '/privacidad' },
];

export default function PublicFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-white/10 bg-[#21002f] text-white">
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-10 sm:px-6 md:grid-cols-2 lg:grid-cols-[1.4fr_0.8fr_0.9fr_0.8fr] lg:px-8">
        <div>
          <Link href="/" className="inline-flex items-center gap-3">
            <img src="/icon-48.png" alt="UrbanFix" className="h-9 w-9 rounded-lg" />
            <span className="text-xl font-extrabold tracking-tight text-white">
              URBAN<span className="text-[#ff8f1f]">FIX</span>
            </span>
          </Link>

          <p className="mt-4 max-w-sm text-sm leading-6 text-white/62">
            Plataforma para ordenar solicitudes, presupuestos y operación técnica.
          </p>
        </div>

        <nav aria-label="Plataforma">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/40">Plataforma</p>
          <div className="mt-4 flex flex-col gap-3">
            {platformLinks.map((item) => (
              <Link key={item.href} href={item.href} className="text-sm font-medium text-white/70 transition hover:text-white">
                {item.label}
              </Link>
            ))}
          </div>
        </nav>

        <nav aria-label="Contacto">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/40">Contacto</p>
          <div className="mt-4 flex flex-col gap-3">
            {contactLinks.map((item) => (
              <a
                key={item.href}
                href={item.href}
                target={item.href.startsWith('http') ? '_blank' : undefined}
                rel={item.href.startsWith('http') ? 'noreferrer' : undefined}
                className="text-sm font-medium text-white/70 transition hover:text-white"
              >
                {item.label}
              </a>
            ))}
          </div>
        </nav>

        <nav aria-label="Legal">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/40">Legal</p>
          <div className="mt-4 flex flex-col gap-3">
            {legalLinks.map((item) => (
              <Link key={item.href} href={item.href} className="text-sm font-medium text-white/70 transition hover:text-white">
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-4 text-xs text-white/45 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <p>© {currentYear} UrbanFix. Todos los derechos reservados.</p>
          <p>urbanfix.com.ar</p>
        </div>
      </div>
    </footer>
  );
}
