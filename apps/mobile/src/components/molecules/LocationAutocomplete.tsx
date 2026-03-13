import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import ReactGoogleAutocomplete from 'react-google-autocomplete';

export interface LocationData {
  address: string;
  lat: number;
  lng: number;
  placeId: string;
  city?: string;
  province?: string;
  source?: 'google' | 'osm' | 'manual';
}

interface Prediction {
  description: string;
  place_id: string;
  lat?: number;
  lng?: number;
  city?: string;
  province?: string;
  source?: 'google' | 'osm';
}

interface Props {
  onLocationSelect: (data: LocationData) => void;
  initialValue?: string;
  apiKey?: string;
  showLabel?: boolean;
  onQueryChange?: (query: string) => void;
  onLoadingChange?: (isLoading: boolean) => void;
  placeholder?: string;
}

const MIN_QUERY_LENGTH = 3;

const OSM_SEARCH_URL = 'https://nominatim.openstreetmap.org/search';

type OsmRow = {
  place_id?: string | number;
  display_name?: string;
  lat?: string;
  lon?: string;
  address?: Record<string, string | undefined>;
};

const pickEnvValue = (...candidates: Array<string | undefined>) => {
  for (const candidate of candidates) {
    const trimmed = String(candidate || '').trim();
    if (trimmed) return trimmed;
  }
  return '';
};

const getEnvApiKey = () => {
  if (Platform.OS === 'web') {
    return pickEnvValue(process.env.EXPO_PUBLIC_WEB_API_KEY, process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY);
  }

  const platformKey =
    Platform.OS === 'ios'
      ? pickEnvValue(process.env.EXPO_PUBLIC_GOOGLE_MAPS_IOS_API_KEY, process.env.EXPO_PUBLIC_IOS_API_KEY)
      : pickEnvValue(process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY, process.env.EXPO_PUBLIC_ANDROID_API_KEY);

  return pickEnvValue(
    process.env.EXPO_PUBLIC_PLACES_API_KEY,
    process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY,
    platformKey,
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
    process.env.EXPO_PUBLIC_ANDROID_API_KEY,
    process.env.EXPO_PUBLIC_IOS_API_KEY
  );
};

const pickFirstAddressValue = (address?: Record<string, string | undefined>, keys: string[] = []) => {
  for (const key of keys) {
    const candidate = String(address?.[key] || '').trim();
    if (candidate) return candidate;
  }
  return '';
};

const resolveOsmCity = (address?: Record<string, string | undefined>) =>
  pickFirstAddressValue(address, ['city', 'town', 'village', 'municipality', 'suburb', 'county', 'state_district']);

const resolveOsmProvince = (address?: Record<string, string | undefined>) =>
  pickFirstAddressValue(address, ['state', 'region', 'county']);

const resolveGoogleAddressPart = (components: any[] | undefined, type: string) => {
  const row = (components || []).find((component) => Array.isArray(component?.types) && component.types.includes(type));
  return String(row?.long_name || '').trim();
};

