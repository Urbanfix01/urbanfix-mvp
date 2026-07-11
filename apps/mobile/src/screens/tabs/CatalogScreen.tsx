import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { CatalogItem } from '../../components/molecules/CatalogItem';
import { EmptyState } from '../../components/molecules/EmptyState';
import { ScreenHeader } from '../../components/molecules/ScreenHeader';
import { useMasterItems } from '../../hooks/useCatalog';
import { COLORS, FONTS } from '../../utils/theme';

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
  return CATEGORY_LABELS[value] || value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
};

export default function CatalogScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { data: items, isLoading, error } = useMasterItems();
  const [search, setSearch] = useState('');
  const initialTab = (route.params as { initialTab?: FilterType } | undefined)?.initialTab;
  const [activeTab, setActiveTab] = useState<FilterType>(
    initialTab === 'labor' || initialTab === 'material' || initialTab === 'all' ? initialTab : 'all'
  );
  const [activeCategory, setActiveCategory] = useState<string>('all');

  useEffect(() => {
    if (initialTab === 'labor' || initialTab === 'material' || initialTab === 'all') {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const categories = useMemo(() => {
    const values = new Set<string>();
    (items || []).forEach((item) => {
      values.add(item.source_ref ? item.source_ref : 'general');
    });

    const sorted = Array.from(values).sort((a, b) =>
      formatCategoryLabel(a).localeCompare(formatCategoryLabel(b))
    );

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

  const activeCategoryLabel = activeCategory === 'all' ? 'Todas las categorias' : formatCategoryLabel(activeCategory);

  const FilterTab = ({ label, type, count }: { label: string; type: FilterType; count: number }) => {
    const isActive = activeTab === type;

    return (
      <TouchableOpacity style={[styles.tab, isActive && styles.tabActive]} onPress={() => setActiveTab(type)}>
        <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{label}</Text>
        <Text style={[styles.tabCountText, isActive && styles.tabCountTextActive]}>{count}</Text>
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

      <ScreenHeader title="CATALOGO MAESTRO" subtitle={`${filteredItems.length} referencias disponibles`} showBack />

      <View style={styles.content}>
        <View style={styles.searchWrapper}>
          <Ionicons name="search" size={18} color="#FF8F1F" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar material o servicio"
            placeholderTextColor="#A6A0AE"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} style={styles.clearSearchBtn}>
              <Ionicons name="close" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.filtersCard}>
          <View style={styles.tabsContainer}>
            <FilterTab label="Todos" type="all" count={typeCounts.all} />
            <FilterTab label="Mano de obra" type="labor" count={typeCounts.labor} />
            <FilterTab label="Materiales" type="material" count={typeCounts.material} />
          </View>

          <View style={styles.categorySection}>
            <View style={styles.categoryHeader}>
              <Text style={styles.categoryLabel}>Categorias</Text>
              <Text style={styles.categoryHint} numberOfLines={1}>
                {activeCategoryLabel}
              </Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
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
            <Text style={styles.centerHint}>Cargando catalogo...</Text>
          </View>
        ) : error ? (
          <EmptyState icon="cloud-offline-outline" title="Sin conexion" message="No pudimos cargar los precios." />
        ) : (
          <FlatList
            data={filteredItems}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <CatalogItem
                item={item}
                onPress={(selectedItem) => {
                  // @ts-ignore
                  navigation.navigate('ItemDetail', { item: selectedItem });
                }}
              />
            )}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            initialNumToRender={10}
            ListEmptyComponent={
              <EmptyState icon="search-outline" title="Sin resultados" message={`No encontramos nada para "${search}".`} />
            }
          />
        )}
      </View>
    </View>
  );
}

const panelShadow = Platform.select({
  web: {
    boxShadow: '0 14px 28px rgba(20, 0, 30, 0.18)',
  },
  default: {
    shadowColor: '#17001F',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 5,
  },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F2EC' },
  content: { flex: 1, paddingHorizontal: 14, paddingTop: 12 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
  centerHint: { fontFamily: FONTS.body, color: '#6B6170', fontSize: 12 },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 14,
    height: 52,
    borderWidth: 1,
    borderColor: '#E9DCD1',
    marginBottom: 10,
    ...panelShadow,
  },
  searchInput: {
    flex: 1,
    fontFamily: FONTS.body,
    fontSize: 14,
    color: '#17001F',
    height: '100%',
  },
  clearSearchBtn: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: '#2D0438',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filtersCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E9DCD1',
    marginBottom: 12,
    ...panelShadow,
  },
  tabsContainer: {
    flexDirection: 'row',
    gap: 6,
    padding: 4,
    borderRadius: 16,
    backgroundColor: '#F3ECE7',
  },
  tab: {
    flex: 1,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tabActive: {
    backgroundColor: '#2D0438',
    borderColor: '#2D0438',
  },
  tabText: {
    color: '#6B6170',
    fontFamily: FONTS.subtitle,
    fontSize: 10,
    textAlign: 'center',
  },
  tabTextActive: { color: '#FFFFFF', fontFamily: FONTS.title },
  tabCountText: {
    color: '#9A8F99',
    fontFamily: FONTS.title,
    fontSize: 11,
    marginTop: 2,
  },
  tabCountTextActive: { color: '#FFB15B' },
  categorySection: { marginTop: 12 },
  categoryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  categoryLabel: {
    color: '#9A6C43',
    fontFamily: FONTS.subtitle,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  categoryHint: {
    flex: 1,
    color: '#7A7080',
    fontFamily: FONTS.body,
    fontSize: 11,
    textAlign: 'right',
  },
  categoryRow: { gap: 8, paddingVertical: 8, paddingRight: 14 },
  categoryChip: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E4D7CD',
    backgroundColor: '#FFFFFF',
  },
  categoryChipActive: {
    backgroundColor: '#FF8F1F',
    borderColor: '#FF8F1F',
  },
  categoryChipText: { color: '#5F5362', fontFamily: FONTS.subtitle, fontSize: 11 },
  categoryChipTextActive: { color: '#17001F', fontFamily: FONTS.title },
  listContent: { paddingBottom: 24 },
});
