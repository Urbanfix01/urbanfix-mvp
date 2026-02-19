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
  Keyboard,
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

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 140;

export const LocationAutocomplete = ({
  onLocationSelect,
  initialValue,
  apiKey,
  showLabel = false,
}: Props) => {
  const nativeRef = useRef<any>(null);
  const abortRef = useRef<AbortController | null>(null);
  const sessionTokenRef = useRef<string | null>(null);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [query, setQuery] = useState(initialValue || '');
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [errorText, setErrorText] = useState('');

  const envKey =
    Platform.OS === 'web'
      ? process.env.EXPO_PUBLIC_WEB_API_KEY
      : process.env.EXPO_PUBLIC_PLACES_API_KEY ||
        process.env.EXPO_PUBLIC_IOS_API_KEY ||
        process.env.EXPO_PUBLIC_ANDROID_API_KEY;
  const finalApiKey = apiKey || envKey;

  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (!isFocused) setQuery(initialValue || '');
  }, [initialValue, isFocused]);

  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  const normalizedQuery = query.trim();

  useEffect(() => {
    if (Platform.OS === 'web') return;

    if (!finalApiKey) {
      setPredictions([]);
      if (normalizedQuery.length >= MIN_QUERY_LENGTH) {
        setErrorText('Falta configurar la API key de Google Places.');
      } else {
        setErrorText('');
      }
      return;
    }

    if (normalizedQuery.length < MIN_QUERY_LENGTH) {
      if (abortRef.current) abortRef.current.abort();
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
      setPredictions([]);
      setIsLoading(false);
      setErrorText('');
      return;
    }

    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);

    const controller = new AbortController();
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = controller;
    setIsLoading(true);
    setErrorText('');

    const sessionToken = sessionTokenRef.current || Math.random().toString(36).slice(2);
    sessionTokenRef.current = sessionToken;

    debounceTimeoutRef.current = setTimeout(async () => {
      try {
        const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
          normalizedQuery
        )}&key=${finalApiKey}&language=es&types=geocode&components=country:ar&sessiontoken=${sessionToken}`;
        const res = await fetch(url, { signal: controller.signal });
        const data = await res.json();
        const status = data?.status;

        if (status === 'OK') {
          const nextPredictions = Array.isArray(data?.predictions) ? data.predictions : [];
          setPredictions(nextPredictions);
          setErrorText(nextPredictions.length ? '' : 'No encontramos direcciones para esa busqueda.');
          return;
        }

        if (status === 'ZERO_RESULTS') {
          setPredictions([]);
          setErrorText('No encontramos direcciones para esa busqueda.');
          return;
        }

        if (status === 'REQUEST_DENIED') {
          setPredictions([]);
          setErrorText('Google Places denego la solicitud. Revisa Billing y restricciones de API key.');
          return;
        }

        const details = data?.error_message ? ` ${data.error_message}` : '';
        setPredictions([]);
        setErrorText(`No pudimos consultar direcciones.${details}`.trim());
      } catch (error) {
        if ((error as any)?.name !== 'AbortError') {
          setPredictions([]);
          setErrorText('Error de red al buscar direcciones.');
        }
      } finally {
        setIsLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
      controller.abort();
    };
  }, [finalApiKey, normalizedQuery]);

  const handleSelect = async (prediction: Prediction) => {
    if (!finalApiKey) return;
    try {
      if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
      setIsLoading(true);
      setErrorText('');
      const sessionToken = sessionTokenRef.current || Math.random().toString(36).slice(2);
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${prediction.place_id}&key=${finalApiKey}&language=es&fields=geometry,formatted_address,place_id&sessiontoken=${sessionToken}`;
      const res = await fetch(url);
      const data = await res.json();
      const status = data?.status;
      const location = data?.result?.geometry?.location;

      if (status !== 'OK' || !location) {
        setErrorText('No pudimos obtener la direccion seleccionada.');
        return;
      }

      const address = data?.result?.formatted_address || prediction.description;
      setQuery(address);
      setPredictions([]);
      sessionTokenRef.current = null;
      setIsFocused(false);
      Keyboard.dismiss();
      onLocationSelect({
        address,
        lat: location.lat,
        lng: location.lng,
        placeId: data?.result?.place_id || prediction.place_id,
      });
    } catch (_error) {
      setErrorText('No pudimos obtener la direccion seleccionada.');
    } finally {
      setIsLoading(false);
    }
  };

  const shouldShowList = useMemo(() => {
    if (Platform.OS === 'web') return false;
    if (!isFocused) return false;
    if (normalizedQuery.length < MIN_QUERY_LENGTH) return false;
    return isLoading || predictions.length > 0 || !!errorText;
  }, [errorText, isFocused, isLoading, normalizedQuery.length, predictions.length]);

  return (
    <View style={styles.container}>
      {showLabel && <Text style={styles.label}>DIRECCION DE LA OBRA</Text>}

      {Platform.OS === 'web' ? (
        <View style={styles.webContainer}>
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
            onPlaceSelected={(place) => {
              const loc = place.geometry?.location as any;
              if (!loc) return;
              onLocationSelect({
                address: place.formatted_address || '',
                lat: typeof loc.lat === 'function' ? loc.lat() : loc.lat,
                lng: typeof loc.lng === 'function' ? loc.lng() : loc.lng,
                placeId: place.place_id || '',
              });
            }}
          />
        </View>
      ) : (
        <View style={styles.nativeContainer}>
          <View style={styles.textInputContainer}>
            <TextInput
              ref={nativeRef}
              style={styles.input}
              placeholder="Buscar direccion..."
              placeholderTextColor="#9CA3AF"
              value={query}
              onChangeText={setQuery}
              onFocus={() => {
                if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
                setIsFocused(true);
              }}
              onBlur={() => {
                blurTimeoutRef.current = setTimeout(() => {
                  setIsFocused(false);
                }, 150);
              }}
              autoCorrect={false}
              autoCapitalize="words"
              returnKeyType="done"
            />
            {isLoading && <ActivityIndicator size="small" color="#9CA3AF" />}
          </View>

          {shouldShowList && (
            <View style={styles.listView}>
              {predictions.length > 0 ? (
                <FlatList
                  keyboardShouldPersistTaps="handled"
                  data={predictions}
                  keyExtractor={(item) => item.place_id}
                  renderItem={({ item }) => (
                    <TouchableOpacity style={styles.row} onPress={() => handleSelect(item)}>
                      <Text style={styles.rowText}>{item.description}</Text>
                    </TouchableOpacity>
                  )}
                />
              ) : (
                <View style={styles.emptyState}>
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#94A3B8" />
                  ) : (
                    <Text style={styles.emptyStateText}>{errorText || 'Buscando direcciones...'}</Text>
                  )}
                </View>
              )}
            </View>
          )}

          {!shouldShowList && !!errorText && normalizedQuery.length >= MIN_QUERY_LENGTH && (
            <Text style={styles.debugText}>{errorText}</Text>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    zIndex: 30,
    marginBottom: 20,
    position: 'relative',
    overflow: 'visible',
  },
  label: {
    fontSize: 12,
    fontFamily: 'Montserrat-Bold',
    marginBottom: 8,
    color: '#6B7280',
  },
  nativeContainer: {
    flex: 0,
    zIndex: 50,
    position: 'relative',
  },
  textInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 60,
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
    top: 61,
    left: 0,
    right: 0,
    zIndex: 70,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    maxHeight: 260,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 9,
  },
  row: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  rowText: {
    fontSize: 14,
    color: '#111827',
  },
  emptyState: {
    paddingHorizontal: 12,
    paddingVertical: 14,
    minHeight: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
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
