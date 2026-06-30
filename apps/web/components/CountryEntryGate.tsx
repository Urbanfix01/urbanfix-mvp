'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ANALYTICS_ENDPOINT, getOrCreateAnalyticsSessionId } from '../lib/analytics';
import {
  COUNTRY_SELECTION_OPTIONS,
  USER_COUNTRY_EVENT_NAME,
  getCountryOptionLabel,
  getStoredCountryPreference,
  storeCountryPreference,
} from '../lib/country-preference';
import { DEFAULT_COUNTRY_NAME } from '../lib/location-catalog';

const SKIP_PREFIXES = ['/admin'];

export default function CountryEntryGate() {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [saving, setSaving] = useState(false);

  const shouldSkip = useMemo(() => {
    const path = pathname || '/';
    return SKIP_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
  }, [pathname]);

  useEffect(() => {
    if (shouldSkip) {
      setIsOpen(false);
      return;
    }

    const storedCountry = getStoredCountryPreference();
    if (storedCountry) {
      setIsOpen(false);
      return;
    }

    setSelectedCountry(DEFAULT_COUNTRY_NAME);
    setIsOpen(true);
  }, [shouldSkip]);

  const confirmCountry = () => {
    if (!selectedCountry || saving) return;
    setSaving(true);
    const country = storeCountryPreference(selectedCountry);
    setIsOpen(false);
    router.refresh();

    if (typeof window !== 'undefined' && country) {
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
        // La eleccion queda guardada localmente aunque no se pueda enviar el evento.
      });
    }
  };

  if (!isOpen || shouldSkip) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-[#17001f]/78 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="country-entry-title"
        className="w-full max-w-md rounded-[28px] border border-white/18 bg-white p-5 shadow-2xl"
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#7b6688]">Ubicacion</p>
        <h2 id="country-entry-title" className="mt-2 text-2xl font-black text-slate-950">
          Elegi tu pais
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Usamos este dato para ajustar la experiencia y medir mejor desde donde entra cada usuario.
        </p>

        <label htmlFor="country-entry-select" className="mt-5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
          Pais de ingreso
        </label>
        <select
          id="country-entry-select"
          value={selectedCountry}
          onChange={(event) => setSelectedCountry(event.target.value)}
          className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-[#ff8f1f]"
          autoFocus
        >
          {COUNTRY_SELECTION_OPTIONS.map((country) => (
            <option key={country} value={country}>
              {getCountryOptionLabel(country)}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={confirmCountry}
          disabled={!selectedCountry || saving}
          className="mt-5 w-full rounded-2xl bg-[#ff8f1f] px-4 py-3 text-sm font-bold text-[#1b0a24] shadow-sm transition hover:bg-[#ff9f3d] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
        >
          {saving ? 'Guardando...' : 'Continuar'}
        </button>
      </div>
    </div>
  );
}
