import React, { useMemo, useState } from 'react';
// 👇 AQUÍ FALTABA 'Text'. YA LO AGREGUÉ.
import { View, Text, FlatList, TextInput, StyleSheet, ActivityIndicator, TouchableOpacity, StatusBar, ScrollView, Platform } from 'react-native';
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

  const baseFilteredItems = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return (items || []).filter((item) => {
      const matchesSearch = !normalizedSearch || item.name.toLowerCase().includes(normalizedSearch);
      const categoryValue = item.source_ref ? item.source_ref : 'general';
      const matchesCategory = activeCategory === 'all' || categoryValue === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [items, search, activeCategory]);

  const typeCounts = useMemo(() => {
    let labor = 0;
    let material = 0;
    baseFilteredItems.forEach((item) => {
      if (item.type === 'labor') labor += 1;
      if (item.type === 'material' || item.type === 'consumable') material += 1;
    });
    return {
      all: baseFilteredItems.length,
      labor,
      material,
    };
  }, [baseFilteredItems]);

  const filteredItems = useMemo(() => {
    if (activeTab === 'labor') return baseFilteredItems.filter((item) => item.type === 'labor');
    if (activeTab === 'material') {
      return baseFilteredItems.filter((item) => item.type === 'material' || item.type === 'consumable');
    }
    return baseFilteredItems;
  }, [baseFilteredItems, activeTab]);

  const FilterTab = ({ label, type, count }: { label: string; type: FilterType; count: number }) => {
    const isActive = activeTab === type;
    return (
      <TouchableOpacity 
        style={[styles.tab, isActive && styles.tabActive]} 
        onPress={() => setActiveTab(type)}
      >
        <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{label}</Text>
        <View style={[styles.tabCount, isActive && styles.tabCountActive]}>
          <Text style={[styles.tabCountText, isActive && styles.tabCountTextActive]}>{count}</Text>
        </View>
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
        title="CATÁLOGO MAESTRO" 
        subtitle={`${filteredItems.length} items encontrados`} 
        centerTitle
      />

      <View style={styles.content}>
        <View style={styles.searchWrapper}>
          <View style={styles.searchIconWrap}>
            <Ionicons name="search" size={18} color="#7F8C8D" />
          </View>
          <TextInput 
            style={styles.searchInput}
            placeholder="Buscar material o servicio..."
            placeholderTextColor="#95A5A6"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
             <TouchableOpacity onPress={() => setSearch('')} style={styles.clearSearchBtn}>
               <Ionicons name="close" size={16} color="#64748B" />
             </TouchableOpacity>
          )}
        </View>

        <View style={styles.filtersCard}>
          <View style={styles.tabsContainer}>
            <FilterTab label="Todos" type="all" count={typeCounts.all} />
            <FilterTab label="Mano de Obra" type="labor" count={typeCounts.labor} />
            <FilterTab label="Materiales" type="material" count={typeCounts.material} />
          </View>

          <View style={styles.categorySection}>
            <View style={styles.categoryHeader}>
              <Text style={styles.categoryLabel}>Categorías</Text>
              <Text style={styles.categoryHint}>
                {activeCategory === 'all' ? 'Todas' : formatCategoryLabel(activeCategory)}
              </Text>
            </View>
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
  content: { flex: 1, paddingHorizontal: 16, paddingTop: 12 }, 
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  searchWrapper: Platform.select({
    web: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#FFF',
      borderRadius: 16,
      paddingHorizontal: 12,
      height: 54,
      borderWidth: 1,
      borderColor: '#ECE7DD',
      boxShadow: '0 10px 18px rgba(15, 23, 42, 0.08)',
      marginBottom: 14,
    },
    default: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#FFF',
      borderRadius: 16,
      paddingHorizontal: 12,
      height: 54,
      borderWidth: 1,
      borderColor: '#ECE7DD',
      shadowColor: '#1F2937',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 4,
      marginBottom: 14,
    },
  }),
  searchIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 999,
    backgroundColor: '#F5F1E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  searchInput: { flex: 1, fontFamily: FONTS.body, fontSize: 15, color: COLORS.text, height: '100%' },
  clearSearchBtn: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  filtersCard: Platform.select({
    web: {
      backgroundColor: '#FFF',
      borderRadius: 18,
      padding: 12,
      borderWidth: 1,
      borderColor: '#EFE6D8',
      boxShadow: '0 8px 16px rgba(15, 23, 42, 0.06)',
      marginBottom: 16,
    },
    default: {
      backgroundColor: '#FFF',
      borderRadius: 18,
      padding: 12,
      borderWidth: 1,
      borderColor: '#EFE6D8',
      shadowColor: '#1F2937',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06,
      shadowRadius: 10,
      elevation: 3,
      marginBottom: 16,
    },
  }),
  tabsContainer: {
    flexDirection: 'row',
    gap: 8,
    padding: 4,
    borderRadius: 999,
    backgroundColor: '#F4EFE6',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tabActive: { backgroundColor: COLORS.secondary, borderColor: COLORS.secondary },
  tabText: { color: '#6B7280', fontFamily: FONTS.subtitle, fontSize: 11, letterSpacing: 0.6 },
  tabTextActive: { color: '#FFF', fontFamily: FONTS.title },
  tabCount: {
    minWidth: 22,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabCountActive: { backgroundColor: 'rgba(255,255,255,0.2)' },
  tabCountText: { fontSize: 10, fontFamily: FONTS.subtitle, color: '#64748B' },
  tabCountTextActive: { color: '#FFF' },
  categorySection: { marginTop: 12 },
  categoryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  categoryLabel: { fontSize: 11, color: '#9A8F7B', fontFamily: FONTS.subtitle, letterSpacing: 1.2 },
  categoryHint: { fontSize: 10, color: '#94A3B8', fontFamily: FONTS.body },
  categoryRow: { gap: 8, paddingVertical: 6, paddingRight: 16 },
  categoryChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E7E2D7',
    backgroundColor: '#FFF',
  },
  categoryChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  categoryChipText: { fontSize: 11, color: '#5B6B75', fontFamily: FONTS.body },
  categoryChipTextActive: { color: '#FFF', fontFamily: FONTS.subtitle },
});
