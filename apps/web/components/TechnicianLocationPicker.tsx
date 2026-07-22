'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MapPin, Search, X } from 'lucide-react';
import { DEFAULT_COUNTRY_NAME, isCoordinateWithinCountry } from '../lib/location-catalog';
import { addMalvinasArgentinaLabel } from '../lib/map-overlays';

export interface LocationPickerResult {
  lat: number;
  lng: number;
  displayName: string;
  fullDisplayName?: string;
  primaryLabel?: string;
  secondaryLabel?: string;
  detailLabel?: string;
  accuracyLabel?: string;
  houseNumber?: string;
  isValid: boolean;
  precision: 'exact' | 'approx';
}

interface Props {
  value: LocationPickerResult | null;
  onChange: (result: LocationPickerResult | null) => void;
  query?: string;
  onQueryChange?: (query: string) => void;
  coverageRadiusKm?: number;
  countryHint?: string;
  cityHint?: string;
  provinceHint?: string;
  label?: string;
  description?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  autoSearch?: boolean;
}

type GeocodeSearchResponse = {
  results: LocationPickerResult[];
  error?: string;
  rateLimited?: boolean;
};

const SEARCH_CACHE_TTL_MS = 45_000;
const SEARCH_RATE_LIMIT_COOLDOWN_MS = 7_000;

const hasAddressHeight = (value: string) => /\b\d{1,6}[a-zA-Z]?\b/.test(String(value || ''));

type StructuredAddressFields = {
  locality: string;
  street: string;
  number: string;
};

const normalizeSpacing = (value: string) => String(value || '').trim().replace(/\s+/g, ' ');

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const parseStructuredAddress = (value: string): StructuredAddressFields => {
  const compact = normalizeSpacing(value).replace(/\s+·\s+/g, ', ');
  const parts = compact
    .split(',')
    .map((part) => normalizeSpacing(part))
    .filter(Boolean);
  const streetLine = parts[0] || '';
  const number = streetLine.match(/\b\d{1,6}[a-zA-Z]?\b/)?.[0] || '';
  const street = normalizeSpacing(number ? streetLine.replace(new RegExp(`\\b${number}\\b`), '') : streetLine);
  const locality = parts[1] || '';

  return { locality, street, number };
};

const composeStructuredAddress = (fields: StructuredAddressFields) => {
  const streetLine = normalizeSpacing([fields.street, fields.number].filter(Boolean).join(' '));
  const locality = normalizeSpacing(fields.locality);
  return [streetLine, locality].filter(Boolean).join(', ');
};

const addressContainsNumber = (value: string, number: string) =>
  Boolean(number && new RegExp(`\\b${escapeRegExp(number)}\\b`, 'i').test(value));

const preserveTypedHouseNumber = (result: LocationPickerResult, searchText: string): LocationPickerResult => {
  const parsed = parseStructuredAddress(searchText);
  const typedNumber = normalizeSpacing(parsed.number);

  if (!typedNumber) return result;

  const primarySource = normalizeSpacing(result.primaryLabel || result.displayName.split(',')[0] || parsed.street);
  const displaySource = normalizeSpacing(result.displayName);

  if (addressContainsNumber(primarySource, typedNumber) || addressContainsNumber(displaySource, typedNumber)) {
    return { ...result, houseNumber: result.houseNumber || typedNumber };
  }

  const baseStreet = normalizeSpacing(primarySource || parsed.street);
  const primaryLabel = normalizeSpacing(`${baseStreet} ${typedNumber}`);
  const secondaryLabel = normalizeSpacing(result.secondaryLabel || parsed.locality);
  const displayName = [primaryLabel, secondaryLabel].filter(Boolean).join(', ');

  return {
    ...result,
    displayName: displayName || primaryLabel || result.displayName,
    primaryLabel: primaryLabel || result.primaryLabel,
    secondaryLabel: secondaryLabel || result.secondaryLabel,
    houseNumber: typedNumber,
  };
};

const buildSearchCacheKey = (query: string, countryHint?: string, cityHint?: string, provinceHint?: string) =>
  JSON.stringify({
    query: query.trim().toLowerCase(),
    countryHint: String(countryHint || '').trim().toLowerCase(),
    cityHint: String(cityHint || '').trim().toLowerCase(),
    provinceHint: String(provinceHint || '').trim().toLowerCase(),
  });

