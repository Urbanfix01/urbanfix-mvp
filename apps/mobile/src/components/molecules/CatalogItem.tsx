import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MasterItem } from '../../types/database';
import { FONTS } from '../../utils/theme';

interface CatalogItemProps {
  item: MasterItem;
  onPress: (item: MasterItem) => void;
}

const formatSource = (source?: string | null) => {
  const raw = source ? source.replace(/_/g, ' ') : 'General';
  return raw.replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const formatPrice = (value?: number | null) => {
  if (!value) return '$0';
  return `$${value.toLocaleString('es-AR')}`;
};

export const CatalogItem = ({ item, onPress }: CatalogItemProps) => {
  const isLabor = item.type === 'labor';
  const isConsumable = item.type === 'consumable';
  const typeLabel = isLabor ? 'MANO DE OBRA' : isConsumable ? 'INSUMO' : 'MATERIAL';
  const sourcePretty = formatSource(item.source_ref);

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(item)} activeOpacity={0.82}>
      <View style={styles.accentBar} />

      <View style={styles.iconContainer}>
        <Ionicons name={isLabor ? 'construct-outline' : 'cube-outline'} size={19} color="#FF8F1F" />
      </View>

      <View style={styles.cardContent}>
        <View style={styles.metaRow}>
          <Text style={styles.typePill}>{typeLabel}</Text>
          <Text style={styles.sourcePill} numberOfLines={1}>
            {sourcePretty}
          </Text>
        </View>
        <Text style={styles.itemName} numberOfLines={2}>
          {item.name}
        </Text>
      </View>

      <View style={styles.actionColumn}>
        <Text style={styles.price}>{formatPrice(item.suggested_price)}</Text>
        <View style={styles.chevronWrap}>
          <Ionicons name="chevron-forward" size={17} color="#FFFFFF" />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const cardShadow = Platform.select({
  web: {
    boxShadow: '0 10px 18px rgba(20, 0, 30, 0.12)',
  },
  default: {
    shadowColor: '#17001F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
});

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 86,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E9DCD1',
    paddingVertical: 12,
    paddingLeft: 14,
    paddingRight: 12,
    marginBottom: 10,
    overflow: 'hidden',
    ...cardShadow,
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
    backgroundColor: '#FF8F1F',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    backgroundColor: '#2D0438',
    borderWidth: 1,
    borderColor: 'rgba(255,143,31,0.42)',
  },
  cardContent: {
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 7,
  },
  typePill: {
    overflow: 'hidden',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#FFF2DE',
    color: '#9A4C00',
    fontFamily: FONTS.title,
    fontSize: 8,
    letterSpacing: 0.9,
  },
  sourcePill: {
    flexShrink: 1,
    overflow: 'hidden',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#F5F0F5',
    color: '#786C7D',
    fontFamily: FONTS.subtitle,
    fontSize: 9,
  },
  itemName: {
    color: '#17001F',
    fontFamily: FONTS.title,
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: 0,
  },
  actionColumn: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    minWidth: 78,
  },
  price: {
    color: '#2D0438',
    fontFamily: FONTS.title,
    fontSize: 15,
    marginBottom: 8,
  },
  chevronWrap: {
    width: 28,
    height: 28,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2D0438',
  },
});
