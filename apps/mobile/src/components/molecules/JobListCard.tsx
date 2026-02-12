import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS } from '../../utils/theme';

type Props = {
  id: string;
  clientName: string;
  amountText: string;
  dateText: string;
  statusLabel: string;
  statusColor: string;
  statusBg: string;
  isSelected: boolean;
  selectionMode: boolean;
  onPress: () => void;
  onLongPress: () => void;
  onShare: () => void;
};

const JobListCard = ({
  clientName,
  amountText,
  dateText,
  statusLabel,
  statusColor,
  statusBg,
  isSelected,
  selectionMode,
  onPress,
  onLongPress,
  onShare,
}: Props) => (
  <TouchableOpacity
    style={styles.card}
    activeOpacity={0.7}
    onPress={onPress}
    onLongPress={onLongPress}
  >
    <View style={[styles.iconBar, { backgroundColor: statusColor }]} />
    <View style={styles.cardContent}>
      {selectionMode && (
        <Ionicons
          name={isSelected ? 'checkbox' : 'square-outline'}
          size={22}
          color={isSelected ? COLORS.primary : '#CBD5E1'}
          style={{ marginRight: 8 }}
        />
      )}
      <View style={{ flex: 1 }}>
        <View style={styles.rowBetween}>
          <Text style={styles.clientName} numberOfLines={1}>
            {clientName}
          </Text>
          <Text style={styles.amountText}>{amountText}</Text>
        </View>
        <View style={styles.rowBetween}>
          <Text style={styles.jobDate}>{dateText}</Text>
          <View style={[styles.badge, { backgroundColor: statusBg, borderColor: statusColor }]}>
            <Text style={[styles.badgeText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
        </View>
      </View>
    </View>
    {!selectionMode && (
      <TouchableOpacity style={styles.shareBtn} onPress={onShare}>
        <Ionicons name="paper-plane-outline" size={20} color={COLORS.textLight} />
      </TouchableOpacity>
    )}
  </TouchableOpacity>
);

export default memo(JobListCard, (prev, next) =>
  prev.clientName === next.clientName &&
  prev.amountText === next.amountText &&
  prev.dateText === next.dateText &&
  prev.statusLabel === next.statusLabel &&
  prev.statusColor === next.statusColor &&
  prev.statusBg === next.statusBg &&
  prev.isSelected === next.isSelected &&
  prev.selectionMode === next.selectionMode
);

const styles = StyleSheet.create({
  card: Platform.select({
    web: {
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      marginBottom: 12,
      flexDirection: 'row',
      overflow: 'hidden',
      boxShadow: '0 3px 10px rgba(0,0,0,0.08)',
    },
    default: {
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      marginBottom: 12,
      flexDirection: 'row',
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      elevation: 2,
    },
  }),
  iconBar: { width: 6, height: '100%' },
  cardContent: { flex: 1, padding: 16, flexDirection: 'row', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  clientName: { fontSize: 17, fontFamily: FONTS.subtitle, color: COLORS.text, width: '60%' },
  amountText: { fontSize: 17, fontFamily: FONTS.title, color: COLORS.text },
  jobDate: { fontSize: 13, fontFamily: FONTS.body, color: COLORS.textLight },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
  badgeText: { fontSize: 10, fontFamily: FONTS.subtitle, letterSpacing: 0.7, textTransform: 'uppercase' },
  shareBtn: { padding: 16, justifyContent: 'center', borderLeftWidth: 1, borderLeftColor: '#F3F4F6' },
});