const geocodeAddress = async (
  query: string,
  countryHint?: string,
  cityHint?: string,
  provinceHint?: string
): Promise<GeocodeSearchResponse> => {
  const trimmed = query.trim();
  if (trimmed.length < 3) return { results: [] };

  try {
    const params = new URLSearchParams({ query: trimmed, limit: '6', quick: '1' });
    if (countryHint?.trim()) {
      params.set('country', countryHint.trim());
    }
    if (cityHint?.trim()) {
      params.set('city', cityHint.trim());
    }
    if (provinceHint?.trim()) {
      params.set('province', provinceHint.trim());
    }
    const response = await fetch(`/api/geocode/search?${params.toString()}`, {
      cache: 'no-store',
    });
    const payload = (await response.json()) as {
      results?: Array<{
        display_name: string;
        full_display_name?: string;
        primary_label?: string;
        secondary_label?: string;
        detail_label?: string;
        accuracy_label?: string;
        house_number?: string;
        lat: number;
        lon: number;
        precision?: 'exact' | 'approx';
      }>;
      error?: string;
      rateLimited?: boolean;
    };
    const data = Array.isArray(payload.results) ? payload.results : [];
    const seenResults = new Set<string>();
    const results = data
      .map((item): LocationPickerResult => ({
        lat: Number(item.lat),
        lng: Number(item.lon),
        displayName: item.display_name,
        fullDisplayName: item.full_display_name,
        primaryLabel: item.primary_label,
        secondaryLabel: item.secondary_label,
        detailLabel: item.detail_label,
        accuracyLabel: item.accuracy_label,
        houseNumber: item.house_number,
        isValid: isCoordinateWithinCountry(Number(item.lat), Number(item.lon), countryHint || DEFAULT_COUNTRY_NAME),
        precision: item.precision === 'exact' ? 'exact' : 'approx',
      }))
      .filter((item) => {
        if (!item.isValid) return false;
        const key = `${item.primaryLabel || item.displayName}|${item.secondaryLabel || ''}`.toLowerCase();
        if (seenResults.has(key)) return false;
        seenResults.add(key);
        return true;
      });
    return { results, error: payload.error, rateLimited: Boolean(payload.rateLimited) };
  } catch {
    return { results: [], error: 'No pudimos buscar direcciones en este momento.' };
  }
};

