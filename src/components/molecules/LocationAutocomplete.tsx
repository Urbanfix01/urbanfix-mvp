import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
// Librería para MÓVIL (Android/iOS)
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
// Librería para WEB
import ReactGoogleAutocomplete from 'react-google-autocomplete';

interface LocationData {
  address: string;
  lat: number;
  lng: number;
  placeId: string;
}

interface Props {
  onLocationSelect: (data: LocationData) => void;
  initialValue?: string;
  apiKey?: string;
}

export const LocationAutocomplete = ({ onLocationSelect, initialValue, apiKey }: Props) => {
  // 1. Obtener API Key (Prioridad: Prop > Variable de Entorno)
  const finalApiKey = apiKey || process.env.EXPO_PUBLIC_ANDROID_API_KEY;

  if (!finalApiKey) console.warn("⚠️ FALTA API KEY en LocationAutocomplete");

  return (
    <View style={styles.container}>
      <Text style={styles.label}>DIRECCIÓN DE LA OBRA</Text>

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
        /* ================= VISTA MÓVIL (React Native Google Places Autocomplete) ================= */
        <GooglePlacesAutocomplete
          placeholder="Buscar dirección..."
          onPress={(data, details = null) => {
            if (details) {
              onLocationSelect({
                address: data.description,
                lat: details.geometry.location.lat,
                lng: details.geometry.location.lng,
                placeId: data.place_id,
              });
            }
          }}
          query={{
            key: finalApiKey,
            language: 'es',
            components: 'country:ar',
          }}
          fetchDetails={true}
          enablePoweredByContainer={false}
          textInputProps={{
            defaultValue: initialValue,
            placeholderTextColor: '#9CA3AF'
          }}
          styles={{
            textInput: styles.input,
            listView: styles.listView,
            row: { padding: 13, height: 44, flexDirection: 'row' }
          }}
        />
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
  },
  label: { 
    fontSize: 12, 
    fontFamily: 'Montserrat-Bold', 
    marginBottom: 8, 
    color: '#6B7280' 
  },
  
  // Estilos Móvil
  input: {
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
    elevation: 15, // Sombra fuerte en Android
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    borderWidth: 1,
    borderColor: '#E5E7EB',
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