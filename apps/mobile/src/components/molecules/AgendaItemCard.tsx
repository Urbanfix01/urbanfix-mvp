import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, FONTS } from '../../utils/theme';

type Props = {
  id: string;
  clientName: string;
  amountText: string;
  statusLabel: string;
  statusColor: string;
  statusBg: string;
  onPress: () => void;
  onLongPress: () => void;
};

const AgendaItemCard = ({
  clientName,
  amountText,
  statusLabel,
  statusColor,
  statusBg,
  onPress,
  onLongPress,
}: Props) => (
  <TouchableOpacity
    style={[styles.itemCard, { borderLeftColor: statusColor }]}
    onPress={onPress}
    onLongPress={onLongPress}
  >
    <View>
      <Text style={styles.itemTitle}>{clientName}</Text>
      <View style={[styles.badge, { backgroundColor: statusBg, borderColor: statusColor }]}>
        <Text style={[styles.badgeText, { color: statusColor }]}>{statusLabel}</Text>
      </View>
    </View>
    <Text style={styles.itemPrice}>{amountText}</Text>
  </TouchableOpacity>
);

export default memo(
  AgendaItemCard,
  (prev, next) =>
    prev.clientName === next.clientName &&
    prev.amountText === next.amountText &&
    prev.statusLabel === next.statusLabel &&
    prev.statusColor === next.statusColor &&
    prev.statusBg === next.statusBg
);

const styles = StyleSheet.create({
  itemCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderLeftWidth: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    elevation: 2,
  },
  itemTitle: { fontSize: 16, fontFamily: FONTS.subtitle, color: COLORS.text, marginBottom: 4 },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgeText: { fontSize: 10, fontFamily: FONTS.subtitle, letterSpacing: 0.6 },
  itemPrice: { fontSize: 16, fontFamily: FONTS.title, color: COLORS.text },
});