export default function TechnicianLocationPicker({
  value,
  onChange,
  query,
  onQueryChange,
  coverageRadiusKm = 20,
  countryHint = DEFAULT_COUNTRY_NAME,
  cityHint,
  provinceHint,
  label = 'Ubicación de trabajo',
  required = true,
  disabled = false,
  error,
  autoSearch = true,
}: Props) {
  const [input, setInput] = useState('');
  const [addressFields, setAddressFields] = useState<StructuredAddressFields>({
    locality: '',
    street: '',
    number: '',
  });
  const [suggestions, setSuggestions] = useState<LocationPickerResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [mapError, setMapError] = useState('');
  const [searchError, setSearchError] = useState('');
  const mapHostRef = useRef<HTMLDivElement | null>(null);
  const leafletRef = useRef<typeof import('leaflet') | null>(null);
  const mapRef = useRef<any | null>(null);
  const markerRef = useRef<any | null>(null);
  const coverageCircleRef = useRef<any | null>(null);
  const isMountedRef = useRef(true);
  const latestValueRef = useRef<LocationPickerResult | null>(value);
  const latestInputRef = useRef('');
  const latestOnChangeRef = useRef(onChange);
  const searchRequestIdRef = useRef(0);
  const searchCacheRef = useRef(new Map<string, { expiresAt: number; payload: GeocodeSearchResponse }>());
  const rateLimitedUntilRef = useRef(0);

  const applyExactSearchResult = useCallback(
    (results: LocationPickerResult[], searchText: string) => {
      const typedNumber = parseStructuredAddress(searchText).number;
      const exactResult = results.find((result) => {
        if (result.precision !== 'exact') return false;
        if (!typedNumber) return true;
        return (
          addressContainsNumber(result.houseNumber || '', typedNumber) ||
          addressContainsNumber(result.primaryLabel || '', typedNumber) ||
          addressContainsNumber(result.displayName || '', typedNumber)
        );
      });

      if (!exactResult) return false;

      const confirmedQuery = normalizeSpacing(exactResult.displayName || exactResult.primaryLabel || searchText);
      onChange(exactResult);
      setInput(confirmedQuery);
      onQueryChange?.(confirmedQuery);
      setSuggestions([]);
      setSearchError('');
      setShowMap(true);
      return true;
    },
    [onChange, onQueryChange]
  );

  const runAddressSearch = useCallback(
    async (rawQuery: string, options: { force?: boolean } = {}) => {
      const trimmed = rawQuery.trim();
      if (trimmed.length === 0 || trimmed.length < 3) {
        setSuggestions([]);
        setLoading(false);
        setSearchError('');
        return;
      }

      if (!hasAddressHeight(trimmed)) {
        setSuggestions([]);
        setLoading(false);
        if (options.force) {
          setSearchError('Agrega la altura exacta. Ejemplo: Husares 564.');
        }
        return;
      }

      const now = Date.now();
      if (rateLimitedUntilRef.current > now) {
        setSuggestions([]);
        setLoading(false);
        setSearchError('Hicimos muchas busquedas seguidas. Espera unos segundos y vuelve a buscar.');
        return;
      }

      const cacheKey = buildSearchCacheKey(trimmed, countryHint, cityHint, provinceHint);
      const cached = searchCacheRef.current.get(cacheKey);
      if (cached && cached.expiresAt > now) {
        if (options.force && applyExactSearchResult(cached.payload.results, trimmed)) {
          setLoading(false);
          return;
        }
        setSuggestions(cached.payload.results);
        setSearchError(cached.payload.error || '');
        setLoading(false);
        return;
      }

      const requestId = searchRequestIdRef.current + 1;
      searchRequestIdRef.current = requestId;
      setLoading(true);
      setSearchError('');

      const response = await geocodeAddress(trimmed, countryHint, cityHint, provinceHint);
      if (!isMountedRef.current || searchRequestIdRef.current !== requestId) return;
      const searchResults = response.results.map((result) => preserveTypedHouseNumber(result, trimmed));
      const normalizedResponse = { ...response, results: searchResults };

      if (response.rateLimited) {
        rateLimitedUntilRef.current = Date.now() + SEARCH_RATE_LIMIT_COOLDOWN_MS;
      }

      searchCacheRef.current.set(cacheKey, {
        expiresAt: Date.now() + SEARCH_CACHE_TTL_MS,
        payload: normalizedResponse,
      });

      if (options.force && applyExactSearchResult(searchResults, trimmed)) {
        setLoading(false);
        return;
      }

      setSuggestions(searchResults);
      if (options.force && searchResults.length === 0) {
        setShowMap(true);
        setSearchError(
          response.error
            ? `${response.error} Si la direccion no aparece, ubica el pin manualmente en el mapa.`
            : 'No encontramos esa direccion. Ubica el pin manualmente en el mapa.'
        );
      } else {
        setSearchError(response.error || '');
      }
      setLoading(false);
    },
    [applyExactSearchResult, cityHint, countryHint, provinceHint]
  );

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    latestValueRef.current = value;
  }, [value]);

  useEffect(() => {
    latestInputRef.current = input;
  }, [input]);

  useEffect(() => {
    latestOnChangeRef.current = onChange;
  }, [onChange]);

  // Initialize input from controlled query
  useEffect(() => {
    const nextInput = query ?? value?.displayName ?? '';
    setInput((current) => (current === nextInput ? current : nextInput));
    const parsed = parseStructuredAddress(nextInput);
    setAddressFields((current) =>
      current.locality === parsed.locality && current.street === parsed.street && current.number === parsed.number
        ? current
        : parsed
    );
    if (!nextInput.trim()) {
      setSuggestions([]);
      setSearchError('');
    }
  }, [query, value?.displayName]);

  useEffect(() => {
    if (!autoSearch) {
      setLoading(false);
      return;
    }

    const trimmed = input.trim();
    if (value?.isValid && normalizeSpacing(trimmed) === normalizeSpacing(value.displayName)) {
      setSuggestions([]);
      setLoading(false);
      setSearchError('');
      return;
    }

    if (trimmed.length === 0 || trimmed.length < 3) {
      setSuggestions([]);
      setLoading(false);
      setSearchError('');
      return;
    }

    if (!hasAddressHeight(trimmed)) {
      setSuggestions([]);
      setLoading(false);
      setSearchError('');
      return;
    }

    setLoading(true);
    setSearchError('');

    const timer = window.setTimeout(async () => {
      await runAddressSearch(trimmed);
    }, 320);

    return () => {
      window.clearTimeout(timer);
    };
  }, [autoSearch, input, runAddressSearch, value?.displayName, value?.isValid]);

  const handleSearch = (query: string) => {
    setInput(query);
    onQueryChange?.(query);
    setSearchError('');
    if (!autoSearch) {
      setSuggestions([]);
    }
    if (value && query.trim() !== value.displayName.trim()) {
      setShowMap(false);
      onChange(null);
    }
  };

  const handleStructuredAddressChange = (field: keyof StructuredAddressFields, nextValue: string) => {
    const nextFields = {
      ...addressFields,
      [field]: nextValue,
    };
    const nextQuery = composeStructuredAddress(nextFields);
    setAddressFields(nextFields);
    handleSearch(nextQuery);
  };

  // Select suggestion
  const handleSelectSuggestion = (result: LocationPickerResult) => {
    const effectiveLocality = normalizeSpacing(cityHint || addressFields.locality);
    const composedQuery = composeStructuredAddress({ ...addressFields, locality: effectiveLocality });
    const normalizedResult = preserveTypedHouseNumber(result, normalizeSpacing(composedQuery || input));
    const confirmedQuery = normalizeSpacing(normalizedResult.displayName || normalizedResult.primaryLabel || input);
    onChange(normalizedResult);
    setInput(confirmedQuery);
    onQueryChange?.(confirmedQuery);
    setSuggestions([]);
    setSearchError('');
    setShowMap(true);
  };

  const handleConfirmMapPoint = () => {
    if (!value?.isValid) return;

    const markerPosition = markerRef.current?.getLatLng?.();
    const lat = Number(markerPosition?.lat ?? value.lat);
    const lng = Number(markerPosition?.lng ?? value.lng);

    if (!isCoordinateWithinCountry(lat, lng, countryHint)) {
      setMapError(`La ubicacion debe estar dentro de ${countryHint}.`);
      return;
    }

    onChange({
      ...value,
      lat,
      lng,
      displayName: normalizeSpacing(value.displayName || input || 'Ubicacion seleccionada en mapa'),
      isValid: true,
      precision: 'exact',
    });
    setSearchError('');
    setMapError('');
    setShowMap(false);
  };

  // Initialize and manage map
  useEffect(() => {
    if (!showMap || !mapHostRef.current) return;

    let cancelled = false;

    const initMap = async () => {
      try {
        const L = await import('leaflet');
        if (cancelled || !mapHostRef.current) return;

        leafletRef.current = L;
        delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: '/leaflet/marker-icon-2x.png',
          iconUrl: '/leaflet/marker-icon.png',
          shadowUrl: '/leaflet/marker-shadow.png',
        });

        // Remove existing map
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }

        // Initial center: Buenos Aires
        const initialValue = latestValueRef.current;
        const center = initialValue || { lat: -34.6037, lng: -58.3816 };
        const coverageRadiusMeters = Math.max(1, coverageRadiusKm) * 1000;

        const map = L.map(mapHostRef.current, {
          center: [center.lat, center.lng],
          zoom: 12,
          minZoom: 4,
          maxZoom: 18,
        });

        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap contributors',
        }).addTo(map);

        addMalvinasArgentinaLabel(L, map);

        mapRef.current = map;
        setMapError('');

        const syncCoverageCircle = (lat: number, lng: number) => {
          if (cancelled || mapRef.current !== map) return null;
          if (coverageCircleRef.current) {
            coverageCircleRef.current.setLatLng([lat, lng]);
            coverageCircleRef.current.setRadius(coverageRadiusMeters);
            return coverageCircleRef.current;
          }

          coverageCircleRef.current = L.circle([lat, lng], {
            radius: coverageRadiusMeters,
            color: '#2563eb',
            weight: 2,
            opacity: 0.8,
            fillColor: '#60a5fa',
            fillOpacity: 0.16,
            interactive: false,
          }).addTo(map);

          return coverageCircleRef.current;
        };

        const fitCoverageBounds = (lat: number, lng: number) => {
          const circle = syncCoverageCircle(lat, lng);
          if (!circle || cancelled || mapRef.current !== map) return;
          map.fitBounds(circle.getBounds(), { padding: [24, 24] });
        };

        // Add marker if location exists
        if (initialValue) {
          const initialMarker = L.marker([initialValue.lat, initialValue.lng], {
            draggable: true,
            title: 'Tu ubicación de trabajo',
          }).addTo(map);
          markerRef.current = initialMarker;
          fitCoverageBounds(initialValue.lat, initialValue.lng);

          initialMarker.on('dragend', () => {
            if (cancelled || mapRef.current !== map) return;
            const newLat = initialMarker.getLatLng().lat;
            const newLng = initialMarker.getLatLng().lng;
            const currentValue = latestValueRef.current || initialValue;

            if (isCoordinateWithinCountry(newLat, newLng, countryHint)) {
              syncCoverageCircle(newLat, newLng);
              latestOnChangeRef.current({
                lat: newLat,
                lng: newLng,
                displayName: currentValue.displayName,
                isValid: true,
                precision: 'approx',
              });
            } else {
              setMapError(`La ubicación debe estar dentro de ${countryHint}.`);
              initialMarker.setLatLng([currentValue.lat, currentValue.lng]);
            }
          });
        }

        // Click to place marker
        map.on('click', (e: any) => {
          if (cancelled || mapRef.current !== map) return;
          const { lat, lng } = e.latlng;

          if (!isCoordinateWithinCountry(lat, lng, countryHint)) {
            setMapError(`La ubicación debe estar dentro de ${countryHint}.`);
            return;
          }

          if (markerRef.current) {
            markerRef.current.setLatLng([lat, lng]);
          } else {
            const placedMarker = L.marker([lat, lng], {
              draggable: true,
              title: 'Tu ubicación de trabajo',
            }).addTo(map);
            markerRef.current = placedMarker;

            placedMarker.on('dragend', () => {
              if (cancelled || mapRef.current !== map) return;
              const newLat = placedMarker.getLatLng().lat;
              const newLng = placedMarker.getLatLng().lng;

              if (isCoordinateWithinCountry(newLat, newLng, countryHint)) {
                syncCoverageCircle(newLat, newLng);
                const currentValue = latestValueRef.current;
                const currentInput = latestInputRef.current;
                latestOnChangeRef.current({
                  lat: newLat,
                  lng: newLng,
                  displayName: currentValue?.displayName || currentInput || 'Ubicación seleccionada en mapa',
                  isValid: true,
                  precision: 'approx',
                });
              } else {
                setMapError(`La ubicación debe estar dentro de ${countryHint}.`);
                placedMarker.setLatLng([lat, lng]);
              }
            });
          }

          syncCoverageCircle(lat, lng);
          const currentValue = latestValueRef.current;
          const currentInput = latestInputRef.current;

          latestOnChangeRef.current({
            lat,
            lng,
            displayName: currentValue?.displayName || currentInput || 'Ubicación seleccionada en mapa',
            isValid: true,
            precision: 'approx',
          });

          setMapError('');
        });
      } catch (err) {
        if (!cancelled) {
          setMapError('No pudimos cargar el mapa.');
        }
      }
    };

    initMap();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      coverageCircleRef.current = null;
      markerRef.current = null;
    };
  }, [countryHint, coverageRadiusKm, showMap]);

  const getSuggestionSecondary = (suggestion: LocationPickerResult) =>
    suggestion.secondaryLabel ||
    suggestion.fullDisplayName ||
    `${suggestion.lat.toFixed(4)}, ${suggestion.lng.toFixed(4)}`;
  const effectiveLocality = normalizeSpacing(cityHint || addressFields.locality);
  const composedAddressQuery = composeStructuredAddress({ ...addressFields, locality: effectiveLocality });
  const searchQuery = normalizeSpacing(composedAddressQuery || input);
  const canOpenMapManually = searchQuery.length >= 3 && hasAddressHeight(searchQuery);

  return (
    <div className="space-y-3">
      <div>
        <label className="text-sm font-semibold text-slate-700">
          {label}
          {required && <span className="text-red-500">*</span>}
        </label>
      </div>

      {/* Input y Búsqueda */}
      <div className="space-y-2">
        <div>
          <div className="grid gap-2 sm:grid-cols-[1fr_8rem]">
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                Calle
              </label>
              <input
                type="text"
                value={addressFields.street}
                onChange={(event) => handleStructuredAddressChange('street', event.target.value)}
                placeholder="Ej: Husares"
                disabled={disabled}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-400 disabled:bg-slate-50"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                Altura
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={addressFields.number}
                onChange={(event) => handleStructuredAddressChange('number', event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    void runAddressSearch(searchQuery, { force: true });
                  }
                }}
                placeholder="564"
                disabled={disabled}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-400 disabled:bg-slate-50"
              />
            </div>
          </div>
        </div>

        <div>
          <div className="flex flex-col gap-2 lg:flex-row">
          <button
            type="button"
            onClick={() => void runAddressSearch(searchQuery, { force: true })}
            disabled={disabled || loading}
            className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Search className="mr-1 h-4 w-4" />
            {loading ? 'Buscando' : 'Buscar'}
          </button>
          <button
            type="button"
            onClick={() => {
              if (!value?.isValid && !canOpenMapManually) {
                setSearchError('Escribi calle y altura antes de ajustar el punto en el mapa.');
                return;
              }
              if (!value?.isValid) {
                setSearchError('Ubica el pin manualmente si la direccion no aparece en la busqueda.');
              }
              setShowMap(!showMap);
            }}
            disabled={disabled}
            className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900 disabled:opacity-50"
          >
            <MapPin className="mr-1 h-4 w-4" />
            {value?.isValid ? 'Ajustar' : 'Mapa'}
          </button>
        </div>
        </div>

        {/* Sugerencias */}
        {suggestions.length > 0 && (
          <div className="max-h-80 overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleSelectSuggestion(suggestion)}
                className="w-full border-b border-slate-100 px-3 py-3 text-left transition hover:bg-orange-50/60 last:border-b-0"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-950">
                      {suggestion.primaryLabel || suggestion.displayName}
                    </div>
                    <div className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                      {getSuggestionSecondary(suggestion)}
                    </div>
                    {suggestion.detailLabel && (
                      <div className="mt-1 text-[11px] font-medium text-slate-400">{suggestion.detailLabel}</div>
                    )}
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${
                      suggestion.precision === 'exact'
                        ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border border-amber-200 bg-amber-50 text-amber-700'
                    }`}
                  >
                    {suggestion.accuracyLabel || (suggestion.precision === 'exact' ? 'Altura exacta' : 'Confirmar')}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Mapa */}
        {showMap && (
          <div className="space-y-2">
            <div className="flex items-center justify-end gap-2">
              {value?.isValid && value.precision !== 'exact' && (
                <button
                  type="button"
                  onClick={handleConfirmMapPoint}
                  className="inline-flex items-center justify-center rounded-xl bg-[#ff8f1f] px-3 py-2 text-xs font-bold text-slate-950 transition hover:bg-[#ff9f39]"
                >
                  Confirmar direccion
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowMap(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {mapError && (
              <div className="rounded bg-red-50 px-2 py-1 text-xs text-red-600">
                {mapError}
              </div>
            )}
            <div
              ref={mapHostRef}
              className="h-[300px] w-full rounded bg-slate-100"
            />
          </div>
        )}
      </div>

      {/* Errores */}
      {error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}

      {searchError && !error && (
        <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {searchError}
        </div>
      )}

    </div>
  );
}
