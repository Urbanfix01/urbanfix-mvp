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
  const requestIdRef = useRef(0);

  useEffect(() => {
    const trimmedCountry = country.trim();
    const trimmedProvince = province.trim();
    if (!trimmedCountry || !trimmedProvince) {
      setOptions([]);
      setLoading(false);
      setError('');
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
    return exact?.name || value;
  }, [normalizedValue, options, value]);

  const baseSelectClassName =
    selectClassName ||
    'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400';
  const baseHelperClassName = helperClassName || 'mt-2 text-xs text-slate-500';
  const isDisabled = disabled || !country.trim() || !province.trim() || loading;

  return (
    <div>
      <select
        value={selectedValue}
        onChange={(event) => onChange(event.target.value)}
        disabled={isDisabled}
        className={baseSelectClassName}
      >
        <option value="">
          {!country.trim() || !province.trim()
            ? 'Selecciona pais y provincia primero'
            : loading
              ? 'Cargando localidades...'
              : 'Seleccionar localidad'}
        </option>
        {value && !options.some((option) => normalizeText(option.name) === normalizedValue) && (
          <option value={value}>{value}</option>
        )}
        {options.map((option) => (
          <option key={`${option.name}-${option.label}`} value={option.name}>
            {option.label || option.name}
          </option>
        ))}
      </select>
      {!country.trim() || !province.trim() ? (
        <p className={baseHelperClassName}>Selecciona pais y provincia para habilitar localidades.</p>
      ) : error ? (
        <p className="mt-2 text-xs text-rose-500">{error}</p>
      ) : (
        <p className={baseHelperClassName}>
          {loading ? 'Cargando localidades disponibles...' : 'Elige una localidad del listado oficial.'}
        </p>
      )}
    </div>
  );
}
