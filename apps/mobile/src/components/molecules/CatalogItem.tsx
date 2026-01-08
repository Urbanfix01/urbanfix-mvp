import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MasterItem } from '../../types/database';
import { COLORS, FONTS, SPACING } from '../../utils/theme';

interface CatalogItemProps {
  item: MasterItem;
  onPress: (item: MasterItem) => void; // Cambiamos onAdd por onPress
}

export const CatalogItem = ({ item, onPress }: CatalogItemProps) => {
  return (
    <TouchableOpacity 
      style={styles.card} 
      onPress={() => onPress(item)} // Hacemos clickeable toda la tarjeta
      activeOpacity={0.7}
    >
      {/* Icono */}
      <View style={styles.iconContainer}>
         <Ionicons 
            name={item.type === 'labor' ? "hand-left-outline" : "cube-outline"} 
            size={24} 
            color={COLORS.secondary} 
         />
      </View>

      {/* Datos */}
      <View style={styles.cardContent}>
        <Text style={styles.itemCategory}>{item.type.toUpperCase()}</Text>
        <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
        <Text style={styles.itemSource}>{item.source_ref || 'Precio Oficial'}</Text>
      </View>

      {/* Precio y Flecha (Indicador de navegación) */}
      <View style={styles.actionColumn}>
        <Text style={styles.price}>
          ${item.suggested_price?.toLocaleString('es-AR') || '0'}
        </Text>
        <Ionicons name="chevron-forward" size={20} color={COLORS.textLight} style={{marginTop: 8}} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: SPACING.cardRadius,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: "#2C3E50",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#F4F6F8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardContent: {
    flex: 1,
    marginRight: 8,
  },
  itemCategory: {
    fontFamily: FONTS.subtitle,
    fontSize: 10,
    color: '#95A5A6',
    fontWeight: 'bold',
    letterSpacing: 0.5,
    marginBottom: 2,
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
    color: '#B0B0B0',
    marginTop: 4,
  },
  actionColumn: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  price: {
    fontFamily: FONTS.title,
    fontSize: 16,
    color: COLORS.primary,
  },
});