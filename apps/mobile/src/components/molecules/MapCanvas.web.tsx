import React, { memo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FONTS } from '../../utils/theme';
import { MapPoint, MapRegion } from '../../types/maps';

type Props = {
  points: MapPoint[];
  region: MapRegion;
  onSelect: (point: MapPoint) => void;
  formatMoney: (value: number) => string;
  height?: number;
  valuePrefix?: string;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const resolvePointPosition = (point: MapPoint, region: MapRegion) => {
  const latMin = region.latitude - region.latitudeDelta / 2;
  const latMax = region.latitude + region.latitudeDelta / 2;
  const lngMin = region.longitude - region.longitudeDelta / 2;
  const lngMax = region.longitude + region.longitudeDelta / 2;

  const left = ((point.lng - lngMin) / Math.max(0.0001, lngMax - lngMin)) * 100;
  const top = ((latMax - point.lat) / Math.max(0.0001, latMax - latMin)) * 100;

  return {
    left: `${clamp(left, 6, 94)}%` as any,
    top: `${clamp(top, 8, 92)}%` as any,
  };
};

const MapCanvas = ({ points, region, onSelect, formatMoney, height, valuePrefix = '$' }: Props) => {
  const mapHeight = height ?? 220;

  return (
    <View style={[styles.shell, { height: mapHeight }]}>
      <View style={styles.gridLayer}>
        <View style={[styles.gridLine, styles.gridLineOne]} />
        <View style={[styles.gridLine, styles.gridLineTwo]} />
        <View style={[styles.gridLineVertical, styles.gridLineVerticalOne]} />
        <View style={[styles.gridLineVertical, styles.gridLineVerticalTwo]} />
      </View>

      <View style={styles.routeLayer}>
        <View style={[styles.routeLine, styles.routeLineA]} />
        <View style={[styles.routeLine, styles.routeLineB]} />
        <View style={[styles.routeLine, styles.routeLineC]} />
      </View>

      <View style={styles.centerPulse}>
        <Ionicons name="navigate" size={18} color="#17001F" />
      </View>

      {points.map((point) => {
        const position = resolvePointPosition(point, region);
        return (
          <TouchableOpacity
            key={point.id}
            activeOpacity={0.82}
            onPress={() => onSelect(point)}
            style={[styles.marker, position, { borderColor: point.status.color }]}
          >
            <View style={[styles.markerDot, { backgroundColor: point.status.color }]} />
            <View style={styles.markerLabel}>
              <Text style={styles.markerTitle} numberOfLines={1}>
                {point.title}
              </Text>
              <Text style={styles.markerMeta} numberOfLines={1}>
                {valuePrefix}
                {formatMoney(point.amount)} - {point.status.label}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}

      {!points.length && (
        <View style={styles.emptyState}>
          <Ionicons name="location-outline" size={28} color="#FF8F1F" />
          <Text style={styles.emptyTitle}>Sin puntos activos</Text>
          <Text style={styles.emptyText}>Cuando haya solicitudes con ubicacion, se veran en este mapa.</Text>
        </View>
      )}
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

  return prevPoints.every((prevPoint, index) => {
    const nextPoint = nextPoints[index];

    return (
      prevPoint.id === nextPoint.id &&
      prevPoint.title === nextPoint.title &&
      prevPoint.lat === nextPoint.lat &&
      prevPoint.lng === nextPoint.lng &&
      prevPoint.amount === nextPoint.amount &&
      prevPoint.status.key === nextPoint.status.key &&
      prevPoint.status.label === nextPoint.status.label &&
      prevPoint.status.color === nextPoint.status.color
    );
  });
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
  shell: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: '#13051B',
  },
  gridLayer: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.45,
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  gridLineOne: { top: '34%' as any },
  gridLineTwo: { top: '67%' as any },
  gridLineVertical: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  gridLineVerticalOne: { left: '32%' as any },
  gridLineVerticalTwo: { left: '68%' as any },
  routeLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  routeLine: {
    position: 'absolute',
    height: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(255,143,31,0.34)',
  },
  routeLineA: { width: '54%' as any, left: '10%' as any, top: '30%' as any, transform: [{ rotate: '-8deg' }] },
  routeLineB: { width: '62%' as any, left: '26%' as any, top: '56%' as any, transform: [{ rotate: '6deg' }] },
  routeLineC: { width: '38%' as any, left: '18%' as any, top: '78%' as any, transform: [{ rotate: '-4deg' }] },
  centerPulse: {
    position: 'absolute',
    left: '50%' as any,
    top: '50%' as any,
    width: 42,
    height: 42,
    marginLeft: -21,
    marginTop: -21,
    borderRadius: 999,
    backgroundColor: '#FF8F1F',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  marker: {
    position: 'absolute',
    maxWidth: 150,
    minWidth: 76,
    marginLeft: -16,
    marginTop: -16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.94)',
    paddingVertical: 5,
    paddingLeft: 6,
    paddingRight: 9,
  },
  markerDot: {
    width: 16,
    height: 16,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  markerLabel: { flex: 1, minWidth: 0 },
  markerTitle: { color: '#17001F', fontFamily: FONTS.title, fontSize: 9 },
  markerMeta: { color: '#6B6170', fontFamily: FONTS.body, fontSize: 8, marginTop: 1 },
  emptyState: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 6,
  },
  emptyTitle: { color: '#FFFFFF', fontFamily: FONTS.title, fontSize: 15 },
  emptyText: { color: 'rgba(255,255,255,0.62)', fontFamily: FONTS.body, fontSize: 11, textAlign: 'center' },
});
