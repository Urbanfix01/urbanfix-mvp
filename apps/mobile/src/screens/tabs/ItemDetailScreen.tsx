import React, { useMemo, useState } from 'react';
import { Modal, Platform, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ScreenHeader } from '../../components/molecules/ScreenHeader';
import { MasterItem } from '../../types/database';
import { COLORS, FONTS } from '../../utils/theme';
import { useCatalogRenders } from '../../materials/useCatalogRenders';
import MaterialRenderImage from '../../materials/MaterialRenderImage';
import { WORK_OPERATION_LABELS } from '../../materials/catalogWorkBindings';

const formatSource = (source?: string | null) => {
  const raw = source ? source.replace(/_/g, ' ') : 'General';
  return raw.replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const formatPrice = (value?: number | null) => {
  if (!value || value < 0) return 'Pendiente';
  return `$${value.toLocaleString('es-AR')}`;
};

export default function ItemDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { item } = route.params as { item: MasterItem };
  const isLabor = item.type === 'labor';
  const typeLabel = isLabor ? 'Mano de obra' : item.type === 'consumable' ? 'Insumo' : 'Material';
  const sourcePretty = formatSource(item.source_ref);
  const [expanded, setExpanded] = useState(false);
  const renderItems = useMemo(() => [item], [item]);
  const renders = useCatalogRenders(renderItems), preview = renders.previews.get(item.id);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.secondary} />

      <ScreenHeader title="DETALLE" subtitle="Catalogo maestro" showBack />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.mainCard}>
          {preview?.source ? <TouchableOpacity style={styles.renderButton} accessibilityRole="button" accessibilityLabel={`Ampliar render de ${item.name}`} onPress={() => setExpanded(true)}>
            <MaterialRenderImage preview={preview} name={item.name} style={styles.render} />
            <View style={styles.expandIcon}><Ionicons name="expand-outline" size={18} color="#FFFFFF" /></View>
          </TouchableOpacity> : <View style={styles.iconCircle}>
            <Ionicons name={isLabor ? 'construct-outline' : 'cube-outline'} size={30} color="#FF8F1F" />
          </View>}

          <View style={styles.badgeRow}>
            <Text style={styles.typeBadge}>{typeLabel}</Text>
            <Text style={styles.sourceBadge}>{sourcePretty}</Text>
          </View>

          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.price}>{formatPrice(item.suggested_price)}</Text>
          <Text style={styles.priceHint}>Valor de referencia para presupuestar.</Text>
          {preview?.source && <Text style={styles.priceHint}>{preview.work ? 'Vista orientativa de la familia de trabajo' : preview.published ? 'Render publicado' : 'Render ilustrativo de la familia de material'}</Text>}
          {preview?.work?.operation && <Text style={styles.priceHint}>{WORK_OPERATION_LABELS[preview.work.operation]}</Text>}
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

        {!isLabor && renders.error ? <TouchableOpacity accessibilityRole="button" accessibilityLabel="Actualizar render" style={styles.copyBtn} onPress={() => void renders.retry()}><Ionicons name="refresh-outline" size={18} color="#17001F" /><Text style={styles.copyText}>Actualizar render</Text></TouchableOpacity> : null}
        {!isLabor && preview?.material && <TouchableOpacity accessibilityRole="button" accessibilityLabel="Ver material en 3D" style={styles.copyBtn} onPress={() => navigation.navigate('DesignWorkspace', { mode: 'materials', materialId: preview.material!.id })}>
          <Ionicons name="cube-outline" size={18} color="#17001F" /><Text style={styles.copyText}>Ver material en 3D</Text>
        </TouchableOpacity>}
        {isLabor && preview?.work?.model && <TouchableOpacity accessibilityRole="button" accessibilityLabel="Ver trabajo en 3D" style={styles.copyBtn} onPress={() => navigation.navigate('DesignWorkspace', { mode: 'work', workId: preview.work!.model, workName: item.name })}>
          <Ionicons name="cube-outline" size={18} color="#17001F" /><Text style={styles.copyText}>Ver trabajo en 3D</Text>
        </TouchableOpacity>}
        <TouchableOpacity style={styles.copyBtn} onPress={() => {}}>
          <Ionicons name="copy-outline" size={18} color="#17001F" />
          <Text style={styles.copyText}>Copiar detalle</Text>
        </TouchableOpacity>
      </ScrollView>
      <Modal visible={expanded} animationType="slide" onRequestClose={() => setExpanded(false)}>
        <SafeAreaView style={styles.previewRoot}><View style={styles.previewHeader}><Text style={styles.previewTitle}>{isLabor ? 'RENDER DEL TRABAJO' : 'RENDER DEL MATERIAL'}</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel="Cerrar render" onPress={() => setExpanded(false)} style={styles.closeRender}><Ionicons name="close" size={24} color="#FFFFFF" /></TouchableOpacity></View>
          <MaterialRenderImage preview={preview} name={item.name} style={styles.largeRender} /><View style={styles.previewCaption}><Text style={styles.previewName}>{item.name}</Text><Text style={styles.description}>{preview?.work ? 'Vista orientativa. No representa cantidades, configuración ni alcance exacto de la tarifa; no es un detalle aprobado para obra.' : preview?.published ? preview.published.title : 'Imagen ilustrativa. La marca, dimensiones y presentación son las indicadas en la ficha del producto.'}</Text></View>
        </SafeAreaView>
      </Modal>
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
  renderButton: { width: '100%', marginBottom: 18, position: 'relative' },
  render: { width: '100%', height: 210, borderRadius: 14, backgroundColor: '#F4F6F8' },
  expandIcon: { position: 'absolute', right: 10, bottom: 10, backgroundColor: '#2D0438', borderRadius: 10, padding: 9 },
  previewRoot: { flex: 1, backgroundColor: '#F7F2EC' },
  previewHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, backgroundColor: COLORS.secondary },
  previewTitle: { flex: 1, fontFamily: FONTS.title, fontSize: 16, color: '#FFFFFF' },
  closeRender: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  largeRender: { flex: 1, width: '100%', minHeight: 180, backgroundColor: '#F4F6F8' },
  previewCaption: { padding: 20, gap: 8 },
  previewName: { fontFamily: FONTS.title, color: '#17001F', fontSize: 18 },
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
