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
  showLabel?: boolean;
}

const MIN_QUERY_LENGTH = 3;

const getEnvApiKey = () => {
  if (Platform.OS === 'web') {
    return process.env.EXPO_PUBLIC_WEB_API_KEY || process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  }

  const platformKey =
    Platform.OS === 'ios' ? process.env.EXPO_PUBLIC_IOS_API_KEY : process.env.EXPO_PUBLIC_ANDROID_API_KEY;

  return (
    process.env.EXPO_PUBLIC_PLACES_API_KEY ||
    process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY ||
    platformKey ||
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
    process.env.EXPO_PUBLIC_ANDROID_API_KEY ||
    process.env.EXPO_PUBLIC_IOS_API_KEY
  );
};

export const LocationAutocomplete = ({ onLocationSelect, initialValue, apiKey, showLabel = false }: Props) => {
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

  const commitAddress = (address: string, placeId = '', lat = 0, lng = 0) => {
    const safeAddress = address.trim();
    if (!safeAddress) return;
    committedAddressRef.current = safeAddress;
    onLocationSelect({
      address: safeAddress,
      lat,
      lng,
      placeId,
    });
  };

  useEffect(() => {
    setQuery(initialValue || '');
    committedAddressRef.current = (initialValue || '').trim();
  }, [initialValue]);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    if (!isFocused) return;
    if (!query || query.trim().length < MIN_QUERY_LENGTH) {
      setPredictions([]);
      setDebugStatus('');
      return;
    }

    if (!finalApiKey) {
      setPredictions([]);
      setDebugStatus('MISSING_API_KEY');
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
        const url =
          `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}` +
          `&key=${finalApiKey}&language=es&types=address&components=country:ar&sessiontoken=${sessionToken}`;
        const response = await fetch(url, { signal: controller.signal });
        const json = await response.json();
        const status = String(json?.status || '');

        if (status === 'OK' && Array.isArray(json?.predictions)) {
          setPredictions(json.predictions);
          setDebugStatus(`OK (${json.predictions.length})`);
          return;
        }

        setPredictions([]);
        setDebugStatus(status || 'UNKNOWN');
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

    if (!finalApiKey) {
      commitAddress(fallbackAddress, prediction.place_id);
      return;
    }

    try {
      setIsLoading(true);
      const sessionToken = sessionTokenRef.current || Math.random().toString(36).slice(2);
      const detailsUrl =
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${prediction.place_id}` +
        `&key=${finalApiKey}&language=es&fields=geometry,formatted_address,place_id&sessiontoken=${sessionToken}`;
      const response = await fetch(detailsUrl);
      const json = await response.json();

      const resolvedAddress = json?.result?.formatted_address || fallbackAddress;
      const lat = Number(json?.result?.geometry?.location?.lat);
      const lng = Number(json?.result?.geometry?.location?.lng);
      const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);

      setQuery(resolvedAddress);
      sessionTokenRef.current = null;

      if (hasCoords) {
        commitAddress(resolvedAddress, json?.result?.place_id || prediction.place_id, lat, lng);
      } else {
        commitAddress(resolvedAddress, json?.result?.place_id || prediction.place_id);
      }
    } catch {
      commitAddress(fallbackAddress, prediction.place_id);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNativeBlur = () => {
    setTimeout(() => {
      setIsFocused(false);
      const typedAddress = query.trim();
      if (typedAddress && typedAddress !== committedAddressRef.current) {
        commitAddress(typedAddress);
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
              placeholder="Buscar direccion..."
              className="web-input"
              style={styles.webInput}
              onPlaceSelected={(place: any) => {
                const resolvedAddress = place?.formatted_address || query || '';
                const loc = place?.geometry?.location;
                const lat = typeof loc?.lat === 'function' ? loc.lat() : Number(loc?.lat);
                const lng = typeof loc?.lng === 'function' ? loc.lng() : Number(loc?.lng);
                const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);
                commitAddress(resolvedAddress, place?.place_id || '', hasCoords ? lat : 0, hasCoords ? lng : 0);
              }}
            />
          ) : (
            <TextInput
              style={styles.webInput}
              placeholder="Buscar direccion..."
              placeholderTextColor="#9CA3AF"
              value={query}
              onChangeText={setQuery}
              onBlur={() => {
                const typedAddress = query.trim();
                if (typedAddress) commitAddress(typedAddress);
              }}
            />
          )}
        </View>
      ) : (
        <View style={styles.nativeContainer}>
          <View style={styles.textInputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Buscar direccion..."
              placeholderTextColor="#9CA3AF"
              value={query}
              onChangeText={(text) => {
                setQuery(text);
                if (!isFocused) setIsFocused(true);
              }}
              onFocus={() => setIsFocused(true)}
              onBlur={handleNativeBlur}
              autoCorrect={false}
            />
            {isLoading ? <ActivityIndicator size="small" color="#9CA3AF" /> : null}
          </View>

          {!!debugStatus ? <Text style={styles.debugText}>Places: {debugStatus}</Text> : null}

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
