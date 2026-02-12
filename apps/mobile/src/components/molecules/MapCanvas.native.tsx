import React from 'react';
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

export default function MapCanvas({ points, region, onSelect, formatMoney, height }: Props) {
  const mapHeight = height ?? 220;
  const tracksViewChanges = Platform.OS === 'android';

  return (
    <View style={[styles.shell, { height: mapHeight }]}>
      <MapView
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
}

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
