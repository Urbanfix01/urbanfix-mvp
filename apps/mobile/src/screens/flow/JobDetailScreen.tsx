import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchQuoteFeedbackLink } from '../../api/marketplace';
import { ScreenHeader } from '../../components/molecules/ScreenHeader';
import { supabase } from '../../lib/supabase';
import { getPublicQuoteUrl } from '../../utils/config';
import { formatCurrency } from '../../utils/number';
import { getStatusLabelEs, getStatusUiKey } from '../../utils/status';
import { COLORS, FONTS } from '../../utils/theme';

async function getQuoteById(id: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Sesion expirada');

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
  const {
    data: { user },
  } = await supabase.auth.getUser();
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

const formatDate = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('es-AR');
};

const formatDateTime = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('es-AR');
};

const getStatusMeta = (status?: string | null) => {
  const label = getStatusLabelEs(status);
  const statusKey = getStatusUiKey(status);

  if (statusKey === 'approved') {
    return { label, bg: '#DCFCE7', text: '#166534', icon: 'thumbs-up-outline' as const };
  }
  if (statusKey === 'presented') {
    return { label, bg: '#DBEAFE', text: '#1D4ED8', icon: 'paper-plane-outline' as const };
  }
  if (statusKey === 'paid') {
    return { label, bg: '#D1FAE5', text: '#047857', icon: 'wallet-outline' as const };
  }
  if (statusKey === 'completed') {
    return { label, bg: '#E0E7FF', text: '#4338CA', icon: 'checkmark-done-circle-outline' as const };
  }
  if (statusKey === 'draft' || statusKey === 'pending') {
    return { label, bg: '#FEF3C7', text: '#B45309', icon: 'time-outline' as const };
  }
  if (statusKey === 'cancelled') {
    return { label, bg: '#FFE4E6', text: '#BE123C', icon: 'close-circle-outline' as const };
  }
  return { label, bg: '#E2E8F0', text: '#475569', icon: 'information-circle-outline' as const };
};

type InfoRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  valueMuted?: boolean;
};

const InfoRow = ({ icon, label, value, valueMuted }: InfoRowProps) => (
  <View style={styles.infoRow}>
    <View style={styles.infoIconWrap}>
      <Ionicons name={icon} size={18} color={COLORS.secondary} />
    </View>
    <View style={styles.infoCopy}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, valueMuted && styles.infoValueMuted]}>{value}</Text>
    </View>
  </View>
);

