import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Platform, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';
import Constants from 'expo-constants';
import { MapCanvasProps, MapPoint, MapRegion } from '../../types/maps';
import { mapCoordinate } from '../../utils/mapGeometry';
import { COLORS } from '../../utils/theme';

const isValidCoordinate = (point: MapPoint) =>
  Boolean(mapCoordinate(point.lat, point.lng));

const normalizeRegion = (region: MapRegion): MapRegion => ({
  latitude: Number.isFinite(region.latitude) ? region.latitude : -34.6037,
  longitude: Number.isFinite(region.longitude) ? region.longitude : -58.3816,
  latitudeDelta: Number.isFinite(region.latitudeDelta) && region.latitudeDelta > 0 ? region.latitudeDelta : 0.25,
  longitudeDelta: Number.isFinite(region.longitudeDelta) && region.longitudeDelta > 0 ? region.longitudeDelta : 0.25,
});

const MapCanvas = ({ points, region, onSelect, formatMoney, height, valuePrefix = '$', selectedId, focusKey }: MapCanvasProps) => {
  const mapHeight = height ?? 220;
  const mapRef = useRef<MapView>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [tracksMarkers, setTracksMarkers] = useState(true);
  const safePoints = useMemo(() => points.filter(isValidCoordinate), [points]);
  const safeRegion = useMemo(() => normalizeRegion(region), [region]);
  const coordsKey = safePoints.map((point) => `${point.lat},${point.lng}`).join('|');
  const markerKey = safePoints.map((point) => `${point.id}:${point.title}:${point.status.key}:${point.status.color}:${point.status.label}:${point.amount}:${point.amountLabel || ''}`).join('|');
  const hasAndroidMapsKeyFlag = Boolean((Constants.expoConfig as any)?.extra?.hasGoogleMapsAndroidKey);
  const androidGoogleMapsKey = String(
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY ||
      (Constants.expoConfig as any)?.android?.config?.googleMaps?.apiKey ||
      (Constants as any)?.manifest2?.extra?.expoClient?.android?.config?.googleMaps?.apiKey ||
      ''
  ).trim();
  const canRenderNativeMap = Platform.OS !== 'android' || hasAndroidMapsKeyFlag || Boolean(androidGoogleMapsKey);

  useEffect(() => {
    if (!canRenderNativeMap) return;
    if (Platform.OS === 'web') return;
    if (!isMapReady) return;
    if (!safePoints.length) {
      mapRef.current?.animateToRegion(safeRegion, 250);
      return;
    }
    if (safePoints.length === 1) {
      mapRef.current?.animateToRegion(safeRegion, 250);
      return;
    }
    const coords = safePoints.map((point) => ({ latitude: point.lat, longitude: point.lng }));
    mapRef.current?.fitToCoordinates(coords, {
      edgePadding: { top: 18, right: 18, bottom: 18, left: 18 },
      animated: false,
    });
  }, [
    canRenderNativeMap,
    coordsKey,
    isMapReady,
    safePoints.length,
    safeRegion.latitude,
    safeRegion.longitude,
    safeRegion.latitudeDelta,
    safeRegion.longitudeDelta,
  ]);

  useEffect(() => {
    if (!safePoints.length) return undefined;
    setTracksMarkers(true);
    const timeout = setTimeout(() => setTracksMarkers(false), 900);
    return () => clearTimeout(timeout);
  }, [coordsKey, markerKey, safePoints.length]);

  useEffect(() => {
    if (!canRenderNativeMap || !isMapReady || !selectedId) return;
    const point = safePoints.find((row) => row.id === selectedId);
    if (point) mapRef.current?.animateToRegion({ latitude: point.lat, longitude: point.lng, latitudeDelta: .02, longitudeDelta: .02 }, 250);
  }, [canRenderNativeMap, isMapReady, selectedId, focusKey, coordsKey]);

  const handleMapReady = useCallback(() => {
    setIsMapReady(true);
  }, []);

  const handleSelect = useCallback(
    (point: MapPoint) => {
      onSelect(point);
    },
    [onSelect]
  );

  const visiblePoints = safePoints;

  if (!canRenderNativeMap) {
    return (
      <View style={[styles.placeholder, { height: mapHeight }]}>
        <View style={styles.placeholderDot} />
        <View style={styles.placeholderLine} />
        <Text style={styles.placeholderText}>Mapa no disponible. Falta configurar Google Maps en Android.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.shell, { height: mapHeight }]}>
      <MapView
        ref={mapRef}
        style={[styles.map, { height: mapHeight }]}
        initialRegion={safeRegion}
        onMapReady={handleMapReady}
        scrollEnabled
        rotateEnabled
        pitchEnabled
        zoomEnabled
      >
        {visiblePoints.map((point) => (
          <Marker
            key={point.id}
            coordinate={{ latitude: point.lat, longitude: point.lng }}
            anchor={{ x: 0.5, y: 1 }}
            tracksViewChanges={tracksMarkers}
            title={point.title}
            description={`${point.amountLabel || `${valuePrefix}${formatMoney(point.amount)}`} - ${point.status.label}`}
            onPress={() => handleSelect(point)}
          >
            <View style={styles.pinWrap}>
              <View style={[styles.pinHead, { backgroundColor: point.status.color }]}>
                <View style={styles.pinInner} />
              </View>
              <View style={[styles.pinTail, { backgroundColor: point.status.color }]} />
            </View>
          </Marker>
        ))}
      </MapView>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Encuadrar solicitudes" style={styles.fit} onPress={() => {
        if (safePoints.length > 1) mapRef.current?.fitToCoordinates(safePoints.map((point) => ({ latitude: point.lat, longitude: point.lng })), { edgePadding: { top: 30, right: 30, bottom: 30, left: 30 }, animated: true });
        else mapRef.current?.animateToRegion(safeRegion, 250);
      }}><Ionicons name="scan-outline" size={22} color={COLORS.brand} /></TouchableOpacity>
    </View>
  );
};

export default memo(MapCanvas);

const styles = StyleSheet.create({
  fit: { position: 'absolute', right: 10, top: 10, width: 44, height: 44, backgroundColor: COLORS.white, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  placeholder: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EFE9DE',
    backgroundColor: '#FBFBF9',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  placeholderDot: {
    width: 18,
    height: 18,
    borderRadius: 999,
    backgroundColor: '#CBD5E1',
  },
  placeholderLine: {
    width: 180,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#E2E8F0',
  },
  placeholderText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  shell: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#EFE9DE',
  },
  map: { width: '100%' },
  pinWrap: { alignItems: 'center' },
  pinHead: {
    width: 28,
    height: 28,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
  pinInner: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
  },
  pinTail: {
    width: 12,
    height: 12,
    marginTop: -4,
    transform: [{ rotate: '45deg' }],
    borderRadius: 2,
  },
});
