'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

type LocalityOption = {
  name: string;
  label: string;
};

type Props = {
  country: string;
  province: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  selectClassName?: string;
  helperClassName?: string;
};

const normalizeText = (value: string) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const cleanAdministrativePrefix = (value: string) =>
  String(value || '')
    .replace(/\b(partido|departamento|municipio)\s+de\s+/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

const getOptionDisplayLabel = (option: LocalityOption) => cleanAdministrativePrefix(option.label || option.name);

const loadLocalities = async (
  country: string,
  province: string
): Promise<{ results: LocalityOption[]; error?: string }> => {
  const trimmedCountry = country.trim();
  const trimmedProvince = province.trim();
  if (!trimmedCountry || !trimmedProvince) return { results: [] };

  try {
    const params = new URLSearchParams({
      country: trimmedCountry,
      province: trimmedProvince,
      mode: 'list',
      limit: '5000',
    });
    const response = await fetch(`/api/localities/search?${params.toString()}`, {
      cache: 'no-store',
    });
    const payload = (await response.json()) as {
      results?: LocalityOption[];
      error?: string;
    };
    return {
      results: Array.isArray(payload.results) ? payload.results : [],
      error: payload.error,
    };
  } catch {
    return {
      results: [],
      error: 'No pudimos cargar las localidades en este momento.',
    };
  }
};

export default function LocalitySelect({
  country,
  province,
  value,
  onChange,
  disabled = false,
  selectClassName,
  helperClassName,
}: Props) {
  const [options, setOptions] = useState<LocalityOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const trimmedCountry = country.trim();
    const trimmedProvince = province.trim();
    if (!trimmedCountry || !trimmedProvince) {
      setOptions([]);
      setLoading(false);
      setError('');
      setQuery('');
      setOpen(false);
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setLoading(true);
    setError('');

    loadLocalities(trimmedCountry, trimmedProvince).then(({ results, error: nextError }) => {
      if (requestIdRef.current !== requestId) return;
      setOptions(results);
      setError(nextError || '');
      setLoading(false);
    });
  }, [country, province]);

  const normalizedValue = normalizeText(value);
  const selectedValue = useMemo(() => {
    if (!normalizedValue) return '';
    const exact = options.find((option) => normalizeText(option.name) === normalizedValue);
    return exact?.name || cleanAdministrativePrefix(value);
  }, [normalizedValue, options, value]);

  const selectedDisplayValue = useMemo(() => {
    if (!selectedValue) return '';
    const exact = options.find((option) => normalizeText(option.name) === normalizeText(selectedValue));
    return exact ? getOptionDisplayLabel(exact) : cleanAdministrativePrefix(selectedValue);
  }, [options, selectedValue]);

  useEffect(() => {
    setQuery(selectedDisplayValue);
  }, [selectedDisplayValue]);

  useEffect(() => {
    const handleDocumentPointerDown = (event: PointerEvent) => {
      if (!rootRef.current || rootRef.current.contains(event.target as Node)) return;
      setOpen(false);
      setQuery(selectedDisplayValue);
    };

    document.addEventListener('pointerdown', handleDocumentPointerDown);
    return () => document.removeEventListener('pointerdown', handleDocumentPointerDown);
  }, [selectedDisplayValue]);

  const visibleOptions = useMemo(() => {
    const normalizedQuery = normalizeText(query);
    const rows = normalizedQuery
      ? options.filter((option) => {
          const display = getOptionDisplayLabel(option);
          return normalizeText(option.name).includes(normalizedQuery) || normalizeText(display).includes(normalizedQuery);
        })
      : options;

    const seen = new Set<string>();
    return rows
      .filter((option) => {
        const key = normalizeText(getOptionDisplayLabel(option));
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 80);
  }, [options, query]);

  const handleSelect = (option: LocalityOption) => {
    const display = getOptionDisplayLabel(option);
    setQuery(display);
    setOpen(false);
    onChange(option.name);
  };

  const baseSelectClassName =
    selectClassName ||
    'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400';
  const baseHelperClassName = helperClassName || 'mt-2 text-xs text-slate-500';
  const isDisabled = disabled || !country.trim() || !province.trim() || loading;

  return (
    <div ref={rootRef} className="relative">
      <input
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && visibleOptions.length > 0) {
            event.preventDefault();
            handleSelect(visibleOptions[0]);
          }
          if (event.key === 'Escape') {
            setOpen(false);
            setQuery(selectedDisplayValue);
          }
        }}
        disabled={isDisabled}
        className={baseSelectClassName}
        placeholder={
          !country.trim() || !province.trim()
            ? 'Selecciona pais y provincia primero'
            : loading
              ? 'Cargando localidades...'
              : 'Escribe para buscar distrito'
        }
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
      />
      {open && !isDisabled && (
        <div className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-50 max-h-72 overflow-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_24px_54px_-34px_rgba(15,23,42,0.55)]">
          {visibleOptions.length === 0 ? (
            <div className="px-3 py-2 text-xs text-slate-500">No encontramos ese distrito en la lista.</div>
          ) : (
            visibleOptions.map((option) => {
              const display = getOptionDisplayLabel(option);
              const isSelected = normalizeText(option.name) === normalizeText(selectedValue);
              return (
                <button
                  key={`${option.name}-${option.label}`}
                  type="button"
                  onClick={() => handleSelect(option)}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm transition ${
                    isSelected
                      ? 'bg-[#fff7ed] font-semibold text-[#7a4a15]'
                      : 'text-slate-700 hover:bg-slate-50 hover:text-slate-950'
                  }`}
                >
                  <span className="min-w-0 truncate">{display}</span>
                  {isSelected && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#ff8f1f]" />}
                </button>
              );
            })
          )}
        </div>
      )}
      {!country.trim() || !province.trim() ? (
        <p className={baseHelperClassName}>Selecciona pais y provincia para habilitar localidades.</p>
      ) : error ? (
        <p className="mt-2 text-xs text-rose-500">{error}</p>
      ) : (
        <p className={baseHelperClassName}>
          {loading ? 'Cargando localidades disponibles...' : 'Escribe para filtrar y elige el distrito del listado.'}
        </p>
      )}
    </div>
  );
}
