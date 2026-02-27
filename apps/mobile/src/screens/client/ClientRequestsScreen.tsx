import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { ClientRequest, ClientWorkspacePayload, fetchClientWorkspace, patchClientRequest } from '../../api/client';
import { ScreenHeader } from '../../components/molecules/ScreenHeader';
import { COLORS, FONTS } from '../../utils/theme';

const statusLabelMap: Record<string, string> = {
  published: 'Publicada',
  matched: 'Con tecnicos',
  quoted: 'Con ofertas',
  direct_sent: 'Directa enviada',
  selected: 'Tecnico elegido',
  scheduled: 'Agendada',
  in_progress: 'En curso',
  completed: 'Finalizada',
  cancelled: 'Cancelada',
};

const statusStyleMap: Record<string, { bg: string; text: string }> = {
  published: { bg: '#DBEAFE', text: '#1D4ED8' },
  matched: { bg: '#E0E7FF', text: '#4338CA' },
  quoted: { bg: '#FEF3C7', text: '#B45309' },
  direct_sent: { bg: '#F3E8FF', text: '#7E22CE' },
  selected: { bg: '#DCFCE7', text: '#166534' },
  scheduled: { bg: '#CCFBF1', text: '#115E59' },
  in_progress: { bg: '#FFEDD5', text: '#9A3412' },
  completed: { bg: '#DCFCE7', text: '#166534' },
  cancelled: { bg: '#FFE4E6', text: '#BE123C' },
};

const formatMoney = (value: number | null | undefined) => {
  const amount = Number(value || 0);
  return amount.toLocaleString('es-AR');
};

const formatDate = (value: string | null | undefined) => {
  if (!value) return '-';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('es-AR');
};

const canAdvance = (status: string) =>
  status === 'selected' || status === 'scheduled' || status === 'in_progress';

const canCancel = (status: string) => status !== 'completed' && status !== 'cancelled';

