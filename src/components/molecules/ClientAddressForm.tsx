import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, Platform } from 'react-native';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS } from '../../utils/theme';

// ⚠️ IMPORTANTE: Reemplaza esto con tu API KEY real de Google Cloud Console
const GOOGLE_API_KEY = "TU_CLAVE_API_DE_GOOGLE_AQUI"; 

interface Props {
  initialName: string;
  initialAddress: string;
  initialLocation: { lat: number; lng: number };
  onClientNameChange: (text: string) => void;
  onLocationChange: (address: string, lat: number, lng: number) => void;
}

export const ClientAddressForm = ({ 
  initialName, 
  initialAddress, 
  onClientNameChange, 
  onLocationChange 
}: Props) => {
  
  const ref = useRef<any>(null);

  // Efecto para pre-cargar la dirección si estamos en modo edición
  useEffect(() => {
    if (initialAddress && ref.current) {
      ref.current.setAddressText(initialAddress);
    }
  }, [initialAddress]);

  return (
    <View style={styles.card}>
      <Text style={styles.cardHeader}>DATOS DEL CLIENTE</Text>

      {/* Input de Nombre (Simple) */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Nombre Completo</Text>
        <View style={styles.inputContainer}>
          <Ionicons name="person-outline" size={20} color="#94A3B8" style={styles.icon} />
          <TextInput
            style={styles.input}
            placeholder="Ej: Juan Pérez"
            placeholderTextColor="#CBD5E1"
            value={initialName}
            onChangeText={onClientNameChange}
          />
        </View>
      </View>

      {/* Input de Dirección (Inteligente con Google) */}
      <View style={[styles.inputGroup, { zIndex: 10 }]}> 
        <Text style={styles.label}>Dirección de la obra</Text>
        
        <GooglePlacesAutocomplete
          ref={ref}
          placeholder="Buscar calle y altura..."
          fetchDetails={true} // Importante para obtener lat/lng
          onPress={(data, details = null) => {
            // 'details' contiene la geometría (lat/lng)
            const address = data.description;
            const lat = details?.geometry?.location?.lat || 0;
            const lng = details?.geometry?.location?.lng || 0;
            
            onLocationChange(address, lat, lng);
          }}
          query={{
            key: GOOGLE_API_KEY,
            language: 'es',
            components: 'country:ar', // Opcional: Restringir a Argentina (o tu país)
          }}
          
          // Estilos personalizados para que se integre con tu diseño
          styles={{
            container: {
              flex: 0,
            },
            textInputContainer: {
              backgroundColor: '#F8FAFC',
              borderWidth: 1,
              borderColor: '#E2E8F0',
              borderRadius: 12,
              paddingHorizontal: 8,
              height: 50,
              alignItems: 'center',
            },
            textInput: {
              backgroundColor: 'transparent',
              fontSize: 15,
              color: '#1E293B',
              marginTop: Platform.OS === 'ios' ? 0 : 5, // Ajuste fino para centrar texto
              fontWeight: '500',
            },
            predefinedPlacesDescription: {
              color: '#1faadb',
            },
            listView: {
              backgroundColor: '#FFF',
              borderRadius: 10,
              marginTop: 5,
              borderWidth: 1,
              borderColor: '#E2E8F0',
              elevation: 5, // Sombra en Android
              shadowColor: '#000', // Sombra en iOS
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              zIndex: 1000,
            },
            row: {
              padding: 13,
              height: 50,
              flexDirection: 'row',
            },
            separator: {
              height: 0.5,
              backgroundColor: '#c8c7cc',
            },
          }}
          
          // Icono de lupa a la izquierda
          renderLeftButton={() => (
             <Ionicons name="search" size={20} color="#94A3B8" style={{ marginLeft: 8, marginRight: 4 }} />
          )}
        />
        
        {/* Nota pequeña de ayuda */}
        <View style={styles.helperContainer}>
            <Ionicons name="information-circle-outline" size={14} color="#64748B" />
            <Text style={styles.helperText}>Selecciona una opción de la lista para guardar el mapa.</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    elevation: 2,
    zIndex: 2, // Importante para que el autocompletar flote sobre lo demás
  },
  cardHeader: {
    fontSize: 13,
    fontFamily: FONTS.title, // Asegúrate de tener esta fuente o usa 'System'
    color: '#64748B',
    letterSpacing: 1,
    marginBottom: 16,
    fontWeight: '700',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '600',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 50,
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#1E293B',
    fontWeight: '500',
    height: '100%',
  },
  helperContainer: {
    flexDirection: 'row', 
    alignItems: 'center', 
    marginTop: 6, 
    gap: 4 
  },
  helperText: {
    fontSize: 11,
    color: '#64748B',
  }
});