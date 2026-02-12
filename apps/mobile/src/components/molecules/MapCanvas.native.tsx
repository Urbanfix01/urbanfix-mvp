import React, { memo, useEffect, useRef } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { MapPoint, MapRegion } from '../../types/maps';

type Props = {
  points: MapPoint[];
  region: MapRegion;
  onSelect: (point: MapPoint) => void;
  formatMoney: (value: number) => string;
  height?: number;
};

const MapCanvas = ({ points, region, onSelect, formatMoney, height }: Props) => {
  const mapHeight = height ?? 220;
  const tracksViewChanges = Platform.OS === 'android';
  const mapRef = useRef<MapView>(null);
  const coordsKey = points.map((point) => `${point.lat},${point.lng}`).join('|');

  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (!points.length) return;
    const coords = points.map((point) => ({ latitude: point.lat, longitude: point.lng }));
    mapRef.current?.fitToCoordinates(coords, {
      edgePadding: { top: 32, right: 32, bottom: 32, left: 32 },
      animated: false,
    });
  }, [coordsKey]);

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
            description={`$${formatMoney(point.amount)} · ${point.status.label}`}
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
    areRegionsEqual(prev.region, next.region) &&
    arePointsEqual(prev.points, next.points)
);

const styles = StyleSheet.create({
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
