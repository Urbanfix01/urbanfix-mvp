import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MasterItem } from '../../types/database';
import { COLORS, FONTS } from '../../utils/theme';

interface CatalogItemProps {
  item: MasterItem;
  onPress: (item: MasterItem) => void; // Cambiamos onAdd por onPress
}

export const CatalogItem = ({ item, onPress }: CatalogItemProps) => {
  const isLabor = item.type === 'labor';
  const typeLabel = isLabor ? 'MANO DE OBRA' : item.type === 'consumable' ? 'INSUMO' : 'MATERIAL';
  const typeColor = isLabor ? COLORS.primary : COLORS.secondary;
  const typeBg = isLabor ? '#FFF3D6' : '#E8EEF5';
  const sourceLabel = item.source_ref ? item.source_ref.replace(/_/g, ' ') : 'General';
  const sourcePretty = sourceLabel.replace(/\b\w/g, (letter) => letter.toUpperCase());

  return (
    <TouchableOpacity 
      style={styles.card} 
      onPress={() => onPress(item)} // Hacemos clickeable toda la tarjeta
      activeOpacity={0.7}
    >
      {/* Icono */}
      <View style={[styles.iconContainer, { backgroundColor: typeBg }]}>
         <Ionicons 
            name={isLabor ? "hand-left-outline" : "cube-outline"} 
            size={22} 
            color={typeColor} 
         />
      </View>

      {/* Datos */}
      <View style={styles.cardContent}>
        <View style={styles.metaRow}>
          <View style={[styles.typePill, { backgroundColor: typeBg, borderColor: typeColor }]}>
            <Text style={[styles.typePillText, { color: typeColor }]}>{typeLabel}</Text>
          </View>
          <View style={styles.sourcePill}>
            <Text style={styles.sourcePillText}>{sourcePretty}</Text>
          </View>
        </View>
        <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
        <Text style={styles.itemSource}>Categoria · {sourcePretty}</Text>
      </View>

      {/* Precio y Flecha (Indicador de navegación) */}
      <View style={styles.actionColumn}>
        <View style={styles.pricePill}>
          <Text style={styles.price}>
            ${item.suggested_price?.toLocaleString('es-AR') || '0'}
          </Text>
        </View>
        <View style={styles.chevronWrap}>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textLight} />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EDE6DB',
    shadowColor: "#1F2937",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardContent: {
    flex: 1,
    marginRight: 8,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  typePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
  },
  typePillText: {
    fontFamily: FONTS.subtitle,
    fontSize: 9,
    letterSpacing: 1,
  },
  sourcePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  sourcePillText: {
    fontFamily: FONTS.body,
    fontSize: 9,
    color: '#64748B',
  },
  itemName: {
    fontFamily: FONTS.subtitle,
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 20,
  },
  itemSource: {
    fontFamily: FONTS.body,
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 4,
  },
  actionColumn: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  pricePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  price: {
    fontFamily: FONTS.title,
    fontSize: 15,
    color: COLORS.primary,
  },
  chevronWrap: {
    marginTop: 8,
    width: 28,
    height: 28,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
  },
});
