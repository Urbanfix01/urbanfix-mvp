import React from 'react';
import { View, Text, StyleSheet, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LocationAutocomplete } from './LocationAutocomplete';
import { FONTS } from '../../utils/theme';

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

      {/* Input de Dirección (Híbrido: Web vs Móvil) */}
      <View style={[styles.inputGroup, styles.addressGroup]}> 
        <Text style={styles.label}>Dirección de la obra</Text>
        <LocationAutocomplete
          initialValue={initialAddress}
          onLocationSelect={({ address, lat, lng }) => onLocationChange(address, lat, lng)}
        />
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
    zIndex: 2,
    position: 'relative',
    overflow: 'visible',
  },
  cardHeader: {
    fontSize: 13,
    fontFamily: FONTS.title || 'System',
    color: '#64748B',
    letterSpacing: 1,
    marginBottom: 16,
    fontWeight: '700',
  },
  inputGroup: {
    marginBottom: 16,
  },
  addressGroup: {
    zIndex: 9999,
    position: 'relative',
    overflow: 'visible',
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
