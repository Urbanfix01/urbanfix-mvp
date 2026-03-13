import React from 'react';
import { View, Text, StyleSheet, SectionList, ActivityIndicator, StatusBar, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { COLORS, FONTS } from '../../utils/theme';
import { ScreenHeader } from '../../components/molecules/ScreenHeader';
import { EmptyState } from '../../components/molecules/EmptyState';
import { HistoryItem, useHistory } from '../../hooks/useHistory';

export default function HistoryScreen() {
  const navigation = useNavigation<any>();
  const { data: sections, isLoading } = useHistory();

  const renderItem = ({ item }: { item: HistoryItem }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.86}
      onPress={() => navigation.navigate('JobDetail', { jobId: item.id })}
    >
      <View style={styles.iconBox}>
        <Ionicons
          name={item.history_type === 'archived' ? 'archive-outline' : 'checkmark-done-circle'}
          size={24}
          color={item.history_type === 'archived' ? '#6D28D9' : COLORS.success}
        />
      </View>

      <View style={styles.cardContent}>
        <Text style={styles.clientName}>{item.client_name || 'Cliente Particular'}</Text>
        <Text style={styles.jobDate}>{new Date(item.history_date).toLocaleDateString()}</Text>
      </View>

      <View style={styles.cardMeta}>
        <Text
          style={[
            styles.statusPill,
            item.history_type === 'archived' ? styles.statusPillArchived : styles.statusPillCompleted,
          ]}
        >
          {item.history_type === 'archived' ? 'ARCHIVADO' : 'FINALIZADO'}
        </Text>
        <Text style={styles.amount}>${item.total_amount?.toLocaleString('es-AR')}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
    </TouchableOpacity>
  );

  const renderSectionHeader = ({ section: { title, totalAmount } }: { section: { title: string; totalAmount: number } }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionTotal}>Total: ${totalAmount.toLocaleString('es-AR')}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.secondary} />
      <ScreenHeader title="Historial" subtitle="Tus trabajos finalizados y archivados" showBack />

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      ) : (
        <SectionList
          sections={sections || []}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={styles.listContent}
          stickySectionHeadersEnabled={false}
          ListEmptyComponent={
            <EmptyState
              icon="time-outline"
              title="Sin Historial"
              message="Aqui apareceran los trabajos que hayas finalizado o archivado."
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 20 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
    backgroundColor: '#EAEAEA',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  sectionTitle: { fontFamily: FONTS.title, fontSize: 14, color: COLORS.textLight, textTransform: 'uppercase' },
  sectionTotal: { fontFamily: FONTS.title, fontSize: 14, color: COLORS.text },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    elevation: 1,
    gap: 12,
  },
  iconBox: { width: 28, alignItems: 'center' },
  cardContent: { flex: 1 },
  clientName: { fontFamily: FONTS.subtitle, fontSize: 16, color: COLORS.text },
  jobDate: { fontFamily: FONTS.body, fontSize: 12, color: COLORS.textLight },
  cardMeta: { alignItems: 'flex-end', gap: 6 },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
    fontFamily: FONTS.subtitle,
    fontSize: 10,
    letterSpacing: 0.6,
  },
  statusPillArchived: { backgroundColor: '#EDE9FE', color: '#6D28D9' },
  statusPillCompleted: { backgroundColor: '#DCFCE7', color: '#166534' },
  amount: { fontFamily: FONTS.title, fontSize: 16, color: COLORS.primary },
});
