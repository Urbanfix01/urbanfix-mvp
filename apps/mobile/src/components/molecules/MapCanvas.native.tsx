import React, { memo, useEffect, useRef } from 'react';
import { View, StyleSheet, Platform, Text } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import Constants from 'expo-constants';
import { MapPoint, MapRegion } from '../../types/maps';

type Props = {
  points: MapPoint[];
  region: MapRegion;
  onSelect: (point: MapPoint) => void;
  formatMoney: (value: number) => string;
  height?: number;
  valuePrefix?: string;
};

const MapCanvas = ({ points, region, onSelect, formatMoney, height, valuePrefix = '$' }: Props) => {
  const mapHeight = height ?? 220;
  const tracksViewChanges = Platform.OS === 'android';
  const mapRef = useRef<MapView>(null);
  const coordsKey = points.map((point) => `${point.lat},${point.lng}`).join('|');
  const androidGoogleMapsKey = String(
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY ||
      (Constants.expoConfig as any)?.android?.config?.googleMaps?.apiKey ||
      (Constants as any)?.manifest2?.extra?.expoClient?.android?.config?.googleMaps?.apiKey ||
      ''
  ).trim();
  const canRenderNativeMap = Platform.OS !== 'android' || Boolean(androidGoogleMapsKey);

  useEffect(() => {
    if (!canRenderNativeMap) return;
    if (Platform.OS === 'web') return;
    if (!points.length) return;
    const coords = points.map((point) => ({ latitude: point.lat, longitude: point.lng }));
    mapRef.current?.fitToCoordinates(coords, {
      edgePadding: { top: 32, right: 32, bottom: 32, left: 32 },
      animated: false,
    });
  }, [canRenderNativeMap, coordsKey]);

  if (!canRenderNativeMap) {
    return (
      <View style={[styles.placeholder, { height: mapHeight }]}>
        <View style={styles.placeholderDot} />
        <View style={styles.placeholderLine} />
        <Text style={styles.placeholderText}>Mapa no disponible en este dispositivo.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.shell, { height: mapHeight }]}>
      <MapView
        ref={mapRef}
        style={[styles.map, { height: mapHeight }]}
        initialRegion={region}
        scrollEnabled
        rotateEnabled
        pitchEnabled
        zoomEnabled
      >
        {points.map((point) => (
          <Marker
            key={point.id}
            coordinate={{ latitude: point.lat, longitude: point.lng }}
            anchor={{ x: 0.5, y: 1 }}
            tracksViewChanges={tracksViewChanges}
            title={point.title}
            description={`${valuePrefix}${formatMoney(point.amount)} - ${point.status.label}`}
            onPress={() => onSelect(point)}
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
    </View>
  );
};

const areRegionsEqual = (a: MapRegion, b: MapRegion) =>
  a.latitude === b.latitude &&
  a.longitude === b.longitude &&
  a.latitudeDelta === b.latitudeDelta &&
  a.longitudeDelta === b.longitudeDelta;

const arePointsEqual = (prevPoints: MapPoint[], nextPoints: MapPoint[]) => {
  if (prevPoints.length !== nextPoints.length) return false;
  for (let i = 0; i < prevPoints.length; i += 1) {
    const prev = prevPoints[i];
    const next = nextPoints[i];
    if (
      prev.id !== next.id ||
      prev.lat !== next.lat ||
      prev.lng !== next.lng ||
      prev.amount !== next.amount ||
      prev.title !== next.title ||
      prev.status.key !== next.status.key ||
      prev.status.label !== next.status.label ||
      prev.status.color !== next.status.color
    ) {
      return false;
    }
  }
  return true;
};

export default memo(
  MapCanvas,
  (prev, next) =>
    prev.height === next.height &&
    prev.valuePrefix === next.valuePrefix &&
    areRegionsEqual(prev.region, next.region) &&
    arePointsEqual(prev.points, next.points)
);

const styles = StyleSheet.create({
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