export default function ClientRequestsScreen() {
  const [requests, setRequests] = useState<ClientRequest[]>([]);
  const [workspaceWarning, setWorkspaceWarning] = useState('');
  const [workspaceError, setWorkspaceError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string>('');

  const loadWorkspace = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    setWorkspaceError('');
    try {
      const payload = await fetchClientWorkspace();
      setRequests(Array.isArray(payload.requests) ? payload.requests : []);
      setWorkspaceWarning(String(payload.warning || ''));
    } catch (error: any) {
      setWorkspaceError(error?.message || 'No pudimos cargar tus solicitudes.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadWorkspace();
    }, [loadWorkspace])
  );

  const applyWorkspacePayload = (payload: ClientWorkspacePayload) => {
    setRequests(Array.isArray(payload.requests) ? payload.requests : []);
    setWorkspaceWarning(String(payload.warning || ''));
  };

  const runRequestAction = async (
    requestId: string,
    payload: Record<string, unknown>,
    successMessage?: string
  ) => {
    setActionLoading(requestId);
    setWorkspaceError('');
    try {
      const next = await patchClientRequest(requestId, payload);
      applyWorkspacePayload(next);
      if (successMessage) {
        Alert.alert('Listo', successMessage);
      }
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'No pudimos procesar la accion.');
    } finally {
      setActionLoading('');
    }
  };

  const summary = useMemo(() => {
    const total = requests.length;
    const withQuotes = requests.filter((item) =>
      item.quotes.some((quote) => String(quote.quoteStatus) === 'submitted')
    ).length;
    const active = requests.filter((item) => item.status !== 'completed' && item.status !== 'cancelled').length;
    return { total, withQuotes, active };
  }, [requests]);

  return (
    <View style={styles.container}>
      <ScreenHeader title="Solicitudes" subtitle="Panel cliente" centerTitle />

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={COLORS.primary} />
          <Text style={styles.loadingText}>Cargando solicitudes...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadWorkspace(true)} />}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Total</Text>
              <Text style={styles.summaryValue}>{summary.total}</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Activas</Text>
              <Text style={styles.summaryValue}>{summary.active}</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Con oferta</Text>
              <Text style={styles.summaryValue}>{summary.withQuotes}</Text>
            </View>
          </View>

          {!!workspaceWarning && <Text style={styles.warningText}>{workspaceWarning}</Text>}
          {!!workspaceError && <Text style={styles.errorText}>{workspaceError}</Text>}

          {requests.length === 0 && (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>Sin solicitudes por ahora</Text>
              <Text style={styles.emptyText}>
                Publica tu primer trabajo desde la pestaÃ±a "Publicar" para recibir ofertas.
              </Text>
            </View>
          )}

          {requests.map((request) => {
            const statusLabel = statusLabelMap[request.status] || request.status || 'Sin estado';
            const style = statusStyleMap[request.status] || { bg: '#E2E8F0', text: '#334155' };
            const isBusy = actionLoading === request.id;
            const submittedQuotes = request.quotes.filter((quote) => quote.quoteStatus === 'submitted');
            const latestEvent = request.timeline?.[0]?.label || '';

            return (
              <View key={request.id} style={styles.requestCard}>
                <View style={styles.requestTop}>
                  <Text style={styles.requestTitle}>{request.title}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: style.bg }]}>
                    <Text style={[styles.statusBadgeText, { color: style.text }]}>{statusLabel}</Text>
                  </View>
                </View>

                <Text style={styles.requestMeta}>
                  {request.category} | {request.city || 'Sin ciudad'} |{' '}
                  {request.mode === 'direct' ? 'Directa' : 'Marketplace'}
                </Text>
                <Text style={styles.requestDescription}>{request.description}</Text>
                <Text style={styles.requestDate}>Actualizada: {formatDate(request.updatedAt)}</Text>

                {!!request.assignedTechName && (
                  <Text style={styles.assignedText}>
                    Tecnico: {request.assignedTechName}
                    {request.assignedTechPhone ? ` (${request.assignedTechPhone})` : ''}
                  </Text>
                )}

                {!!latestEvent && <Text style={styles.timelineText}>Ultimo evento: {latestEvent}</Text>}

                {submittedQuotes.length > 0 && (
                  <View style={styles.quoteList}>
                    {submittedQuotes.map((quote) => (
                      <View key={quote.id} style={styles.quoteCard}>
                        <Text style={styles.quoteTitle}>{quote.technicianName}</Text>
                        <Text style={styles.quoteDetail}>
                          Oferta: ${formatMoney(quote.priceArs)} | ETA: {quote.etaHours || '-'} hs
                        </Text>

                        <View style={styles.quoteActions}>
                          <TouchableOpacity
                            style={[styles.actionBtn, styles.acceptBtn]}
                            disabled={isBusy}
                            onPress={() =>
                              runRequestAction(
                                request.id,
                                { action: 'quote_accept', matchId: quote.id },
                                'Oferta aceptada.'
                              )
                            }
                          >
                            <Text style={styles.actionBtnText}>Aceptar</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.actionBtn, styles.rejectBtn]}
                            disabled={isBusy}
                            onPress={() =>
                              Alert.alert('Rechazar oferta', 'Confirma si deseas rechazar esta oferta.', [
                                { text: 'Cancelar', style: 'cancel' },
                                {
                                  text: 'Rechazar',
                                  style: 'destructive',
                                  onPress: () =>
                                    runRequestAction(
                                      request.id,
                                      { action: 'quote_reject', matchId: quote.id },
                                      'Oferta rechazada.'
                                    ),
                                },
                              ])
                            }
                          >
                            <Text style={styles.actionBtnText}>Rechazar</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                <View style={styles.requestActions}>
                  {request.status === 'direct_sent' && (
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.secondaryBtn]}
                      disabled={isBusy}
                      onPress={() =>
                        runRequestAction(
                          request.id,
                          { action: 'open_marketplace' },
                          'La solicitud fue abierta al marketplace.'
                        )
                      }
                    >
                      <Text style={styles.secondaryBtnText}>Abrir marketplace</Text>
                    </TouchableOpacity>
                  )}

                  {canAdvance(request.status) && (
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.primaryBtn]}
                      disabled={isBusy}
                      onPress={() =>
                        runRequestAction(request.id, { action: 'advance' }, 'Solicitud actualizada.')
                      }
                    >
                      <Text style={styles.actionBtnText}>Avanzar estado</Text>
                    </TouchableOpacity>
                  )}

                  {canCancel(request.status) && (
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.cancelBtn]}
                      disabled={isBusy}
                      onPress={() =>
                        Alert.alert('Cancelar solicitud', 'Esta accion no se puede deshacer.', [
                          { text: 'Volver', style: 'cancel' },
                          {
                            text: 'Cancelar solicitud',
                            style: 'destructive',
                            onPress: () =>
                              runRequestAction(request.id, { action: 'cancel' }, 'Solicitud cancelada.'),
                          },
                        ])
                      }
                    >
                      <Text style={styles.actionBtnText}>Cancelar</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
  loadingText: { fontFamily: FONTS.body, color: COLORS.textSecondary },
  content: { padding: 16, gap: 12, paddingBottom: 28 },
  summaryRow: { flexDirection: 'row', gap: 8 },
  summaryCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  summaryLabel: { fontFamily: FONTS.body, color: COLORS.textSecondary, fontSize: 11 },
  summaryValue: { fontFamily: FONTS.title, color: COLORS.text, marginTop: 2, fontSize: 18 },
  warningText: {
    borderWidth: 1,
    borderColor: '#FDE68A',
    backgroundColor: '#FFFBEB',
    color: '#92400E',
    fontFamily: FONTS.body,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 12,
  },
  errorText: {
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
    color: '#991B1B',
    fontFamily: FONTS.body,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 12,
  },
  emptyCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
  },
  emptyTitle: { fontFamily: FONTS.subtitle, color: COLORS.text, fontSize: 16 },
  emptyText: { fontFamily: FONTS.body, color: COLORS.textSecondary, marginTop: 6, lineHeight: 20, fontSize: 13 },
  requestCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    gap: 8,
  },
  requestTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  requestTitle: { fontFamily: FONTS.subtitle, color: COLORS.text, fontSize: 16, flex: 1 },
  statusBadge: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  statusBadgeText: { fontFamily: FONTS.subtitle, fontSize: 10, textTransform: 'uppercase' },
  requestMeta: { fontFamily: FONTS.body, color: COLORS.textSecondary, fontSize: 12 },
  requestDescription: { fontFamily: FONTS.body, color: COLORS.text, fontSize: 13, lineHeight: 20 },
  requestDate: { fontFamily: FONTS.body, color: COLORS.textSecondary, fontSize: 11 },
  assignedText: { fontFamily: FONTS.subtitle, color: '#166534', fontSize: 12 },
  timelineText: { fontFamily: FONTS.body, color: COLORS.textSecondary, fontSize: 12 },
  quoteList: { gap: 8, marginTop: 2 },
  quoteCard: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    padding: 10,
    gap: 6,
  },
  quoteTitle: { fontFamily: FONTS.subtitle, color: COLORS.text, fontSize: 13 },
  quoteDetail: { fontFamily: FONTS.body, color: COLORS.textSecondary, fontSize: 12 },
  quoteActions: { flexDirection: 'row', gap: 8, marginTop: 2 },
  requestActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  actionBtn: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  actionBtnText: { color: '#FFF', fontFamily: FONTS.subtitle, fontSize: 12 },
  primaryBtn: { backgroundColor: '#1D4ED8' },
  secondaryBtn: { backgroundColor: '#334155' },
  secondaryBtnText: { color: '#FFF', fontFamily: FONTS.subtitle, fontSize: 12 },
  acceptBtn: { backgroundColor: '#16A34A' },
  rejectBtn: { backgroundColor: '#DC2626' },
  cancelBtn: { backgroundColor: '#B91C1C' },
});

