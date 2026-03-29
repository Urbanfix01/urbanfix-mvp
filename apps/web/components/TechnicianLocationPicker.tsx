'use client';

import React, { useEffect, useRef, useState } from 'react';
import { HelpCircle, MapPin, X } from 'lucide-react';
import { DEFAULT_COUNTRY_NAME, isCoordinateWithinCountry } from '../lib/location-catalog';

export interface LocationPickerResult {
  lat: number;
  lng: number;
  displayName: string;
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
}

type GeocodeSearchResponse = {
  results: LocationPickerResult[];
  error?: string;
  rateLimited?: boolean;
};

const SEARCH_CACHE_TTL_MS = 45_000;
const SEARCH_RATE_LIMIT_COOLDOWN_MS = 7_000;

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
    const params = new URLSearchParams({ query: trimmed, limit: '12' });
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
      results?: Array<{ display_name: string; lat: number; lon: number; precision?: 'exact' | 'approx' }>;
      error?: string;
      rateLimited?: boolean;
    };
    const data = Array.isArray(payload.results) ? payload.results : [];
    const results = data
      .map((item): LocationPickerResult => ({
        lat: Number(item.lat),
        lng: Number(item.lon),
        displayName: item.display_name,
        isValid: isCoordinateWithinCountry(Number(item.lat), Number(item.lon), countryHint || DEFAULT_COUNTRY_NAME),
        precision: item.precision === 'exact' ? 'exact' : 'approx',
      }))
      .filter((item) => item.isValid);
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
  description: descriptionProp,
  required = true,
  disabled = false,
  error,
}: Props) {
  const [input, setInput] = useState('');
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
  const searchRequestIdRef = useRef(0);
  const searchCacheRef = useRef(new Map<string, { expiresAt: number; payload: GeocodeSearchResponse }>());
  const rateLimitedUntilRef = useRef(0);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Initialize input from value
  useEffect(() => {
    const nextInput = value?.displayName ?? query ?? '';
    setInput((current) => (current === nextInput ? current : nextInput));
    if (!nextInput.trim()) {
      setSuggestions([]);
      setSearchError('');
    }
  }, [query, value?.displayName]);

  useEffect(() => {
    const trimmed = input.trim();
    if (trimmed.length === 0 || trimmed.length < 3) {
      setSuggestions([]);
      setLoading(false);
      setSearchError('');
      return;
    }

    const now = Date.now();
    if (rateLimitedUntilRef.current > now) {
      setSuggestions([]);
      setLoading(false);
      setSearchError('Demasiadas busquedas seguidas. Espera unos segundos e intenta nuevamente.');
      return;
    }

    const cacheKey = buildSearchCacheKey(trimmed, countryHint, cityHint, provinceHint);
    const cached = searchCacheRef.current.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      setSuggestions(cached.payload.results);
      setSearchError(cached.payload.error || '');
      setLoading(false);
      return;
    }

    const requestId = searchRequestIdRef.current + 1;
    searchRequestIdRef.current = requestId;
    setLoading(true);
    setSearchError('');

    const timer = window.setTimeout(async () => {
      const response = await geocodeAddress(trimmed, countryHint, cityHint, provinceHint);
      if (!isMountedRef.current || searchRequestIdRef.current !== requestId) return;

      if (response.rateLimited) {
        rateLimitedUntilRef.current = Date.now() + SEARCH_RATE_LIMIT_COOLDOWN_MS;
      }

      searchCacheRef.current.set(cacheKey, {
        expiresAt: Date.now() + SEARCH_CACHE_TTL_MS,
        payload: response,
      });

      setSuggestions(response.results);
      setSearchError(response.error || '');
      setLoading(false);
    }, 900);

    return () => {
      window.clearTimeout(timer);
    };
  }, [cityHint, countryHint, input, provinceHint]);

  const handleSearch = (query: string) => {
    setInput(query);
    onQueryChange?.(query);
    if (value && query.trim() !== value.displayName.trim()) {
      onChange(null);
    }
  };

  // Select suggestion
  const handleSelectSuggestion = (result: LocationPickerResult) => {
    onChange(result);
    setInput(result.displayName);
    onQueryChange?.(result.displayName);
    setSuggestions([]);
    setSearchError('');
    setShowMap(true);
  };

  // Clear location
  const handleClear = () => {
    onChange(null);
    setInput('');
    onQueryChange?.('');
    setSuggestions([]);
    setShowMap(false);
    setMapError('');
    setSearchError('');
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
        const center = value || { lat: -34.6037, lng: -58.3816 };
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
        if (value) {
          const initialMarker = L.marker([value.lat, value.lng], {
            draggable: true,
            title: 'Tu ubicación de trabajo',
          }).addTo(map);
          markerRef.current = initialMarker;
          fitCoverageBounds(value.lat, value.lng);

          initialMarker.on('dragend', () => {
            if (cancelled || mapRef.current !== map) return;
            const newLat = initialMarker.getLatLng().lat;
            const newLng = initialMarker.getLatLng().lng;

            if (isCoordinateWithinCountry(newLat, newLng, countryHint)) {
              syncCoverageCircle(newLat, newLng);
              onChange({
                lat: newLat,
                lng: newLng,
                displayName: value.displayName,
                isValid: true,
                precision: 'exact',
              });
            } else {
              setMapError(`La ubicación debe estar dentro de ${countryHint}.`);
              initialMarker.setLatLng([value.lat, value.lng]);
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
                onChange({
                  lat: newLat,
                  lng: newLng,
                  displayName: input || 'Ubicación seleccionada en mapa',
                  isValid: true,
                  precision: 'exact',
                });
              } else {
                setMapError(`La ubicación debe estar dentro de ${countryHint}.`);
                placedMarker.setLatLng([lat, lng]);
              }
            });
          }

          fitCoverageBounds(lat, lng);

          onChange({
            lat,
            lng,
            displayName: input || 'Ubicación seleccionada en mapa',
            isValid: true,
            precision: 'exact',
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
  }, [countryHint, coverageRadiusKm, showMap, value, input, onChange]);

  const description =
    descriptionProp || 'Busca la dirección y confirma el punto exacto en el mapa para definir dónde apareces.';
  const needsMapConfirmation = Boolean(value?.isValid && value.precision !== 'exact');
  const statusText = value?.isValid
    ? needsMapConfirmation
      ? 'Confirma el punto en el mapa para guardar.'
      : value.displayName
    : null;
  const coverageText = needsMapConfirmation
    ? 'Haz clic o arrastra el pin para fijar tu punto exacto.'
    : `Este punto define dónde apareces en el mapa y tu cobertura de ${coverageRadiusKm} km.`;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-slate-700">
          {label}
          {required && <span className="text-red-500">*</span>}
        </label>
        <div
          className="group relative inline-flex cursor-help"
          title={description}
        >
          <HelpCircle className="h-4 w-4 text-slate-400" />
          <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 w-48 -translate-x-1/2 rounded-lg bg-slate-900 px-3 py-2 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus:opacity-100 whitespace-normal">
            {description}
          </div>
        </div>
      </div>

      <p className="text-xs text-slate-500">{description}</p>

      {/* Input y Búsqueda */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={input}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Ej: Av. Rivadavia 1000, Buenos Aires..."
              disabled={disabled}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none disabled:bg-slate-50"
            />
            {loading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
              </div>
            )}
            {value?.isValid && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                title="Limpiar ubicación"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowMap(!showMap)}
            disabled={disabled}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
          >
            <MapPin className="h-4 w-4 inline mr-1" />
            Mapa
          </button>
        </div>

        {/* Sugerencias */}
        {suggestions.length > 0 && (
          <div className="max-h-80 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-sm">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleSelectSuggestion(suggestion)}
                className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50 border-b border-slate-100 last:border-b-0"
              >
                <div className="font-medium text-slate-900">{suggestion.displayName}</div>
                <div className="text-xs text-slate-500">
                  {suggestion.lat.toFixed(4)}, {suggestion.lng.toFixed(4)}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Mapa */}
        {showMap && (
          <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-3">
            <div className="flex justify-between items-center">
              <p className="text-xs text-slate-600">Haz clic o arrastra el marcador para seleccionar tu ubicación</p>
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
            <p className="text-xs text-slate-500">El círculo azul muestra la cobertura desde el punto que elijas en el mapa.</p>
          </div>
        )}
      </div>

      {/* Estado actual */}
      {statusText && (
        <div
          className={`rounded-lg px-3 py-2 text-sm ${
            needsMapConfirmation ? 'bg-amber-50 text-amber-800' : 'bg-green-50 text-green-800'
          }`}
        >
          {needsMapConfirmation ? '!' : '✓'} {statusText}
          <div className={`mt-1 text-xs ${needsMapConfirmation ? 'text-amber-700' : 'text-green-700'}`}>{coverageText}</div>
        </div>
      )}

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

      {required && !value?.isValid && (
        <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          ⚠ Esta información es obligatoria para que aparezcas en el mapa de técnicos
        </div>
      )}
    </div>
  );
}
