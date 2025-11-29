import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, FlatList, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS } from '../../utils/theme';
import { useMasterItems } from '../../hooks/useCatalog';
import { MasterItem } from '../../types/database';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (item: MasterItem) => void;
}

export default function ItemSelector({ visible, onClose, onSelect }: Props) {
  // Traemos los datos reales del catálogo
  const { data: items, isLoading } = useMasterItems();
  const [search, setSearch] = useState('');

  // Filtramos en tiempo real según lo que escribe el usuario
  const filteredItems = (items || []).filter(i => 
    i.name.toLowerCase().includes(search.toLowerCase())
  );

  const renderItem = ({ item }: { item: MasterItem }) => (
    <TouchableOpacity 
      style={styles.itemRow} 
      onPress={() => {
        onSelect(item); // Devolvemos el ítem seleccionado al padre
        setSearch('');  // Limpiamos el buscador
      }}
    >
      <View style={styles.iconBox}>
        <Ionicons 
          name={item.type === 'labor' ? "hand-left-outline" : "cube-outline"} 
          size={20} color={COLORS.primary} 
        />
      </View>
      <View style={{flex: 1}}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemPrice}>${item.suggested_price.toLocaleString('es-AR')}</Text>
      </View>
      <Ionicons name="add-circle" size={24} color={COLORS.success} />
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        
        {/* Header del Modal */}
        <View style={styles.header}>
          <Text style={styles.title}>Agregar Ítem</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>Cerrar</Text>
          </TouchableOpacity>
        </View>

        {/* Barra de Búsqueda */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#999" style={{marginRight: 8}} />
          <TextInput 
            style={styles.input} 
            placeholder="Buscar material o mano de obra..." 
            value={search}
            onChangeText={setSearch}
            autoFocus={false}
          />
        </View>

        {/* Lista de Resultados */}
        {isLoading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{marginTop: 40}} />
        ) : (
          <FlatList
            data={filteredItems}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={{ padding: 16 }}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
                <Text style={{textAlign: 'center', color: '#999', marginTop: 20}}>
                    No se encontraron resultados para "{search}"
                </Text>
            }
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F9F9' },
  
  header: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EEE'
  },
  title: { fontFamily: FONTS.title, fontSize: 18, color: COLORS.text },
  closeBtn: { padding: 8 },
  closeText: { color: COLORS.primary, fontFamily: FONTS.subtitle, fontSize: 16 },
  
  searchContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF',
    margin: 16, paddingHorizontal: 12, height: 44, borderRadius: 10,
    borderWidth: 1, borderColor: '#DDD'
  },
  input: { flex: 1, height: '100%', fontFamily: FONTS.body, fontSize: 16 },

  itemRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF',
    padding: 12, borderRadius: 12, marginBottom: 8,
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 2, elevation: 1
  },
  iconBox: { 
    width: 36, height: 36, borderRadius: 8, backgroundColor: '#FFF5E0', 
    justifyContent: 'center', alignItems: 'center', marginRight: 12 
  },
  itemName: { fontFamily: FONTS.subtitle, fontSize: 14, color: COLORS.text },
  itemPrice: { fontFamily: FONTS.body, fontSize: 12, color: COLORS.textLight, marginTop: 2 },
});