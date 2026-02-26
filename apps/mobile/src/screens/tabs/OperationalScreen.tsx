import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import MapCanvas from '../../components/molecules/MapCanvas';
import { ScreenHeader } from '../../components/molecules/ScreenHeader';
import {
  fetchNearbyRequests,
  NearbyRequest,
  NearbyRequestsPayload,
  submitOffer,
} from '../../api/marketplace';
import { MapPoint } from '../../types/maps';
import { COLORS, FONTS } from '../../utils/theme';
import { formatCurrency } from '../../utils/number';

const QUERY_KEY = ['operativo-nearby-requests'] as const;
const BA_DEFAULT_REGION = {
  latitude: -34.6037,
  longitude: -58.3816,
  latitudeDelta: 0.32,
  longitudeDelta: 0.32,
};

const toErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message.trim()) return error.message;
  return fallback;
};

const parsePositiveNumber = (value: string) => {
  const trimmed = String(value || '').trim().replace(/\s+/g, '');
  let normalized = trimmed;
  if (trimmed.includes(',') && trimmed.includes('.')) {
    normalized = trimmed.replace(/\./g, '').replace(',', '.');
  } else if (trimmed.includes(',')) {
    normalized = trimmed.replace(',', '.');
  }
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
};

const modeLabel = (mode: NearbyRequest['mode']) => (mode === 'direct' ? 'Directa' : 'Marketplace');
const urgencyLabel = (urgency: NearbyRequest['urgency']) => {
  if (urgency === 'alta') return 'Alta';
  if (urgency === 'baja') return 'Baja';
  return 'Media';
};

const resolveStatusMeta = (request: NearbyRequest) => {
  if (request.my_quote_status === 'submitted' || request.my_quote_status === 'accepted') {
    return { key: 'quoted', label: 'Oferta enviada', color: '#10B981' };
  }
  if (request.urgency === 'alta') return { key: 'high', label: 'Urgente', color: '#EF4444' };
  if (request.urgency === 'media') return { key: 'mid', label: 'Media', color: '#F59E0B' };
  return { key: 'low', label: 'Baja', color: '#3B82F6' };
};

