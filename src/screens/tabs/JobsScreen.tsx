import React, { useState, useCallback, useMemo } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  StatusBar, ActivityIndicator, Alert, Share 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { COLORS, FONTS, SPACING } from '../../utils/theme';
import ServiceSelector from '../../components/organisms/ServiceSelector';
import { ServiceBlueprint } from '../../types/database';
import { supabase } from '../../lib/supabase'; 

const WEB_BASE_URL = 'https://urbanfix-web.vercel.app/p'; // Tu URL

export default function JobsScreen() {
  const navigation = useNavigation();
  const [selectorVisible, setSelectorVisible] = useState(false);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchJobs = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('quotes')
        .select('*')
        .eq('user_id', user.id)
        .neq('status', 'completed') // Ocultamos los finalizados de la lista
        .order('created_at', { ascending: false }); 

      if (error) throw error;
      setJobs(data || []);
    } catch (error) {
      console.error("Error cargando trabajos:", error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchJobs();
    }, [])
  );

  // --- NUEVAS ESTADÍSTICAS (Adaptadas a tu diseño) ---
  const stats = useMemo(() => {
    const drafts = jobs.filter(j => j.status === 'draft').length;
    const approved = jobs.filter(j => j.status === 'accepted').length;
    // Calculamos el dinero total "En Juego" (Suma de todo lo activo)
    const totalMoney = jobs.reduce((acc, j) => acc + j.total_amount, 0);
    
    return { drafts, approved, totalMoney };
  }, [jobs]);

  const handleCreateJob = () => setSelectorVisible(true);

  const handleSelectService = (blueprint: ServiceBlueprint) => {
    setSelectorVisible(false);
    // @ts-ignore
    navigation.navigate('JobConfig', { blueprint });
  };

  const handleShareJob = async (jobId: string, total: number) => {
    const link = `${WEB_BASE_URL}/${jobId}`;
    const message = `Hola! 👋 Te paso el presupuesto por $${total.toLocaleString('es-AR')}: ${link}`;
    try {
      await Share.share({ message, title: 'Presupuesto UrbanFix', url: link });
    } catch (error) {
      Alert.alert("Error", "No se pudo compartir.");
    }
  };

  const getStatusConfig = (status: string) => {
    switch(status) {
      case 'draft': return { label: 'BORRADOR', color: '#F59E0B', bg: '#FFF7ED' }; // Naranja
      case 'accepted': return { label: 'APROBADO', color: '#10B981', bg: '#D1FAE5' }; // Verde
      default: return { label: status, color: '#6B7280', bg: '#E5E7EB' };
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const status = getStatusConfig(item.status);
    
    return (
      <TouchableOpacity 
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => {
          // @ts-ignore
          navigation.navigate('JobDetail', { jobId: item.id });
        }}
      >
        {/* Borde de color lateral */}
        <View style={[styles.iconBar, { backgroundColor: status.color }]} />
        
        <View style={styles.cardContent}>
            <View style={styles.rowBetween}>
                <Text style={styles.clientName} numberOfLines={1}>
                    {item.client_name || `Presupuesto #${item.id.slice(0,4)}`}
                </Text>
                <Text style={styles.amountText}>
                    ${item.total_amount?.toLocaleString('es-AR')}
                </Text>
            </View>

            <View style={styles.rowBetween}>
                <Text style={styles.jobDate}>
                    {new Date(item.created_at).toLocaleDateString()}
                </Text>
                
                {/* Badge Pequeño */}
                <View style={[styles.badge, { backgroundColor: status.bg }]}>
                    <Text style={[styles.badgeText, { color: status.color }]}>{status.label}</Text>
                </View>
            </View>
        </View>

        <TouchableOpacity 
            style={styles.shareBtn}
            onPress={() => handleShareJob(item.id, item.total_amount)}
        >
             <Ionicons name="paper-plane-outline" size={20} color={COLORS.textLight} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.secondary} />
      
      {/* HEADER DASHBOARD (REDISEÑADO ESTILO TARJETAS) */}
      <View style={styles.header}>
        <SafeAreaView edges={['top']}>
           <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>Resumen de Solicitudes</Text>
              
              <View style={styles.statsRow}>
                  {/* Tarjeta 1: Pendientes (Borradores) */}
                  <View style={[styles.statCard, { borderLeftColor: '#F59E0B' }]}>
                      <Text style={[styles.statNumber, { color: '#F59E0B' }]}>{stats.drafts}</Text>
                      <Text style={styles.statLabel}>PENDIENTES</Text>
                  </View>

                  {/* Tarjeta 2: Aprobados */}
                  <View style={[styles.statCard, { borderLeftColor: '#10B981' }]}>
                      <Text style={[styles.statNumber, { color: '#10B981' }]}>{stats.approved}</Text>
                      <Text style={styles.statLabel}>APROBADOS</Text>
                  </View>

                  {/* Tarjeta 3: Dinero en Juego */}
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

      {/* LISTA DE TRABAJOS */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
            data={jobs}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={
                <Text style={styles.sectionTitle}>ÚLTIMOS MOVIMIENTOS</Text>
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

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={handleCreateJob}>
        <Ionicons name="add" size={32} color="#FFF" />
      </TouchableOpacity>

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
  
  // Header Azul de Fondo
  header: {
    backgroundColor: COLORS.secondary,
    paddingBottom: 30, // Espacio para que las tarjetas "cuelguen" un poco si quisiéramos, o queden dentro
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: "#000", shadowOffset: {width:0, height:4}, shadowOpacity:0.2, elevation: 8,
    zIndex: 10
  },
  headerContent: { paddingHorizontal: 20, paddingTop: 10 },
  headerTitle: { fontSize: 22, fontFamily: FONTS.title, color: '#FFF', marginBottom: 20, textAlign: 'center' },
  
  // --- NUEVAS TARJETAS DE ESTADÍSTICAS ---
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  
  statCard: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 8,
    paddingVertical: 15,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 4, // El borde de color a la izquierda
    // Sombra suave
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, elevation: 3,
  },
  statNumber: { fontSize: 24, fontFamily: FONTS.title, fontWeight: 'bold', marginBottom: 4 },
  statLabel: { fontSize: 9, fontFamily: FONTS.body, color: '#9CA3AF', fontWeight: 'bold', letterSpacing: 0.5 },

  // Lista
  listContent: { padding: 20, paddingBottom: 100 },
  sectionTitle: { fontSize: 12, fontFamily: FONTS.title, color: COLORS.textLight, marginBottom: 12, letterSpacing: 1, marginTop: 10 },
  emptyText: { textAlign: 'center', marginTop: 16, color: COLORS.textLight, fontFamily: FONTS.body },

  // Tarjeta de Trabajo (Row)
  card: {
    backgroundColor: '#FFF', borderRadius: 12, marginBottom: 12, flexDirection: 'row', overflow: 'hidden',
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, elevation: 2,
  },
  iconBar: { width: 6, height: '100%' },
  cardContent: { flex: 1, padding: 16 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  
  clientName: { fontSize: 16, fontFamily: FONTS.subtitle, color: COLORS.text, width: '60%' },
  amountText: { fontSize: 16, fontFamily: FONTS.title, color: COLORS.text },
  jobDate: { fontSize: 12, fontFamily: FONTS.body, color: COLORS.textLight },
  
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  badgeText: { fontSize: 10, fontFamily: FONTS.title },
  
  shareBtn: { padding: 16, justifyContent: 'center', borderLeftWidth: 1, borderLeftColor: '#F3F4F6' },

  fab: {
    position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28,
    backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center',
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, elevation: 5,
  },
});