import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Circle, Marker, MapPressEvent, MarkerDragStartEndEvent, Region } from 'react-native-maps';
import Constants from 'expo-constants';
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
  coverageRadiusKm?: number;
  countryHint?: string;
  disabled?: boolean;
}

const DEFAULT_COUNTRY_NAME = 'Argentina';
const DEFAULT_REGION: Region = {
  latitude: -34.6037,
  longitude: -58.3816,
  latitudeDelta: 0.18,
  longitudeDelta: 0.18,
};

const ARGENTINA_BOUNDS = {
  minLat: -55.2,
  maxLat: -21.7,
  minLng: -73.7,
  maxLng: -53.6,
};

const hasValidCoordinates = (lat: number, lng: number) =>
  Number.isFinite(lat) &&
  Number.isFinite(lng) &&
  !(Math.abs(lat) <= 0.000001 && Math.abs(lng) <= 0.000001);

const isCoordinateWithinCountry = (lat: number, lng: number, countryHint = DEFAULT_COUNTRY_NAME) => {
  if (String(countryHint || '').trim().toLowerCase() !== 'argentina') {
    return Number.isFinite(lat) && Number.isFinite(lng);
  }
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= ARGENTINA_BOUNDS.minLat &&
    lat <= ARGENTINA_BOUNDS.maxLat &&
    lng >= ARGENTINA_BOUNDS.minLng &&
    lng <= ARGENTINA_BOUNDS.maxLng
  );
};

const buildRegion = (lat: number, lng: number): Region => ({
  latitude: lat,
  longitude: lng,
  latitudeDelta: 0.045,
  longitudeDelta: 0.045,
});

