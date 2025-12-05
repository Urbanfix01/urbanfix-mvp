import React, { useEffect, useState } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, ScrollView, 
  ActivityIndicator, Alert, Share, StatusBar, Platform, Linking 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { COLORS, FONTS } from '../../utils/theme';

// Tu URL real
const WEB_BASE_URL = 'https://urbanfix-web.vercel.app/p';

export default function JobDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { jobId } = route.params as { jobId: string };

  const [quote, setQuote] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [breakdown, setBreakdown] = useState({ subtotal: 0, tax: 0, total: 0 });

  // 1. CARGAR DATOS
  const fetchQuoteDetail = async () => {
    try {
      const { data, error } = await supabase
        .from('quotes')
        .select('*, quote_items(*)')
        .eq('id', jobId)
        .single();

      if (error) throw error;
      setQuote(data);

      // Calcular desglose
      const rawSub = data.quote_items.reduce((acc: number, item: any) => acc + (item.unit_price * item.quantity), 0);
      const taxRate = data.tax_rate || 0;
      const taxVal = rawSub * taxRate;
      
      setBreakdown({
        subtotal: rawSub,
        tax: taxVal,
        total: data.total_amount 
      });

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      setLoading(true);
      fetchQuoteDetail();
    });
    return unsubscribe;
  }, [navigation, jobId]);

  // 2. NUEVA FUNCIÓN: ABRIR MAPAS (GPS o Texto)
  const openMap = () => {
    if (!quote) return;

    const lat = quote.location_lat;
    const lng = quote.location_lng;
    const label = encodeURIComponent(quote.client_name || 'Cliente');

    if (lat && lng) {
      // Esquema nativo para precisión GPS
      const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
      const latLng = `${lat},${lng}`;
      const url = Platform.select({
        ios: `${scheme}${label}@${latLng}`,
        android: `${scheme}${latLng}(${label})`
      });
      
      // Fallback web
      const webUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
      
      Linking.canOpenURL(url!).then(supported => {
        if (supported) Linking.openURL(url!);
        else Linking.openURL(webUrl);
      });
    } else {
      // Fallback: búsqueda por texto si no hay GPS guardado
      const address = encodeURIComponent(quote.client_address || '');
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${address}`);
    }
  };

  // 3. ACCIONES EXISTENTES
  const handleDelete = async () => {
    const performDelete = async () => {
        try {
            const { error } = await supabase.from('quotes').delete().eq('id', jobId);
            if (error) throw error;
            navigation.goBack();
        } catch (err: any) {
            console.error("Error borrando:", err);
            if (Platform.OS === 'web') {
                alert("Error al borrar: " + err.message);
            } else {
                Alert.alert("Error", "No se pudo borrar el trabajo.");
            }
        }
    };

    if (Platform.OS === 'web') {
        if (window.confirm("¿Estás seguro de borrar este trabajo permanentemente?")) await performDelete();
    } else {
        Alert.alert(
            "¿Borrar Trabajo?", "Esta acción es irreversible.", 
            [{ text: "Cancelar", style: "cancel" }, { text: "Eliminar", style: "destructive", onPress: performDelete }]
        );
    }
  };

  const handleEdit = () => {
    // @ts-ignore
    navigation.navigate('JobConfig', { quote }); 
  };

  const handleShare = async () => {
    const link = `${WEB_BASE_URL}/${jobId}`;
    const message = `Hola ${quote.client_name || ''}, te envío el presupuesto: ${link}`;
    
    if (Platform.OS === 'web') {
        navigator.clipboard.writeText(message + "\n" + link);
        alert("Enlace copiado al portapapeles");
    } else {
        await Share.share({ message, url: link });
    }
  };

  const handleFinalize = () => {
    const performFinalize = async () => {
        await supabase.from('quotes').update({ status: 'completed', completed_at: new Date() }).eq('id', jobId);
        navigation.goBack();
    };

    if (Platform.OS === 'web') {
        if(confirm("¿Marcar como Cobrado?")) performFinalize();
    } else {
        Alert.alert("¿Cobrar Trabajo?", "Se moverá al Historial como Finalizado.", [
            { text: "Cancelar", style: "cancel" }, { text: "¡Cobrado!", onPress: performFinalize }
        ]);
    }
  };

  const getStatusColor = (status: string) => {
    if (status === 'accepted') return { bg: '#DCFCE7', text: '#166534', label: 'APROBADO' };
    if (status === 'completed') return { bg: '#DBEAFE', text: '#1E40AF', label: 'COBRADO' };
    return { bg: '#FEF3C7', text: '#B45309', label: 'BORRADOR' };
  };

  if (loading) return <View style={[styles.container, styles.center]}><ActivityIndicator size="large" color={COLORS.primary}/></View>;
  if (!quote) return <View style={styles.center}><Text>No se encontró el trabajo</Text></View>;

  const statusStyle = getStatusColor(quote?.status);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.secondary} />
      
      {/* HEADER */}
      <View style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Resumen del Trabajo</Text>
            <TouchableOpacity onPress={handleEdit} style={styles.editHeaderBtn}>
               <Ionicons name="pencil" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* CLIENTE CARD */}
        <View style={styles.clientCard}>
            <View style={styles.clientRow}>
                <View style={styles.clientIcon}>
                    <Ionicons name="person" size={24} color={COLORS.primary} />
                </View>
                <View style={{flex:1}}>
                    <Text style={styles.label}>CLIENTE</Text>
                    <Text style={styles.clientName}>{quote.client_name || 'Sin Nombre'}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                    <Text style={[styles.statusText, { color: statusStyle.text }]}>{statusStyle.label}</Text>
                </View>
            </View>
            
            {/* UBICACIÓN SINCRONIZADA */}
            {quote.client_address && (
                <View style={[styles.clientRow, { marginTop: 12 }]}>
                    <View style={[styles.clientIcon, { backgroundColor: '#F3F4F6' }]}>
                        <Ionicons name="location" size={20} color={COLORS.textLight} />
                    </View>
                    <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={styles.label}>UBICACIÓN</Text>
                        <Text style={styles.clientAddress}>{quote.client_address}</Text>
                        {/* Pequeño indicador si es GPS preciso */}
                        {quote.location_lat && <Text style={styles.gpsTag}>📍 GPS Exacto</Text>}
                    </View>
                    
                    {/* BOTÓN NUEVO: ABRIR MAPA */}
                    <TouchableOpacity onPress={openMap} style={styles.mapBtn}>
                        <Ionicons name="map-outline" size={22} color={COLORS.secondary} />
                    </TouchableOpacity>
                </View>
            )}
            
            <View style={styles.divider} />
            <Text style={styles.dateText}>Creado el {new Date(quote.created_at).toLocaleDateString()}</Text>
        </View>

        {/* ITEMS */}
        <Text style={styles.sectionTitle}>DETALLE DEL SERVICIO</Text>
        <View style={styles.itemsContainer}>
            {quote.quote_items && quote.quote_items.map((item: any, index: number) => (
                <View key={item.id} style={[styles.itemRow, index !== quote.quote_items.length - 1 && styles.itemBorder]}>
                    <View style={{flex: 1}}>
                        <Text style={styles.itemDesc}>{item.description}</Text>
                        <Text style={styles.itemMeta}>{item.quantity} x ${item.unit_price.toLocaleString('es-AR')}</Text>
                    </View>
                    <Text style={styles.itemTotal}>${(item.unit_price * item.quantity).toLocaleString('es-AR')}</Text>
                </View>
            ))}
        </View>

        {/* RESUMEN */}
        <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryValue}>${breakdown.subtotal.toLocaleString('es-AR')}</Text>
            </View>
            {breakdown.tax > 0 && (
                <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>IVA (21%)</Text>
                    <Text style={styles.summaryValue}>+ ${breakdown.tax.toLocaleString('es-AR')}</Text>
                </View>
            )}
            <View style={styles.divider} />
            <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>TOTAL A COBRAR</Text>
                <Text style={styles.totalValue}>${breakdown.total.toLocaleString('es-AR')}</Text>
            </View>
        </View>

      </ScrollView>

      {/* FOOTER */}
      <SafeAreaView edges={['bottom']} style={styles.footer}>
        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={24} color={COLORS.danger} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
            <Text style={styles.shareText}>Compartir Link</Text>
            <Ionicons name="share-social" size={20} color="#FFF" style={{marginLeft: 8}} />
        </TouchableOpacity>

        {quote.status === 'accepted' && (
             <TouchableOpacity style={styles.successBtn} onPress={handleFinalize}>
                <Ionicons name="checkmark-circle" size={24} color="#FFF" />
             </TouchableOpacity>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  header: { backgroundColor: COLORS.secondary, paddingBottom: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10 },
  headerTitle: { fontSize: 18, fontFamily: FONTS.title, color: '#FFF' },
  backBtn: { padding: 8 },
  editHeaderBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 8 },

  content: { padding: 20, paddingBottom: 100 },

  clientCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, marginBottom: 20, shadowColor: "#000", shadowOffset: {width:0, height:2}, shadowOpacity:0.05, elevation: 2 },
  clientRow: { flexDirection: 'row', alignItems: 'center' },
  clientIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF5E0', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  label: { fontSize: 10, fontFamily: FONTS.body, color: COLORS.textLight, marginBottom: 2, letterSpacing: 0.5 },
  clientName: { fontSize: 18, fontFamily: FONTS.title, color: COLORS.text },
  clientAddress: { fontSize: 14, fontFamily: FONTS.body, color: COLORS.text },
  gpsTag: { fontSize: 10, color: COLORS.success, marginTop: 2, fontWeight: 'bold' },
  
  mapBtn: { padding: 10, backgroundColor: '#EFF6FF', borderRadius: 10, justifyContent: 'center', alignItems: 'center' },

  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 10, fontFamily: FONTS.title, fontWeight: 'bold' },
  divider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 16 },
  dateText: { textAlign: 'right', fontSize: 12, color: COLORS.textLight, fontFamily: FONTS.body },

  sectionTitle: { fontSize: 12, fontFamily: FONTS.title, color: COLORS.textLight, marginBottom: 8, letterSpacing: 1, marginLeft: 4 },
  itemsContainer: { backgroundColor: '#FFF', borderRadius: 16, overflow: 'hidden', marginBottom: 20, shadowColor: "#000", shadowOpacity: 0.03, elevation: 1 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  itemBorder: { borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  itemDesc: { fontSize: 14, fontFamily: FONTS.subtitle, color: COLORS.text, marginBottom: 4 },
  itemMeta: { fontSize: 12, fontFamily: FONTS.body, color: COLORS.textLight },
  itemTotal: { fontSize: 16, fontFamily: FONTS.subtitle, color: COLORS.text },

  summaryCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, shadowColor: "#000", shadowOpacity: 0.05, elevation: 2 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryLabel: { fontSize: 14, fontFamily: FONTS.body, color: COLORS.textLight },
  summaryValue: { fontSize: 14, fontFamily: FONTS.subtitle, color: COLORS.text },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  totalLabel: { fontSize: 12, fontFamily: FONTS.title, color: COLORS.text, letterSpacing: 1 },
  totalValue: { fontSize: 24, fontFamily: FONTS.title, color: COLORS.primary },

  footer: { 
      position: 'absolute', bottom: 0, left: 0, right: 0, 
      backgroundColor: '#FFF', 
      flexDirection: 'row', alignItems: 'center', 
      padding: 16, paddingBottom: 30, 
      borderTopWidth: 1, borderTopColor: '#F0F0F0',
      justifyContent: 'space-between', gap: 12
  },
  deleteBtn: { width: 50, height: 50, borderRadius: 12, backgroundColor: '#FEF2F2', justifyContent: 'center', alignItems: 'center' },
  shareBtn: { flex: 1, height: 50, borderRadius: 12, backgroundColor: COLORS.secondary, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  shareText: { color: '#FFF', fontFamily: FONTS.title, fontSize: 16 },
  successBtn: { width: 50, height: 50, borderRadius: 12, backgroundColor: COLORS.success, justifyContent: 'center', alignItems: 'center' },
});