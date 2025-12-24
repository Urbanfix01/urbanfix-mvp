import React, { useMemo, useState } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, 
  StatusBar, ActivityIndicator, Alert, Share, Platform 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { COLORS, FONTS } from '../../utils/theme';
import ServiceSelector from '../../components/organisms/ServiceSelector';
import { ServiceBlueprint } from '../../types/database';
import { supabase } from '../../lib/supabase'; 

const WEB_BASE_URL = 'https://urbanfix-web.vercel.app/p'; // Tu URL

type QuoteListItem = {
  id: string;
  client_name?: string | null;
  client_address?: string | null;
  address?: string | null;
  location_address?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
  total_amount?: number | null;
  status?: string | null;
  created_at: string;
};

async function getQuotes(): Promise<QuoteListItem[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('quotes')
    .select('*')
    .eq('user_id', user.id)
    .neq('status', 'completed')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export default function JobsScreen() {
  const navigation = useNavigation();
  const [selectorVisible, setSelectorVisible] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const queryClient = useQueryClient();
  const { data: jobs = [], isLoading, error, refetch, isFetching } = useQuery<QuoteListItem[]>({
    queryKey: ['quotes-list'],
    queryFn: getQuotes,
    staleTime: 60000,
  });

  // --- FIX 1: ESTADISTICAS ROBUSTAS (Suma todo lo que sea similar) ---
  const stats = useMemo(() => {
    const drafts = jobs.filter(j => {
      const status = (j.status || '').toLowerCase();
      return ['pending', 'draft', 'pendiente', 'presented', 'accepted'].includes(status);
    }).length;

    const approved = jobs.filter(j => {
      const status = (j.status || '').toLowerCase();
      return ['approved', 'aprobado'].includes(status);
    }).length;

    const totalMoney = jobs.reduce((acc, j) => acc + (j.total_amount || 0), 0);
    
    return { drafts, approved, totalMoney };
  }, [jobs]);

  // --- ACCIONES ---
  const handleCreateJob = () => setSelectorVisible(true);

  const handleSelectService = (blueprint: ServiceBlueprint) => {
    setSelectorVisible(false);
    // @ts-ignore
    navigation.navigate('JobConfig', { blueprint });
  };

  const handleShareJob = async (jobId: string, total?: number | null) => {
    const link = `${WEB_BASE_URL}/${jobId}`;
    const safeTotal = (total || 0).toLocaleString('es-AR');
    const message = `Hola! Te paso el presupuesto por $${safeTotal}: ${link}`;
    try {
      await Share.share({ message, title: 'Presupuesto UrbanFix', url: link });
    } catch (err) {
      Alert.alert("Error", "No se pudo compartir.");
    }
  };

  // --- FIX 2: NORMALIZADOR VISUAL DE ESTADOS ---
  const getStatusConfig = (status?: string | null) => {
    const normalized = status?.toLowerCase().trim() || '';

    if (['presented','accepted'].includes(normalized)) {
        return { label: 'PRESENTADO', color: '#3B82F6', bg: '#DBEAFE' }; // Azul
    }

    if (['approved', 'aprobado'].includes(normalized)) {
        return { label: 'APROBADO', color: '#10B981', bg: '#D1FAE5' }; // Emerald
    }

    if (['pending', 'draft', 'pendiente'].includes(normalized)) {
        return { label: 'PENDIENTE', color: '#F59E0B', bg: '#FFF7ED' }; // Amber
    }

    return { label: normalized.toUpperCase() || 'N/A', color: '#6B7280', bg: '#E5E7EB' };
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  // --- RENDER ITEM ---
  const renderItem = ({ item }: { item: QuoteListItem }) => {
    const status = getStatusConfig(item.status);
    const isSelected = selectedIds.includes(item.id);
    
    return (
      <TouchableOpacity 
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => {
          if (selectionMode) {
            toggleSelect(item.id);
          } else {
            // @ts-ignore
            navigation.navigate('JobDetail', { 
              jobId: item.id,
              quote: item,
              client_address: item.client_address || item.address || item.location_address,
              location_lat: item.location_lat,
              location_lng: item.location_lng,
            });
          }
        }}
        onLongPress={() => {
          setSelectionMode(true);
          toggleSelect(item.id);
        }}
      >
        <View style={[styles.iconBar, { backgroundColor: status.color }]} />
        
        <View style={styles.cardContent}>
            {selectionMode && (
              <Ionicons 
                name={isSelected ? "checkbox" : "square-outline"} 
                size={22} 
                color={isSelected ? COLORS.primary : '#CBD5E1'} 
                style={{ marginRight: 8 }}
              />
            )}
            <View style={styles.rowBetween}>
                <Text style={styles.clientName} numberOfLines={1}>
                    {item.client_name || `Presupuesto #${item.id.slice(0,4).toUpperCase()}`}
                </Text>
                <Text style={styles.amountText}>
                    ${(item.total_amount || 0).toLocaleString('es-AR')}
                </Text>
            </View>

            <View style={styles.rowBetween}>
                <Text style={styles.jobDate}>
                    {new Date(item.created_at).toLocaleDateString()}
                </Text>
                
                <View style={[styles.badge, { backgroundColor: status.bg }]}>
                    <Text style={[styles.badgeText, { color: status.color }]}>{status.label}</Text>
                </View>
            </View>
        </View>

        {!selectionMode && (
          <TouchableOpacity 
              style={styles.shareBtn}
              onPress={() => handleShareJob(item.id, item.total_amount)}
          >
               <Ionicons name="paper-plane-outline" size={20} color={COLORS.textLight} />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.secondary} />
      
      {/* HEADER DASHBOARD */}
      <View style={styles.header}>
        <SafeAreaView edges={['top']}>
           <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>Resumen de Solicitudes</Text>
              
              <View style={styles.statsRow}>
                  <View style={[styles.statCard, { borderLeftColor: '#F59E0B' }]}>
                      <Text style={[styles.statNumber, { color: '#F59E0B' }]}>{stats.drafts}</Text>
                      <Text style={styles.statLabel}>PENDIENTES</Text>
                  </View>

                  <View style={[styles.statCard, { borderLeftColor: '#10B981' }]}>
                      <Text style={[styles.statNumber, { color: '#10B981' }]}>{stats.approved}</Text>
                      <Text style={styles.statLabel}>APROBADOS</Text>
                  </View>

                  <View style={[styles.statCard, { borderLeftColor: '#374151' }]}>
                      <Text style={[styles.statNumber, { color: '#374151', fontSize: 18 }]}>
                        ${(stats.totalMoney/1000).toFixed(0)}k
                      </Text>
                      <Text style={styles.statLabel}>EN JUEGO</Text>
                  </View>
              </View>

           </View>
        </SafeAreaView>
      </View>

      {/* LISTA */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color={COLORS.danger} />
          <Text style={styles.emptyText}>No pudimos cargar tus trabajos.</Text>
          <TouchableOpacity style={styles.selectBtn} onPress={() => refetch()}>
            <Text style={styles.selectBtnText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlashList
            data={jobs}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            extraData={{ selectionMode, selectedIds }}
            contentContainerStyle={styles.listContent}
            estimatedItemSize={150}
            onRefresh={refetch}
            refreshing={isFetching && !isLoading}
            ListHeaderComponent={
                <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:12}}>
                  <Text style={styles.sectionTitle}>ULTIMOS MOVIMIENTOS</Text>
                  <View style={{flexDirection:'row', gap:10}}>
                    {selectionMode && (
                      <TouchableOpacity 
                        onPress={() => {
                          setSelectionMode(false);
                          setSelectedIds([]);
                        }} 
                        style={[styles.selectBtn, {backgroundColor:'#E5E7EB'}]}
                      >
                        <Text style={[styles.selectBtnText, {color:'#0F172A'}]}>Cancelar</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity 
                      onPress={() => {
                        if (selectionMode && selectedIds.length === 0) {
                          setSelectionMode(false);
                          return;
                        }
                        setSelectionMode(prev => !prev);
                        if (!selectionMode) setSelectedIds([]);
                      }} 
                      style={styles.selectBtn}
                    >
                      <Text style={styles.selectBtnText}>{selectionMode ? 'Listo' : 'Seleccionar'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
            }
            ListEmptyComponent={
                <View style={styles.center}>
                   <Ionicons name="file-tray-outline" size={60} color="#E5E7EB" />
                   <Text style={styles.emptyText}>
                      No tienes trabajos activos. {"\n"}Toca (+) para empezar.
                   </Text>
                </View>
            }
        />
      )}

      {/* FAB (Boton Flotante) */}
      <TouchableOpacity style={styles.fab} onPress={handleCreateJob}>
        <Ionicons name="add" size={32} color="#FFF" />
      </TouchableOpacity>

      {selectionMode && selectedIds.length > 0 && (
        <TouchableOpacity 
          style={styles.bulkDeleteBar} 
          onPress={async () => {
            try {
              const { error: deleteError } = await supabase.from('quotes').delete().in('id', selectedIds);
              if (deleteError) throw deleteError;
              await queryClient.invalidateQueries({ queryKey: ['quotes-list'] });
              setSelectedIds([]);
              setSelectionMode(false);
            } catch (err) {
              Alert.alert("Error", "No se pudieron borrar los presupuestos seleccionados.");
            }
          }}
        >
          <Ionicons name="trash" size={22} color="#FFF" />
          <Text style={styles.bulkDeleteText}>Borrar {selectedIds.length} seleccionados</Text>
        </TouchableOpacity>
      )}

      <ServiceSelector 
        visible={selectorVisible}
        onClose={() => setSelectorVisible(false)}
        onSelect={handleSelectService}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 50 },
  
  // Header
  header: Platform.select({
    web: {
      backgroundColor: COLORS.secondary,
      paddingBottom: 30,
      borderBottomLeftRadius: 24,
      borderBottomRightRadius: 24,
      zIndex: 10,
      boxShadow: '0 6px 12px rgba(0,0,0,0.2)',
    },
    default: {
      backgroundColor: COLORS.secondary,
      paddingBottom: 30,
      borderBottomLeftRadius: 24,
      borderBottomRightRadius: 24,
      shadowColor: "#000", shadowOffset: {width:0, height:4}, shadowOpacity:0.2, elevation: 8,
      zIndex: 10
    }
  }),
  headerContent: { paddingHorizontal: 20, paddingTop: 10 },
  headerTitle: { fontSize: 22, fontFamily: FONTS.title, color: '#FFF', marginBottom: 20, textAlign: 'center' },
  
  // Stats Cards
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  statCard: Platform.select({
    web: {
      flex: 1,
      backgroundColor: '#FFF',
      borderRadius: 8,
      paddingVertical: 15,
      paddingHorizontal: 5,
      alignItems: 'center',
      justifyContent: 'center',
      borderLeftWidth: 4,
      boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
    },
    default: {
      flex: 1,
      backgroundColor: '#FFF',
      borderRadius: 8,
      paddingVertical: 15,
      paddingHorizontal: 5,
      alignItems: 'center',
      justifyContent: 'center',
      borderLeftWidth: 4, 
      shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, elevation: 3,
    }
  }),
  statNumber: { fontSize: 24, fontFamily: FONTS.title, fontWeight: 'bold', marginBottom: 4 },
  statLabel: { fontSize: 9, fontFamily: FONTS.body, color: '#9CA3AF', fontWeight: 'bold', letterSpacing: 0.5 },

  // List
  listContent: { padding: 20, paddingBottom: 100 },
  sectionTitle: { fontSize: 12, fontFamily: FONTS.title, color: COLORS.textLight, marginBottom: 12, letterSpacing: 1, marginTop: 10 },
  emptyText: { textAlign: 'center', marginTop: 16, color: COLORS.textLight, fontFamily: FONTS.body },

  // Cards
  card: Platform.select({
    web: {
      backgroundColor: '#FFF', borderRadius: 12, marginBottom: 12, flexDirection: 'row', overflow: 'hidden',
      boxShadow: '0 3px 8px rgba(0,0,0,0.08)',
    },
    default: {
      backgroundColor: '#FFF', borderRadius: 12, marginBottom: 12, flexDirection: 'row', overflow: 'hidden',
      shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, elevation: 2,
    }
  }),
  iconBar: { width: 6, height: '100%' },
  cardContent: { flex: 1, padding: 16 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  
  clientName: { fontSize: 16, fontFamily: FONTS.subtitle, color: COLORS.text, width: '60%' },
  amountText: { fontSize: 16, fontFamily: FONTS.title, color: COLORS.text },
  jobDate: { fontSize: 12, fontFamily: FONTS.body, color: COLORS.textLight },
  
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  badgeText: { fontSize: 10, fontFamily: FONTS.title, fontWeight: '700' },
  
  shareBtn: { padding: 16, justifyContent: 'center', borderLeftWidth: 1, borderLeftColor: '#F3F4F6' },

  fab: Platform.select({
    web: {
      position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28,
      backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center',
      boxShadow: '0 8px 16px rgba(0,0,0,0.25)',
    },
    default: {
      position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28,
      backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center',
      shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, elevation: 5,
    }
  }),
  selectBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: COLORS.primary, borderRadius: 8 },
  selectBtnText: { color: '#FFF', fontFamily: FONTS.title, fontSize: 12 },
  bulkDeleteBar: { position: 'absolute', left: 16, right: 16, bottom: 16, backgroundColor: COLORS.danger, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 12, borderRadius: 12, gap: 8 },
  bulkDeleteText: { color: '#FFF', fontFamily: FONTS.title, fontSize: 14 }
});
