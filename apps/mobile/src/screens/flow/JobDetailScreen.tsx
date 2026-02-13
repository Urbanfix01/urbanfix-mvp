import React, { useMemo, useState } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, ScrollView, 
  ActivityIndicator, Alert, Share, StatusBar, Platform, Linking, Modal, Pressable
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { deleteOfflineQuoteDraft, getOfflineQuoteDetail, isLocalQuoteId, updateOfflineQuoteStatus } from '../../lib/offlineQuotes';
import { COLORS, FONTS } from '../../utils/theme';
import { formatCurrency } from '../../utils/number';
import { getPublicQuoteUrl } from '../../utils/config';
import {
  getManualStatusOptions,
  getPrimaryProcessAction,
  getSecondaryProcessActions,
  getStatusMeta,
  getWorkflowLabel,
  type QuoteWorkflowStatus,
} from '../../utils/quoteWorkflow';

async function getQuoteById(id: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Sesión expirada');

  if (isLocalQuoteId(id)) {
    const localQuote = await getOfflineQuoteDetail(id, user.id);
    if (!localQuote) throw new Error('No se encontró el presupuesto local.');
    return localQuote;
  }

  const { data, error } = await supabase
    .from('quotes')
    .select('*, quote_items(*)')
    .eq('id', id)
    .eq('user_id', user.id)
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
  const isLocalDraft = isLocalQuoteId(jobId);
  const queryClient = useQueryClient();
  const [manualStatusOpen, setManualStatusOpen] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['quote', jobId],
    queryFn: () => getQuoteById(jobId),
    staleTime: 60000,
  });

  const { data: revisionRequests = [] } = useQuery({
    queryKey: ['quote-revision-requests', jobId],
    queryFn: () => getRevisionRequests(jobId),
    enabled: !!jobId && !isLocalDraft,
    staleTime: 30000,
  });

  const { processedQuote: quote, breakdown } = useMemo(() => {
    if (!data) {
      return {
        processedQuote: null,
        breakdown: { subtotal: 0, discountPercent: 0, discountAmount: 0, tax: 0, total: 0 },
      };
    }

    const processedQuote = {
      ...data,
      client_address: data.client_address || data.address || data.location_address || params?.client_address || '',
      location_lat: data.location_lat,
      location_lng: data.location_lng,
    };

    const subtotal = (processedQuote.quote_items || []).reduce(
      (acc: number, item: any) => acc + (item.unit_price * item.quantity),
      0
    );
    const discountPercent = Math.min(100, Math.max(0, Number(processedQuote.discount_percent || 0)));
    const discountAmount = subtotal * (discountPercent / 100);
    const discountedSubtotal = subtotal - discountAmount;
    const taxRate = Number(processedQuote.tax_rate || 0);
    const taxVal = discountedSubtotal * taxRate;
    const total = discountedSubtotal + taxVal;

    return {
      processedQuote,
      breakdown: {
        subtotal,
        discountPercent,
        discountAmount,
        tax: taxVal,
        total,
      },
    };
  }, [data, params]);

  const mapData = useMemo(() => {
    if (!quote) return null;

    const address = quote.client_address;
    const lat = Number(quote.location_lat);
    const lng = Number(quote.location_lng);
    const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);

    if (!address && !hasCoords) return null;

    const query = hasCoords ? `${lat},${lng}` : encodeURIComponent(address);

    return {
        embedUrl: `https://maps.google.com/maps?q=${query}&t=m&z=15&output=embed&iwloc=near`,
        externalUrl: `https://www.google.com/maps/search/?api=1&query=${query}`
    };
  }, [quote?.client_address, quote?.location_lat, quote?.location_lng]);

  const renderMapSection = () => {
    if (!mapData) return null;

    return (
      <View style={styles.mapContainer}>
          <Text style={styles.sectionTitle}>UBICACIÓN EN MAPA</Text>
          
          {Platform.OS === 'web' ? (
            /* VERSIÓN WEB: Iframe incrustado */
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
            /* VERSIÓN MÓVIL: Botón de acción */
            <TouchableOpacity 
                style={styles.mapButtonMobile} 
                onPress={() => Linking.openURL(mapData.externalUrl)}
            >
                <View style={styles.mapIconCircle}>
                    <Ionicons name="map" size={24} color="#FFF" />
                </View>
                <View>
                    <Text style={styles.mapBtnTitle}>Abrir en Google Maps</Text>
                    <Text style={styles.mapBtnSubtitle}>Ver ruta y navegación</Text>
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
      const performDelete = async () => {
          try {
              if (isLocalDraft) {
                const { data: { user } } = await supabase.auth.getUser();
                await deleteOfflineQuoteDraft(jobId, user?.id);
                await queryClient.invalidateQueries({ queryKey: ['quotes-list'] });
                navigation.goBack();
                return;
              }

              const { error } = await supabase.rpc('delete_quote', { p_quote_id: jobId });
              if (error) throw error;
              await queryClient.invalidateQueries({ queryKey: ['quote', jobId] });
              await queryClient.invalidateQueries({ queryKey: ['quotes-list'] });
              navigation.goBack();
          } catch (err: any) {
              Alert.alert('Error', err?.message || 'No se pudo borrar el presupuesto.');
          }
      };

      if (Platform.OS === 'web') {
          // @ts-ignore
          if (window.confirm('Borrar presupuesto?')) {
              await performDelete();
          }
          return;
      }

      Alert.alert('Borrar presupuesto', 'Seguro que quieres borrar este presupuesto?', [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Borrar', style: 'destructive', onPress: () => void performDelete() },
      ]);
  };

  const handleShare = async () => {
      if (isLocalDraft) {
          Alert.alert('Pendiente de sincronizacion', 'Este presupuesto se creo sin internet y aun no tiene link publico.');
          return;
      }
      /* Tu lógica de compartir... */
      const link = getPublicQuoteUrl(jobId);
      if (Platform.OS === 'web') {
          try {
              if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
                  await navigator.clipboard.writeText(link);
                  alert('Link copiado');
              } else if (typeof window !== 'undefined') {
                  window.prompt('Copia este link', link);
              }
          } catch (_err) {
              if (typeof window !== 'undefined') {
                  window.prompt('Copia este link', link);
              }
          }
          return;
      }
      Share.share({message: link});
  };

  const applyStatus = async (nextStatus: QuoteWorkflowStatus, mode: 'process' | 'manual') => {
      if (!quote) return;
      try {
        setStatusUpdating(true);
        if (isLocalDraft) {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user?.id) throw new Error('Sesion expirada');
          const updated = await updateOfflineQuoteStatus({
            userId: user.id,
            localId: jobId,
            status: nextStatus,
          });
          if (!updated) throw new Error('No se pudo actualizar el estado local.');
        } else {
          const { error: rpcError } = await supabase.rpc('update_quote_status', {
            quote_id: jobId,
            next_status: nextStatus,
            mode,
          });
          if (rpcError) throw rpcError;
        }

        await queryClient.invalidateQueries({ queryKey: ['quote', jobId] });
        await queryClient.invalidateQueries({ queryKey: ['quotes-list'] });
        Alert.alert('Estado actualizado', `${mode === 'process' ? 'Proceso' : 'Manual'}: ${getWorkflowLabel(nextStatus)}`);
      } catch (err: any) {
        Alert.alert('Error', err?.message || 'No se pudo actualizar el estado.');
      } finally {
        setStatusUpdating(false);
      }
  };

  const handleProcessStatus = async (nextStatus: QuoteWorkflowStatus) => {
    await applyStatus(nextStatus, 'process');
  };

  const handleManualStatus = async (nextStatus: QuoteWorkflowStatus) => {
    setManualStatusOpen(false);
    await applyStatus(nextStatus, 'manual');
  };

  const statusInfo = getStatusMeta(quote?.status);
  const primaryProcessAction = getPrimaryProcessAction(quote?.status);
  const secondaryProcessActions = getSecondaryProcessActions(quote?.status);
  const manualStatusOptions = getManualStatusOptions(quote?.status);

  if (isLoading && !quote) return <View style={[styles.container, styles.center]}><ActivityIndicator size="large" color={COLORS.primary}/></View>;
  if (error) return <View style={styles.center}><Text>Error al cargar el trabajo</Text></View>;
  if (!quote) return <View style={styles.center}><Text>No se encontró el trabajo</Text></View>;

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
                    <Text style={[styles.statusText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
                </View>
            </View>

            <View style={[styles.clientRow, { marginTop: 16 }]}>
                <View style={[styles.clientIcon, { backgroundColor: '#F3F4F6' }]}>
                    <Ionicons name="location" size={20} color={COLORS.textLight} />
                </View>
                <View style={{flex: 1}}>
                    <Text style={styles.label}>DIRECCIÓN</Text>
                    <Text style={styles.clientAddress}>
                        {quote.client_address || 'Sin dirección cargada'}
                    </Text>
                </View>
            </View>
            
            <View style={styles.divider} />
            <Text style={styles.dateText}>Creado el {new Date(quote.created_at).toLocaleDateString()}</Text>
        </View>

        {/* MAPA GOOGLE */}
        {renderMapSection()}

        {/* PROCESO DE ESTADOS */}
        <View style={styles.workflowCard}>
          <Text style={styles.sectionTitle}>PROCESO DE ESTADOS</Text>
          <Text style={styles.workflowModeText}>
            Proceso real: cliente y tecnico. Manual: ajuste directo por el tecnico.
          </Text>

          {primaryProcessAction ? (
            <TouchableOpacity
              style={[styles.workflowPrimaryBtn, statusUpdating && styles.disabledBtn]}
              disabled={statusUpdating}
              onPress={() => void handleProcessStatus(primaryProcessAction.nextStatus)}
            >
              <Ionicons name={primaryProcessAction.icon} size={20} color="#FFF" />
              <View style={styles.workflowPrimaryTextWrap}>
                <Text style={styles.workflowPrimaryTitle}>{primaryProcessAction.label}</Text>
                <Text style={styles.workflowPrimaryHint}>{primaryProcessAction.hint}</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <Text style={styles.workflowDoneText}>
              Este estado no tiene mas pasos automaticos del proceso real.
            </Text>
          )}

          {secondaryProcessActions.map((action) => (
            <TouchableOpacity
              key={`${action.nextStatus}-${action.label}`}
              style={[styles.workflowSecondaryBtn, statusUpdating && styles.disabledBtn]}
              disabled={statusUpdating}
              onPress={() => void handleProcessStatus(action.nextStatus)}
            >
              <Ionicons name={action.icon} size={18} color={COLORS.text} />
              <View style={styles.workflowSecondaryTextWrap}>
                <Text style={styles.workflowSecondaryTitle}>{action.label}</Text>
                <Text style={styles.workflowSecondaryHint}>{action.hint}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textLight} />
            </TouchableOpacity>
          ))}
        </View>

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
            {breakdown.discountAmount > 0 && (
                <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Descuento ({breakdown.discountPercent.toFixed(0)}%)</Text>
                    <Text style={styles.summaryValue}>- ${formatCurrency(breakdown.discountAmount)}</Text>
                </View>
            )}
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

        {primaryProcessAction ? (
          <TouchableOpacity
            style={[styles.shareBtn, statusUpdating && styles.disabledBtn]}
            disabled={statusUpdating}
            onPress={() => void handleProcessStatus(primaryProcessAction.nextStatus)}
          >
              {statusUpdating ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Text style={styles.shareText} numberOfLines={1}>{primaryProcessAction.label}</Text>
                  <Ionicons name={primaryProcessAction.icon} size={20} color="#FFF" style={{marginLeft: 8}} />
                </>
              )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.shareBtn} onPress={handleShare} disabled={statusUpdating}>
              <Text style={styles.shareText}>Compartir</Text>
              <Ionicons name="share-social" size={20} color="#FFF" style={{marginLeft: 8}} />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.successBtn, statusUpdating && styles.disabledBtn]}
          disabled={statusUpdating}
          onPress={() => setManualStatusOpen(true)}
        >
          <Ionicons name="settings-outline" size={20} color="#FFF" />
        </TouchableOpacity>
      </SafeAreaView>

      <Modal
        transparent
        animationType="fade"
        visible={manualStatusOpen}
        onRequestClose={() => setManualStatusOpen(false)}
      >
        <Pressable style={styles.manualOverlay} onPress={() => setManualStatusOpen(false)}>
          <Pressable style={styles.manualCard} onPress={() => null}>
            <Text style={styles.manualTitle}>Cambiar estado manualmente</Text>
            <Text style={styles.manualSubtitle}>Estado actual: {statusInfo.label}</Text>

            <View style={styles.manualList}>
              {manualStatusOptions.length === 0 ? (
                <Text style={styles.manualEmpty}>No hay otros estados disponibles.</Text>
              ) : (
                manualStatusOptions.map((status) => {
                  const meta = getStatusMeta(status);
                  return (
                    <TouchableOpacity
                      key={status}
                      style={styles.manualOption}
                      disabled={statusUpdating}
                      onPress={() => void handleManualStatus(status)}
                    >
                      <View style={[styles.manualDot, { backgroundColor: meta.color }]} />
                      <Text style={styles.manualOptionText}>{getWorkflowLabel(status)}</Text>
                      <Ionicons name="chevron-forward" size={18} color={COLORS.textLight} />
                    </TouchableOpacity>
                  );
                })
              )}
            </View>

            <TouchableOpacity
              style={styles.manualCloseBtn}
              onPress={() => setManualStatusOpen(false)}
            >
              <Text style={styles.manualCloseText}>Cerrar</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
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

  // WORKFLOW
  workflowCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#E2E8F0' },
  workflowModeText: { fontSize: 12, color: COLORS.textLight, marginBottom: 12 },
  workflowPrimaryBtn: {
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  workflowPrimaryTextWrap: { marginLeft: 10, flex: 1 },
  workflowPrimaryTitle: { fontSize: 14, fontFamily: FONTS.subtitle, color: '#FFF' },
  workflowPrimaryHint: { marginTop: 2, fontSize: 11, color: 'rgba(255,255,255,0.82)' },
  workflowDoneText: { fontSize: 12, color: COLORS.textLight, marginBottom: 10 },
  workflowSecondaryBtn: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  workflowSecondaryTextWrap: { flex: 1, marginLeft: 10, marginRight: 8 },
  workflowSecondaryTitle: { fontSize: 13, fontFamily: FONTS.subtitle, color: COLORS.text },
  workflowSecondaryHint: { fontSize: 11, color: COLORS.textLight, marginTop: 2 },

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
  disabledBtn: { opacity: 0.6 },

  // MODAL MANUAL
  manualOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    justifyContent: 'center',
    padding: 20,
  },
  manualCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    maxHeight: '80%',
  },
  manualTitle: { fontSize: 17, fontFamily: FONTS.title, color: COLORS.text },
  manualSubtitle: { marginTop: 6, marginBottom: 12, fontSize: 12, color: COLORS.textLight },
  manualList: { gap: 8 },
  manualEmpty: { fontSize: 12, color: COLORS.textLight },
  manualOption: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  manualDot: { width: 8, height: 8, borderRadius: 999, marginRight: 10 },
  manualOptionText: { flex: 1, fontSize: 13, fontFamily: FONTS.subtitle, color: COLORS.text },
  manualCloseBtn: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  manualCloseText: { fontSize: 13, fontFamily: FONTS.subtitle, color: COLORS.text },
});
