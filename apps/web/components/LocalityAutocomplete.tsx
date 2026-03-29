'use client';

import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Search } from 'lucide-react';

type LocalityOption = {
  name: string;
  label: string;
};

type Props = {
  country: string;
  province: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  inputClassName?: string;
  helperClassName?: string;
  panelClassName?: string;
  itemClassName?: string;
  emptyClassName?: string;
};

const normalizeText = (value: string) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const tokenizeText = (value: string) => normalizeText(value).split(' ').filter(Boolean);

const isSingleEditAway = (source: string, target: string) => {
  if (!source || !target) return false;
  const lengthDiff = Math.abs(source.length - target.length);
  if (lengthDiff > 1) return false;
  if (source === target) return true;

  let sourceIndex = 0;
  let targetIndex = 0;
  let mismatches = 0;

  while (sourceIndex < source.length && targetIndex < target.length) {
    if (source[sourceIndex] === target[targetIndex]) {
      sourceIndex += 1;
      targetIndex += 1;
      continue;
    }

    mismatches += 1;
    if (mismatches > 1) return false;

    if (source.length > target.length) {
      sourceIndex += 1;
    } else if (source.length < target.length) {
      targetIndex += 1;
    } else {
      sourceIndex += 1;
      targetIndex += 1;
    }
  }

  if (sourceIndex < source.length || targetIndex < target.length) {
    mismatches += 1;
  }

  return mismatches <= 1;
};

const isStrongPredictiveMatch = (typedValue: string, option: LocalityOption) => {
  const normalizedTypedValue = normalizeText(typedValue);
  if (normalizedTypedValue.length < 5) return false;

  const normalizedName = normalizeText(option.name);
  const typedTokens = tokenizeText(typedValue);
  const nameTokens = tokenizeText(option.name);

  if (normalizedName.includes(normalizedTypedValue)) {
    return true;
  }

  return typedTokens.every((typedToken) =>
    nameTokens.some(
      (nameToken) =>
        nameToken === typedToken ||
        nameToken.startsWith(typedToken) ||
        nameToken.includes(typedToken) ||
        (typedToken.length >= 5 && isSingleEditAway(nameToken, typedToken))
    )
  );
};

const searchLocalities = async (
  country: string,
  province: string,
  query: string
): Promise<{ results: LocalityOption[]; error?: string }> => {
  const trimmedCountry = country.trim();
  const trimmedProvince = province.trim();
  const trimmedQuery = query.trim();
  if (!trimmedCountry || !trimmedProvince || trimmedQuery.length < 2) return { results: [] };

  try {
    const params = new URLSearchParams({
      country: trimmedCountry,
      province: trimmedProvince,
      query: trimmedQuery,
      limit: '12',
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
      error: 'No pudimos buscar localidades en este momento.',
    };
  }
};

export default function LocalityAutocomplete({
  country,
  province,
  value,
  onChange,
  placeholder = 'Escribe tu localidad',
  disabled = false,
  inputClassName,
  helperClassName,
  panelClassName,
  itemClassName,
  emptyClassName,
}: Props) {
  const [input, setInput] = useState(value || '');
  const [suggestions, setSuggestions] = useState<LocalityOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const requestIdRef = useRef(0);
  const mountedRef = useRef(true);
  const blurTimerRef = useRef<number | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (blurTimerRef.current !== null) {
        window.clearTimeout(blurTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setInput(value || '');
  }, [value]);

  useEffect(() => {
    if (!country.trim() || !province.trim()) {
      setSuggestions([]);
      setLoading(false);
      setError('');
      setOpen(false);
      return;
    }

    const trimmed = input.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setLoading(false);
      setError('');
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setLoading(true);
    setError('');

    const timer = window.setTimeout(async () => {
      const { results, error: nextError } = await searchLocalities(country, province, trimmed);
      if (!mountedRef.current || requestIdRef.current !== requestId) return;
      setSuggestions(results);
      setError(nextError || '');
      setLoading(false);
      setOpen(true);
    }, 250);

    return () => {
      window.clearTimeout(timer);
    };
  }, [country, input, province]);

  const selectOption = (option: LocalityOption) => {
    setInput(option.name);
    onChange(option.name);
    setOpen(false);
    setSuggestions([]);
    setError('');
  };

  const commitTypedValue = () => {
    const normalizedInput = normalizeText(input);
    if (!normalizedInput) {
      onChange('');
      return;
    }

    const exactMatch = suggestions.find(
      (option) => normalizeText(option.name) === normalizedInput || normalizeText(option.label) === normalizedInput
    );

    if (exactMatch) {
      selectOption(exactMatch);
      return;
    }

    if (suggestions.length === 1 && isStrongPredictiveMatch(input, suggestions[0])) {
      selectOption(suggestions[0]);
      return;
    }

    setInput(value || '');
    onChange(value || '');
  };

  const handleInputChange = (nextValue: string) => {
    setInput(nextValue);
    setOpen(true);
    if (!nextValue.trim()) {
      onChange('');
      setSuggestions([]);
      setError('');
      return;
    }
    if (value && normalizeText(nextValue) !== normalizeText(value)) {
      onChange('');
    }
  };

  const baseInputClassName =
    inputClassName ||
    'w-full rounded-2xl border border-slate-200 bg-white px-10 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400';
  const baseHelperClassName = helperClassName || 'mt-2 text-xs text-slate-500';
  const basePanelClassName = panelClassName || 'absolute z-20 mt-2 max-h-64 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl';
  const baseItemClassName = itemClassName || 'w-full border-b border-slate-100 px-4 py-3 text-left text-sm text-slate-700 transition hover:bg-slate-50';
  const baseEmptyClassName = emptyClassName || 'px-4 py-3 text-sm text-slate-500';

  const showSuggestions = open && province.trim() && input.trim().length >= 2;

  return (
    <div className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={input}
          onChange={(event) => handleInputChange(event.target.value)}
          onFocus={() => {
            if (country.trim() && province.trim() && input.trim().length >= 2) {
              setOpen(true);
            }
          }}
          onBlur={() => {
            blurTimerRef.current = window.setTimeout(() => {
              commitTypedValue();
              setOpen(false);
            }, 150);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              if (suggestions.length > 0) {
                selectOption(suggestions[0]);
              } else {
                commitTypedValue();
              }
            }
          }}
          placeholder={country.trim() && province.trim() ? placeholder : 'Selecciona pais y provincia primero'}
          disabled={disabled || !country.trim() || !province.trim()}
          className={`${baseInputClassName} pl-10 ${loading ? 'pr-10' : ''}`}
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
          </div>
        )}
      </div>

      {(!country.trim() || !province.trim()) && (
        <p className={baseHelperClassName}>Selecciona pais y provincia para habilitar la busqueda de localidades.</p>
      )}
      {country.trim() && province.trim() && !value && !loading && (
        <p className={baseHelperClassName}>Elige una localidad o distrito sugerido para guardar un nombre estandarizado. Si la primera coincide claramente, Enter la toma.</p>
      )}
      {error && <p className="mt-2 text-xs text-rose-500">{error}</p>}

      {showSuggestions && (
        <div className={basePanelClassName}>
          {suggestions.length === 0 && !loading ? (
            <div className={baseEmptyClassName}>No encontramos localidades para esa búsqueda.</div>
          ) : (
            suggestions.map((option) => (
              <button
                key={`${option.name}-${option.label}`}
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault();
                  selectOption(option);
                }}
                className={baseItemClassName}
              >
                <span className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                  <span>
                    <span className="block font-semibold text-slate-800">{option.name}</span>
                    <span className="block text-xs text-slate-500">{option.label}</span>
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}