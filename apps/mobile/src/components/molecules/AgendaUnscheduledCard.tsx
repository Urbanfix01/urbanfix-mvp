import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS } from '../../utils/theme';

type Props = {
  id: string;
  clientName: string;
  amountText: string;
  onQuickAssign: (id: string, offsetDays: number) => void;
  onOpenScheduler: (id: string) => void;
};

const AgendaUnscheduledCard = ({
  id,
  clientName,
  amountText,
  onQuickAssign,
  onOpenScheduler,
}: Props) => (
  <View style={styles.unscheduledCard}>
    <View style={styles.unscheduledInfo}>
      <Text style={styles.unscheduledName} numberOfLines={1}>
        {clientName}
      </Text>
      <Text style={styles.unscheduledAmount}>{amountText}</Text>
    </View>
    <View style={styles.quickRow}>
      <TouchableOpacity style={styles.quickChip} onPress={() => onQuickAssign(id, 0)}>
        <Text style={styles.quickChipText}>Hoy</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.quickChip} onPress={() => onQuickAssign(id, 1)}>
        <Text style={styles.quickChipText}>Mañana</Text>
      </TouchableOpacity>
    </View>
    <TouchableOpacity style={styles.assignBtn} onPress={() => onOpenScheduler(id)}>
      <Text style={styles.assignBtnText}>Asignar fecha</Text>
      <Ionicons name="calendar" size={14} color="#FFF" style={{ marginLeft: 6 }} />
    </TouchableOpacity>
  </View>
);

export default memo(
  AgendaUnscheduledCard,
  (prev, next) =>
    prev.clientName === next.clientName &&
    prev.amountText === next.amountText &&
    prev.id === next.id
);

const styles = StyleSheet.create({
  unscheduledCard: {
    backgroundColor: '#FFFFFF',
    width: 180,
    padding: 12,
    borderRadius: 14,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#F3E6CF',
    shadowColor: '#BFA57A',
    shadowOpacity: 0.15,
    elevation: 2,
  },
  unscheduledInfo: { gap: 4 },
  unscheduledName: { fontSize: 13, fontFamily: FONTS.subtitle, color: COLORS.text },
  unscheduledAmount: { fontSize: 12, fontFamily: FONTS.body, color: COLORS.textLight },
  quickRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  quickChip: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#F3E6CF',
    backgroundColor: '#FFFDF9',
    alignItems: 'center',
  },
  quickChipText: { fontSize: 10, fontFamily: FONTS.subtitle, color: '#92400E' },
  assignBtn: {
    marginTop: 10,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
  },
  assignBtnText: { color: '#FFF', fontSize: 11, fontFamily: FONTS.subtitle },
});
