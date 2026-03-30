'use client';

import { useEffect, useState } from 'react';

import { supabase } from '../lib/supabase/supabase';

const navLinks = [
  { label: 'Inicio', href: '/' },
  { label: 'Servicios', href: '/urbanfix' },
  { label: 'Valores Mano de Obra', href: '/rubros' },
  { label: 'Ciudades', href: '/ciudades' },
  { label: 'Tecnicos disponibles', href: '/vidriera' },
];

const createRequestHref = '/cliente?mode=register&quick=1&intent=create-request';

type PublicTopNavProps = {
  activeHref?: string;
  sticky?: boolean;
};

type AuthNavProfile = {
  full_name?: string | null;
  business_name?: string | null;
  company_logo_url?: string | null;
  avatar_url?: string | null;
};

const platformButtonClass =
  'inline-flex rounded-full border px-5 py-2 text-xs font-bold uppercase tracking-[0.08em] transition';

export default function PublicTopNav({ activeHref, sticky = false }: PublicTopNavProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [profile, setProfile] = useState<AuthNavProfile | null>(null);
  const isCreateRequestActive = activeHref === '/cliente';
  const isDownloadActive = activeHref === '/descargar-app';
  const isPlatformActive = activeHref === '/tecnicos';
  const isAccountAreaActive = activeHref === '/tecnicos' || activeHref === '/cliente';
  const panelHref = activeHref === '/cliente' ? '/cliente' : '/tecnicos';
  const profileName =
    profile?.business_name?.trim() ||
    profile?.full_name?.trim() ||
    'Mi cuenta';
  const profileLogoUrl = profile?.company_logo_url?.trim() || profile?.avatar_url?.trim() || '';
  const profileInitial = profileName.charAt(0).toUpperCase() || 'U';

  useEffect(() => {
    let cancelled = false;

    const loadProfile = async (userId: string) => {
      const { data } = await supabase
        .from('profiles')
        .select('full_name,business_name,company_logo_url,avatar_url')
        .eq('id', userId)
        .maybeSingle();

      if (!cancelled) {
        setProfile((data as AuthNavProfile | null) || null);
      }
    };

    const applySession = async (nextSession: any) => {
      const user = nextSession?.user || null;
      setIsAuthenticated(Boolean(user));

      if (!user) {
        if (!cancelled) {
          setProfile(null);
        }
        return;
      }

      if (!cancelled) {
        setProfile({
          full_name: user.user_metadata?.full_name || null,
          business_name: user.user_metadata?.business_name || null,
          company_logo_url: null,
          avatar_url: null,
        });
      }

      await loadProfile(user.id);
    };

    supabase.auth.getSession().then(({ data }) => {
      void applySession(data.session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void applySession(nextSession);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const accountChip = (
    <a
      href={panelHref}
      onClick={() => setMenuOpen(false)}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 transition ${
        isAccountAreaActive
          ? 'border-white bg-white text-[#2a0338]'
          : 'border-white/70 bg-white/10 text-white hover:bg-white hover:text-[#2a0338]'
      }`}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/90 text-[0.8rem] font-extrabold text-[#2a0338]">
        {profileLogoUrl ? (
          <img src={profileLogoUrl} alt={profileName} className="h-full w-full object-cover" />
        ) : (
          profileInitial
        )}
      </span>
      <span className="min-w-0 max-w-[180px] truncate text-sm font-bold">
        {profileName}
      </span>
    </a>
  );

  return (
    <header
      className={`${sticky ? 'sticky top-0 z-50' : ''} overflow-x-clip border-b border-white/10 bg-[#2a0338]/95 backdrop-blur-sm`}
    >
      <div className="flex w-full items-center justify-between gap-2 px-2 py-2 sm:px-6">
        <a href="/" className="flex min-w-0 items-center gap-2">
          <img src="/icon.png" alt="UrbanFix" className="h-8 w-8 shrink-0 rounded-lg sm:h-9 sm:w-9" />
          <span className="whitespace-nowrap text-[1.22rem] font-extrabold tracking-tight leading-none text-white sm:text-[1.72rem]">
            URBAN<span className="text-[#ff8f1f]">FIX</span>
          </span>
        </a>

        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-4">
          <nav className="hidden items-center gap-4 xl:flex">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className={`text-xs font-semibold transition hover:text-white ${
                  activeHref === link.href ? 'text-white' : 'text-white/85'
                }`}
              >
                {link.label}
              </a>
            ))}
          </nav>

          <a
            href={createRequestHref}
            className={`hidden ${platformButtonClass} xl:inline-flex ${
              isCreateRequestActive
                ? 'border-white bg-white text-[#2a0338]'
                : 'border-[#ffbf73]/70 bg-[#fff5e8] text-[#2a0338] hover:bg-white'
            }`}
          >
            Crear solicitud
          </a>

          <a
            href="/descargar-app"
            className={`hidden ${platformButtonClass} xl:inline-flex ${
              isDownloadActive
                ? 'border-[#ffbf73] bg-[#ffbf73] text-[#2a0338]'
                : 'border-[#ff8f1f]/80 bg-[#ff8f1f] text-[#2a0338] hover:bg-[#ffad56]'
            }`}
          >
            Descargar app
          </a>

          {isAuthenticated ? (
            <div className="hidden xl:block">{accountChip}</div>
          ) : (
            <a
              href="/tecnicos"
              className={`hidden ${platformButtonClass} xl:inline-flex ${
                isPlatformActive
                  ? 'border-white bg-white text-[#2a0338]'
                  : 'border-white/70 text-white hover:bg-white hover:text-[#2a0338]'
              }`}
            >
              Iniciar sesión
            </a>
          )}

          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-expanded={menuOpen}
            aria-label="Abrir menu"
            className="inline-flex items-center justify-center rounded-lg border border-white/30 p-1.5 text-white transition hover:bg-white/10 xl:hidden"
          >
            <span className="sr-only">Menu</span>
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="border-t border-white/10 bg-[#2a0338] px-3 py-3 xl:hidden">
          <nav className="flex flex-col gap-2">
            {isAuthenticated && (
              <div className="mb-2">{accountChip}</div>
            )}
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition hover:bg-white/10 ${
                  activeHref === link.href ? 'bg-white/10 text-white' : 'text-white/90'
                }`}
              >
                {link.label}
              </a>
            ))}
            <a
              href={createRequestHref}
              onClick={() => setMenuOpen(false)}
              className={`mt-1 rounded-full border px-4 py-2 text-center text-xs font-bold uppercase tracking-[0.08em] transition ${
                isCreateRequestActive
                  ? 'border-white bg-white text-[#2a0338]'
                  : 'border-[#ffbf73]/70 bg-[#fff5e8] text-[#2a0338] hover:bg-white'
              }`}
            >
              Crear solicitud
            </a>
            <a
              href="/descargar-app"
              onClick={() => setMenuOpen(false)}
              className={`mt-1 rounded-full border px-4 py-2 text-center text-xs font-bold uppercase tracking-[0.08em] transition ${
                isDownloadActive
                  ? 'border-[#ffbf73] bg-[#ffbf73] text-[#2a0338]'
                  : 'border-[#ff8f1f]/80 bg-[#ff8f1f] text-[#2a0338] hover:bg-[#ffad56]'
              }`}
            >
              Descargar app
            </a>
            {!isAuthenticated && (
              <a
                href="/tecnicos"
                onClick={() => setMenuOpen(false)}
                className={`mt-1 rounded-full border px-4 py-2 text-center text-xs font-bold uppercase tracking-[0.08em] transition ${
                  isPlatformActive
                    ? 'border-white bg-white text-[#2a0338]'
                    : 'border-white/70 text-white hover:bg-white hover:text-[#2a0338]'
                }`}
              >
                Iniciar sesión
              </a>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