export default function OperationalScreen() {
  const queryClient = useQueryClient();
  const [modeFilter, setModeFilter] = useState<'all' | 'marketplace' | 'direct'>('all');
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [offerRequest, setOfferRequest] = useState<NearbyRequest | null>(null);
  const [offerPrice, setOfferPrice] = useState('');
  const [offerEta, setOfferEta] = useState('');

  const {
    data,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery<NearbyRequestsPayload>({
    queryKey: QUERY_KEY,
    queryFn: fetchNearbyRequests,
    staleTime: 30_000,
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const requests = data?.requests || [];
  const technician = data?.technician;

  const filteredRequests = useMemo(() => {
    if (modeFilter === 'all') return requests;
    return requests.filter((request) => request.mode === modeFilter);
  }, [modeFilter, requests]);

  useEffect(() => {
    if (!selectedRequestId) return;
    const exists = filteredRequests.some((request) => request.id === selectedRequestId);
    if (!exists) setSelectedRequestId(null);
  }, [filteredRequests, selectedRequestId]);

  const mapPoints = useMemo<MapPoint[]>(() => {
    return filteredRequests
      .map((request) => {
        const lat = Number(request.location_lat);
        const lng = Number(request.location_lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        return {
          id: request.id,
          title: request.title || 'Solicitud sin titulo',
          amount: Number(request.my_price_ars || 0),
          address: [request.address, request.city].filter(Boolean).join(', '),
          createdAt: request.created_at,
          lat,
          lng,
          status: resolveStatusMeta(request),
        };
      })
      .filter(Boolean) as MapPoint[];
  }, [filteredRequests]);

  const mapRegion = useMemo(() => {
    if (!mapPoints.length) {
      const hasTechCoords =
        typeof technician?.service_lat === 'number' &&
        Number.isFinite(technician.service_lat) &&
        typeof technician?.service_lng === 'number' &&
        Number.isFinite(technician.service_lng);
      if (hasTechCoords) {
        return {
          latitude: Number(technician?.service_lat),
          longitude: Number(technician?.service_lng),
          latitudeDelta: 0.2,
          longitudeDelta: 0.2,
        };
      }
      return BA_DEFAULT_REGION;
    }
    const lats = mapPoints.map((point) => point.lat);
    const lngs = mapPoints.map((point) => point.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max(0.05, (maxLat - minLat) * 1.4),
      longitudeDelta: Math.max(0.05, (maxLng - minLng) * 1.4),
    };
  }, [mapPoints, technician?.service_lat, technician?.service_lng]);

  const counts = useMemo(
    () => ({
      total: requests.length,
      marketplace: requests.filter((request) => request.mode === 'marketplace').length,
      direct: requests.filter((request) => request.mode === 'direct').length,
      offered: requests.filter(
        (request) => request.my_quote_status === 'submitted' || request.my_quote_status === 'accepted'
      ).length,
    }),
    [requests]
  );

  const offerMutation = useMutation({
    mutationFn: ({ requestId, priceArs, etaHours }: { requestId: string; priceArs: number; etaHours: number }) =>
      submitOffer(requestId, priceArs, etaHours),
    onSuccess: (payload, variables) => {
      queryClient.setQueryData<NearbyRequestsPayload | undefined>(QUERY_KEY, (previous) => {
        if (!previous) return previous;
        return {
          ...previous,
          requests: previous.requests.map((request) => {
            if (request.id !== variables.requestId) return request;
            return {
              ...request,
              status: payload.request.status || request.status,
              my_quote_status: payload.request.my_quote_status,
              my_price_ars: payload.request.my_price_ars,
              my_eta_hours: payload.request.my_eta_hours,
              my_quote_updated_at: payload.request.my_quote_updated_at,
            };
          }),
        };
      });
      setOfferRequest(null);
      setOfferPrice('');
      setOfferEta('');
      Alert.alert('Oferta enviada', payload.message || 'Tu oferta se envio correctamente.');
    },
    onError: (mutationError: unknown) => {
      Alert.alert('No se pudo ofertar', toErrorMessage(mutationError, 'Intenta nuevamente.'));
    },
  });

  const openOfferModal = useCallback((request: NearbyRequest) => {
    setOfferRequest(request);
    setOfferPrice(request.my_price_ars ? String(Math.round(request.my_price_ars)) : '');
    setOfferEta(request.my_eta_hours ? String(Math.round(request.my_eta_hours)) : '');
  }, []);

  const closeOfferModal = useCallback(() => {
    if (offerMutation.isPending) return;
    setOfferRequest(null);
    setOfferPrice('');
    setOfferEta('');
  }, [offerMutation.isPending]);

  const handleSubmitOffer = useCallback(() => {
    if (!offerRequest) return;
    const priceValue = parsePositiveNumber(offerPrice);
    const etaValue = parsePositiveNumber(offerEta);
    if (!priceValue) {
      Alert.alert('Dato faltante', 'Ingresa un precio valido en ARS.');
      return;
    }
    if (!etaValue) {
      Alert.alert('Dato faltante', 'Ingresa una ETA valida en horas.');
      return;
    }
    offerMutation.mutate({
      requestId: offerRequest.id,
      priceArs: Math.round(priceValue * 100) / 100,
      etaHours: Math.max(1, Math.round(etaValue)),
    });
  }, [offerEta, offerMutation, offerPrice, offerRequest]);

  const subtitle = `${filteredRequests.length} solicitudes visibles`;
  const mapKey = `${modeFilter}-${mapPoints.length}-${mapRegion.latitude}-${mapRegion.longitude}`;

  if (isLoading && !data) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="OPERATIVO" subtitle="Solicitudes por zona" centerTitle />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.helperText}>Cargando solicitudes cercanas...</Text>
        </View>
      </View>
    );
  }

  if (error && !data) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="OPERATIVO" subtitle="Solicitudes por zona" centerTitle />
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={38} color={COLORS.danger} />
          <Text style={styles.errorText}>{toErrorMessage(error, 'No se pudo cargar Operativo.')}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="OPERATIVO"
        subtitle={subtitle}
        centerTitle
        rightAction={
          <TouchableOpacity style={styles.headerRefreshBtn} onPress={() => refetch()} disabled={isFetching}>
            <Ionicons name={isFetching ? 'hourglass-outline' : 'refresh'} size={16} color="#FFFFFF" />
            <Text style={styles.headerRefreshText}>{isFetching ? 'Actualizando' : 'Actualizar'}</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={COLORS.primary} colors={[COLORS.primary]} />
        }
      >
        <View style={styles.chipsRow}>
          <View style={styles.chip}>
            <Text style={styles.chipLabel}>Radio</Text>
            <Text style={styles.chipValue}>{Math.max(1, Number(technician?.radius_km || 20))} km</Text>
          </View>
          <View style={styles.chip}>
            <Text style={styles.chipLabel}>Horario</Text>
            <Text style={[styles.chipValue, technician?.within_working_hours ? styles.okText : styles.warnText]}>
              {technician?.within_working_hours ? 'Disponible' : 'Fuera de horario'}
            </Text>
          </View>
          <View style={styles.chip}>
            <Text style={styles.chipLabel}>Ofertas</Text>
            <Text style={styles.chipValue}>{counts.offered}</Text>
          </View>
        </View>

        {!!technician?.working_hours_label && (
          <Text style={styles.hoursLabel}>Horario activo: {technician.working_hours_label}</Text>
        )}

        {!!data?.warning && (
          <View style={styles.warningCard}>
            <Ionicons name="warning-outline" size={16} color="#B45309" />
            <Text style={styles.warningText}>{data.warning}</Text>
          </View>
        )}

        <View style={styles.mapPanel}>
          <View style={styles.mapHeaderRow}>
            <Text style={styles.mapTitle}>Solicitudes cercanas</Text>
            <Text style={styles.mapCount}>{filteredRequests.length} visibles</Text>
          </View>
          <MapCanvas
            key={mapKey}
            points={mapPoints}
            region={mapRegion}
            onSelect={(point) => setSelectedRequestId(point.id)}
            formatMoney={formatCurrency}
            height={260}
          />
          {!mapPoints.length && <Text style={styles.emptyHint}>No hay puntos geolocalizados con estos filtros.</Text>}
        </View>

        <View style={styles.filterRow}>
          <FilterButton
            label={`Todo (${counts.total})`}
            active={modeFilter === 'all'}
            onPress={() => setModeFilter('all')}
          />
          <FilterButton
            label={`Marketplace (${counts.marketplace})`}
            active={modeFilter === 'marketplace'}
            onPress={() => setModeFilter('marketplace')}
          />
          <FilterButton
            label={`Directa (${counts.direct})`}
            active={modeFilter === 'direct'}
            onPress={() => setModeFilter('direct')}
          />
        </View>

        <View style={styles.listBlock}>
          {filteredRequests.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="locate-outline" size={24} color="#94A3B8" />
              <Text style={styles.emptyCardTitle}>Sin solicitudes para mostrar</Text>
              <Text style={styles.emptyCardText}>Ajusta filtros o toca "Actualizar".</Text>
            </View>
          ) : (
            filteredRequests.map((request) => {
              const selected = selectedRequestId === request.id;
              const statusMeta = resolveStatusMeta(request);
              return (
                <View key={request.id} style={[styles.requestCard, selected && styles.requestCardSelected]}>
                  <View style={styles.requestHeader}>
                    <Text style={styles.requestTitle}>{request.title}</Text>
                    <View style={[styles.pill, { borderColor: statusMeta.color }]}>
                      <View style={[styles.pillDot, { backgroundColor: statusMeta.color }]} />
                      <Text style={styles.pillText}>{statusMeta.label}</Text>
                    </View>
                  </View>

                  <Text style={styles.requestMeta}>
                    {modeLabel(request.mode)} | {urgencyLabel(request.urgency)} | {request.distance_km.toFixed(1)} km
                  </Text>
                  <Text style={styles.requestAddress}>{[request.address, request.city].filter(Boolean).join(', ')}</Text>
                  <Text numberOfLines={2} style={styles.requestDescription}>
                    {request.description || 'Sin descripcion adicional.'}
                  </Text>

                  {!!request.my_quote_status && (
                    <Text style={styles.offerInfo}>
                      Tu oferta: {request.my_price_ars ? `$${formatCurrency(request.my_price_ars)}` : '-'} | ETA{' '}
                      {request.my_eta_hours || '-'} h
                    </Text>
                  )}

                  <View style={styles.requestActions}>
                    <TouchableOpacity
                      style={styles.secondaryAction}
                      onPress={() => setSelectedRequestId(request.id)}
                    >
                      <Text style={styles.secondaryActionText}>Ver en mapa</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.primaryAction} onPress={() => openOfferModal(request)}>
                      <Text style={styles.primaryActionText}>
                        {request.my_quote_status === 'submitted' || request.my_quote_status === 'accepted'
                          ? 'Editar oferta'
                          : 'Ofertar'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      <Modal transparent visible={Boolean(offerRequest)} animationType="fade" onRequestClose={closeOfferModal}>
        <Pressable style={styles.modalOverlay} onPress={closeOfferModal}>
          <Pressable style={styles.modalCard} onPress={() => null}>
            <Text style={styles.modalTitle}>Enviar oferta</Text>
            <Text style={styles.modalSubtitle}>{offerRequest?.title || 'Solicitud'}</Text>

            <Text style={styles.inputLabel}>Precio (ARS)</Text>
            <TextInput
              value={offerPrice}
              onChangeText={setOfferPrice}
              keyboardType="decimal-pad"
              placeholder="Ej: 150000"
              placeholderTextColor="#94A3B8"
              style={styles.input}
            />

            <Text style={styles.inputLabel}>ETA (horas)</Text>
            <TextInput
              value={offerEta}
              onChangeText={setOfferEta}
              keyboardType="number-pad"
              placeholder="Ej: 24"
              placeholderTextColor="#94A3B8"
              style={styles.input}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalGhostBtn} onPress={closeOfferModal} disabled={offerMutation.isPending}>
                <Text style={styles.modalGhostText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalPrimaryBtn} onPress={handleSubmitOffer} disabled={offerMutation.isPending}>
                {offerMutation.isPending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalPrimaryText}>Enviar oferta</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const FilterButton = ({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) => (
  <TouchableOpacity style={[styles.filterBtn, active && styles.filterBtnActive]} onPress={onPress}>
    <Text style={[styles.filterBtnText, active && styles.filterBtnTextActive]}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 28, gap: 12 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10, paddingHorizontal: 24 },
  helperText: { fontFamily: FONTS.body, color: '#64748B', fontSize: 13 },
  errorText: { fontFamily: FONTS.body, color: '#64748B', fontSize: 13, textAlign: 'center' },
  retryBtn: {
    marginTop: 6,
    backgroundColor: COLORS.secondary,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  retryText: { color: '#FFFFFF', fontFamily: FONTS.subtitle, fontSize: 12 },
  headerRefreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  headerRefreshText: { color: '#FFFFFF', fontFamily: FONTS.subtitle, fontSize: 11 },
  chipsRow: { flexDirection: 'row', gap: 8 },
  chip: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  chipLabel: { fontFamily: FONTS.body, color: '#94A3B8', fontSize: 11 },
  chipValue: { fontFamily: FONTS.subtitle, color: '#0F172A', fontSize: 13, marginTop: 2 },
  okText: { color: '#059669' },
  warnText: { color: '#B45309' },
  hoursLabel: { fontFamily: FONTS.body, color: '#475569', fontSize: 12 },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFBEB',
    borderColor: '#FCD34D',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  warningText: { flex: 1, fontFamily: FONTS.body, color: '#92400E', fontSize: 12 },
  mapPanel: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
  },
  mapHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  mapTitle: { fontFamily: FONTS.subtitle, color: '#0F172A', fontSize: 13 },
  mapCount: { fontFamily: FONTS.body, color: '#64748B', fontSize: 11 },
  emptyHint: { marginTop: 10, fontFamily: FONTS.body, color: '#94A3B8', fontSize: 11 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filterBtn: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
  },
  filterBtnActive: { backgroundColor: '#0F172A', borderColor: '#0F172A' },
  filterBtnText: { color: '#334155', fontFamily: FONTS.subtitle, fontSize: 11 },
  filterBtnTextActive: { color: '#FFFFFF' },
  listBlock: { gap: 10 },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 18,
    alignItems: 'center',
    gap: 6,
  },
  emptyCardTitle: { fontFamily: FONTS.subtitle, color: '#0F172A', fontSize: 14 },
  emptyCardText: { fontFamily: FONTS.body, color: '#64748B', fontSize: 12 },
  requestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    gap: 8,
  },
  requestCardSelected: {
    borderColor: COLORS.primary,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: Platform.OS === 'web' ? 0 : 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  requestHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  requestTitle: { flex: 1, fontFamily: FONTS.subtitle, color: '#0F172A', fontSize: 14 },
  requestMeta: { fontFamily: FONTS.body, color: '#475569', fontSize: 12 },
  requestAddress: { fontFamily: FONTS.body, color: '#0F172A', fontSize: 12 },
  requestDescription: { fontFamily: FONTS.body, color: '#64748B', fontSize: 12, lineHeight: 16 },
  offerInfo: { fontFamily: FONTS.subtitle, color: '#0369A1', fontSize: 12 },
  requestActions: { flexDirection: 'row', gap: 8, marginTop: 2 },
  secondaryAction: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  },
  secondaryActionText: { fontFamily: FONTS.subtitle, color: '#334155', fontSize: 12 },
  primaryAction: {
    flex: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: COLORS.primary,
  },
  primaryActionText: { fontFamily: FONTS.subtitle, color: '#FFFFFF', fontSize: 12 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#FFFFFF',
  },
  pillDot: { width: 6, height: 6, borderRadius: 999 },
  pillText: { color: '#334155', fontFamily: FONTS.body, fontSize: 10 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    gap: 10,
  },
  modalTitle: { fontFamily: FONTS.title, color: '#0F172A', fontSize: 17 },
  modalSubtitle: { fontFamily: FONTS.body, color: '#64748B', fontSize: 12, marginTop: -4 },
  inputLabel: { fontFamily: FONTS.subtitle, color: '#0F172A', fontSize: 12, marginTop: 2 },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#0F172A',
    fontFamily: FONTS.body,
    fontSize: 14,
    backgroundColor: '#FFFFFF',
  },
  modalActions: { flexDirection: 'row', gap: 8, marginTop: 6 },
  modalGhostBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  },
  modalGhostText: { fontFamily: FONTS.subtitle, color: '#334155', fontSize: 12 },
  modalPrimaryBtn: {
    flex: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: COLORS.primary,
    minHeight: 40,
  },
  modalPrimaryText: { fontFamily: FONTS.subtitle, color: '#FFFFFF', fontSize: 12 },
});

