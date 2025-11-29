import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// NOTA EL CAMBIO AQUÍ: Usamos "../../" para subir dos niveles hasta 'src'
import { COLORS, FONTS, SPACING } from '../../utils/theme';
import { useBlueprints } from '../../hooks/useBlueprints';
import { ServiceBlueprint } from '../../types/database';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (blueprint: ServiceBlueprint) => void;
}

export default function ServiceSelector({ visible, onClose, onSelect }: Props) {
  // Usamos el Hook que creamos antes para traer datos reales
  const { data: blueprints, isLoading, error } = useBlueprints();

  const renderItem = ({ item }: { item: ServiceBlueprint }) => (
    <TouchableOpacity 
      style={styles.itemCard} 
      onPress={() => onSelect(item)}
      activeOpacity={0.7}
    >
      <View style={styles.iconBox}>
        <Ionicons name="construct" size={24} color={COLORS.primary} />
      </View>
      <View style={{flex: 1}}>
        <Text style={styles.itemTitle}>{item.name}</Text>
        <Text style={styles.itemSub}>
          {item.blueprint_components?.length || 0} items incluidos
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#BDC3C7" />
    </TouchableOpacity>
  );

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Nuevo Presupuesto</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>
          <Text style={styles.subtitle}>¿Qué trabajo vas a realizar hoy?</Text>

          {/* Lista de Servicios */}
          {isLoading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={{marginTop: 10, fontFamily: FONTS.body}}>Cargando plantillas...</Text>
            </View>
          ) : error ? (
            <View style={styles.center}>
              <Ionicons name="alert-circle-outline" size={40} color={COLORS.textLight} />
              <Text style={{color: COLORS.textLight, marginTop:10}}>No se pudieron cargar los servicios</Text>
            </View>
          ) : (
            <FlatList
              data={blueprints}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              contentContainerStyle={{ paddingBottom: 40 }}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.center}>
                  <Text style={{textAlign: 'center', color: '#999', fontFamily: FONTS.body}}>
                    No hay plantillas configuradas en la base de datos.
                  </Text>
                </View>
              }
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)', // Fondo oscuro
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '75%', // Ocupa 3/4 de pantalla
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontFamily: FONTS.title,
    color: COLORS.text,
  },
  closeBtn: {
    padding: 4,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: FONTS.body,
    color: COLORS.textLight,
    marginBottom: 24,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  // Card Estilo
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFF',
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F0F2F5',
    // Sombra suave
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  iconBox: {
    width: 44,
    height: 44,
    backgroundColor: '#FFF5E6', // Naranja muy suave
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  itemTitle: {
    fontSize: 16,
    fontFamily: FONTS.subtitle,
    color: COLORS.text,
    marginBottom: 2,
  },
  itemSub: {
    fontSize: 12,
    fontFamily: FONTS.body,
    color: COLORS.textLight,
  }
});