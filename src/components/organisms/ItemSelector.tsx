import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, Modal, TouchableOpacity, FlatList, 
  TextInput, ActivityIndicator, Keyboard 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS } from '../../utils/theme';
import { useMasterItems } from '../../hooks/useCatalog';
import { MasterItem } from '../../types/database';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (item: MasterItem) => void;
  filterType?: 'labor' | 'material';
}

export default function ItemSelector({ visible, onClose, onSelect, filterType }: Props) {
  const { data: items, isLoading } = useMasterItems();
  const [search, setSearch] = useState('');
  
  // Ref para el input, para darle foco automático
  const inputRef = useRef<TextInput>(null);

  // --- 1. OPTIMIZACIÓN DE RENDIMIENTO ---
  // Solo recalculamos el filtro si cambia 'items' o 'search'
  const filteredItems = useMemo(() => {
    if (!items) return [];
    const term = search.toLowerCase();
    return items
      .filter(i => !filterType || i.type === filterType)
      .filter(i => i.name.toLowerCase().includes(term));
  }, [items, search, filterType]);

  // --- 2. UX: AUTO-FOCUS AL ABRIR ---
  useEffect(() => {
    if (visible) {
      setSearch(''); // Limpiar búsqueda anterior
      // Pequeño delay para esperar que termine la animación del modal
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [visible]);

  const handleCreateCustom = () => {
    if (!search.trim()) return;

    const customItem: MasterItem = {
        id: `custom-${Date.now()}`,
        name: search.trim(),
        type: filterType || 'material',       
        suggested_price: 0,
        source_ref: 'Manual'
    };

    onSelect(customItem);
    onClose(); // Cerrar modal automáticamente al seleccionar
  };

  const handleSelect = (item: MasterItem) => {
      onSelect(item);
      onClose(); // Cerrar modal automáticamente
  };

  const renderItem = ({ item }: { item: MasterItem }) => (
    <TouchableOpacity 
      style={styles.itemRow} 
      onPress={() => handleSelect(item)}
    >
      <View style={[styles.iconBox, item.type === 'labor' && { backgroundColor: '#E0F2FE' }]}>
        <Ionicons 
          name={item.type === 'labor' ? "hammer-outline" : "cube-outline"} 
          size={20} 
          color={item.type === 'labor' ? COLORS.secondary : COLORS.primary} 
        />
      </View>
      <View style={{flex: 1}}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemPrice}>
            {item.suggested_price > 0 
                ? `$${item.suggested_price.toLocaleString('es-AR')}` 
                : 'Precio a definir'}
        </Text>
      </View>
      <Ionicons name="add-circle" size={24} color={COLORS.success} />
    </TouchableOpacity>
  );

  return (
    <Modal 
      visible={visible} 
      animationType="slide" 
      presentationStyle="pageSheet"
      onRequestClose={onClose} // Importante para Android (botón atrás físico)
    >
      <View style={styles.container}>
        
        {/* Header Modal */}
        <View style={styles.header}>
          <Text style={styles.title}>Agregar Ítem</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>Cerrar</Text>
          </TouchableOpacity>
        </View>

        {/* Buscador */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#94A3B8" style={{marginRight: 8}} />
          <TextInput 
            ref={inputRef}
            style={styles.input} 
            placeholder="Buscar material o tarea..." 
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
             <TouchableOpacity onPress={() => setSearch('')}>
                 <Ionicons name="close-circle" size={18} color="#CBD5E1" />
             </TouchableOpacity>
          )}
        </View>

        {/* Lista */}
        {isLoading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{marginTop: 40}} />
        ) : (
          <FlatList
            data={filteredItems}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={{ padding: 16, paddingBottom: 50 }}
            keyboardShouldPersistTaps="handled"
            
            // --- 3. UX: OCULTAR TECLADO AL SCROLLEAR ---
            keyboardDismissMode="on-drag" 

            ListFooterComponent={
                search.length > 0 ? (
                    <TouchableOpacity style={styles.createBtn} onPress={handleCreateCustom}>
                        <View style={[styles.iconBox, { backgroundColor: COLORS.primary }]}>
                            <Ionicons name="add" size={24} color="#FFF" />
                        </View>
                        <View style={{flex: 1}}>
                            <Text style={styles.createTitle}>Crear "{search}"</Text>
                            <Text style={styles.createSub}>Agregar manual (precio $0)</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={COLORS.primary} />
                    </TouchableOpacity>
                ) : null
            }

            ListEmptyComponent={
                search.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="search-outline" size={48} color="#E2E8F0" />
                        <Text style={styles.emptyText}>
                            Busca materiales o mano de obra{"\n"}para tu presupuesto.
                        </Text>
                    </View>
                ) : null
            }
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  title: { fontSize: 17, fontWeight: '700', color: '#0F172A' },
  closeBtn: { padding: 4 },
  closeText: { color: COLORS.primary, fontWeight: '600', fontSize: 16 },
  
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', margin: 16, paddingHorizontal: 12, height: 46, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 3, elevation: 1 },
  input: { flex: 1, height: '100%', fontSize: 16, color: '#0F172A' },

  itemRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 14, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#F1F5F9' },
  iconBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#FFF7ED', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  itemName: { fontSize: 15, fontWeight: '600', color: '#1E293B', marginBottom: 2 },
  itemPrice: { fontSize: 13, color: '#64748B' },

  createBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F9FF', padding: 12, borderRadius: 12, marginTop: 10, borderWidth: 1, borderColor: '#38BDF8', borderStyle: 'dashed' },
  createTitle: { fontSize: 15, fontWeight: '700', color: '#0369A1' },
  createSub: { fontSize: 12, color: '#0EA5E9' },

  emptyState: { alignItems: 'center', marginTop: 60, paddingHorizontal: 40 },
  emptyText: { textAlign: 'center', color: '#94A3B8', marginTop: 16, lineHeight: 22 }
});
