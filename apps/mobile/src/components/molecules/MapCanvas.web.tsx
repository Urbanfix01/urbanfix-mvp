import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FONTS } from '../../utils/theme';
import { MapPoint, MapRegion } from '../../types/maps';

type Props = {
  points: MapPoint[];
  region: MapRegion;
  onSelect: (point: MapPoint) => void;
  formatMoney: (value: number) => string;
  height?: number;
};

const MapCanvas = ({ height }: Props) => {
  const mapHeight = height ?? 220;
  return (
    <View style={[styles.placeholder, { height: mapHeight }]}>
      <Ionicons name="map-outline" size={28} color="#94A3B8" />
      <Text style={styles.text}>Mapa disponible en la app movil.</Text>
    </View>
  );
};

export default memo(MapCanvas, (prev, next) => prev.height === next.height);

const styles = StyleSheet.create({
  placeholder: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EFE9DE',
    backgroundColor: '#FBFBF9',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  text: { fontSize: 10, fontFamily: FONTS.body, color: '#A8A29E' },
});