export const LocationAutocomplete = ({
  onLocationSelect,
  initialValue,
  apiKey,
  showLabel = false,
  onQueryChange,
  onLoadingChange,
  placeholder = 'Buscar direccion exacta...',
}: Props) => {
  const [query, setQuery] = useState(initialValue || '');
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [debugStatus, setDebugStatus] = useState('');

  const abortRef = useRef<AbortController | null>(null);
  const sessionTokenRef = useRef<string | null>(null);
  const committedAddressRef = useRef((initialValue || '').trim());

  const finalApiKey = apiKey || getEnvApiKey();

  const shouldShowList = useMemo(
    () => Platform.OS !== 'web' && isFocused && predictions.length > 0,
    [isFocused, predictions.length]
  );

  const commitAddress = (
    address: string,
    placeId = '',
    lat = 0,
    lng = 0,
    meta: Partial<Pick<LocationData, 'city' | 'province' | 'source'>> = {}
  ) => {
    const safeAddress = address.trim();
    if (!safeAddress) return;
    committedAddressRef.current = safeAddress;
    onLocationSelect({
      address: safeAddress,
      lat,
      lng,
      placeId,
      city: meta.city,
      province: meta.province,
      source: meta.source,
    });
  };

  const geocodeWithOsm = async (address: string, signal?: AbortSignal) => {
    const trimmed = String(address || '').trim();
    if (!trimmed) return null;
    const url =
      `${OSM_SEARCH_URL}?format=json&limit=1&countrycodes=ar` +
      `&addressdetails=1&q=${encodeURIComponent(trimmed)}`;
    const response = await fetch(url, {
      signal,
      headers: {
        'Accept-Language': 'es-AR,es;q=0.9',
      },
    });
    if (!response.ok) return null;
    const rows = (await response.json()) as OsmRow[];
    const first = rows?.[0];
    if (!first) return null;
    const lat = Number(first.lat);
    const lng = Number(first.lon);
    const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);
    return {
      address: String(first.display_name || trimmed),
      lat: hasCoords ? lat : 0,
      lng: hasCoords ? lng : 0,
      placeId: String(first.place_id || ''),
      city: resolveOsmCity(first.address),
      province: resolveOsmProvince(first.address),
      hasCoords,
    };
  };

  useEffect(() => {
    const nextValue = initialValue || '';
    if (nextValue === query) return;
    setQuery(nextValue);
    committedAddressRef.current = nextValue.trim();
    onQueryChange?.(nextValue);
  }, [initialValue, onQueryChange, query]);

  useEffect(() => {
    onLoadingChange?.(isLoading);
  }, [isLoading, onLoadingChange]);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    if (!isFocused) return;
    if (!query || query.trim().length < MIN_QUERY_LENGTH) {
      setPredictions([]);
      setDebugStatus('');
      return;
    }

    const sessionToken = sessionTokenRef.current || Math.random().toString(36).slice(2);
    sessionTokenRef.current = sessionToken;

    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;
    setIsLoading(true);

    const timeoutId = setTimeout(async () => {
      try {
        if (finalApiKey) {
          const url =
            `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}` +
            `&key=${finalApiKey}&language=es&types=address&components=country:ar&sessiontoken=${sessionToken}`;
          const response = await fetch(url, { signal: controller.signal });
          const json = await response.json();
          const status = String(json?.status || '');

          if (status === 'OK' && Array.isArray(json?.predictions)) {
            const googleRows: Prediction[] = json.predictions.map((item: any) => ({
              description: String(item?.description || ''),
              place_id: String(item?.place_id || ''),
              source: 'google',
            }));
            setPredictions(googleRows);
            setDebugStatus(`GOOGLE (${googleRows.length})`);
            return;
          }

          // Fallback robusto si Google devuelve cero resultados.
          if (status && status !== 'ZERO_RESULTS') {
            setDebugStatus(status);
          }
        }

        const osmUrl =
          `${OSM_SEARCH_URL}?format=json&limit=5&countrycodes=ar` +
          `&addressdetails=1&q=${encodeURIComponent(query)}`;
        const osmResponse = await fetch(osmUrl, {
          signal: controller.signal,
          headers: {
            'Accept-Language': 'es-AR,es;q=0.9',
          },
        });
        if (!osmResponse.ok) {
          setPredictions([]);
          setDebugStatus(finalApiKey ? 'GOOGLE_NO_RESULTS' : 'OSM_ERROR');
          return;
        }

        const osmRows = (await osmResponse.json()) as OsmRow[];
        const mapped: Prediction[] = (osmRows || [])
          .map((row) => {
            const lat = Number(row.lat);
            const lng = Number(row.lon);
            const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);
            return {
              description: String(row.display_name || ''),
              place_id: String(row.place_id || Math.random().toString(36).slice(2)),
              lat: hasCoords ? lat : undefined,
              lng: hasCoords ? lng : undefined,
              city: resolveOsmCity(row.address),
              province: resolveOsmProvince(row.address),
              source: 'osm' as const,
            };
          })
          .filter((row) => row.description.trim().length > 0);

        setPredictions(mapped);
        setDebugStatus(`OSM (${mapped.length})`);
      } catch (error: any) {
        if (error?.name !== 'AbortError') {
          setPredictions([]);
          setDebugStatus('NETWORK_ERROR');
        }
      } finally {
        setIsLoading(false);
      }
    }, 220);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [finalApiKey, isFocused, query]);

  const handleSelect = async (prediction: Prediction) => {
    const fallbackAddress = prediction.description || query;
    setQuery(fallbackAddress);
    setPredictions([]);
    setIsFocused(false);

    if (prediction.source === 'osm' && Number.isFinite(prediction.lat) && Number.isFinite(prediction.lng)) {
      commitAddress(
        fallbackAddress,
        prediction.place_id,
        Number(prediction.lat),
        Number(prediction.lng),
        {
          city: prediction.city,
          province: prediction.province,
          source: 'osm',
        }
      );
      return;
    }

    if (!finalApiKey) {
      try {
        const resolved = await geocodeWithOsm(fallbackAddress);
        if (resolved?.hasCoords) {
          commitAddress(resolved.address, resolved.placeId || prediction.place_id, resolved.lat, resolved.lng, {
            city: resolved.city,
            province: resolved.province,
            source: 'osm',
          });
        } else {
          commitAddress(fallbackAddress, prediction.place_id, 0, 0, { source: 'manual' });
        }
      } catch {
        commitAddress(fallbackAddress, prediction.place_id, 0, 0, { source: 'manual' });
      }
      return;
    }

    try {
      setIsLoading(true);
      const sessionToken = sessionTokenRef.current || Math.random().toString(36).slice(2);
      const detailsUrl =
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${prediction.place_id}` +
        `&key=${finalApiKey}&language=es&fields=geometry,formatted_address,place_id,address_components&sessiontoken=${sessionToken}`;
      const response = await fetch(detailsUrl);
      const json = await response.json();

      const resolvedAddress = json?.result?.formatted_address || fallbackAddress;
      const lat = Number(json?.result?.geometry?.location?.lat);
      const lng = Number(json?.result?.geometry?.location?.lng);
      const city =
        resolveGoogleAddressPart(json?.result?.address_components, 'locality') ||
        resolveGoogleAddressPart(json?.result?.address_components, 'administrative_area_level_2');
      const province = resolveGoogleAddressPart(json?.result?.address_components, 'administrative_area_level_1');
      const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);

      setQuery(resolvedAddress);
      sessionTokenRef.current = null;

      if (hasCoords) {
        commitAddress(resolvedAddress, json?.result?.place_id || prediction.place_id, lat, lng, {
          city,
          province,
          source: 'google',
        });
      } else {
        commitAddress(resolvedAddress, json?.result?.place_id || prediction.place_id, 0, 0, {
          city,
          province,
          source: 'manual',
        });
      }
    } catch {
      commitAddress(fallbackAddress, prediction.place_id, 0, 0, { source: 'manual' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleNativeBlur = () => {
    setTimeout(() => {
      setIsFocused(false);
      const typedAddress = query.trim();
      if (typedAddress && typedAddress !== committedAddressRef.current) {
        if (!finalApiKey) {
          void geocodeWithOsm(typedAddress)
            .then((resolved) => {
              if (resolved?.hasCoords) {
                commitAddress(resolved.address, resolved.placeId, resolved.lat, resolved.lng, {
                  city: resolved.city,
                  province: resolved.province,
                  source: 'osm',
                });
                return;
              }
              commitAddress(typedAddress, '', 0, 0, { source: 'manual' });
            })
            .catch(() => {
              commitAddress(typedAddress, '', 0, 0, { source: 'manual' });
            });
          return;
        }
        commitAddress(typedAddress, '', 0, 0, { source: 'manual' });
      }
    }, 160);
  };

  return (
    <View style={styles.container}>
      {showLabel ? <Text style={styles.label}>DIRECCION DE LA OBRA</Text> : null}

      {Platform.OS === 'web' ? (
        <View style={styles.webContainer}>
          {finalApiKey ? (
            <ReactGoogleAutocomplete
              apiKey={finalApiKey}
              defaultValue={initialValue}
              options={{
                types: ['address'],
                componentRestrictions: { country: 'ar' },
              }}
              placeholder={placeholder}
              className="web-input"
              style={styles.webInput}
              onPlaceSelected={(place: any) => {
                const resolvedAddress = place?.formatted_address || query || '';
                const loc = place?.geometry?.location;
                const lat = typeof loc?.lat === 'function' ? loc.lat() : Number(loc?.lat);
                const lng = typeof loc?.lng === 'function' ? loc.lng() : Number(loc?.lng);
                const city =
                  resolveGoogleAddressPart(place?.address_components, 'locality') ||
                  resolveGoogleAddressPart(place?.address_components, 'administrative_area_level_2');
                const province = resolveGoogleAddressPart(place?.address_components, 'administrative_area_level_1');
                const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);
                commitAddress(resolvedAddress, place?.place_id || '', hasCoords ? lat : 0, hasCoords ? lng : 0, {
                  city,
                  province,
                  source: hasCoords ? 'google' : 'manual',
                });
              }}
            />
          ) : (
            <TextInput
              style={styles.webInput}
              placeholder={placeholder}
              placeholderTextColor="#9CA3AF"
              value={query}
              onChangeText={(text) => {
                setQuery(text);
                onQueryChange?.(text);
              }}
              onBlur={() => {
                const typedAddress = query.trim();
                if (!typedAddress) return;
                if (!finalApiKey) {
                  void geocodeWithOsm(typedAddress)
                    .then((resolved) => {
                      if (resolved?.hasCoords) {
                        commitAddress(resolved.address, resolved.placeId, resolved.lat, resolved.lng, {
                          city: resolved.city,
                          province: resolved.province,
                          source: 'osm',
                        });
                        return;
                      }
                      commitAddress(typedAddress, '', 0, 0, { source: 'manual' });
                    })
                    .catch(() => commitAddress(typedAddress, '', 0, 0, { source: 'manual' }));
                  return;
                }
                commitAddress(typedAddress, '', 0, 0, { source: 'manual' });
              }}
            />
          )}
        </View>
      ) : (
        <View style={styles.nativeContainer}>
          <View style={styles.textInputContainer}>
            <TextInput
              style={styles.input}
              placeholder={placeholder}
              placeholderTextColor="#9CA3AF"
              value={query}
              onChangeText={(text) => {
                setQuery(text);
                onQueryChange?.(text);
                if (!isFocused) setIsFocused(true);
              }}
              onFocus={() => setIsFocused(true)}
              onBlur={handleNativeBlur}
              autoCorrect={false}
            />
            {isLoading ? <ActivityIndicator size="small" color="#9CA3AF" /> : null}
          </View>

          {__DEV__ && !!debugStatus ? <Text style={styles.debugText}>Places: {debugStatus}</Text> : null}

          {shouldShowList ? (
            <View style={styles.listView}>
              <FlatList
                keyboardShouldPersistTaps="always"
                data={predictions}
                keyExtractor={(item) => item.place_id}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.row} onPress={() => handleSelect(item)}>
                    <Text style={styles.rowText}>{item.description}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    zIndex: 9999,
    marginBottom: 20,
    elevation: 10,
    position: 'relative',
    overflow: 'visible',
  },
  label: {
    fontSize: 12,
    marginBottom: 8,
    color: '#6B7280',
    fontWeight: '700',
  },
  nativeContainer: {
    flex: 0,
    zIndex: 9999,
    elevation: 20,
    position: 'relative',
    overflow: 'visible',
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
    top: 60,
    left: 0,
    right: 0,
    zIndex: 10001,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    maxHeight: 260,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 12,
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
  debugText: {
    marginTop: 6,
    fontSize: 11,
    color: '#6B7280',
  },
  webContainer: {
    width: '100%',
    zIndex: 9999,
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
