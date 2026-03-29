import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LocationAutocomplete, type LocationData } from './LocationAutocomplete';

export interface TechnicianLocationPickerResult {
  lat: number;
  lng: number;
  displayName: string;
  isValid: boolean;
  precision: 'exact' | 'approx';
  city?: string;
  province?: string;
}

interface Props {
  value: TechnicianLocationPickerResult | null;
  onChange: (result: TechnicianLocationPickerResult | null) => void;
  query?: string;
  onQueryChange?: (query: string) => void;
  onLoadingChange?: (isLoading: boolean) => void;
  placeholder?: string;
}

const hasValidCoordinates = (lat: number, lng: number) =>
  Number.isFinite(lat) &&
  Number.isFinite(lng) &&
  !(Math.abs(lat) <= 0.000001 && Math.abs(lng) <= 0.000001);

export default function TechnicianLocationPicker({
  value,
  onChange,
  query,
  onQueryChange,
  onLoadingChange,
  placeholder = 'Calle, altura, localidad y provincia',
}: Props) {
  const handleSelect = (data: LocationData) => {
    const lat = Number(data.lat);
    const lng = Number(data.lng);
    onChange({
      lat: hasValidCoordinates(lat, lng) ? lat : 0,
      lng: hasValidCoordinates(lat, lng) ? lng : 0,
      displayName: String(data.address || '').trim(),
      isValid: hasValidCoordinates(lat, lng),
      precision: data.precision === 'exact' ? 'exact' : 'approx',
      city: data.city,
      province: data.province,
    });
    onQueryChange?.(String(data.address || '').trim());
  };

  return (
    <View style={styles.container}>
      <LocationAutocomplete
        initialValue={query}
        onLocationSelect={handleSelect}
        onQueryChange={onQueryChange}
        onLoadingChange={onLoadingChange}
        placeholder={placeholder}
      />
      <View style={styles.noticeCard}>
        <Ionicons name="information-circle-outline" size={15} color="#92400E" />
        <Text style={styles.noticeText}>
          {value?.precision === 'exact'
            ? 'Ubicación exacta cargada.'
            : 'En Android o iPhone podrás confirmar el punto exacto en el mapa.'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    color: '#9A3412',
  },
});