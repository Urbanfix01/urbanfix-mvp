import React, { useMemo } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, ScrollView, 
  ActivityIndicator, Alert, Share, StatusBar, Platform, Linking 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { COLORS, FONTS } from '../../utils/theme';
import { formatCurrency } from '../../utils/number';

const WEB_BASE_URL = 'https://urbanfix-web.vercel.app/p';

async function getQuoteById(id: string) {
  const { data, error } = await supabase
    .from('quotes')
    .select('*, quote_items(*)')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

type RevisionRequest = {
  id: string;
  created_at: string;
  data: {
    quote_id?: string;
    client_name?: string;
    requested_at?: string;
    items?: Array<{
      id?: string;
      description?: string;
      quantity?: number;
      unit_price?: number;
      total?: number;
      type?: string;
      note?: string;
    }>;
  };
};

async function getRevisionRequests(quoteId: string): Promise<RevisionRequest[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('notifications')
    .select('id, created_at, data')
    .eq('user_id', user.id)
    .eq('type', 'quote_revision_request')
    .eq('data->>quote_id', quoteId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as RevisionRequest[]) || [];
}

export default function JobDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const params = route.params as any;
  const jobId = params?.jobId as string;
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['quote', jobId],
    queryFn: () => getQuoteById(jobId),
    staleTime: 60000,
  });

  const { data: revisionRequests = [] } = useQuery({
    queryKey: ['quote-revision-requests', jobId],
    queryFn: () => getRevisionRequests(jobId),
    enabled: !!jobId,
    staleTime: 30000,
  });

  const { processedQuote: quote, breakdown } = useMemo(() => {
    if (!data) {
      return {
        processedQuote: null,
        breakdown: { subtotal: 0, tax: 0, total: 0 },
      };
    }

    const processedQuote = {
      ...data,
      client_address: data.client_address || data.address || data.location_address || params?.client_address || '',
      location_lat: data.location_lat,
      location_lng: data.location_lng,
    };

    const rawSub = (processedQuote.quote_items || []).reduce((acc: number, item: any) => acc + (item.unit_price * item.quantity), 0);
    const taxVal = rawSub * (processedQuote.tax_rate || 0);

    return {
      processedQuote,
      breakdown: {
        subtotal: rawSub,
        tax: taxVal,
        total: processedQuote.total_amount,
      },
    };
  }, [data, params]);

  const mapData = useMemo(() => {
    if (!quote) return null;

    const address = quote.client_address;
    const lat = quote.location_lat;
    const lng = quote.location_lng;

    if (!address && (!lat || !lng)) return null;

    const query = (lat && lng) ? `${lat},${lng}` : encodeURIComponent(address);

    return {
        embedUrl: `https://maps.google.com/maps?q=${query}&t=m&z=15&output=embed&iwloc=near`,
        externalUrl: `https://www.google.com/maps/search/?api=1&query=${query}`
    };
  }, [quote?.client_address, quote?.location_lat, quote?.location_lng]);

  const renderMapSection = () => {
    if (!mapData) return null;

    return (
      <View style={styles.mapContainer}>
          <Text style={styles.sectionTitle}>UBICACIàN EN MAPA</Text>
          
          {Platform.OS === 'web' ? (
            /* VERSIàN WEB: Iframe incrustado */
            <View style={styles.mapFrame}>
                <iframe 
                  title="mapa-ubicacion"
                  width="100%" 
                  height="100%" 
                  style={{ border: 0 }} 
                  loading="lazy" 
                  allowFullScreen 
                  src={mapData.embedUrl}
                ></iframe>
            </View>
          ) : (
            /* VERSIàN MàVIL: Bot¢n de acci¢n */
            <TouchableOpacity 
                style={styles.mapButtonMobile} 
                onPress={() => Linking.openURL(mapData.externalUrl)}
            >
                <View style={styles.mapIconCircle}>
                    <Ionicons name="map" size={24} color="#FFF" />
                </View>
                <View>
                    <Text style={styles.mapBtnTitle}>Abrir en Google Maps</Text>
                    <Text style={styles.mapBtnSubtitle}>Ver ruta y navegaci¢n</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={COLORS.textLight} style={{marginLeft: 'auto'}}/>
            </TouchableOpacity>
          )}
      </View>
    );
  };

  // --- ACCIONES DE BOTONES ---
  const handleEdit = () => navigation.navigate('JobConfig', { quote });
  
  const handleDelete = async () => {
      /* Tu l¢gica de borrado existente... */
      if(confirm("¨Borrar trabajo?")) {
          await supabase.from('quotes').delete().eq('id', jobId);
          await queryClient.invalidateQueries({ queryKey: ['quote', jobId] });
          await queryClient.invalidateQueries({ queryKey: ['quotes-list'] });
          navigation.goBack();
      }
  };

  const handleShare = async () => {
      /* Tu l¢gica de compartir... */
      const link = `${WEB_BASE_URL}/${jobId}`;
      if(Platform.OS === 'web') { navigator.clipboard.writeText(link); alert("Link copiado"); }
      else { Share.share({message: link}); }
  };

  const handleConfirmQuote = async () => {
      await supabase.from('quotes').update({ status: 'sent' }).eq('id', jobId);
      await queryClient.invalidateQueries({ queryKey: ['quote', jobId] });
      await queryClient.invalidateQueries({ queryKey: ['quotes-list'] });
  };

  const handleFinalize = async () => {
      await supabase.from('quotes').update({ status: 'completed', completed_at: new Date() }).eq('id', jobId);
      await queryClient.invalidateQueries({ queryKey: ['quote', jobId] });
      await queryClient.invalidateQueries({ queryKey: ['quotes-list'] });
      navigation.goBack();
  };

  // --- HELPERS UI ---
  const getStatusColor = (s: string) => {
      const st = (s || '').toLowerCase();
      if (['approved', 'accepted'].includes(st)) return { bg: '#DCFCE7', text: '#166534', label: 'APROBADO' };
      if (st === 'sent') return { bg: '#DBEAFE', text: '#1E40AF', label: 'PRESENTADO' };
      if (st === 'completed') return { bg: '#DCFCE7', text: '#166534', label: 'COBRADO' };
      return { bg: '#FEF3C7', text: '#B45309', label: 'BORRADOR' };
  };

  if (isLoading && !quote) return <View style={[styles.container, styles.center]}><ActivityIndicator size="large" color={COLORS.primary}/></View>;
  if (error) return <View style={styles.center}><Text>Error al cargar el trabajo</Text></View>;
  if (!quote) return <View style={styles.center}><Text>No se encontr¢ el trabajo</Text></View>;

  const statusInfo = getStatusColor(quote.status);

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
        
        {/* TARJETA DE CLIENTE */}
        <View style={styles.clientCard}>
            <View style={styles.clientRow}>
                <View style={styles.clientIcon}>
                    <Ionicons name="person" size={24} color={COLORS.primary} />
                </View>
                <View style={{flex:1}}>
                    <Text style={styles.label}>CLIENTE</Text>
                    <Text style={styles.clientName}>{quote.client_name || 'Sin Nombre'}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
                    <Text style={[styles.statusText, { color: statusInfo.text }]}>{statusInfo.label}</Text>
                </View>
            </View>

            <View style={[styles.clientRow, { marginTop: 16 }]}>
                <View style={[styles.clientIcon, { backgroundColor: '#F3F4F6' }]}>
                    <Ionicons name="location" size={20} color={COLORS.textLight} />
                </View>
                <View style={{flex: 1}}>
                    <Text style={styles.label}>DIRECCIàN</Text>
                    <Text style={styles.clientAddress}>
                        {quote.client_address || 'Sin direcci¢n cargada'}
                    </Text>
                </View>
            </View>
            
            <View style={styles.divider} />
            <Text style={styles.dateText}>Creado el {new Date(quote.created_at).toLocaleDateString()}</Text>
        </View>

        {/* MAPA GOOGLE */}
        {renderMapSection()}

        {/* REVISIONES SOLICITADAS */}
        {revisionRequests.length > 0 && (
          <View style={styles.revisionCard}>
            <Text style={styles.sectionTitle}>REVISIONES SOLICITADAS</Text>
            {revisionRequests.map((request) => {
              const items = request.data?.items || [];
              return (
                <View key={request.id} style={styles.revisionBlock}>
                  <Text style={styles.revisionTitle}>
                    {request.data?.client_name
                      ? `Cliente: ${request.data.client_name}`
                      : 'Solicitud del cliente'}
                  </Text>
                  <Text style={styles.revisionDate}>
                    {new Date(request.created_at).toLocaleString()}
                  </Text>
                  {items.length > 0 ? (
                    items.map((item, index) => (
                      <View
                        key={item.id || `${request.id}-${index}`}
                        style={[styles.revisionItem, index === 0 && styles.revisionItemFirst]}
                      >
                        <Text style={styles.revisionItemText}>{item.description || 'Item'}</Text>
                        <Text style={styles.revisionItemMeta}>
                          {item.quantity || 0} x ${formatCurrency(item.unit_price || 0)}
                        </Text>
                        {item.note ? (
                          <Text style={styles.revisionItemNote}>{item.note}</Text>
                        ) : null}
                      </View>
                    ))
                  ) : (
                    <Text style={styles.revisionEmpty}>Sin items detallados.</Text>
                  )}
                </View>
              );
            })}
          </View>
        )}

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
            {(!quote.quote_items || quote.quote_items.length === 0) && (
                <Text style={{textAlign: 'center', padding: 20, color: '#999'}}>No hay items agregados</Text>
            )}
        </View>

        {/* TOTALES */}
        <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryValue}>${formatCurrency(breakdown.subtotal)}</Text>
            </View>
            {breakdown.tax > 0 && (
                <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>IVA (21%)</Text>
                    <Text style={styles.summaryValue}>+ ${formatCurrency(breakdown.tax)}</Text>
                </View>
            )}
            <View style={styles.divider} />
            <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>TOTAL A COBRAR</Text>
                <Text style={styles.totalValue}>${formatCurrency(breakdown.total)}</Text>
            </View>
        </View>

      </ScrollView>

      {/* FOOTER */}
      <SafeAreaView edges={['bottom']} style={styles.footer}>
        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={24} color={COLORS.danger} />
        </TouchableOpacity>

        {quote.status === 'draft' ? (
          <TouchableOpacity style={styles.shareBtn} onPress={handleConfirmQuote}>
              <Text style={styles.shareText}>Confirmar</Text>
              <Ionicons name="checkmark" size={20} color="#FFF" style={{marginLeft: 8}} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
              <Text style={styles.shareText}>Compartir</Text>
              <Ionicons name="share-social" size={20} color="#FFF" style={{marginLeft: 8}} />
          </TouchableOpacity>
        )}

        {['approved', 'accepted'].includes((quote.status || '').toLowerCase()) ? (
            <TouchableOpacity style={styles.successBtn} onPress={handleFinalize}>
                <Ionicons name="checkmark-circle" size={24} color="#FFF" />
            </TouchableOpacity>
        ) : (
            <TouchableOpacity style={styles.successBtn} onPress={handleEdit}>
                <Ionicons name="pencil" size={20} color="#FFF" />
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
  
  // TARJETAS
  clientCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, marginBottom: 20, shadowColor: "#000", shadowOpacity: 0.05, elevation: 2 },
  clientRow: { flexDirection: 'row', alignItems: 'center' },
  clientIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF5E0', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  label: { fontSize: 10, fontFamily: FONTS.body, color: COLORS.textLight, marginBottom: 2, letterSpacing: 0.5 },
  clientName: { fontSize: 18, fontFamily: FONTS.title, color: COLORS.text },
  clientAddress: { fontSize: 15, fontFamily: FONTS.subtitle, color: COLORS.text },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 10, fontFamily: FONTS.title, fontWeight: 'bold' },
  divider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 16 },
  dateText: { textAlign: 'right', fontSize: 12, color: COLORS.textLight },

  // MAPA
  mapContainer: { marginBottom: 24 },
  sectionTitle: { fontSize: 12, fontFamily: FONTS.title, color: COLORS.textLight, marginBottom: 10, letterSpacing: 1, marginLeft: 4 },
  mapFrame: { width: '100%', height: 200, borderRadius: 16, overflow: 'hidden', backgroundColor: '#E5E7EB', shadowColor: "#000", shadowOpacity: 0.1, elevation: 3 },
  mapButtonMobile: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 16, borderRadius: 16, shadowColor: "#000", shadowOpacity: 0.05, elevation: 2 },
  mapIconCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#34A853', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  mapBtnTitle: { fontSize: 16, fontFamily: FONTS.subtitle, color: COLORS.text },
  mapBtnSubtitle: { fontSize: 12, color: COLORS.textLight },

  // REVISIONES
  revisionCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: '#E2E8F0' },
  revisionBlock: { marginTop: 12, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 12, backgroundColor: '#F8FAFC' },
  revisionTitle: { fontSize: 13, fontFamily: FONTS.title, color: COLORS.text },
  revisionDate: { marginTop: 4, fontSize: 11, color: COLORS.textLight },
  revisionItem: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  revisionItemFirst: { marginTop: 8, paddingTop: 0, borderTopWidth: 0 },
  revisionItemText: { fontSize: 13, fontFamily: FONTS.subtitle, color: COLORS.text },
  revisionItemMeta: { fontSize: 12, color: COLORS.textLight, marginTop: 2 },
  revisionItemNote: { marginTop: 6, fontSize: 12, color: COLORS.text, backgroundColor: '#FFFFFF', padding: 8, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  revisionEmpty: { marginTop: 8, fontSize: 12, color: COLORS.textLight },

  // ITEMS
  itemsContainer: { backgroundColor: '#FFF', borderRadius: 16, overflow: 'hidden', marginBottom: 20, elevation: 1 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  itemBorder: { borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  itemDesc: { fontSize: 14, fontFamily: FONTS.subtitle, color: COLORS.text, marginBottom: 4 },
  itemMeta: { fontSize: 12, color: COLORS.textLight },
  itemTotal: { fontSize: 16, fontFamily: FONTS.subtitle, color: COLORS.text },

  // TOTALES
  summaryCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, elevation: 2 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryLabel: { fontSize: 14, color: COLORS.textLight },
  summaryValue: { fontSize: 14, fontFamily: FONTS.subtitle, color: COLORS.text },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  totalLabel: { fontSize: 12, fontFamily: FONTS.title, color: COLORS.text, letterSpacing: 1 },
  totalValue: { fontSize: 24, fontFamily: FONTS.title, color: COLORS.primary },

  // FOOTER
  footer: { 
      position: 'absolute', bottom: 0, left: 0, right: 0, 
      backgroundColor: '#FFF', flexDirection: 'row', alignItems: 'center', 
      padding: 16, paddingBottom: 30, borderTopWidth: 1, borderTopColor: '#F0F0F0',
      justifyContent: 'space-between', gap: 12
  },
  deleteBtn: { width: 50, height: 50, borderRadius: 12, backgroundColor: '#FEF2F2', justifyContent: 'center', alignItems: 'center' },
  shareBtn: { flex: 1, height: 50, borderRadius: 12, backgroundColor: COLORS.secondary, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  shareText: { color: '#FFF', fontFamily: FONTS.title, fontSize: 16 },
  successBtn: { width: 50, height: 50, borderRadius: 12, backgroundColor: COLORS.success, justifyContent: 'center', alignItems: 'center' },
});
