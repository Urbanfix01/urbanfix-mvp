'use client';

import React, { useEffect, useRef, useState } from 'react';
import { HelpCircle, MapPin, X } from 'lucide-react';

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
  label?: string;
  description?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
}

const ARGENTINA_BOUNDS = {
  minLat: -55.5,
  maxLat: -21.78,
  minLng: -73.56,
  maxLng: -53.64,
};

const isArgentinaCoordinate = (lat: number, lng: number): boolean => {
  return (
    lat >= ARGENTINA_BOUNDS.minLat &&
    lat <= ARGENTINA_BOUNDS.maxLat &&
    lng >= ARGENTINA_BOUNDS.minLng &&
    lng <= ARGENTINA_BOUNDS.maxLng
  );
};

const geocodeAddress = async (
  query: string
): Promise<{ results: LocationPickerResult[]; error?: string }> => {
  const trimmed = query.trim();
  if (trimmed.length < 3) return { results: [] };

  try {
    const response = await fetch(`/api/geocode/search?query=${encodeURIComponent(trimmed)}&limit=8`, {
      cache: 'no-store',
    });
    const payload = (await response.json()) as {
      results?: Array<{ display_name: string; lat: number; lon: number }>;
      error?: string;
    };
    const data = Array.isArray(payload.results) ? payload.results : [];
    const results = data
      .map((item) => ({
        lat: Number(item.lat),
        lng: Number(item.lon),
        displayName: item.display_name,
        isValid: isArgentinaCoordinate(Number(item.lat), Number(item.lon)),
        precision: 'approx' as const,
      }))
      .filter((item) => item.isValid);
    return { results, error: payload.error };
  } catch {
    return { results: [], error: 'No pudimos buscar direcciones en este momento.' };
  }
};

export default function TechnicianLocationPicker({
  value,
  onChange,
  query,
  onQueryChange,
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
  const isMountedRef = useRef(true);
  const searchRequestIdRef = useRef(0);

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

    const requestId = searchRequestIdRef.current + 1;
    searchRequestIdRef.current = requestId;
    setLoading(true);
    setSearchError('');

    const timer = window.setTimeout(async () => {
      const { results, error: nextError } = await geocodeAddress(trimmed);
      if (!isMountedRef.current || searchRequestIdRef.current !== requestId) return;
      setSuggestions(results);
      setSearchError(nextError || '');
      setLoading(false);
    }, 450);

    return () => {
      window.clearTimeout(timer);
    };
  }, [input]);

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

        // Remove existing map
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }

        // Initial center: Buenos Aires
        const center = value || { lat: -34.6037, lng: -58.3816 };

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

        // Add marker if location exists
        if (value) {
          markerRef.current = L.marker([value.lat, value.lng], {
            draggable: true,
            title: 'Tu ubicación de trabajo',
          }).addTo(map);

          markerRef.current.on('dragend', () => {
            const newLat = markerRef.current.getLatLng().lat;
            const newLng = markerRef.current.getLatLng().lng;

            if (isArgentinaCoordinate(newLat, newLng)) {
              onChange({
                lat: newLat,
                lng: newLng,
                displayName: value.displayName,
                isValid: true,
                precision: 'exact',
              });
            } else {
              setMapError('La ubicación debe estar dentro de Argentina.');
              markerRef.current.setLatLng([value.lat, value.lng]);
            }
          });
        }

        // Click to place marker
        map.on('click', (e: any) => {
          const { lat, lng } = e.latlng;

          if (!isArgentinaCoordinate(lat, lng)) {
            setMapError('La ubicación debe estar dentro de Argentina.');
            return;
          }

          if (markerRef.current) {
            markerRef.current.setLatLng([lat, lng]);
          } else {
            markerRef.current = L.marker([lat, lng], {
              draggable: true,
              title: 'Tu ubicación de trabajo',
            }).addTo(map);

            markerRef.current.on('dragend', () => {
              const newLat = markerRef.current.getLatLng().lat;
              const newLng = markerRef.current.getLatLng().lng;

              if (isArgentinaCoordinate(newLat, newLng)) {
                onChange({
                  lat: newLat,
                  lng: newLng,
                  displayName: input || 'Ubicación seleccionada en mapa',
                  isValid: true,
                  precision: 'exact',
                });
              } else {
                setMapError('La ubicación debe estar dentro de Argentina.');
                markerRef.current.setLatLng([lat, lng]);
              }
            });
          }

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
    };
  }, [showMap, value, input, onChange]);

  const description = descriptionProp || 'Ingresa la dirección completa o selecciona en el mapa para que los clientes te encuentren.';
  const statusText = value?.isValid 
    ? `${value.displayName} (${value.precision === 'exact' ? 'ubicación exacta' : 'zona estimada'})`
    : null;

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
          <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
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
          </div>
        )}
      </div>

      {/* Estado actual */}
      {statusText && (
        <div className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">
          ✓ {statusText}
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
