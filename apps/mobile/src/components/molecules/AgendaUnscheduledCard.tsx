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
      <Text style={styles.unscheduledLabel}>Trabajo pendiente</Text>
      <Text style={styles.unscheduledName} numberOfLines={1}>
        {clientName}
      </Text>
      <Text style={styles.unscheduledAmount}>{amountText}</Text>
    </View>

    <View style={styles.quickRow}>
      <TouchableOpacity style={styles.quickChip} onPress={() => onQuickAssign(id, 0)}>
        <Text style={styles.quickChipText}>Inicio hoy</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.quickChip} onPress={() => onQuickAssign(id, 1)}>
        <Text style={styles.quickChipText}>Inicio manana</Text>
      </TouchableOpacity>
    </View>

    <TouchableOpacity style={styles.assignBtn} onPress={() => onOpenScheduler(id)}>
      <Text style={styles.assignBtnText}>Elegir inicio</Text>
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
    width: 196,
    padding: 14,
    borderRadius: 16,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#C7BBA8',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 3,
  },
  unscheduledInfo: { gap: 4 },
  unscheduledLabel: {
    fontSize: 10,
    fontFamily: FONTS.subtitle,
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  unscheduledName: { fontSize: 14, fontFamily: FONTS.subtitle, color: COLORS.text },
  unscheduledAmount: { fontSize: 12, fontFamily: FONTS.body, color: COLORS.textLight },
  quickRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  quickChip: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
  },
  quickChipText: { fontSize: 10, fontFamily: FONTS.subtitle, color: '#334155' },
  assignBtn: {
    marginTop: 12,
    backgroundColor: COLORS.secondary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 12,
  },
  assignBtnText: { color: '#FFF', fontSize: 11, fontFamily: FONTS.subtitle },
});