const shareOrCopyLink = async (link: string, options?: { title?: string; message?: string; copiedLabel?: string }) => {
  const title = options?.title || 'UrbanFix';
  const message = options?.message || link;
  const copiedLabel = options?.copiedLabel || 'Link copiado';

  if (Platform.OS === 'web') {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(link);
        // @ts-ignore
        if (typeof window !== 'undefined') window.alert(copiedLabel);
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

  await Share.share({ title, message, url: link });
};

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
      (acc: number, item: any) => acc + item.unit_price * item.quantity,
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
      externalUrl: `https://www.google.com/maps/search/?api=1&query=${query}`,
    };
  }, [quote]);

  const handleEdit = () => navigation.navigate('JobConfig', { quote });

  const handleDelete = async () => {
    const performDelete = async () => {
      try {
        const { error: deleteError } = await supabase.rpc('delete_quote', { p_quote_id: jobId });
        if (deleteError) throw deleteError;
        await queryClient.invalidateQueries({ queryKey: ['quote', jobId] });
        await queryClient.invalidateQueries({ queryKey: ['quotes-list'] });
        await queryClient.invalidateQueries({ queryKey: ['quotes-list-all'] });
        navigation.goBack();
      } catch (deleteErr: any) {
        Alert.alert('Error', deleteErr?.message || 'No se pudo borrar el presupuesto.');
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
    const link = getPublicQuoteUrl(jobId);
    await shareOrCopyLink(link, {
      title: 'Presupuesto UrbanFix',
      message: link,
      copiedLabel: 'Link del presupuesto copiado',
    });
  };

  const handleShareFeedbackLink = async () => {
    try {
      const payload = await fetchQuoteFeedbackLink(jobId);
      const message = payload.alreadyReviewed
        ? `Te comparto nuevamente el link para editar la calificacion del trabajo realizado: ${payload.url}`
        : `Te comparto el link para calificar el trabajo realizado: ${payload.url}`;

      await shareOrCopyLink(payload.url, {
        title: 'Calificacion UrbanFix',
        message,
        copiedLabel: payload.alreadyReviewed
          ? 'Link de calificacion copiado. El cliente puede editar su resena con el mismo link.'
          : 'Link de calificacion copiado',
      });
    } catch (shareErr: any) {
      Alert.alert('No pudimos generar el link', shareErr?.message || 'Intenta nuevamente.');
    }
  };

  const handleConfirmQuote = async () => {
    const { error: rpcError } = await supabase.rpc('update_quote_status', { quote_id: jobId, next_status: 'sent' });
    if (rpcError) {
      await supabase.from('quotes').update({ status: 'sent' }).eq('id', jobId);
    }
    await queryClient.invalidateQueries({ queryKey: ['quote', jobId] });
    await queryClient.invalidateQueries({ queryKey: ['quotes-list'] });
    await queryClient.invalidateQueries({ queryKey: ['quotes-list-all'] });
  };

  const handleFinalize = async () => {
    await supabase
      .from('quotes')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', jobId);
    await queryClient.invalidateQueries({ queryKey: ['quote', jobId] });
    await queryClient.invalidateQueries({ queryKey: ['quotes-list'] });
    await queryClient.invalidateQueries({ queryKey: ['quotes-list-all'] });
    navigation.goBack();
  };

  if (isLoading && !quote) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.secondary} />
        <ScreenHeader title="Resumen del trabajo" subtitle="Cargando datos" showBack />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.secondary} />
        <ScreenHeader title="Resumen del trabajo" subtitle="No pudimos cargarlo" showBack />
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={40} color={COLORS.danger} />
          <Text style={styles.errorText}>Error al cargar el trabajo.</Text>
        </View>
      </View>
    );
  }

  if (!quote) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.secondary} />
        <ScreenHeader title="Resumen del trabajo" subtitle="Trabajo no encontrado" showBack />
        <View style={styles.center}>
          <Text style={styles.errorText}>No se encontro el trabajo.</Text>
        </View>
      </View>
    );
  }

  const statusMeta = getStatusMeta(quote.status);
  const items = Array.isArray(quote.quote_items) ? quote.quote_items : [];
  const itemCount = items.length;
  const statusKey = getStatusUiKey(quote.status);
  const canFinalize = ['approved', 'accepted'].includes(String(quote.status || '').toLowerCase());
  const isDraft = statusKey === 'draft';
  const isClosedJob = statusKey === 'completed' || statusKey === 'paid';
  const canEdit = statusKey !== 'completed' && statusKey !== 'paid';

  const primaryAction = isDraft
    ? { label: 'Confirmar', icon: 'checkmark-outline' as const, onPress: handleConfirmQuote }
    : isClosedJob
      ? { label: 'Pedir calificacion', icon: 'star-outline' as const, onPress: handleShareFeedbackLink }
      : { label: 'Compartir', icon: 'share-social-outline' as const, onPress: handleShare };

  const secondaryAction = canFinalize
    ? {
        label: 'Finalizar',
        icon: 'checkmark-done-circle-outline' as const,
        onPress: handleFinalize,
        style: styles.footerSuccessBtn,
        textStyle: styles.footerSuccessText,
      }
    : isClosedJob
      ? {
        label: 'Compartir presupuesto',
        icon: 'paper-plane-outline' as const,
        onPress: handleShare,
        style: styles.footerGhostBtn,
        textStyle: styles.footerGhostText,
      }
    : canEdit
      ? {
        label: 'Editar',
        icon: 'pencil-outline' as const,
        onPress: handleEdit,
        style: styles.footerGhostBtn,
        textStyle: styles.footerGhostText,
      }
      : null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.secondary} />
      <ScreenHeader
        title="Resumen del trabajo"
        subtitle={`${statusMeta.label} | ${formatDate(quote.created_at)}`}
        showBack
        rightAction={canEdit ? (
          <TouchableOpacity style={styles.headerActionBtn} onPress={handleEdit}>
            <Ionicons name="pencil-outline" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        ) : undefined}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.heroCopy}>
              <Text style={styles.heroEyebrow}>Presupuesto activo</Text>
              <Text style={styles.heroTitle}>{quote.client_name || 'Cliente sin nombre'}</Text>
              <Text style={styles.heroMeta}>{quote.client_address || 'Sin direccion cargada'}</Text>
            </View>
            <View style={[styles.heroStatusPill, { backgroundColor: statusMeta.bg }]}>
              <Ionicons name={statusMeta.icon} size={14} color={statusMeta.text} />
              <Text style={[styles.heroStatusText, { color: statusMeta.text }]}>{statusMeta.label}</Text>
            </View>
          </View>

          <Text style={styles.heroText}>
            {itemCount > 0
              ? `${itemCount} item${itemCount > 1 ? 's' : ''} cargados para este trabajo.`
              : 'Todavia no hay items cargados en este trabajo.'}
          </Text>

          <View style={styles.heroMetricRow}>
            <View style={styles.heroMetricCard}>
              <Text style={styles.heroMetricLabel}>Items</Text>
              <Text style={styles.heroMetricValue}>{itemCount}</Text>
            </View>
            <View style={styles.heroMetricCard}>
              <Text style={styles.heroMetricLabel}>Revisiones</Text>
              <Text style={styles.heroMetricValue}>{revisionRequests.length}</Text>
            </View>
            <View style={styles.heroMetricCard}>
              <Text style={styles.heroMetricLabel}>Creado</Text>
              <Text style={styles.heroMetricValueSmall}>{formatDate(quote.created_at)}</Text>
            </View>
          </View>

          <View style={styles.heroTotalBand}>
            <View>
              <Text style={styles.heroTotalLabel}>Total estimado</Text>
              <Text style={styles.heroTotalHint}>Resumen financiero del trabajo</Text>
            </View>
            <Text style={styles.heroTotalValue}>${formatCurrency(breakdown.total)}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Cliente y ubicacion</Text>
            <View style={styles.sectionPill}>
              <Text style={styles.sectionPillText}>Ficha</Text>
            </View>
          </View>

          <InfoRow icon="person-outline" label="Cliente" value={quote.client_name || 'Sin nombre'} />
          <InfoRow
            icon="location-outline"
            label="Direccion"
            value={quote.client_address || 'Sin direccion cargada'}
            valueMuted={!quote.client_address}
          />
          <InfoRow icon="calendar-outline" label="Fecha de creacion" value={formatDate(quote.created_at)} />
        </View>

        {mapData ? (
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Mapa operativo</Text>
              <View style={styles.sectionPillSoft}>
                <Ionicons name="navigate-outline" size={12} color="#0369A1" />
                <Text style={styles.sectionPillSoftText}>Ruta</Text>
              </View>
            </View>
            <Text style={styles.cardHint}>
              Verifica la ubicacion antes de salir para trabajar sobre una referencia precisa.
            </Text>

            {Platform.OS === 'web' ? (
              <View style={styles.mapFrame}>
                <iframe
                  title="mapa-ubicacion"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  loading="lazy"
                  allowFullScreen
                  src={mapData.embedUrl}
                />
              </View>
            ) : (
              <TouchableOpacity style={styles.mapButton} onPress={() => Linking.openURL(mapData.externalUrl)}>
                <View style={styles.mapButtonIcon}>
                  <Ionicons name="map-outline" size={22} color="#FFFFFF" />
                </View>
                <View style={styles.mapButtonCopy}>
                  <Text style={styles.mapButtonTitle}>Abrir en Google Maps</Text>
                  <Text style={styles.mapButtonSubtitle}>Ver ruta, zona y navegacion</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>
        ) : null}

        {revisionRequests.length > 0 ? (
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Revisiones solicitadas</Text>
              <View style={styles.sectionPillWarning}>
                <Text style={styles.sectionPillWarningText}>{revisionRequests.length}</Text>
              </View>
            </View>

            {revisionRequests.map((request, requestIndex) => {
              const requestItems = request.data?.items || [];
              return (
                <View
                  key={request.id}
                  style={[styles.revisionCard, requestIndex > 0 && styles.revisionCardSpaced]}
                >
                  <View style={styles.revisionTop}>
                    <View>
                      <Text style={styles.revisionTitle}>
                        {request.data?.client_name ? `Cliente: ${request.data.client_name}` : 'Solicitud del cliente'}
                      </Text>
                      <Text style={styles.revisionDate}>{formatDateTime(request.created_at)}</Text>
                    </View>
                    <View style={styles.revisionPill}>
                      <Text style={styles.revisionPillText}>
                        {requestItems.length} item{requestItems.length === 1 ? '' : 's'}
                      </Text>
                    </View>
                  </View>

                  {requestItems.length > 0 ? (
                    requestItems.map((item, itemIndex) => (
                      <View
                        key={item.id || `${request.id}-${itemIndex}`}
                        style={[styles.revisionItem, itemIndex > 0 && styles.revisionItemBorder]}
                      >
                        <View style={styles.revisionItemCopy}>
                          <Text style={styles.revisionItemText}>{item.description || 'Item sin descripcion'}</Text>
                          <Text style={styles.revisionItemMeta}>
                            {item.quantity || 0} x ${formatCurrency(item.unit_price || 0)}
                          </Text>
                        </View>
                        {item.note ? <Text style={styles.revisionNote}>{item.note}</Text> : null}
                      </View>
                    ))
                  ) : (
                    <Text style={styles.emptyInlineText}>Sin items detallados en la revision.</Text>
                  )}
                </View>
              );
            })}
          </View>
        ) : null}

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Detalle del servicio</Text>
            <View style={styles.sectionPill}>
              <Text style={styles.sectionPillText}>
                {itemCount} item{itemCount === 1 ? '' : 's'}
              </Text>
            </View>
          </View>

          {items.length > 0 ? (
            items.map((item: any, index: number) => (
              <View
                key={item.id || `${jobId}-item-${index}`}
                style={[styles.lineItemCard, index > 0 && styles.lineItemSpaced]}
              >
                <View style={styles.lineItemTop}>
                  <View style={styles.lineItemCopy}>
                    <Text style={styles.lineItemTitle}>{item.description || 'Item sin descripcion'}</Text>
                    <Text style={styles.lineItemMeta}>
                      {item.quantity || 0} x ${formatCurrency(item.unit_price || 0)}
                    </Text>
                  </View>
                  <Text style={styles.lineItemTotal}>
                    ${formatCurrency((item.unit_price || 0) * (item.quantity || 0))}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyCard}>
              <Ionicons name="document-text-outline" size={22} color="#94A3B8" />
              <Text style={styles.emptyCardTitle}>Sin items cargados</Text>
              <Text style={styles.emptyCardText}>Edita el trabajo para agregar mano de obra o materiales.</Text>
            </View>
          )}
        </View>

        <View style={[styles.card, styles.financialCard]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Resumen financiero</Text>
            <View style={styles.sectionPillSoft}>
              <Ionicons name="cash-outline" size={12} color="#047857" />
              <Text style={styles.sectionPillSoftText}>Actual</Text>
            </View>
          </View>

          <View style={styles.summaryLine}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>${formatCurrency(breakdown.subtotal)}</Text>
          </View>
          {breakdown.discountAmount > 0 ? (
            <View style={styles.summaryLine}>
              <Text style={styles.summaryLabel}>Descuento ({breakdown.discountPercent.toFixed(0)}%)</Text>
              <Text style={styles.summaryValue}>- ${formatCurrency(breakdown.discountAmount)}</Text>
            </View>
          ) : null}
          {breakdown.tax > 0 ? (
            <View style={styles.summaryLine}>
              <Text style={styles.summaryLabel}>IVA (21%)</Text>
              <Text style={styles.summaryValue}>+ ${formatCurrency(breakdown.tax)}</Text>
            </View>
          ) : null}

          <View style={styles.financialDivider} />

          <View style={styles.totalBand}>
            <View>
              <Text style={styles.totalBandLabel}>TOTAL A COBRAR</Text>
              <Text style={styles.totalBandHint}>Valor final del presupuesto</Text>
            </View>
            <Text style={styles.totalBandValue}>${formatCurrency(breakdown.total)}</Text>
          </View>
        </View>
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={styles.footerWrap}>
        <View style={styles.footerBar}>
          <TouchableOpacity style={styles.footerIconBtn} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={20} color={COLORS.danger} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.footerPrimaryBtn} onPress={primaryAction.onPress}>
            <Ionicons name={primaryAction.icon} size={18} color="#FFFFFF" />
            <Text style={styles.footerPrimaryText}>{primaryAction.label}</Text>
          </TouchableOpacity>

          {secondaryAction ? (
            <TouchableOpacity style={[styles.footerSecondaryBtn, secondaryAction.style]} onPress={secondaryAction.onPress}>
              <Ionicons name={secondaryAction.icon} size={18} color={secondaryAction.textStyle.color} />
              <Text style={[styles.footerSecondaryText, secondaryAction.textStyle]}>{secondaryAction.label}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  errorText: {
    marginTop: 12,
    fontFamily: FONTS.body,
    fontSize: 13,
    color: COLORS.text,
    textAlign: 'center',
  },
  headerActionBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  content: {
    padding: 16,
    paddingBottom: 150,
    gap: 14,
  },
  heroCard: {
    backgroundColor: '#0F172A',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 18,
    gap: 12,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  heroCopy: {
    flex: 1,
    gap: 4,
  },
  heroEyebrow: {
    fontFamily: FONTS.subtitle,
    color: '#FCD34D',
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  heroTitle: {
    fontFamily: FONTS.title,
    color: '#FFFFFF',
    fontSize: 22,
  },
  heroMeta: {
    fontFamily: FONTS.body,
    color: '#CBD5E1',
    fontSize: 12,
    lineHeight: 18,
  },
  heroStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  heroStatusText: {
    fontFamily: FONTS.subtitle,
    fontSize: 11,
  },
  heroText: {
    fontFamily: FONTS.body,
    color: '#E2E8F0',
    fontSize: 13,
    lineHeight: 19,
  },
  heroMetricRow: {
    flexDirection: 'row',
    gap: 10,
  },
  heroMetricCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  heroMetricLabel: {
    fontFamily: FONTS.body,
    color: '#94A3B8',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  heroMetricValue: {
    marginTop: 6,
    fontFamily: FONTS.title,
    color: '#FFFFFF',
    fontSize: 20,
  },
  heroMetricValueSmall: {
    marginTop: 8,
    fontFamily: FONTS.subtitle,
    color: '#FFFFFF',
    fontSize: 12,
  },
  heroTotalBand: {
    marginTop: 2,
    borderRadius: 18,
    backgroundColor: '#111827',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#1F2937',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  heroTotalLabel: {
    fontFamily: FONTS.subtitle,
    color: '#E5E7EB',
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  heroTotalHint: {
    marginTop: 4,
    fontFamily: FONTS.body,
    color: '#94A3B8',
    fontSize: 11,
  },
  heroTotalValue: {
    fontFamily: FONTS.title,
    color: '#FCD34D',
    fontSize: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    gap: 12,
  },
  financialCard: {
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  sectionTitle: {
    fontFamily: FONTS.subtitle,
    color: '#0F172A',
    fontSize: 16,
  },
  sectionPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionPillText: {
    fontFamily: FONTS.subtitle,
    fontSize: 11,
    color: '#475569',
  },
  sectionPillSoft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  sectionPillSoftText: {
    fontFamily: FONTS.subtitle,
    fontSize: 11,
    color: '#0369A1',
  },
  sectionPillWarning: {
    minWidth: 28,
    height: 28,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF3C7',
  },
  sectionPillWarningText: {
    fontFamily: FONTS.title,
    fontSize: 12,
    color: '#B45309',
  },
  cardHint: {
    fontFamily: FONTS.body,
    color: '#64748B',
    fontSize: 12,
    lineHeight: 18,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  infoIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCopy: {
    flex: 1,
    gap: 2,
  },
  infoLabel: {
    fontFamily: FONTS.body,
    color: '#94A3B8',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  infoValue: {
    fontFamily: FONTS.subtitle,
    color: '#0F172A',
    fontSize: 14,
    lineHeight: 20,
  },
  infoValueMuted: {
    color: '#94A3B8',
  },
  mapFrame: {
    width: '100%',
    height: 220,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#E2E8F0',
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    padding: 14,
  },
  mapButtonIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
  },
  mapButtonCopy: {
    flex: 1,
  },
  mapButtonTitle: {
    fontFamily: FONTS.subtitle,
    color: '#0F172A',
    fontSize: 14,
  },
  mapButtonSubtitle: {
    marginTop: 3,
    fontFamily: FONTS.body,
    color: '#64748B',
    fontSize: 12,
  },
  revisionCard: {
    borderRadius: 16,
    padding: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  revisionCardSpaced: {
    marginTop: 10,
  },
  revisionTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  revisionTitle: {
    fontFamily: FONTS.subtitle,
    color: '#0F172A',
    fontSize: 14,
  },
  revisionDate: {
    marginTop: 4,
    fontFamily: FONTS.body,
    color: '#64748B',
    fontSize: 11,
  },
  revisionPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  revisionPillText: {
    fontFamily: FONTS.subtitle,
    fontSize: 10,
    color: '#475569',
  },
  revisionItem: {
    gap: 6,
  },
  revisionItemBorder: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  revisionItemCopy: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  revisionItemText: {
    flex: 1,
    fontFamily: FONTS.subtitle,
    color: '#0F172A',
    fontSize: 13,
  },
  revisionItemMeta: {
    fontFamily: FONTS.body,
    color: '#64748B',
    fontSize: 12,
  },
  revisionNote: {
    fontFamily: FONTS.body,
    color: '#334155',
    fontSize: 12,
    lineHeight: 18,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
  },
  emptyInlineText: {
    fontFamily: FONTS.body,
    color: '#64748B',
    fontSize: 12,
  },
  lineItemCard: {
    borderRadius: 16,
    padding: 14,
    backgroundColor: '#FBFBF9',
    borderWidth: 1,
    borderColor: '#EFE9DE',
  },
  lineItemSpaced: {
    marginTop: 10,
  },
  lineItemTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  lineItemCopy: {
    flex: 1,
    gap: 4,
  },
  lineItemTitle: {
    fontFamily: FONTS.subtitle,
    color: '#0F172A',
    fontSize: 14,
  },
  lineItemMeta: {
    fontFamily: FONTS.body,
    color: '#64748B',
    fontSize: 12,
  },
  lineItemTotal: {
    fontFamily: FONTS.title,
    color: '#0F172A',
    fontSize: 16,
  },
  emptyCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 22,
    paddingHorizontal: 18,
    gap: 6,
  },
  emptyCardTitle: {
    fontFamily: FONTS.subtitle,
    color: '#0F172A',
    fontSize: 14,
  },
  emptyCardText: {
    fontFamily: FONTS.body,
    color: '#64748B',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  summaryLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  summaryLabel: {
    fontFamily: FONTS.body,
    color: '#64748B',
    fontSize: 13,
  },
  summaryValue: {
    fontFamily: FONTS.subtitle,
    color: '#0F172A',
    fontSize: 14,
  },
  financialDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 2,
  },
  totalBand: {
    marginTop: 2,
    borderRadius: 16,
    backgroundColor: '#0F172A',
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  totalBandLabel: {
    fontFamily: FONTS.subtitle,
    color: '#E2E8F0',
    fontSize: 11,
    letterSpacing: 0.8,
  },
  totalBandHint: {
    marginTop: 4,
    fontFamily: FONTS.body,
    color: '#94A3B8',
    fontSize: 11,
  },
  totalBandValue: {
    fontFamily: FONTS.title,
    color: '#FCD34D',
    fontSize: 24,
  },
  footerWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(244,246,248,0.96)',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  footerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
  },
  footerIconBtn: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  footerPrimaryBtn: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    backgroundColor: COLORS.secondary,
  },
  footerPrimaryText: {
    fontFamily: FONTS.subtitle,
    color: '#FFFFFF',
    fontSize: 14,
  },
  footerSecondaryBtn: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    borderWidth: 1,
  },
  footerGhostBtn: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
  },
  footerSuccessBtn: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
  },
  footerSecondaryText: {
    fontFamily: FONTS.subtitle,
    fontSize: 14,
  },
  footerGhostText: {
    color: '#0F172A',
  },
  footerSuccessText: {
    color: '#166534',
  },
});
