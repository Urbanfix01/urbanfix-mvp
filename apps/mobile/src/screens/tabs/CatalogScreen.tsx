import React, { useMemo, useState } from 'react';
// 👇 AQUÍ FALTABA 'Text'. YA LO AGREGUÉ.
import { View, Text, FlatList, TextInput, StyleSheet, ActivityIndicator, TouchableOpacity, StatusBar, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons'; 
import { useNavigation } from '@react-navigation/native'; 
import { useMasterItems } from '../../hooks/useCatalog'; 
import { COLORS, FONTS } from '../../utils/theme'; 
import { CatalogItem } from '../../components/molecules/CatalogItem'; 
import { ScreenHeader } from '../../components/molecules/ScreenHeader'; 
import { EmptyState } from '../../components/molecules/EmptyState';     

type FilterType = 'all' | 'labor' | 'material';

const CATEGORY_LABELS: Record<string, string> = {
  electricidad: 'Electricidad',
  plomeria: 'Plomeria',
  albanileria: 'Albanileria',
  gas: 'Gas',
  agua_cloaca: 'Agua y Cloaca',
  calefaccion: 'Calefaccion',
  jornales: 'Jornales y Visitas',
};

const formatCategoryLabel = (value: string) => {
  if (value === 'general') return 'General';
  return CATEGORY_LABELS[value] || value.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
};

export default function CatalogScreen() {
  const navigation = useNavigation(); 
  const { data: items, isLoading, error } = useMasterItems();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<FilterType>('all');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const categories = useMemo(() => {
    const values = new Set<string>();
    (items || []).forEach((item) => {
      const category = item.source_ref ? item.source_ref : 'general';
      values.add(category);
    });
    const sorted = Array.from(values).sort((a, b) => formatCategoryLabel(a).localeCompare(formatCategoryLabel(b)));
    return ['all', ...sorted];
  }, [items]);

  const filteredItems = (items || []).filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const categoryValue = item.source_ref ? item.source_ref : 'general';
    const matchesCategory = activeCategory === 'all' || categoryValue === activeCategory;
    let matchesType = true;
    
    if (activeTab === 'labor') matchesType = item.type === 'labor';
    else if (activeTab === 'material') matchesType = item.type === 'material' || item.type === 'consumable';

    return matchesSearch && matchesType && matchesCategory;
  });

  const FilterTab = ({ label, type }: { label: string, type: FilterType }) => {
    const isActive = activeTab === type;
    return (
      <TouchableOpacity 
        style={[styles.tab, isActive && styles.tabActive]} 
        onPress={() => setActiveTab(type)}
      >
        <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{label}</Text>
      </TouchableOpacity>
    );
  };

  const CategoryChip = ({ label, value }: { label: string; value: string }) => {
    const isActive = activeCategory === value;
    return (
      <TouchableOpacity
        style={[styles.categoryChip, isActive && styles.categoryChipActive]}
        onPress={() => setActiveCategory(value)}
      >
        <Text style={[styles.categoryChipText, isActive && styles.categoryChipTextActive]}>{label}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.secondary} />
      
      <ScreenHeader 
        title="Catálogo Maestro" 
        subtitle={`${filteredItems.length} items encontrados`} 
      />

      <View style={styles.content}>
        <View style={styles.searchWrapper}>
          <Ionicons name="search" size={20} color="#7F8C8D" style={{marginRight: 8}} />
          <TextInput 
            style={styles.searchInput}
            placeholder="Buscar material o servicio..."
            placeholderTextColor="#95A5A6"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
             <TouchableOpacity onPress={() => setSearch('')}>
               <Ionicons name="close-circle" size={20} color="#95A5A6" />
             </TouchableOpacity>
          )}
        </View>

        <View style={styles.tabsContainer}>
          <FilterTab label="Todos" type="all" />
          <FilterTab label="Mano de Obra" type="labor" />
          <FilterTab label="Materiales" type="material" />
        </View>

        <View style={styles.categorySection}>
          <Text style={styles.categoryLabel}>Categorias</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryRow}
          >
            {categories.map((value) => (
              <CategoryChip
                key={value}
                value={value}
                label={value === 'all' ? 'Todas' : formatCategoryLabel(value)}
              />
            ))}
          </ScrollView>
        </View>

        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : error ? (
          <EmptyState 
            icon="cloud-offline-outline" 
            title="Sin Conexión" 
            message="No pudimos cargar los precios." 
          />
        ) : (
          <FlatList
            data={filteredItems}
            keyExtractor={(item) => item.id}
            
            renderItem={({ item }) => (
              <CatalogItem 
                item={item} 
                onPress={(i) => {
                  // @ts-ignore
                  navigation.navigate('ItemDetail', { item: i }); 
                }} 
              />
            )}

            contentContainerStyle={{ paddingBottom: 20 }}
            showsVerticalScrollIndicator={false}
            initialNumToRender={10}
            ListEmptyComponent={
              <EmptyState 
                icon="search-outline" 
                title="Sin resultados" 
                message={`No encontramos nada para "${search}".`} 
              />
            }
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { flex: 1, paddingHorizontal: 16, paddingTop: 16 }, 
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  searchWrapper: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF',
    borderRadius: 12, paddingHorizontal: 12, height: 48, elevation: 2, marginBottom: 16
  },
  searchInput: { flex: 1, fontFamily: FONTS.body, fontSize: 16, color: COLORS.text, height: '100%' },
  tabsContainer: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  tab: { 
    paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, 
    backgroundColor: '#E0E0E0', borderWidth: 1, borderColor: 'transparent' 
  },
  tabActive: { backgroundColor: COLORS.primary },
  tabText: { color: COLORS.textLight, fontFamily: FONTS.subtitle, fontSize: 12 },
  tabTextActive: { color: '#FFF', fontFamily: FONTS.title },
  categorySection: { marginBottom: 16 },
  categoryLabel: { fontSize: 12, color: COLORS.textLight, marginBottom: 8, fontFamily: FONTS.subtitle },
  categoryRow: { gap: 8 },
  categoryChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFF',
  },
  categoryChipActive: { backgroundColor: COLORS.secondary, borderColor: COLORS.secondary },
  categoryChipText: { fontSize: 12, color: '#475569', fontFamily: FONTS.body },
  categoryChipTextActive: { color: '#FFF', fontFamily: FONTS.subtitle },
});
