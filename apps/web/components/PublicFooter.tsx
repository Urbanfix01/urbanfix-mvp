'use client';

import Link from 'next/link';
import { Mail, MessageCircleMore } from 'lucide-react';

const WHATSAPP_CHANNEL_URL = 'https://whatsapp.com/channel/0029VbCFl1TKQuJGScUp4b0J';
const CONTACT_EMAIL = 'hola@urbanfix.com.ar';

const socialLinks = [
  {
    label: 'WhatsApp',
    href: WHATSAPP_CHANNEL_URL,
    icon: MessageCircleMore,
  },
];

const legalLinks = [
  { label: 'Políticas', href: '/politicas' },
  { label: 'Términos', href: '/terminos' },
  { label: 'Privacidad', href: '/privacidad' },
];

const helpLinks = [
  { label: 'Contacto', href: '/contacto' },
  { label: 'Soporte', href: '/soporte' },
  { label: 'Descargar app', href: '/descargar-app' },
];

export default function PublicFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-[#3c1550] bg-[#21002f] text-white">
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1.2fr_0.9fr_0.9fr] lg:px-8">
        <div>
          <Link href="/" className="inline-flex items-center gap-3">
            <img src="/icon.png" alt="UrbanFix" className="h-10 w-10 rounded-xl" />
            <span className="text-2xl font-extrabold tracking-tight text-white">
              URBAN<span className="text-[#ff8f1f]">FIX</span>
            </span>
          </Link>
          <p className="mt-4 max-w-md text-sm leading-7 text-white/72">
            Plataforma operativa para técnicos, clientes y presencia pública en una sola estructura.
          </p>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:border-[#ff8f1f]/50 hover:bg-white/10"
          >
            <Mail className="h-4 w-4 text-[#ff8f1f]" />
            {CONTACT_EMAIL}
          </a>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-white/45">Redes sociales</p>
          <div className="mt-4 flex flex-col gap-3">
            {socialLinks.map((item) => {
              const Icon = item.icon;
              return (
                <a
                  key={item.label}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-3 rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white/88 transition hover:border-[#ff8f1f]/45 hover:bg-white/[0.08] hover:text-white"
                >
                  <Icon className="h-4 w-4 text-[#ff8f1f]" />
                  {item.label}
                </a>
              );
            })}
            <p className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm leading-6 text-white/58">
              Sumaremos más canales sociales oficiales acá a medida que queden publicados.
            </p>
          </div>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-1">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-white/45">Contacto</p>
            <div className="mt-4 flex flex-col gap-3">
              {helpLinks.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="text-sm font-semibold text-white/78 transition hover:text-[#ffcf96]"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-white/45">Políticas</p>
            <div className="mt-4 flex flex-col gap-3">
              {legalLinks.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="text-sm font-semibold text-white/78 transition hover:text-[#ffcf96]"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-4 text-xs text-white/55 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <p>© {currentYear} UrbanFix. Todos los derechos reservados.</p>
          <p>Gestión clara para técnicos en movimiento.</p>
        </div>
      </div>
    </footer>
  );
}