// ClientAddressForm.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../utils/theme'; // ⚠️ Revisa que esta ruta sea correcta en tu proyecto
import { WebGoogleMaps } from '../../components/molecules/WebGoogleMaps';
import { LocationAutocomplete } from '../../components/molecules/LocationAutocomplete';

interface ClientAddressFormProps {
  initialName: string;
  initialAddress: string;
  initialLocation: { lat: number; lng: number };
  onClientNameChange: (text: string) => void;
  onLocationChange: (address: string, lat: number, lng: number) => void;
}

export const ClientAddressForm = ({
  initialName,
  initialAddress,
  initialLocation,
  onClientNameChange,
  onLocationChange
}: ClientAddressFormProps) => {
  // Estado local solo para la UI inmediata
  const [addressInput, setAddressInput] = useState(initialAddress);
  const [disableWebAutocomplete, setDisableWebAutocomplete] = useState(false);
  
  const isWeb = Platform.OS === 'web';
  const hasCoordinates = initialLocation.lat !== 0 && initialLocation.lng !== 0;

  // Sincronización cuando vienen datos de la base de datos (Modo Edición)
  useEffect(() => {
    setAddressInput(initialAddress);
  }, [initialAddress]);

  // Maneja cuando el usuario escribe a mano
  const handleManualTyping = (text: string) => {
    setAddressInput(text);
    // Notificamos al padre solo el texto, reseteamos coordenadas porque ya no son seguras
    onLocationChange(text, 0, 0); 
  };

  // Maneja cuando el usuario selecciona del mapa/autocompletado
  const handlePlaceSelected = (data: { address: string, lat: number, lng: number }) => {
    setAddressInput(data.address);
    onLocationChange(data.address, data.lat, data.lng);
  };

  return (
    <View style={styles.card}>
      <Text style={styles.cardHeader}>DATOS DEL CLIENTE</Text>
      
      {/* 1. Nombre */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Nombre Completo</Text>
        <TextInput 
          style={styles.textInput} 
          placeholder="Ej: Juan Perez" 
          value={initialName} 
          onChangeText={onClientNameChange}
          placeholderTextColor="#94A3B8"
        />
      </View>

      {/* 2. Dirección y Mapa */}
      <View style={[styles.inputContainer, { zIndex: 9000 }]}>
        <Text style={styles.inputLabel}>Dirección de la obra</Text>
        
        <View style={styles.searchRow}>
             <TextInput
                style={[styles.textInput, styles.addressInput]}
                placeholder="Escribe calle y altura..."
                value={addressInput}
                onChangeText={handleManualTyping}
                placeholderTextColor="#94A3B8"
             />
             {hasCoordinates && (
                 <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} style={{marginLeft: 8}} />
             )}
        </View>

        {/* MAPA: Aquí está el truco. Quitamos la 'key' dinámica para evitar parpadeos */}
        <View style={styles.mapContainer}>
            {isWeb && process.env.EXPO_PUBLIC_WEB_API_KEY && !disableWebAutocomplete ? (
                <WebGoogleMaps 
                    apiKey={process.env.EXPO_PUBLIC_WEB_API_KEY} 
                    initialValue={addressInput} 
                    onPlaceSelected={handlePlaceSelected}
                    onError={() => setDisableWebAutocomplete(true)}
                />
            ) : (
                <LocationAutocomplete 
                    apiKey={process.env.EXPO_PUBLIC_ANDROID_API_KEY}
                    initialValue={addressInput}
                    onLocationSelect={handlePlaceSelected}
                />
            )}
        </View>

        <Text style={styles.helperText}>
          {hasCoordinates
            ? '📍 Ubicación confirmada con GPS.'
            : '⚠️ Selecciona una opción sugerida para guardar coordenadas exactas.'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOffset: {width:0, height:2}, shadowOpacity:0.03, elevation: 2, zIndex: 2000 },
  cardHeader: { fontSize: 13, color: '#64748B', letterSpacing: 1, marginBottom: 16, fontWeight: '700' },
  inputContainer: { marginBottom: 16 },
  inputLabel: { fontSize: 12, color: '#475569', marginBottom: 6, fontWeight: '600' },
  textInput: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, padding: 12, fontSize: 15, color: '#1E293B' },
  addressInput: { flex: 1, fontWeight: '600' },
  searchRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  mapContainer: { height: 200, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0' },
  helperText: { fontSize: 11, color: '#64748B', marginTop: 8, fontStyle: 'italic' }
});