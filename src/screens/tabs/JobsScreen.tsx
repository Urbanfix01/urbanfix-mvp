import React, { useState, useCallback } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  StatusBar, ActivityIndicator, Alert, Share 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

// IMPORTAMOS EL TEMA OFICIAL
import { COLORS, FONTS, SPACING } from '../../utils/theme';
import ServiceSelector from '../../components/organisms/ServiceSelector';
import { ServiceBlueprint } from '../../types/database';
import { supabase } from '../../lib/supabase'; 

const WEB_BASE_URL = 'https://urbanfix-web.vercel.app/p';

export default function JobsScreen() {
  const navigation = useNavigation();
  const [selectorVisible, setSelectorVisible] = useState(false);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // --- LÓGICA DE NEGOCIO ---
 // En src/screens/tabs/JobsScreen.tsx

const fetchJobs = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('quotes')
      // 🔴 ANTES: .select('*')
      // 🟢 AHORA (Agregamos la relación):
      .select('*, quote_items(*)') 
      .eq('user_id', user.id)
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

  const getStatusLabel = (status: string) => {
    switch(status) {
      case 'draft': return 'BORRADOR';
      case 'accepted': return 'APROBADO';
      case 'locked': return 'CERRADO';
      default: return status?.toUpperCase() || 'BORRADOR';
    }
  };

  // --- RENDERIZADO VISUAL ---
  const renderItem = ({ item }: { item: any }) => (
  <TouchableOpacity 
    style={styles.card}
    activeOpacity={0.7}
    onPress={() => {
      // 🟢 CORRECCIÓN: Ahora vamos al Detalle primero
      // @ts-ignore
      navigation.navigate('JobDetail', { jobId: item.id }); 
    }}
    >
      {/* Icono */}
      <View style={styles.iconContainer}>
        <MaterialIcons name="description" size={24} color={COLORS.primary} />
      </View>

      {/* Info */}
      <View style={styles.infoContainer}>
        <Text style={styles.jobTitle}>Presupuesto #{item.id.slice(0, 4)}</Text>
        <Text style={styles.jobDate}>
            {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>

      {/* Meta (Precio y Estado) */}
      <View style={styles.metaContainer}>
        <Text style={styles.amountText}>
            ${item.total_amount?.toLocaleString('es-AR')}
        </Text>
        
        <View style={[
            styles.statusBadge, 
            item.status === 'accepted' && styles.statusBadgeAccepted
        ]}>
          <Text style={[
              styles.statusText,
              item.status === 'accepted' && styles.statusTextAccepted
          ]}>
              {getStatusLabel(item.status)}
          </Text>
        </View>
        
        {/* Botón compartir rápido */}
        <TouchableOpacity 
            style={styles.shareIcon}
            onPress={() => handleShareJob(item.id, item.total_amount)}
        >
             <Ionicons name="share-social-outline" size={20} color={COLORS.primary} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.secondary} />
      
      {/* HEADER (Igual al Catálogo y Config) */}
      <View style={styles.header}>
        <SafeAreaView edges={['top']}>
           <View style={styles.headerContent}>
              <View>
                <Text style={styles.headerTitle}>Mis Trabajos</Text>
                <Text style={styles.headerSubtitle}>Gestiona tus presupuestos activos</Text>
              </View>
              {/* Aquí podrías poner tu foto de perfil pequeña si quisieras */}
           </View>
        </SafeAreaView>
      </View>

      {/* LISTA */}
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
            ListEmptyComponent={
                <View style={styles.center}>
                   <Ionicons name="documents-outline" size={48} color="#CCC" />
                   <Text style={styles.emptyText}>
                      No tienes trabajos aún.{"\n"}Crea el primero con (+).
                   </Text>
                </View>
            }
        />
      )}

      {/* FAB (Botón Flotante) */}
      <TouchableOpacity style={styles.fab} onPress={handleCreateJob}>
        <Ionicons name="add" size={32} color="#FFF" />
      </TouchableOpacity>

      {/* Selector Modal */}
      <ServiceSelector 
        visible={selectorVisible}
        onClose={() => setSelectorVisible(false)}
        onSelect={handleSelectService}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background, // #F4F6F8
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
  },
  // Header consistente con el resto de la App
  header: {
    backgroundColor: COLORS.secondary, // Azul Oscuro
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 8,
    zIndex: 10,
  },
  headerContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24, // Igual a CatalogScreen
    fontFamily: FONTS.title, // Montserrat Bold
    color: '#FFF',
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: FONTS.body, // Raleway
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  // Lista
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 100, // Espacio para el FAB
  },
  emptyText: {
    textAlign: 'center', 
    marginTop: 16, 
    color: COLORS.textLight,
    fontFamily: FONTS.body,
    lineHeight: 22,
  },
  // Tarjetas
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    // Sombras suaves
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#FFF5E0', // Fondo naranja muy suave
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoContainer: {
    flex: 1,
  },
  jobTitle: {
    fontSize: 16,
    fontFamily: FONTS.subtitle, // Raleway SemiBold
    color: COLORS.text,
    marginBottom: 2,
  },
  jobDate: {
    fontSize: 12,
    fontFamily: FONTS.body,
    color: COLORS.textLight,
  },
  metaContainer: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 16,
    fontFamily: FONTS.title, // Montserrat Bold para el dinero
    color: COLORS.primary,
    marginBottom: 4,
  },
  statusBadge: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 4,
  },
  statusBadgeAccepted: {
      backgroundColor: '#D1FAE5',
  },
  statusText: {
    fontSize: 10,
    fontFamily: FONTS.title,
    color: COLORS.textLight,
  },
  statusTextAccepted: {
      color: '#065F46',
  },
  shareIcon: {
      marginTop: 4,
      padding: 4,
  },
  // FAB
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary, 
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
});