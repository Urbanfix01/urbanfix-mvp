import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';

interface LocationData {
  address: string;
  lat: number;
  lng: number;
  placeId: string;
}

interface Props {
  onLocationSelect: (data: LocationData) => void;
  initialValue?: string;
  apiKey?: string; // 👈 AGREGADO: Ahora acepta la prop apiKey opcional
}

export const LocationAutocomplete = ({ onLocationSelect, initialValue, apiKey }: Props) => {
  // Prioridad: 1. Prop pasada, 2. Variable de entorno (Fallback)
  const finalApiKey = apiKey || process.env.EXPO_PUBLIC_ANDROID_API_KEY;

  if (!finalApiKey) {
    console.warn("⚠️ FALTA API KEY en LocationAutocomplete");
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>DIRECCIÓN DE LA OBRA</Text>

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
    </View>
  );
};

const styles = StyleSheet.create({
  container: { zIndex: 100, marginBottom: 20 },
  label: { fontSize: 12, fontFamily: 'Montserrat-Bold', marginBottom: 8, color: '#6B7280' }, // Ajuste a tu theme
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
    top: 65,
    width: '100%',
    zIndex: 1000,
    backgroundColor: 'white',
    borderRadius: 8,
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 4,
  }
});