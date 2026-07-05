'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePathname, useRouter } from 'next/navigation';

import { ANALYTICS_ENDPOINT, getOrCreateAnalyticsSessionId } from '../lib/analytics';
import {
  COUNTRY_SELECTION_OPTIONS,
  USER_COUNTRY_CHANGED_EVENT,
  USER_COUNTRY_EVENT_NAME,
  getCountryFlagCode,
  getStoredCountryPreference,
  storeCountryPreference,
} from '../lib/country-preference';
import { DEFAULT_COUNTRY_NAME } from '../lib/location-catalog';

type CountryMenuSelectorProps = {
  className?: string;
  onChanged?: () => void;
};

const getCurrentCountry = () => getStoredCountryPreference() || DEFAULT_COUNTRY_NAME;

function CountryFlag({ country, compact = false }: { country: string; compact?: boolean }) {
  const code = getCountryFlagCode(country);
  const sizeClass = compact ? 'h-5 w-5 text-[8px]' : 'h-7 w-7 text-[9px]';

  return (
    <span
      aria-hidden="true"
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/90 font-black uppercase leading-none text-[#2a0338] shadow-[inset_-3px_-4px_7px_rgba(0,0,0,0.35),0_2px_6px_rgba(0,0,0,0.28)] ring-1 ring-white/45 ${sizeClass}`}
    >
      {code || 'UF'}
      {code ? (
        <img
          src={`https://flagcdn.com/w80/${code.toLowerCase()}.png`}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          onError={(event) => {
            event.currentTarget.style.display = 'none';
          }}
        />
      ) : null}
      <span className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_24%,rgba(255,255,255,0.72),rgba(255,255,255,0.22)_24%,rgba(255,255,255,0)_48%)]" />
      <span className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle_at_72%_78%,rgba(0,0,0,0.34),rgba(0,0,0,0)_56%)]" />
    </span>
  );
}

export default function CountryMenuSelector({ className = '', onChanged }: CountryMenuSelectorProps) {
  const pathname = usePathname();
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [selectedCountry, setSelectedCountry] = useState(DEFAULT_COUNTRY_NAME);
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 12, width: 288 });

  useEffect(() => {
    setSelectedCountry(getCurrentCountry());

    const syncCountry = (event?: Event) => {
      const nextCountry =
        event instanceof CustomEvent && typeof event.detail?.country === 'string'
          ? event.detail.country
          : getCurrentCountry();
      setSelectedCountry(nextCountry || DEFAULT_COUNTRY_NAME);
    };

    window.addEventListener('storage', syncCountry);
    window.addEventListener(USER_COUNTRY_CHANGED_EVENT, syncCountry);

    return () => {
      window.removeEventListener('storage', syncCountry);
      window.removeEventListener(USER_COUNTRY_CHANGED_EVENT, syncCountry);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const updateMenuPosition = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
      const horizontalGap = 12;
      const menuWidth = Math.min(288, Math.max(220, viewportWidth - horizontalGap * 2));
      const maxLeft = Math.max(horizontalGap, viewportWidth - menuWidth - horizontalGap);
      const preferredLeft = rect.right - menuWidth;
      const left = Math.min(maxLeft, Math.max(horizontalGap, preferredLeft));
      setMenuPosition({
        top: Math.round(rect.bottom + 8),
        left: Math.round(left),
        width: Math.round(menuWidth),
      });
    };

    updateMenuPosition();

    const closeOnOutsidePress = (event: MouseEvent | TouchEvent) => {
      const target = event.target;
      if (target instanceof Node && containerRef.current?.contains(target)) return;
      if (target instanceof Node && menuRef.current?.contains(target)) return;
      setIsOpen(false);
    };

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', closeOnOutsidePress);
    document.addEventListener('touchstart', closeOnOutsidePress);
    document.addEventListener('keydown', closeOnEscape);
    window.addEventListener('resize', updateMenuPosition);
    window.addEventListener('scroll', updateMenuPosition, true);

    return () => {
      document.removeEventListener('mousedown', closeOnOutsidePress);
      document.removeEventListener('touchstart', closeOnOutsidePress);
      document.removeEventListener('keydown', closeOnEscape);
      window.removeEventListener('resize', updateMenuPosition);
      window.removeEventListener('scroll', updateMenuPosition, true);
    };
  }, [isOpen]);

  const handleCountryChange = (nextCountry: string) => {
    const country = storeCountryPreference(nextCountry);
    setSelectedCountry(country || DEFAULT_COUNTRY_NAME);
    setIsOpen(false);
    onChanged?.();
    router.refresh();

    if (typeof window === 'undefined' || !country) return;

    void fetch(ANALYTICS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: getOrCreateAnalyticsSessionId(),
        event_type: 'funnel',
        event_name: USER_COUNTRY_EVENT_NAME,
        event_context: { country },
        selected_country: country,
        path: window.location.pathname || pathname || '/',
        referrer: document.referrer || '',
      }),
      keepalive: true,
    }).catch(() => {
      // El pais queda guardado localmente aunque no se pueda enviar el evento.
    });
  };

  const countryMenu = isOpen ? (
    <div
      className="fixed inset-0 z-[10000]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) setIsOpen(false);
      }}
    >
      <div
        ref={menuRef}
        className="absolute overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-950 shadow-2xl"
        style={{ top: menuPosition.top, left: menuPosition.left, width: menuPosition.width }}
      >
        <p className="border-b border-slate-100 px-3 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-[#7b6688]">
          Pais de ingreso
        </p>
        <div role="listbox" aria-label="Paises disponibles" className="max-h-[360px] overflow-y-auto p-1">
          {COUNTRY_SELECTION_OPTIONS.map((country) => {
            const isSelected = selectedCountry === country;

            return (
              <button
                key={country}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => handleCountryChange(country)}
                className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold transition ${
                  isSelected
                    ? 'bg-[#fff2e4] text-[#2a0338]'
                    : 'text-slate-700 hover:bg-slate-50 hover:text-slate-950'
                }`}
              >
                <CountryFlag country={country} compact />
                <span className="min-w-0 flex-1 truncate">{country}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div ref={containerRef} className={`relative inline-flex ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`Pais seleccionado: ${selectedCountry}`}
        title={selectedCountry}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-transparent text-white outline-none transition focus-visible:ring-2 focus-visible:ring-[#ff8f1f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#2a0338]"
      >
        <CountryFlag country={selectedCountry} />
      </button>

      {typeof document !== 'undefined' && countryMenu ? createPortal(countryMenu, document.body) : null}
    </div>
  );
}