export default function TechnicianLocationPicker({
  value,
  onChange,
  query,
  onQueryChange,
  onLoadingChange,
  placeholder = 'Calle, altura, localidad y provincia',
  coverageRadiusKm = 20,
  countryHint = DEFAULT_COUNTRY_NAME,
  disabled = false,
}: Props) {
  const [showMap, setShowMap] = useState(Boolean(value?.isValid));
  const [isMapModalVisible, setIsMapModalVisible] = useState(false);
  const [mapError, setMapError] = useState('');
  const [mapReady, setMapReady] = useState(false);

  const hasAndroidMapsKeyFlag = Boolean((Constants.expoConfig as any)?.extra?.hasGoogleMapsAndroidKey);
  const androidGoogleMapsKey = String(
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY ||
      (Constants.expoConfig as any)?.android?.config?.googleMaps?.apiKey ||
      (Constants as any)?.manifest2?.extra?.expoClient?.android?.config?.googleMaps?.apiKey ||
      ''
  ).trim();
  const canRenderMap = Boolean(Constants.platform?.ios) || hasAndroidMapsKeyFlag || Boolean(androidGoogleMapsKey);

  useEffect(() => {
    if (value?.isValid) {
      setShowMap(true);
    }
  }, [value?.isValid, value?.lat, value?.lng]);

  useEffect(() => {
    if (!isMapModalVisible) {
      setMapReady(false);
    }
  }, [isMapModalVisible]);

  const region = useMemo(() => {
    if (value?.isValid && hasValidCoordinates(value.lat, value.lng)) {
      return buildRegion(value.lat, value.lng);
    }
    return DEFAULT_REGION;
  }, [value?.isValid, value?.lat, value?.lng]);

  const commitMapPoint = (lat: number, lng: number) => {
    if (!isCoordinateWithinCountry(lat, lng, countryHint)) {
      setMapError(`La ubicación debe estar dentro de ${countryHint}.`);
      return;
    }

    const fallbackDisplayName = String(query || value?.displayName || 'Punto confirmado en el mapa').trim();

    onChange({
      lat,
      lng,
      displayName: fallbackDisplayName,
      isValid: true,
      precision: 'exact',
      city: value?.city,
      province: value?.province,
    });
    setMapError('');
    setIsMapModalVisible(false);
  };

  const handleAutocompleteSelect = (data: LocationData) => {
    const lat = Number(data.lat);
    const lng = Number(data.lng);
    const isValid = hasValidCoordinates(lat, lng) && isCoordinateWithinCountry(lat, lng, countryHint);
    const safeAddress = String(data.address || '').trim();

    onChange({
      lat: isValid ? lat : 0,
      lng: isValid ? lng : 0,
      displayName: safeAddress,
      isValid,
      precision: data.precision === 'exact' ? 'exact' : 'approx',
      city: data.city,
      province: data.province,
    });
    onQueryChange?.(safeAddress);
    setShowMap(true);
    setMapError('');
    setIsMapModalVisible(true);
  };

  const handleMapPress = (event: MapPressEvent) => {
    if (disabled) return;
    const { latitude, longitude } = event.nativeEvent.coordinate;
    commitMapPoint(latitude, longitude);
  };

  const handleMarkerDragEnd = (event: MarkerDragStartEndEvent) => {
    if (disabled) return;
    const { latitude, longitude } = event.nativeEvent.coordinate;
    commitMapPoint(latitude, longitude);
  };

  return (
    <View style={styles.container}>
      <LocationAutocomplete
        initialValue={query}
        onLocationSelect={handleAutocompleteSelect}
        onQueryChange={onQueryChange}
        onLoadingChange={onLoadingChange}
        placeholder={placeholder}
      />

      {showMap ? (
        <View style={styles.mapCard}>
          <View style={styles.mapHeader}>
            <View style={styles.mapTitleWrap}>
              <Ionicons name="map-outline" size={16} color="#0F172A" />
              <Text style={styles.mapTitle}>Confirma tu punto en el mapa</Text>
            </View>
            <Text style={styles.mapBadge}>{value?.precision === 'exact' ? 'Exacto' : 'Pendiente'}</Text>
          </View>
          <Text style={styles.mapHint}>
            {value?.precision === 'exact'
              ? `Este punto define dónde apareces en el mapa y tu cobertura de ${coverageRadiusKm} km.`
              : 'Abre el mapa y toca o arrastra el pin para fijar el punto exacto donde quieres aparecer.'}
          </Text>

          <TouchableOpacity
            style={[styles.openMapButton, !canRenderMap && styles.openMapButtonDisabled]}
            onPress={() => setIsMapModalVisible(true)}
            disabled={!canRenderMap}
            activeOpacity={0.9}
          >
            <View style={styles.openMapButtonCopy}>
              <Ionicons name="expand-outline" size={18} color={canRenderMap ? '#FFFFFF' : '#94A3B8'} />
              <View style={styles.openMapButtonTextWrap}>
                <Text style={[styles.openMapButtonTitle, !canRenderMap && styles.openMapButtonTitleDisabled]}>
                  {value?.precision === 'exact' ? 'Volver a abrir mapa' : 'Abrir mapa en ventana'}
                </Text>
                <Text style={[styles.openMapButtonSubtitle, !canRenderMap && styles.openMapButtonSubtitleDisabled]}>
                  {value?.precision === 'exact'
                    ? 'Puedes mover el pin si quieres ajustar el punto.'
                    : 'Se abrirá una ventana para confirmar tu ubicación exacta.'}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={canRenderMap ? '#FFFFFF' : '#94A3B8'} />
          </TouchableOpacity>

          {value?.isValid && hasValidCoordinates(value.lat, value.lng) ? (
            <View style={styles.coordinatePreview}>
              <View style={styles.coordinatePreviewItem}>
                <Text style={styles.coordinatePreviewLabel}>Lat</Text>
                <Text style={styles.coordinatePreviewValue}>{value.lat.toFixed(6)}</Text>
              </View>
              <View style={styles.coordinatePreviewItem}>
                <Text style={styles.coordinatePreviewLabel}>Lng</Text>
                <Text style={styles.coordinatePreviewValue}>{value.lng.toFixed(6)}</Text>
              </View>
            </View>
          ) : null}

          {!canRenderMap ? (
            <View style={styles.mapUnavailableCard}>
              <Ionicons name="warning-outline" size={16} color="#92400E" />
              <Text style={styles.mapUnavailableText}>No pudimos abrir el mapa en este dispositivo.</Text>
            </View>
          ) : null}

          {mapError ? (
            <View style={styles.mapErrorCard}>
              <Ionicons name="alert-circle-outline" size={15} color="#B91C1C" />
              <Text style={styles.mapErrorText}>{mapError}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      <Modal
        visible={isMapModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsMapModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleWrap}>
              <Text style={styles.modalTitle}>Confirma tu punto exacto</Text>
              <Text style={styles.modalSubtitle}>Toca el mapa o arrastra el pin para ajustar dónde apareces.</Text>
            </View>
            <TouchableOpacity style={styles.modalCloseButton} onPress={() => setIsMapModalVisible(false)}>
              <Text style={styles.modalCloseText}>Cerrar</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            {canRenderMap ? (
              <View style={styles.modalMapWrap}>
                {!mapReady ? (
                  <View style={styles.mapLoadingOverlay}>
                    <ActivityIndicator color="#2563EB" />
                  </View>
                ) : null}
                <MapView
                  style={styles.map}
                  initialRegion={region}
                  region={region}
                  onPress={handleMapPress}
                  onMapReady={() => setMapReady(true)}
                  scrollEnabled
                  rotateEnabled={false}
                  pitchEnabled={false}
                >
                  {value?.isValid && hasValidCoordinates(value.lat, value.lng) ? (
                    <>
                      <Marker
                        coordinate={{ latitude: value.lat, longitude: value.lng }}
                        draggable={!disabled}
                        onDragEnd={handleMarkerDragEnd}
                        title="Base operativa"
                        description={value.displayName}
                      />
                      <Circle
                        center={{ latitude: value.lat, longitude: value.lng }}
                        radius={Math.max(1, coverageRadiusKm) * 1000}
                        strokeColor="rgba(37,99,235,0.75)"
                        fillColor="rgba(96,165,250,0.18)"
                      />
                    </>
                  ) : null}
                </MapView>
              </View>
            ) : (
              <View style={styles.mapUnavailableCard}>
                <Ionicons name="warning-outline" size={16} color="#92400E" />
                <Text style={styles.mapUnavailableText}>No pudimos abrir el mapa en este dispositivo.</Text>
              </View>
            )}

            {mapError ? (
              <View style={styles.mapErrorCard}>
                <Ionicons name="alert-circle-outline" size={15} color="#B91C1C" />
                <Text style={styles.mapErrorText}>{mapError}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  mapCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    backgroundColor: '#EFF6FF',
    padding: 14,
    gap: 10,
  },
  mapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  mapTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  mapTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  mapBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1D4ED8',
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  mapHint: {
    fontSize: 12,
    lineHeight: 18,
    color: '#1E3A8A',
  },
  openMapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: '#2563EB',
  },
  openMapButtonDisabled: {
    backgroundColor: '#E2E8F0',
  },
  openMapButtonCopy: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  openMapButtonTextWrap: {
    flex: 1,
    gap: 2,
  },
  openMapButtonTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  openMapButtonTitleDisabled: {
    color: '#475569',
  },
  openMapButtonSubtitle: {
    fontSize: 11,
    lineHeight: 16,
    color: 'rgba(255,255,255,0.82)',
  },
  openMapButtonSubtitleDisabled: {
    color: '#64748B',
  },
  coordinatePreview: {
    flexDirection: 'row',
    gap: 10,
  },
  coordinatePreviewItem: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  coordinatePreviewLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1D4ED8',
    textTransform: 'uppercase',
  },
  coordinatePreviewValue: {
    fontSize: 12,
    color: '#0F172A',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    paddingTop: 18,
    paddingHorizontal: 18,
    paddingBottom: 14,
  },
  modalTitleWrap: {
    flex: 1,
    gap: 4,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  modalSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: '#CBD5E1',
  },
  modalCloseButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  modalCloseText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  modalBody: {
    flex: 1,
    paddingHorizontal: 18,
    paddingBottom: 24,
    gap: 12,
  },
  modalMapWrap: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(191,219,254,0.35)',
    backgroundColor: '#E0F2FE',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  mapLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239,246,255,0.65)',
  },
  mapUnavailableCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 14,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FCD34D',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  mapUnavailableText: {
    flex: 1,
    fontSize: 12,
    color: '#92400E',
  },
  mapErrorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  mapErrorText: {
    flex: 1,
    fontSize: 12,
    color: '#991B1B',
  },
});