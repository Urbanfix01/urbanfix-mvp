import React from 'react';
import { Platform, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';
import { ScreenHeader } from '../../components/molecules/ScreenHeader';
import { MasterItem } from '../../types/database';
import { COLORS, FONTS } from '../../utils/theme';

const formatSource = (source?: string | null) => {
  const raw = source ? source.replace(/_/g, ' ') : 'General';
  return raw.replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const formatPrice = (value?: number | null) => {
  if (!value) return '$0';
  return `$${value.toLocaleString('es-AR')}`;
};

export default function ItemDetailScreen() {
  const route = useRoute();
  const { item } = route.params as { item: MasterItem };
  const isLabor = item.type === 'labor';
  const typeLabel = isLabor ? 'Mano de obra' : item.type === 'consumable' ? 'Insumo' : 'Material';
  const sourcePretty = formatSource(item.source_ref);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.secondary} />

      <ScreenHeader title="DETALLE" subtitle="Catalogo maestro" showBack />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.mainCard}>
          <View style={styles.iconCircle}>
            <Ionicons name={isLabor ? 'construct-outline' : 'cube-outline'} size={30} color="#FF8F1F" />
          </View>

          <View style={styles.badgeRow}>
            <Text style={styles.typeBadge}>{typeLabel}</Text>
            <Text style={styles.sourceBadge}>{sourcePretty}</Text>
          </View>

          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.price}>{formatPrice(item.suggested_price)}</Text>
          <Text style={styles.priceHint}>Valor de referencia para presupuestar.</Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.sectionEyebrow}>INFORMACION</Text>

          <View style={styles.row}>
            <Text style={styles.label}>Tipo</Text>
            <Text style={styles.value}>{typeLabel}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <Text style={styles.label}>Categoria</Text>
            <Text style={styles.value}>{sourcePretty}</Text>
          </View>

          <View style={styles.divider} />

          <Text style={styles.description}>
            Este item pertenece al catalogo maestro de UrbanFix. Usalo como referencia al armar
            presupuestos y ajustar valores segun zona, alcance y complejidad del trabajo.
          </Text>
        </View>

        <TouchableOpacity style={styles.copyBtn} onPress={() => {}}>
          <Ionicons name="copy-outline" size={18} color="#17001F" />
          <Text style={styles.copyText}>Copiar detalle</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const panelShadow = Platform.select({
  web: {
    boxShadow: '0 14px 28px rgba(20, 0, 30, 0.16)',
  },
  default: {
    shadowColor: '#17001F',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 5,
  },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F2EC' },
  content: { padding: 16, paddingBottom: 28, gap: 14 },
  mainCard: {
    alignItems: 'center',
    backgroundColor: '#2D0438',
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    padding: 22,
    ...panelShadow,
  },
  iconCircle: {
    width: 66,
    height: 66,
    borderRadius: 22,
    backgroundColor: '#17001F',
    borderWidth: 1,
    borderColor: 'rgba(255,143,31,0.46)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginBottom: 12 },
  typeBadge: {
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: '#FF8F1F',
    paddingHorizontal: 10,
    paddingVertical: 5,
    color: '#17001F',
    fontFamily: FONTS.title,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  sourceBadge: {
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    color: 'rgba(255,255,255,0.78)',
    fontFamily: FONTS.subtitle,
    fontSize: 10,
  },
  itemName: {
    color: '#FFFFFF',
    fontFamily: FONTS.title,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: 0,
    textAlign: 'center',
  },
  price: {
    color: '#FFB15B',
    fontFamily: FONTS.title,
    fontSize: 34,
    marginTop: 14,
  },
  priceHint: {
    color: 'rgba(255,255,255,0.62)',
    fontFamily: FONTS.body,
    fontSize: 12,
    marginTop: 4,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E9DCD1',
    padding: 16,
    ...panelShadow,
  },
  sectionEyebrow: {
    color: '#9A6C43',
    fontFamily: FONTS.subtitle,
    fontSize: 10,
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 16 },
  label: { color: '#8A7D89', fontFamily: FONTS.subtitle, fontSize: 12 },
  value: { flex: 1, color: '#17001F', fontFamily: FONTS.title, fontSize: 13, textAlign: 'right' },
  divider: { height: 1, backgroundColor: '#EFE5DD', marginVertical: 12 },
  description: { color: '#4B4250', fontFamily: FONTS.body, fontSize: 13, lineHeight: 20 },
  copyBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    borderRadius: 18,
    backgroundColor: '#FF8F1F',
    paddingVertical: 15,
  },
  copyText: { color: '#17001F', fontFamily: FONTS.title, fontSize: 13 },
});
