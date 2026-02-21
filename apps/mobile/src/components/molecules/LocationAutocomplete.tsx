import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Modal,
  Pressable,
} from 'react-native';
// Librería para WEB
import ReactGoogleAutocomplete from 'react-google-autocomplete';

interface LocationData {
  address: string;
  lat: number;
  lng: number;
  placeId: string;
}

interface Prediction {
  description: string;
  place_id: string;
}

interface Props {
  onLocationSelect: (data: LocationData) => void;
  initialValue?: string;
  apiKey?: string;
  onQueryChange?: (text: string) => void;
  showLabel?: boolean;
  countryCode?: string;
  restrictToCountry?: boolean;
  minQueryLength?: number;
  maxSuggestions?: number;
  debounceMs?: number;
  querySyncDebounceMs?: number;
  showDebugStatus?: boolean;
  locationBias?: { lat: number; lng: number } | null;
}

export const LocationAutocomplete = ({
  onLocationSelect,
  initialValue,
  apiKey,
  onQueryChange,
  showLabel = false,
  countryCode = 'ar',
  restrictToCountry = true,
  minQueryLength = 3,
  maxSuggestions = 10,
  debounceMs = 260,
  querySyncDebounceMs = 120,
  showDebugStatus = false,
  locationBias,
}: Props) => {
  const nativeRef = useRef<any>(null);
  const [query, setQuery] = useState(initialValue || '');
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [inputLayout, setInputLayout] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [debugStatus, setDebugStatus] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [lookupBlockedReason, setLookupBlockedReason] = useState<'REQUEST_DENIED' | 'MISSING_API_KEY' | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const sessionTokenRef = useRef<string | null>(null);
  const cacheRef = useRef<Map<string, Prediction[]>>(new Map());
  const querySyncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismissRef = useRef(false);
  const normalizedCountryCode = countryCode.trim().toLowerCase();
  const safeLocationBias = useMemo(() => {
    if (!locationBias) return null;
    const lat = Number(locationBias.lat);
    const lng = Number(locationBias.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    if (lat === 0 && lng === 0) return null;
    return { lat, lng };
  }, [locationBias?.lat, locationBias?.lng]);

  // 1. Obtener API Key (Prioridad: Prop > Variable de Entorno)
  const envKey = Platform.select({
    web:
      process.env.EXPO_PUBLIC_WEB_API_KEY ||
      process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
      process.env.EXPO_PUBLIC_PLACES_API_KEY,
    ios:
      process.env.EXPO_PUBLIC_IOS_API_KEY ||
      process.env.EXPO_PUBLIC_PLACES_API_KEY ||
      process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
      process.env.EXPO_PUBLIC_ANDROID_API_KEY,
    android:
      process.env.EXPO_PUBLIC_ANDROID_API_KEY ||
      process.env.EXPO_PUBLIC_PLACES_API_KEY ||
      process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
      process.env.EXPO_PUBLIC_IOS_API_KEY,
    default:
      process.env.EXPO_PUBLIC_PLACES_API_KEY || process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
  });
  const finalApiKey = apiKey || envKey;

  const shouldRenderDebugStatus =
    showDebugStatus ||
    ((typeof __DEV__ !== 'undefined' && __DEV__) &&
      process.env.EXPO_PUBLIC_SHOW_PLACES_DEBUG === 'true');

  const getReadableStatus = (status?: string, errorMessage?: string) => {
    switch (status) {
      case 'REQUEST_DENIED':
        return 'No se pudieron cargar sugerencias (API key sin permisos). Podés escribir la dirección manualmente.';
      case 'OVER_QUERY_LIMIT':
        return 'Se alcanzó el límite de Google Places. Probá de nuevo en unos minutos.';
      case 'INVALID_REQUEST':
        return 'La búsqueda no se pudo procesar. Seguís pudiendo cargar la dirección manual.';
      case 'UNKNOWN_ERROR':
        return 'Google Places respondió con un error temporal. Intentá nuevamente.';
      default:
        return errorMessage
          ? `No se pudieron cargar sugerencias (${errorMessage}).`
          : 'No se pudieron cargar sugerencias. Podés escribir la dirección manualmente.';
    }
  };

  const scheduleQuerySync = (text: string) => {
    if (!onQueryChange) return;
    if (querySyncTimeoutRef.current) {
      clearTimeout(querySyncTimeoutRef.current);
    }
    querySyncTimeoutRef.current = setTimeout(() => {
      onQueryChange(text);
      querySyncTimeoutRef.current = null;
    }, querySyncDebounceMs);
  };

  const handleChangeText = (text: string) => {
    setQuery(text);
    scheduleQuerySync(text);
    if (!lookupBlockedReason && statusMessage) setStatusMessage('');
  };

  const clearLookupState = () => {
    cacheRef.current.clear();
    setLookupBlockedReason(null);
    setStatusMessage('');
    setDebugStatus('');
  };

  useEffect(() => {
    return () => {
      if (querySyncTimeoutRef.current) {
        clearTimeout(querySyncTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (!finalApiKey) {
      cacheRef.current.clear();
      setPredictions([]);
      setLookupBlockedReason('MISSING_API_KEY');
      setDebugStatus('MISSING_API_KEY');
      setStatusMessage('Falta configurar una API key de Google Places en la app.');
      return;
    }
    clearLookupState();
  }, [finalApiKey]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    setQuery(initialValue || '');
  }, [initialValue]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (!finalApiKey) return;
    const normalizedQuery = query.trim();
    if (!normalizedQuery || normalizedQuery.length < minQueryLength) {
      setPredictions([]);
      if (!lookupBlockedReason) {
        setDebugStatus('');
        setStatusMessage('');
      } else {
        setDebugStatus(lookupBlockedReason);
        setStatusMessage(getReadableStatus(lookupBlockedReason));
      }
      setIsLoading(false);
      sessionTokenRef.current = null;
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
      return;
    }
    if (lookupBlockedReason) {
      setPredictions([]);
      setIsLoading(false);
      setDebugStatus(lookupBlockedReason);
      setStatusMessage(getReadableStatus(lookupBlockedReason));
      return;
    }

    const sessionToken = sessionTokenRef.current || Math.random().toString(36).slice(2);
    sessionTokenRef.current = sessionToken;

    const cacheKey = [
      normalizedCountryCode || 'xx',
      restrictToCountry ? 'strict' : 'open',
      safeLocationBias ? `${safeLocationBias.lat.toFixed(3)},${safeLocationBias.lng.toFixed(3)}` : 'noloc',
      normalizedQuery.toLowerCase(),
    ].join('|');
    const cachedPredictions = cacheRef.current.get(cacheKey);
    if (cachedPredictions) {
      setPredictions(cachedPredictions.slice(0, maxSuggestions));
      setDebugStatus(`CACHE (${cachedPredictions.length})`);
      setStatusMessage('');
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = controller;

    const timeoutId = setTimeout(async () => {
      const baseUrl = 'https://maps.googleapis.com/maps/api/place/autocomplete/json';
      const buildUrl = (types?: string, shouldRestrictCountry = false, includeLocationBias = true) => {
        const params = new URLSearchParams();
        params.set('input', normalizedQuery);
        params.set('key', finalApiKey);
        params.set('language', 'es');
        params.set('sessiontoken', sessionToken);
        if (types) params.set('types', types);
        if (normalizedCountryCode) {
          params.set('region', normalizedCountryCode);
          if (shouldRestrictCountry) {
            params.set('components', `country:${normalizedCountryCode}`);
          }
        }
        if (includeLocationBias && safeLocationBias) {
          params.set('location', `${safeLocationBias.lat},${safeLocationBias.lng}`);
          params.set('radius', '80000');
        }
        return `${baseUrl}?${params.toString()}`;
      };

      const fetchPredictionsBatch = async (
        types?: string,
        shouldRestrictCountry = false,
        includeLocationBias = true
      ) => {
        const url = buildUrl(types, shouldRestrictCountry, includeLocationBias);
        const res = await fetch(url, { signal: controller.signal });
        const data = await res.json();
        return {
          status: data?.status as string | undefined,
          errorMessage: data?.error_message as string | undefined,
          predictions: Array.isArray(data?.predictions) ? (data.predictions as Prediction[]) : [],
        };
      };

      try {
        setIsLoading(true);
        setDebugStatus('');
        setStatusMessage('');
        const seen = new Set<string>();
        const merged: Prediction[] = [];
        const statuses: string[] = [];
        const errors: string[] = [];

        const appendPredictions = (list: Prediction[]) => {
          for (const prediction of list) {
            if (seen.has(prediction.place_id)) continue;
            seen.add(prediction.place_id);
            merged.push(prediction);
            if (merged.length >= maxSuggestions) break;
          }
        };

        const primaryResult = await fetchPredictionsBatch(
          'geocode',
          restrictToCountry,
          true
        );
        if (primaryResult.status) statuses.push(primaryResult.status);
        if (primaryResult.errorMessage) errors.push(primaryResult.errorMessage);
        appendPredictions(primaryResult.predictions);

        if (primaryResult.status === 'REQUEST_DENIED') {
          setLookupBlockedReason('REQUEST_DENIED');
          setPredictions([]);
          setDebugStatus('REQUEST_DENIED');
          setStatusMessage(getReadableStatus('REQUEST_DENIED', primaryResult.errorMessage));
          return;
        }

        const shouldTryFallback =
          !restrictToCountry &&
          merged.length < Math.ceil(maxSuggestions / 2) &&
          primaryResult.status !== 'REQUEST_DENIED';

        if (shouldTryFallback) {
          const fallbackResult = await fetchPredictionsBatch(undefined, false, false);
          if (fallbackResult.status) statuses.push(fallbackResult.status);
          if (fallbackResult.errorMessage) errors.push(fallbackResult.errorMessage);
          appendPredictions(fallbackResult.predictions);
        }

        const limitedPredictions = merged.slice(0, maxSuggestions);
        setPredictions(limitedPredictions);
        if (limitedPredictions.length > 0) {
          cacheRef.current.set(cacheKey, limitedPredictions);
          if (cacheRef.current.size > 60) {
            const oldestKey = cacheRef.current.keys().next().value;
            if (oldestKey) cacheRef.current.delete(oldestKey);
          }
        }
        if (merged.length) {
          setDebugStatus(`OK (${merged.length})`);
          setStatusMessage('');
        } else if (statuses.includes('ZERO_RESULTS')) {
          setDebugStatus('ZERO_RESULTS');
          setStatusMessage('');
        } else {
          const primaryStatus = statuses.find((status) => status && status !== 'OK');
          const resolvedStatus = primaryStatus || 'NO_RESULTS';
          const joinedErrors = errors.join(' / ');
          setDebugStatus(statuses.filter(Boolean).join(' / ') || resolvedStatus);
          setStatusMessage(getReadableStatus(resolvedStatus, joinedErrors));
        }
      } catch (error) {
        if ((error as any)?.name !== 'AbortError') {
          console.warn('Autocomplete error', error);
          setPredictions([]);
          setDebugStatus('NETWORK_ERROR');
          setStatusMessage('No pudimos cargar sugerencias. Podés escribir la dirección manualmente.');
        }
      } finally {
        setIsLoading(false);
      }
    }, debounceMs);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [
    debounceMs,
    finalApiKey,
    lookupBlockedReason,
    maxSuggestions,
    minQueryLength,
    normalizedCountryCode,
    query,
    restrictToCountry,
    safeLocationBias,
  ]);

  const handleSelect = async (prediction: Prediction) => {
    if (!finalApiKey) return;
    try {
      setIsLoading(true);
      const sessionToken = sessionTokenRef.current || Math.random().toString(36).slice(2);
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${prediction.place_id}&key=${finalApiKey}&language=es&fields=geometry,formatted_address,place_id&sessiontoken=${sessionToken}`;
      const res = await fetch(url);
      const data = await res.json();
      const location = data?.result?.geometry?.location;
      const address = data?.result?.formatted_address || prediction.description;

      setQuery(address);
      if (querySyncTimeoutRef.current) {
        clearTimeout(querySyncTimeoutRef.current);
        querySyncTimeoutRef.current = null;
      }
      onQueryChange?.(address);
      setStatusMessage('');
      setPredictions([]);
      sessionTokenRef.current = null;

      if (location) {
        onLocationSelect({
          address,
          lat: location.lat,
          lng: location.lng,
          placeId: data?.result?.place_id || prediction.place_id,
        });
      }
    } catch (error) {
      console.warn('Place details error', error);
    } finally {
      setIsLoading(false);
      dismissRef.current = true;
      setIsFocused(false);
    }
  };

  const shouldShowList = useMemo(
    () =>
      Platform.OS !== 'web' &&
      isFocused &&
      query.trim().length >= minQueryLength &&
      predictions.length > 0,
    [isFocused, minQueryLength, predictions.length, query]
  );

  const measureInput = () => {
    if (nativeRef.current?.measureInWindow) {
      nativeRef.current.measureInWindow((x: number, y: number, width: number, height: number) => {
        setInputLayout({ x, y, width, height });
      });
    }
  };

  return (
    <View style={styles.container}>
      {showLabel && <Text style={styles.label}>DIRECCIÓN DE LA OBRA</Text>}

      {Platform.OS === 'web' ? (
        /* ================= VISTA WEB (React Google Autocomplete) ================= */
        <View style={styles.webContainer}>
          <ReactGoogleAutocomplete
            apiKey={finalApiKey}
            defaultValue={initialValue}
            options={{
              types: ['geocode'],
              language: 'es',
              ...(normalizedCountryCode ? { region: normalizedCountryCode } : {}),
              ...(restrictToCountry && normalizedCountryCode
                ? { componentRestrictions: { country: normalizedCountryCode } }
                : {}),
            }}
            placeholder="Buscar dirección..."
            className="web-input"
            style={styles.webInput}
            onPlaceSelected={(place) => {
              // --- CORRECCIÓN TYPESCRIPT ---
              // Usamos 'as any' para evitar el error de tipos, pero mantenemos la lógica segura
              const loc = place.geometry?.location as any;

              if (loc) {
                const selectedAddress = place.formatted_address || '';
                onQueryChange?.(selectedAddress);
                onLocationSelect({
                  address: selectedAddress,
                  // Verificamos si es función o número (Web suele devolver funciones)
                  lat: typeof loc.lat === 'function' ? loc.lat() : loc.lat,
                  lng: typeof loc.lng === 'function' ? loc.lng() : loc.lng,
                  placeId: place.place_id || '',
                });
              }
            }}
          />
        </View>
      ) : (
        /* ================= VISTA MÓVIL (Google Places REST) ================= */
        <View style={styles.nativeContainer}>
          <View style={styles.textInputContainer}>
            <TextInput
              ref={nativeRef}
              style={styles.input}
              placeholder="Buscar dirección..."
              placeholderTextColor="#9CA3AF"
              value={query}
              onChangeText={handleChangeText}
              onFocus={() => {
                setIsFocused(true);
                measureInput();
              }}
              onBlur={() => {
                if (querySyncTimeoutRef.current) {
                  clearTimeout(querySyncTimeoutRef.current);
                  querySyncTimeoutRef.current = null;
                }
                onQueryChange?.(query);
                setTimeout(() => {
                  if (dismissRef.current) {
                    dismissRef.current = false;
                    setIsFocused(false);
                    return;
                  }
                  setIsFocused(false);
                }, 80);
              }}
              onLayout={measureInput}
            />
            {isLoading && <ActivityIndicator size="small" color="#9CA3AF" />}
          </View>
          {!!statusMessage && <Text style={styles.statusText}>{statusMessage}</Text>}
          {shouldRenderDebugStatus && !!debugStatus && <Text style={styles.debugText}>Places: {debugStatus}</Text>}

          <Modal
            visible={shouldShowList}
            transparent
            animationType="fade"
            onRequestClose={() => {
              dismissRef.current = true;
              setIsFocused(false);
            }}
          >
            <Pressable
              style={styles.modalBackdrop}
              onPress={() => {
                dismissRef.current = true;
                setIsFocused(false);
              }}
            >
              <Pressable
                style={[
                  styles.listView,
                  inputLayout
                    ? { top: inputLayout.y + inputLayout.height + 6, left: inputLayout.x, width: inputLayout.width }
                    : { left: 16, right: 16, top: 0 },
                ]}
              >
                <FlatList
                  keyboardShouldPersistTaps="always"
                  data={predictions}
                  keyExtractor={(item) => item.place_id}
                  renderItem={({ item }) => (
                    <TouchableOpacity style={styles.row} onPress={() => handleSelect(item)}>
                      <Text style={styles.rowText}>{item.description}</Text>
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={
                    <View style={styles.emptyState}>
                      <Text style={styles.emptyStateText}>No encontramos coincidencias.</Text>
                    </View>
                  }
                  ListFooterComponent={isLoading ? <ActivityIndicator size="small" color="#9CA3AF" style={styles.listFooterLoader} /> : null}
                />
              </Pressable>
            </Pressable>
          </Modal>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    zIndex: 9999, // <--- CLAVE: Asegura que el contenedor flote sobre lo demás
    marginBottom: 20,
    elevation: 10, // Para Android
    position: 'relative',
    overflow: 'visible',
  },
  label: { 
    fontSize: 12, 
    fontFamily: 'Montserrat-Bold', 
    marginBottom: 8, 
    color: '#6B7280' 
  },
  
  // Estilos Móvil
  nativeContainer: {
    flex: 0,
    zIndex: 9999,
    elevation: 20,
    position: 'relative',
  },
  textInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 10000,
    elevation: 21,
  },
  input: {
    flex: 1,
    height: 55,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    color: '#1F2937',
  },
  listView: {
    position: 'absolute',
    zIndex: 10000, // <--- CLAVE: La lista debe ser lo más alto de todo
    backgroundColor: 'white',
    borderRadius: 8,
    elevation: 30, // Sombra fuerte en Android
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    maxHeight: 260,
  },
  row: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  rowText: {
    fontSize: 14,
    color: '#111827',
  },
  emptyState: {
    paddingHorizontal: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyStateText: {
    fontSize: 12,
    color: '#64748B',
  },
  modalBackdrop: {
    flex: 1,
  },
  statusText: {
    marginTop: 6,
    fontSize: 11,
    color: '#64748B',
  },
  debugText: {
    marginTop: 6,
    fontSize: 11,
    color: '#6B7280',
  },
  listFooterLoader: {
    marginBottom: 10,
  },

  // Estilos Web
  webContainer: {
    width: '100%',
    zIndex: 9999, // <--- Importante también aquí
    position: 'relative',
  },
  webInput: {
    width: '100%',
    height: 55,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    color: '#1F2937',
    outlineStyle: 'none', 
  } as any, 
});
