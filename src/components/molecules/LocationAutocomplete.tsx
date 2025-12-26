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
  showLabel?: boolean;
}

export const LocationAutocomplete = ({ onLocationSelect, initialValue, apiKey, showLabel = false }: Props) => {
  const nativeRef = useRef<any>(null);
  const [query, setQuery] = useState(initialValue || '');
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const sessionTokenRef = useRef<string | null>(null);

  // 1. Obtener API Key (Prioridad: Prop > Variable de Entorno)
  const envKey = Platform.OS === 'web'
    ? process.env.EXPO_PUBLIC_WEB_API_KEY
    : process.env.EXPO_PUBLIC_PLACES_API_KEY || process.env.EXPO_PUBLIC_ANDROID_API_KEY;
  const finalApiKey = apiKey || envKey;

  if (!finalApiKey) console.warn("⚠️ FALTA API KEY en LocationAutocomplete");

  useEffect(() => {
    if (Platform.OS !== 'web' && initialValue && nativeRef.current) {
      nativeRef.current.setAddressText(initialValue);
    }
  }, [initialValue]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    setQuery(initialValue || '');
  }, [initialValue]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (!finalApiKey) return;
    if (!query || query.trim().length < 3) {
      setPredictions([]);
      return;
    }

    const sessionToken = sessionTokenRef.current || Math.random().toString(36).slice(2);
    sessionTokenRef.current = sessionToken;

    const controller = new AbortController();
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = controller;
    setIsLoading(true);

    const timeoutId = setTimeout(async () => {
      try {
        const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
          query
        )}&key=${finalApiKey}&language=es&types=address&components=country:ar&sessiontoken=${sessionToken}`;
        const res = await fetch(url, { signal: controller.signal });
        const data = await res.json();
        setPredictions(Array.isArray(data?.predictions) ? data.predictions : []);
      } catch (error) {
        if ((error as any)?.name !== 'AbortError') {
          console.warn('Autocomplete error', error);
        }
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [finalApiKey, query]);

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
      setIsFocused(false);
    }
  };

  const shouldShowList = useMemo(
    () => Platform.OS !== 'web' && isFocused && predictions.length > 0,
    [isFocused, predictions.length]
  );

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
              types: ['address'],
              componentRestrictions: { country: "ar" },
            }}
            placeholder="Buscar dirección..."
            className="web-input"
            style={styles.webInput}
            onPlaceSelected={(place) => {
              // --- CORRECCIÓN TYPESCRIPT ---
              // Usamos 'as any' para evitar el error de tipos, pero mantenemos la lógica segura
              const loc = place.geometry?.location as any;

              if (loc) {
                onLocationSelect({
                  address: place.formatted_address || '',
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
              onChangeText={setQuery}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setTimeout(() => setIsFocused(false), 150)}
            />
            {isLoading && <ActivityIndicator size="small" color="#9CA3AF" />}
          </View>

          {shouldShowList && (
            <View style={styles.listView}>
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
            </View>
          )}
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
    top: 60, // Ajustado para que pegue justo debajo del input
    width: '100%',
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
