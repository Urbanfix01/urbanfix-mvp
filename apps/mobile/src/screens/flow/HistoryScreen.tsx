import React from 'react';
import { View, Text, StyleSheet, SectionList, ActivityIndicator, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS } from '../../utils/theme';
import { ScreenHeader } from '../../components/molecules/ScreenHeader';
import { EmptyState } from '../../components/molecules/EmptyState';
import { useHistory } from '../../hooks/useHistory';

export default function HistoryScreen() {
  const { data: sections, isLoading } = useHistory();

  // Renderiza cada trabajo individual
  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.iconBox}>
        <Ionicons name="checkmark-done-circle" size={24} color={COLORS.success} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.clientName}>
          {item.client_name || 'Cliente Particular'}
        </Text>
        <Text style={styles.jobDate}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
      <Text style={styles.amount}>
        ${item.total_amount?.toLocaleString('es-AR')}
      </Text>
    </View>
  );

  // Renderiza el encabezado del mes (ej: "Noviembre 2025 - Total: $...")
  const renderSectionHeader = ({ section: { title, totalAmount } }: any) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionTotal}>
        Total: ${totalAmount.toLocaleString('es-AR')}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.secondary} />
      <ScreenHeader title="Historial" subtitle="Tus trabajos finalizados" showBack />

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color={COLORS.primary} /></View>
      ) : (
        <SectionList
          // @ts-ignore
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
              message="Aquí aparecerán los trabajos que hayas cerrado o completado." 
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

  // Encabezado de Mes
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 20, marginBottom: 10,
    backgroundColor: '#EAEAEA', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8
  },
  sectionTitle: { fontFamily: FONTS.title, fontSize: 14, color: COLORS.textLight, textTransform: 'uppercase' },
  sectionTotal: { fontFamily: FONTS.title, fontSize: 14, color: COLORS.text },

  // Tarjeta de Trabajo
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFF', padding: 16, borderRadius: 12, marginBottom: 8,
    shadowColor: "#000", shadowOffset: {width:0, height:1}, shadowOpacity:0.05, elevation: 1
  },
  iconBox: { marginRight: 12 },
  clientName: { fontFamily: FONTS.subtitle, fontSize: 16, color: COLORS.text },
  jobDate: { fontFamily: FONTS.body, fontSize: 12, color: COLORS.textLight },
  amount: { fontFamily: FONTS.title, fontSize: 16, color: COLORS.primary },
});