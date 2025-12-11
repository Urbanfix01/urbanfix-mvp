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
import { formatCurrency } from '../../utils/number';

const WEB_BASE_URL = 'https://urbanfix-web.vercel.app/p';

export default function JobDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { jobId, quote: initialQuote } = route.params as { jobId: string; quote?: any };

  const [quote, setQuote] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [breakdown, setBreakdown] = useState({ subtotal: 0, tax: 0, total: 0 });

  const fetchQuoteDetail = async () => {
    try {
      const { data, error } = await supabase
        .from('quotes')
        .select('*, quote_items(*)')
        .eq('id', jobId)
        .single();

      if (error) throw error;
      setQuote(data);

      const rawSub = (data.quote_items || []).reduce((acc: number, item: any) => acc + (item.unit_price * item.quantity), 0);
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
    if (initialQuote) {
      setQuote(initialQuote);
      setLoading(false);
    }
    const unsubscribe = navigation.addListener('focus', () => {
      setLoading(true);
      fetchQuoteDetail();
    });
    return unsubscribe;
  }, [navigation, jobId, initialQuote]);

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
        if (window.confirm("¿Estás seguro de borrar este trabajo permanentemente?")) {
            await performDelete();
        }
    } else {
        Alert.alert(
            "¿Borrar Trabajo?", 
            "Esta acción es irreversible.", 
            [
                { text: "Cancelar", style: "cancel" },
                { text: "Eliminar", style: "destructive", onPress: performDelete }
            ]
        );
    }
  };

  const handleEdit = () => {
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
        if(confirm("¿Marcar como Cobrado? Se moverá al Historial.")) performFinalize();
    } else {
        Alert.alert("¿Cobrar Trabajo?", "Se moverá al Historial como Finalizado.", [
            { text: "Cancelar", style: "cancel" },
            { text: "¡Cobrado!", onPress: performFinalize }
        ]);
    }
  };

  const getStatusColor = (status: string) => {
    const normalized = (status || '').toLowerCase();
    // En DB usamos 'accepted' para estado presentable (evita 400 de enum)
    if (normalized === 'accepted') return { bg: '#DBEAFE', text: '#1E40AF', label: 'PRESENTADO' };
    if (normalized === 'completed') return { bg: '#E0F2FE', text: '#0369A1', label: 'COBRADO' };
    return { bg: '#FEF3C7', text: '#B45309', label: 'BORRADOR' };
  };

  const getStatusStep = (status: string) => {
    const normalized = (status || '').toLowerCase();
    if (normalized === 'completed') return 3;
    if (['approved', 'aprobado'].includes(normalized)) return 2;
    if (['presented', 'accepted'].includes(normalized)) return 1;
    return 0; // draft / pending
  };

  const handleConfirmQuote = async () => {
    try {
      // Usamos 'accepted' para marcarlo como presentado y evitar errores de enum en DB
      const { error } = await supabase.from('quotes').update({ status: 'accepted' }).eq('id', jobId);
      if (error) throw error;
      await fetchQuoteDetail();
      handleShare();
    } catch (err: any) {
      Alert.alert("Error", "No se pudo confirmar el presupuesto.");
    }
  };

  const clientAddress = quote?.client_address || initialQuote?.client_address || '';

  const getMapLinks = () => {
    const hasCoords = quote?.location_lat && quote?.location_lng;
    const address = clientAddress;
    if (!hasCoords && !address) return null;

    const query = hasCoords
      ? `${quote.location_lat},${quote.location_lng}`
      : encodeURIComponent(address);

    return {
      embed: `https://www.google.com/maps?q=${query}&output=embed`,
      external: `https://www.google.com/maps?q=${query}`,
    };
  };

  const renderMap = () => {
    const links = getMapLinks();
    if (!links) return null;
    if (Platform.OS === 'web') {
      return (
        <View style={styles.mapContainer}>
          <Text style={styles.sectionTitle}>UBICACION</Text>
          <View style={styles.mapFrame}>
            <iframe 
              title="map-preview"
              src={links.embed}
              style={{ border: 0, width: '100%', height: '100%', borderRadius: 12 }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </View>
        </View>
      );
    }
    return (
      <TouchableOpacity style={styles.mapButton} onPress={() => Linking.openURL(links.external)}>
        <Ionicons name="location" size={18} color={COLORS.primary} />
        <Text style={styles.mapButtonText}>Ver en Google Maps</Text>
      </TouchableOpacity>
    );
  };

  if (loading) return <View style={[styles.container, styles.center]}><ActivityIndicator size="large" color={COLORS.primary}/></View>;
  if (!quote) return <View style={styles.center}><Text>No se encontró el trabajo</Text></View>;
\n  const statusStyle = getStatusColor(quote?.status); = getStatusColor(quote?.status);
  const stepIndex = getStatusStep(quote?.status);
  const mapLinks = getMapLinks();
  const steps = [
    { title: 'Borrador', desc: 'Editando presupuesto' },
    { title: 'Presentado', desc: 'Enviado al cliente' },
    { title: 'Aprobado', desc: 'Cliente confirmó' },
    { title: 'Cobrado', desc: 'Trabajo finalizado' },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.secondary} />
      
      <View style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerTop}>
            <TouchableOpacity
              onPress={() => {
                // Siempre volver al listado de trabajos
                // @ts-ignore
                navigation.navigate('Main', { screen: 'Trabajos' });
              }}
              style={styles.backBtn}
            >
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
        <View>
          {/* TIMELINE DE ESTADO */}
          <View style={styles.timelineContainer}>
            {steps.map((step, idx) => {
              const active = idx <= stepIndex;
              const isLast = idx === steps.length - 1;
              return (
                <View key={step.title} style={styles.timelineStep}>
                  <View style={styles.timelineLineWrapper}>
                    <View style={[styles.timelineDot, active && styles.timelineDotActive]} />
                    {!isLast && <View style={[styles.timelineBar, active && styles.timelineBarActive]} />}
                  </View>
                  <View style={styles.timelineTextBox}>
                    <Text style={[styles.timelineTitle, active && styles.timelineTitleActive]}>{step.title}</Text>
                    <Text style={styles.timelineDesc}>{step.desc}</Text>
                  </View>
                </View>
              );
            })}
          </View>

          {/* CLIENTE */}
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

              <View style={[styles.clientRow, { marginTop: 12 }]}>
                  <View style={[styles.clientIcon, { backgroundColor: '#F3F4F6' }]}>
                      <Ionicons name="location" size={20} color={COLORS.textLight} />
                  </View>
                  <View style={{flex: 1}}>
                      <Text style={styles.label}>UBICACION</Text>
                      <Text style={styles.clientAddress}>{clientAddress || 'Sin direccion'}</Text>
                  </View>
                  {mapLinks ? (
                    <TouchableOpacity style={styles.mapChip} onPress={() => Linking.openURL(mapLinks.external)}>
                      <Ionicons name="navigate" size={16} color={COLORS.primary} />
                      <Text style={styles.mapChipText}>Ver en Maps</Text>
                    </TouchableOpacity>
                  ) : null}
              </View>
              
              <View style={styles.divider} />
              <Text style={styles.dateText}>Creado el {new Date(quote.created_at).toLocaleDateString()}</Text>
          </View>

          {renderMap()}

          {/* ITEMS */}
          <Text style={styles.sectionTitle}>DETALLE DEL SERVICIO</Text>
          <View style={styles.itemsContainer}>
              {quote.quote_items && quote.quote_items.map((item: any, index: number) => (
                  <View key={item.id} style={[styles.itemRow, index !== quote.quote_items.length - 1 && styles.itemBorder]}>
                      <View style={{flex: 1}}>
                          <Text style={styles.itemDesc}>{item.description}</Text>
                          <Text style={styles.itemMeta}>{item.quantity} x ${formatCurrency(item.unit_price)}</Text>
                      </View>
                      <Text style={styles.itemTotal}>${formatCurrency(item.unit_price * item.quantity)}</Text>
                  </View>
              ))}
          </View>

          {/* RESUMEN */}
          <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Subtotal</Text>
                  <Text style={styles.summaryValue}>${formatCurrency(breakdown.subtotal)}</Text>
              </View>
              {breakdown.tax > 0 ? (
                  <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>IVA (21%)</Text>
                      <Text style={styles.summaryValue}>+ ${formatCurrency(breakdown.tax)}</Text>
                  </View>
              ) : null}
              <View style={styles.divider} />
              <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>TOTAL A COBRAR</Text>
                  <Text style={styles.totalValue}>${formatCurrency(breakdown.total)}</Text>
              </View>
          </View>
        </View>
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={styles.footer}>
        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={24} color={COLORS.danger} />
        </TouchableOpacity>

        {quote.status === 'draft' && (
          <TouchableOpacity style={styles.shareBtn} onPress={handleConfirmQuote}>
              <Text style={styles.shareText}>Confirmar presupuesto</Text>
              <Ionicons name="checkmark" size={20} color="#FFF" style={{marginLeft: 8}} />
          </TouchableOpacity>
        )}

        {quote.status !== 'draft' && (
          <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
              <Text style={styles.shareText}>Compartir Link</Text>
              <Ionicons name="share-social" size={20} color="#FFF" style={{marginLeft: 8}} />
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.successBtn} onPress={handleEdit}>
            <Ionicons name="pencil" size={20} color="#FFF" />
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

  clientCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, marginBottom: 20, shadowColor: "#000", shadowOffset: {width:0, height:2}, shadowOpacity: 0.05, elevation: 2 },
  clientRow: { flexDirection: 'row', alignItems: 'center' },
  clientIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF5E0', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  label: { fontSize: 10, fontFamily: FONTS.body, color: COLORS.textLight, marginBottom: 2, letterSpacing: 0.5 },
  clientName: { fontSize: 18, fontFamily: FONTS.title, color: COLORS.text },
  clientAddress: { fontSize: 14, fontFamily: FONTS.body, color: COLORS.text },
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
  mapContainer: { marginBottom: 20 },
  mapFrame: { width: '100%', height: 200, borderRadius: 12, overflow: 'hidden', backgroundColor: '#F3F4F6', marginBottom: 12 },
  mapButton: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10 },
  mapButtonText: { color: COLORS.primary, fontFamily: FONTS.subtitle, fontSize: 14 },
  mapChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: '#E0F2FE', marginLeft: 8 },
  mapChipText: { color: COLORS.primary, fontFamily: FONTS.subtitle, fontSize: 12, marginLeft: 4 },
  timelineContainer: { backgroundColor: '#FFF', borderRadius: 12, padding: 12, marginBottom: 16, gap: 12, shadowColor: '#000', shadowOpacity: 0.03, elevation: 1 },
  timelineStep: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  timelineLineWrapper: { alignItems: 'center', width: 20 },
  timelineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#E5E7EB', marginTop: 4 },
  timelineDotActive: { backgroundColor: COLORS.primary },
  timelineBar: { width: 2, flex: 1, backgroundColor: '#E5E7EB', marginTop: 2 },
  timelineBarActive: { backgroundColor: COLORS.primary },
  timelineTextBox: { flex: 1 },
  timelineTitle: { fontFamily: FONTS.subtitle, fontSize: 14, color: COLORS.textLight },
  timelineTitleActive: { color: COLORS.text, fontWeight: '700' },
  timelineDesc: { fontFamily: FONTS.body, fontSize: 12, color: COLORS.textLight }
});





