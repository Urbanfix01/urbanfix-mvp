import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { ClientRequest, ClientWorkspacePayload, fetchClientWorkspace, patchClientRequest } from '../../api/client';
import { ScreenHeader } from '../../components/molecules/ScreenHeader';
import { COLORS, FONTS } from '../../utils/theme';

const statusLabelMap: Record<string, string> = {
  published: 'Publicada',
  matched: 'Con tecnicos',
  quoted: 'Con respuestas',
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
const isSubmittedResponse = (quoteStatus: string) => quoteStatus === 'submitted' || quoteStatus === 'accepted';
const isApplicationResponse = (responseType: string | null | undefined) => String(responseType || '') === 'application';
const clampRating = (value: number) => Math.min(5, Math.max(1, Math.round(value || 0)));

type FeedbackDraft = {
  rating: number;
  comment: string;
  isPublic: boolean;
};

const buildFeedbackDraft = (request: ClientRequest): FeedbackDraft => ({
  rating: clampRating(Number(request.feedback?.rating || 5)),
  comment: String(request.feedback?.comment || ''),
  isPublic: request.feedback?.isPublic ?? true,
});

const getSelectedResponse = (request: ClientRequest) => {
  const responses = request.responses || request.quotes || [];
  return (
    responses.find((response) => request.selectedQuoteId === response.id) ||
    responses.find((response) => request.assignedTechId === response.technicianId) ||
    null
  );
};

const getFeedbackTechnicianName = (request: ClientRequest) =>
  request.feedback?.technicianName ||
  request.assignedTechName ||
  getSelectedResponse(request)?.technicianName ||
  request.targetTechName ||
  'Tecnico UrbanFix';

export default function ClientRequestsScreen() {
  const navigation = useNavigation<any>();
  const { width } = useWindowDimensions();
  const [requests, setRequests] = useState<ClientRequest[]>([]);
  const [workspaceWarning, setWorkspaceWarning] = useState('');
  const [workspaceError, setWorkspaceError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string>('');
  const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null);
  const [editingFeedbackRequestId, setEditingFeedbackRequestId] = useState<string | null>(null);
  const [feedbackDrafts, setFeedbackDrafts] = useState<Record<string, FeedbackDraft>>({});
  const isCompactScreen = width < 390;

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

  const openFeedbackEditor = (request: ClientRequest) => {
    setEditingFeedbackRequestId(request.id);
    setFeedbackDrafts((current) => ({
      ...current,
      [request.id]: buildFeedbackDraft(request),
    }));
  };

  const closeFeedbackEditor = () => {
    setEditingFeedbackRequestId(null);
  };

  const updateFeedbackDraft = (requestId: string, patch: Partial<FeedbackDraft>) => {
    setFeedbackDrafts((current) => {
      const base = current[requestId] || { rating: 5, comment: '', isPublic: true };
      return {
        ...current,
        [requestId]: {
          ...base,
          ...patch,
        },
      };
    });
  };

  const saveRequestFeedback = async (request: ClientRequest) => {
    const draft = feedbackDrafts[request.id] || buildFeedbackDraft(request);
    const comment = draft.comment.trim();
    if (draft.rating < 1 || draft.rating > 5) {
      Alert.alert('Falta calificacion', 'Elige entre 1 y 5 estrellas.');
      return;
    }
    if (comment.length < 6) {
      Alert.alert('Falta comentario', 'Escribe al menos una opinion corta sobre el trabajo realizado.');
      return;
    }

    setActionLoading(request.id);
    setWorkspaceError('');
    try {
      const next = await patchClientRequest(request.id, {
        action: 'submit_feedback',
        rating: clampRating(draft.rating),
        comment,
        isPublic: draft.isPublic,
      });
      applyWorkspacePayload(next);
      setEditingFeedbackRequestId(null);
      Alert.alert('Resena guardada', 'Tu comentario ya quedo asociado a este trabajo.');
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'No pudimos guardar tu resena.');
    } finally {
      setActionLoading('');
    }
  };

  const summary = useMemo(() => {
    const total = requests.length;
    const withResponses = requests.filter((item) =>
      (item.responses || item.quotes || []).some((response) => isSubmittedResponse(String(response.quoteStatus || '')))
    ).length;
    const active = requests.filter((item) => item.status !== 'completed' && item.status !== 'cancelled').length;
    const completed = requests.filter((item) => item.status === 'completed').length;
    return { total, withResponses, active, completed };
  }, [requests]);

  const headerSubtitle = useMemo(() => {
    if (!requests.length) {
      return 'Publica tu primer pedido y recibe postulaciones o cotizaciones sin perder el seguimiento.';
    }
    return `Tienes ${summary.active} activas, ${summary.withResponses} con respuestas y ${summary.completed} finalizadas.`;
  }, [requests.length, summary.active, summary.completed, summary.withResponses]);

  const summaryCards = useMemo(
    () => [
      {
        key: 'total',
        label: 'Total',
        value: summary.total,
        hint: 'Solicitudes creadas',
        accent: COLORS.secondary,
      },
      {
        key: 'active',
        label: 'Activas',
        value: summary.active,
        hint: 'Pendientes de gestion',
        accent: COLORS.primary,
      },
      {
        key: 'withResponses',
        label: 'Con respuestas',
        value: summary.withResponses,
        hint: 'Listas para decidir',
        accent: '#B45309',
      },
      {
        key: 'completed',
        label: 'Finalizadas',
        value: summary.completed,
        hint: 'Trabajos cerrados',
        accent: '#166534',
      },
    ],
    [summary.active, summary.completed, summary.total, summary.withResponses]
  );

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
          <View style={styles.heroCard}>
            <View style={styles.heroGlowPrimary} />
            <View style={styles.heroGlowSecondary} />

            <View style={[styles.heroTopRow, isCompactScreen && styles.heroTopRowCompact]}>
              <View style={styles.heroCopy}>
                <Text style={styles.heroEyebrow}>Cliente UrbanFix</Text>
                <Text style={styles.heroTitle}>Tus solicitudes, mejor organizadas</Text>
                <Text style={styles.heroText}>{headerSubtitle}</Text>
              </View>

              <TouchableOpacity style={styles.heroAction} onPress={() => navigation.navigate('Publicar')}>
                <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
                <Text style={styles.heroActionText}>Nueva solicitud</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.heroHighlights, isCompactScreen && styles.heroHighlightsCompact]}>
              <View style={styles.heroHighlightCard}>
                <Text style={styles.heroHighlightValue}>{summary.active}</Text>
                <Text style={styles.heroHighlightLabel}>Activas</Text>
              </View>
              <View style={styles.heroHighlightCard}>
                <Text style={styles.heroHighlightValue}>{summary.withResponses}</Text>
                <Text style={styles.heroHighlightLabel}>Con respuestas</Text>
              </View>
              <View style={styles.heroHighlightCard}>
                <Text style={styles.heroHighlightValue}>{summary.completed}</Text>
                <Text style={styles.heroHighlightLabel}>Finalizadas</Text>
              </View>
            </View>
          </View>

          <View style={[styles.summaryRow, isCompactScreen && styles.summaryRowCompact]}>
            {summaryCards.map((item) => (
              <View key={item.key} style={[styles.summaryCard, isCompactScreen && styles.summaryCardCompact]}>
                <View style={styles.summaryHeader}>
                  <View style={[styles.summaryDot, { backgroundColor: item.accent }]} />
                  <Text style={styles.summaryLabel}>{item.label}</Text>
                </View>
                <Text style={[styles.summaryValue, { color: item.accent }]}>{item.value}</Text>
                <Text style={styles.summaryHint}>{item.hint}</Text>
              </View>
            ))}
          </View>

          {!!workspaceWarning && (
            <View style={styles.noticeCard}>
              <Ionicons name="alert-circle-outline" size={16} color="#92400E" />
              <Text style={styles.warningText}>{workspaceWarning}</Text>
            </View>
          )}
          {!!workspaceError && (
            <View style={[styles.noticeCard, styles.noticeCardError]}>
              <Ionicons name="warning-outline" size={16} color="#991B1B" />
              <Text style={styles.errorText}>{workspaceError}</Text>
            </View>
          )}

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Tus solicitudes</Text>
            <View style={styles.sectionPill}>
              <Text style={styles.sectionPillText}>{requests.length}</Text>
            </View>
          </View>

          {requests.length === 0 && (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="document-text-outline" size={22} color={COLORS.secondary} />
              </View>
              <Text style={styles.emptyTitle}>Sin solicitudes por ahora</Text>
              <Text style={styles.emptyText}>Publica tu primer trabajo desde la pestana "Publicar" para recibir respuestas.</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => navigation.navigate('Publicar')}>
                <Text style={styles.emptyBtnText}>Ir a publicar</Text>
              </TouchableOpacity>
            </View>
          )}

          {requests.map((request) => {
            const statusLabel = statusLabelMap[request.status] || request.status || 'Sin estado';
            const style = statusStyleMap[request.status] || { bg: '#E2E8F0', text: '#334155' };
            const isBusy = actionLoading === request.id;
            const responses = request.responses || request.quotes || [];
            const submittedResponses = responses.filter((response) => isSubmittedResponse(String(response.quoteStatus || '')));
            const applicationResponses = submittedResponses.filter((response) => isApplicationResponse(response.responseType));
            const directQuoteResponses = submittedResponses.filter((response) => !isApplicationResponse(response.responseType));
            const latestEvent = request.timeline?.[0]?.label || '';
            const isExpanded = expandedRequestId === request.id;
            const responseCount = submittedResponses.length;
            const requestHasChosenTechnician = Boolean(request.assignedTechId || request.selectedQuoteId);
            const feedback = request.feedback;
            const isEditingFeedback = editingFeedbackRequestId === request.id;
            const feedbackDraft = feedbackDrafts[request.id] || buildFeedbackDraft(request);
            const feedbackTechnicianName = getFeedbackTechnicianName(request);

            return (
              <View key={request.id} style={styles.requestCard}>
                <View style={styles.requestTop}>
                  <Text style={styles.requestTitle}>{request.title}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: style.bg }]}>
                    <Text style={[styles.statusBadgeText, { color: style.text }]}>{statusLabel}</Text>
                  </View>
                </View>

                <View style={styles.metaRow}>
                  <View style={styles.metaPill}>
                    <Text style={styles.metaPillText}>{request.category}</Text>
                  </View>
                  <View style={styles.metaPill}>
                    <Text style={styles.metaPillText}>{request.city || 'Sin ciudad'}</Text>
                  </View>
                  <View style={[styles.metaPill, request.mode === 'direct' && styles.metaPillAccent]}>
                    <Text style={[styles.metaPillText, request.mode === 'direct' && styles.metaPillAccentText]}>
                      {request.mode === 'direct' ? 'Directa' : 'Marketplace'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.requestDescription}>{request.description}</Text>
                {!!request.photoUrls?.length && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoStrip}>
                    {request.photoUrls.slice(0, 5).map((photoUrl, index) => (
                      <Image
                        key={`${request.id}-photo-${index}`}
                        source={{ uri: photoUrl }}
                        style={styles.photoThumb}
                      />
                    ))}
                  </ScrollView>
                )}
                <View style={styles.requestInfoRow}>
                  <Text style={styles.requestDate}>Actualizada: {formatDate(request.updatedAt)}</Text>
                  <Text style={styles.requestInfoAccent}>
                    {responseCount > 0 ? `${responseCount} respuesta${responseCount > 1 ? 's' : ''}` : 'Sin respuestas aun'}
                  </Text>
                </View>

                {!!request.assignedTechName && (
                  <View style={styles.assignedCard}>
                    <Ionicons name="person-circle-outline" size={16} color="#166534" />
                    <Text style={styles.assignedText}>
                      Tecnico asignado: {request.assignedTechName}
                      {request.assignedTechPhone ? ` (${request.assignedTechPhone})` : ''}
                    </Text>
                  </View>
                )}

                {!!latestEvent && (
                  <View style={styles.timelineRow}>
                    <Ionicons name="time-outline" size={14} color="#64748B" />
                    <Text style={styles.timelineText}>Ultimo evento: {latestEvent}</Text>
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.responseToggle, isExpanded && styles.responseToggleActive]}
                  onPress={() => setExpandedRequestId((current) => (current === request.id ? null : request.id))}
                >
                  <View style={styles.responseToggleCopy}>
                    <Text style={styles.responseToggleTitle}>Ver respuestas</Text>
                    <Text style={styles.responseToggleText}>
                      {applicationResponses.length} postulaciones | {directQuoteResponses.length} cotizaciones directas
                    </Text>
                  </View>
                  <Ionicons
                    name={isExpanded ? 'chevron-up-outline' : 'chevron-down-outline'}
                    size={18}
                    color="#334155"
                  />
                </TouchableOpacity>

                {isExpanded && (
                  <View style={styles.responseSections}>
                    <View style={styles.responseGroup}>
                      <View style={styles.responseGroupHeader}>
                        <Text style={styles.responseGroupTitle}>Postulaciones</Text>
                        <Text style={styles.responseGroupCount}>{applicationResponses.length}</Text>
                      </View>
                      {applicationResponses.length === 0 ? (
                        <Text style={styles.responseEmptyText}>Todavia no recibiste postulaciones en este trabajo.</Text>
                      ) : (
                        applicationResponses.map((response) => {
                          const isSelectedResponse =
                            request.selectedQuoteId === response.id || request.assignedTechId === response.technicianId;
                          return (
                            <View key={response.id} style={styles.quoteCard}>
                              <View style={styles.quoteTop}>
                                <Text style={styles.quoteTitle}>{response.technicianName}</Text>
                                <View style={[styles.quoteEtaPill, styles.applicationPill]}>
                                  <Text style={[styles.quoteEtaText, styles.applicationPillText]}>
                                    Visita {response.visitEtaHours || '-'} h
                                  </Text>
                                </View>
                              </View>
                              <Text style={styles.quoteDetail}>
                                {response.specialty || 'Tecnico general'}
                                {response.rating ? ` | Rating ${response.rating.toFixed(1)}` : ''}
                              </Text>
                              {!!response.responseMessage && (
                                <Text style={styles.responseMessage}>{response.responseMessage}</Text>
                              )}

                              <View style={styles.quoteActions}>
                                <TouchableOpacity
                                  style={[styles.actionBtn, styles.secondaryBtn]}
                                  onPress={() =>
                                    navigation.navigate('ClientTechnicianProfile', { technicianId: response.technicianId })
                                  }
                                >
                                  <Text style={styles.actionBtnText}>Ver perfil</Text>
                                </TouchableOpacity>

                                {!isSelectedResponse && !requestHasChosenTechnician && (
                                  <TouchableOpacity
                                    style={[styles.actionBtn, styles.acceptBtn]}
                                    disabled={isBusy}
                                    onPress={() =>
                                      runRequestAction(
                                        request.id,
                                        { action: 'select_match', matchId: response.id },
                                        'Tecnico seleccionado.'
                                      )
                                    }
                                  >
                                    <Text style={styles.actionBtnText}>Elegir tecnico</Text>
                                  </TouchableOpacity>
                                )}

                                {isSelectedResponse && (
                                  <View style={styles.selectedResponsePill}>
                                    <Text style={styles.selectedResponsePillText}>Seleccionado</Text>
                                  </View>
                                )}
                              </View>
                            </View>
                          );
                        })
                      )}
                    </View>

                    <View style={styles.responseGroup}>
                      <View style={styles.responseGroupHeader}>
                        <Text style={styles.responseGroupTitle}>Cotizaciones directas</Text>
                        <Text style={styles.responseGroupCount}>{directQuoteResponses.length}</Text>
                      </View>
                      {directQuoteResponses.length === 0 ? (
                        <Text style={styles.responseEmptyText}>Todavia no recibiste cotizaciones directas en este trabajo.</Text>
                      ) : (
                        directQuoteResponses.map((response) => {
                          const isSelectedResponse =
                            request.selectedQuoteId === response.id || request.assignedTechId === response.technicianId;
                          return (
                            <View key={response.id} style={styles.quoteCard}>
                              <View style={styles.quoteTop}>
                                <Text style={styles.quoteTitle}>{response.technicianName}</Text>
                                <View style={styles.quoteEtaPill}>
                                  <Text style={styles.quoteEtaText}>ETA {response.etaHours || '-'} hs</Text>
                                </View>
                              </View>
                              <Text style={styles.quoteDetail}>
                                Cotizacion: ${formatMoney(response.priceArs)}
                                {response.specialty ? ` | ${response.specialty}` : ''}
                              </Text>
                              {!!response.responseMessage && (
                                <Text style={styles.responseMessage}>{response.responseMessage}</Text>
                              )}

                              <View style={styles.quoteActions}>
                                <TouchableOpacity
                                  style={[styles.actionBtn, styles.secondaryBtn]}
                                  onPress={() =>
                                    navigation.navigate('ClientTechnicianProfile', { technicianId: response.technicianId })
                                  }
                                >
                                  <Text style={styles.actionBtnText}>Ver perfil</Text>
                                </TouchableOpacity>

                                {!isSelectedResponse && !requestHasChosenTechnician && (
                                  <TouchableOpacity
                                    style={[styles.actionBtn, styles.acceptBtn]}
                                    disabled={isBusy}
                                    onPress={() =>
                                      runRequestAction(
                                        request.id,
                                        { action: 'quote_accept', matchId: response.id },
                                        'Cotizacion aceptada.'
                                      )
                                    }
                                  >
                                    <Text style={styles.actionBtnText}>Aceptar cotizacion</Text>
                                  </TouchableOpacity>
                                )}

                                {!isSelectedResponse && !requestHasChosenTechnician && (
                                  <TouchableOpacity
                                    style={[styles.actionBtn, styles.rejectBtn]}
                                    disabled={isBusy}
                                    onPress={() =>
                                      Alert.alert('Rechazar respuesta', 'Confirma si deseas descartar esta respuesta.', [
                                        { text: 'Cancelar', style: 'cancel' },
                                        {
                                          text: 'Rechazar',
                                          style: 'destructive',
                                          onPress: () =>
                                            runRequestAction(
                                              request.id,
                                              { action: 'quote_reject', matchId: response.id },
                                              'Respuesta rechazada.'
                                            ),
                                        },
                                      ])
                                    }
                                  >
                                    <Text style={styles.actionBtnText}>Rechazar</Text>
                                  </TouchableOpacity>
                                )}

                                {isSelectedResponse && (
                                  <View style={styles.selectedResponsePill}>
                                    <Text style={styles.selectedResponsePillText}>Seleccionado</Text>
                                  </View>
                                )}
                              </View>
                            </View>
                          );
                        })
                      )}
                    </View>
                  </View>
                )}

                {(request.feedbackAllowed || feedback) && (
                  <View style={styles.feedbackSection}>
                    <View style={styles.feedbackSectionHeader}>
                      <View style={styles.feedbackSectionCopy}>
                        <Text style={styles.feedbackSectionTitle}>Calificacion del trabajo</Text>
                        <Text style={styles.feedbackSectionHint}>
                          {feedback
                            ? `Tu comentario quedo vinculado a ${feedbackTechnicianName}.`
                            : `Cuando cierras un trabajo, puedes dejar una resena verificada para ${feedbackTechnicianName}.`}
                        </Text>
                      </View>
                      {feedback && !isEditingFeedback ? (
                        <TouchableOpacity style={styles.feedbackEditBtn} onPress={() => openFeedbackEditor(request)}>
                          <Ionicons name="create-outline" size={14} color="#1D4ED8" />
                          <Text style={styles.feedbackEditBtnText}>Editar</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>

                    {feedback && !isEditingFeedback ? (
                      <View style={styles.feedbackSavedCard}>
                        <View style={styles.feedbackSavedHeader}>
                          <View style={styles.feedbackStarsRow}>
                            {[1, 2, 3, 4, 5].map((value) => (
                              <Ionicons
                                key={`saved-star-${request.id}-${value}`}
                                name={value <= feedback.rating ? 'star' : 'star-outline'}
                                size={16}
                                color="#F59E0B"
                              />
                            ))}
                          </View>
                          <Text style={styles.feedbackSavedMeta}>{feedback.rating}/5</Text>
                        </View>
                        <Text style={styles.feedbackSavedText}>{feedback.comment}</Text>
                        <Text style={styles.feedbackSavedHint}>
                          {feedback.isPublic
                            ? 'Visible en el perfil publico del tecnico.'
                            : 'Guardada como comentario privado para este trabajo.'}
                        </Text>
                        {!!feedback.updatedAt && (
                          <Text style={styles.feedbackSavedDate}>Actualizada: {formatDate(feedback.updatedAt)}</Text>
                        )}
                      </View>
                    ) : null}

                    {!feedback && !isEditingFeedback ? (
                      <TouchableOpacity style={styles.feedbackCta} onPress={() => openFeedbackEditor(request)}>
                        <View style={styles.feedbackCtaIcon}>
                          <Ionicons name="chatbubble-ellipses-outline" size={18} color="#1D4ED8" />
                        </View>
                        <View style={styles.feedbackCtaCopy}>
                          <Text style={styles.feedbackCtaTitle}>Comentar este trabajo</Text>
                          <Text style={styles.feedbackCtaText}>
                            Deja una opinion real sobre tiempos, trato y resultado final.
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ) : null}

                    {isEditingFeedback && (
                      <View style={styles.feedbackComposer}>
                        <Text style={styles.feedbackComposerHint}>
                          Esta resena queda asociada al trabajo finalizado y ayuda a validar el perfil del tecnico.
                        </Text>

                        <View style={styles.feedbackStarsSelector}>
                          {[1, 2, 3, 4, 5].map((value) => {
                            const selected = value <= feedbackDraft.rating;
                            return (
                              <TouchableOpacity
                                key={`draft-star-${request.id}-${value}`}
                                style={[styles.feedbackStarBtn, selected && styles.feedbackStarBtnSelected]}
                                onPress={() => updateFeedbackDraft(request.id, { rating: value })}
                              >
                                <Ionicons
                                  name={selected ? 'star' : 'star-outline'}
                                  size={18}
                                  color={selected ? '#F59E0B' : '#94A3B8'}
                                />
                              </TouchableOpacity>
                            );
                          })}
                        </View>

                        <TextInput
                          value={feedbackDraft.comment}
                          onChangeText={(value) => updateFeedbackDraft(request.id, { comment: value })}
                          placeholder="Cuenta brevemente como fue el trabajo, si cumplio tiempos y como quedo el resultado."
                          placeholderTextColor="#94A3B8"
                          multiline
                          style={styles.feedbackInput}
                          textAlignVertical="top"
                        />

                        <View style={styles.feedbackVisibilityRow}>
                          <TouchableOpacity
                            style={[
                              styles.feedbackVisibilityBtn,
                              feedbackDraft.isPublic && styles.feedbackVisibilityBtnActive,
                            ]}
                            onPress={() => updateFeedbackDraft(request.id, { isPublic: true })}
                          >
                            <Ionicons
                              name="globe-outline"
                              size={14}
                              color={feedbackDraft.isPublic ? '#166534' : '#475569'}
                            />
                            <Text
                              style={[
                                styles.feedbackVisibilityBtnText,
                                feedbackDraft.isPublic && styles.feedbackVisibilityBtnTextActive,
                              ]}
                            >
                              Publica
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.feedbackVisibilityBtn,
                              !feedbackDraft.isPublic && styles.feedbackVisibilityBtnActive,
                            ]}
                            onPress={() => updateFeedbackDraft(request.id, { isPublic: false })}
                          >
                            <Ionicons
                              name="lock-closed-outline"
                              size={14}
                              color={!feedbackDraft.isPublic ? '#166534' : '#475569'}
                            />
                            <Text
                              style={[
                                styles.feedbackVisibilityBtnText,
                                !feedbackDraft.isPublic && styles.feedbackVisibilityBtnTextActive,
                              ]}
                            >
                              Privada
                            </Text>
                          </TouchableOpacity>
                        </View>

                        <View style={styles.feedbackActionsRow}>
                          <TouchableOpacity style={[styles.actionBtn, styles.secondaryBtn]} onPress={closeFeedbackEditor}>
                            <Text style={styles.secondaryBtnText}>Cancelar</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.actionBtn, styles.primaryBtn]}
                            disabled={isBusy}
                            onPress={() => saveRequestFeedback(request)}
                          >
                            <Text style={styles.actionBtnText}>
                              {feedback ? 'Actualizar resena' : 'Guardar resena'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
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
  content: { padding: 16, gap: 14, paddingBottom: 28 },
  heroCard: {
    backgroundColor: '#0F172A',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 18,
    gap: 14,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 8,
  },
  heroGlowPrimary: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 999,
    backgroundColor: 'rgba(243,156,18,0.18)',
    top: -70,
    right: -50,
  },
  heroGlowSecondary: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    bottom: -60,
    left: -20,
  },
  heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  heroTopRowCompact: { flexDirection: 'column' },
  heroCopy: { flex: 1, gap: 6 },
  heroEyebrow: { fontFamily: FONTS.subtitle, color: '#FCD34D', fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase' },
  heroTitle: { fontFamily: FONTS.title, color: '#FFFFFF', fontSize: 22, lineHeight: 28 },
  heroText: { fontFamily: FONTS.body, color: '#CBD5E1', fontSize: 13, lineHeight: 19 },
  heroAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  heroActionText: { color: '#FFFFFF', fontFamily: FONTS.subtitle, fontSize: 12, letterSpacing: 0.3 },
  heroHighlights: { flexDirection: 'row', gap: 10 },
  heroHighlightsCompact: { flexWrap: 'wrap' },
  heroHighlightCard: {
    flex: 1,
    minWidth: 90,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  heroHighlightValue: { fontFamily: FONTS.title, color: '#FFFFFF', fontSize: 20, marginBottom: 4 },
  heroHighlightLabel: { fontFamily: FONTS.subtitle, color: '#CBD5E1', fontSize: 11 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  sectionTitle: { fontFamily: FONTS.subtitle, color: '#64748B', fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase' },
  sectionPill: {
    minWidth: 28,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: 'rgba(243,156,18,0.18)',
    alignItems: 'center',
  },
  sectionPillText: { fontFamily: FONTS.subtitle, color: '#B45309', fontSize: 11 },
  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  summaryRowCompact: { gap: 8 },
  summaryCard: {
    flexGrow: 1,
    flexBasis: '48%',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#D7DEE6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
  },
  summaryCardCompact: { flexBasis: '47%' },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  summaryDot: { width: 8, height: 8, borderRadius: 999 },
  summaryLabel: { fontFamily: FONTS.subtitle, color: COLORS.textSecondary, fontSize: 11, letterSpacing: 0.4 },
  summaryValue: { fontFamily: FONTS.title, marginTop: 6, fontSize: 22 },
  summaryHint: { fontFamily: FONTS.body, color: COLORS.textSecondary, fontSize: 11, marginTop: 2, lineHeight: 16 },
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
    backgroundColor: '#FFFBEB',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  noticeCardError: {
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
  },
  warningText: {
    color: '#92400E',
    fontFamily: FONTS.body,
    fontSize: 12,
    flex: 1,
    lineHeight: 18,
  },
  errorText: {
    color: '#991B1B',
    fontFamily: FONTS.body,
    fontSize: 12,
    flex: 1,
    lineHeight: 18,
  },
  emptyCard: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 18,
    gap: 10,
    alignItems: 'flex-start',
  },
  emptyIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: 'rgba(243,156,18,0.18)',
  },
  emptyTitle: { fontFamily: FONTS.subtitle, color: COLORS.text, fontSize: 16 },
  emptyText: { fontFamily: FONTS.body, color: COLORS.textSecondary, lineHeight: 20, fontSize: 13 },
  emptyBtn: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: '#0F172A',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  emptyBtnText: { color: '#FFF', fontFamily: FONTS.subtitle, fontSize: 12 },
  requestCard: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    gap: 10,
    shadowColor: '#CBD5E1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 2,
  },
  requestTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  requestTitle: { fontFamily: FONTS.subtitle, color: COLORS.text, fontSize: 17, flex: 1, lineHeight: 22 },
  statusBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  statusBadgeText: { fontFamily: FONTS.subtitle, fontSize: 10, textTransform: 'uppercase' },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metaPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  metaPillAccent: {
    backgroundColor: '#FFF7ED',
    borderColor: 'rgba(243,156,18,0.18)',
  },
  metaPillText: { fontFamily: FONTS.subtitle, color: '#475569', fontSize: 11 },
  metaPillAccentText: { color: '#B45309' },
  requestDescription: { fontFamily: FONTS.body, color: COLORS.text, fontSize: 13, lineHeight: 20 },
  photoStrip: { gap: 8 },
  photoThumb: {
    width: 74,
    height: 74,
    borderRadius: 14,
    backgroundColor: '#E2E8F0',
    marginRight: 8,
  },
  requestInfoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  requestDate: { fontFamily: FONTS.body, color: COLORS.textSecondary, fontSize: 11 },
  requestInfoAccent: { fontFamily: FONTS.subtitle, color: '#B45309', fontSize: 11 },
  assignedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  assignedText: { fontFamily: FONTS.subtitle, color: '#166534', fontSize: 12, flex: 1 },
  timelineRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  timelineText: { fontFamily: FONTS.body, color: COLORS.textSecondary, fontSize: 12, flex: 1 },
  responseToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  responseToggleActive: {
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  responseToggleCopy: { flex: 1, gap: 2 },
  responseToggleTitle: { fontFamily: FONTS.subtitle, color: '#0F172A', fontSize: 13 },
  responseToggleText: { fontFamily: FONTS.body, color: '#64748B', fontSize: 12 },
  responseSections: { gap: 12 },
  responseGroup: { gap: 8 },
  responseGroupHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  responseGroupTitle: { fontFamily: FONTS.subtitle, color: '#334155', fontSize: 13 },
  responseGroupCount: { fontFamily: FONTS.subtitle, color: '#64748B', fontSize: 12 },
  responseEmptyText: { fontFamily: FONTS.body, color: COLORS.textSecondary, fontSize: 12, lineHeight: 18 },
  quoteList: { gap: 8, marginTop: 2 },
  quoteCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    padding: 12,
    gap: 8,
  },
  quoteTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  quoteTitle: { fontFamily: FONTS.subtitle, color: COLORS.text, fontSize: 13, flex: 1 },
  quoteEtaPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  applicationPill: {
    backgroundColor: '#E0F2FE',
    borderColor: '#BAE6FD',
  },
  quoteEtaText: { fontFamily: FONTS.subtitle, color: '#4338CA', fontSize: 10 },
  applicationPillText: { color: '#0369A1' },
  quoteDetail: { fontFamily: FONTS.body, color: COLORS.textSecondary, fontSize: 12 },
  responseMessage: { fontFamily: FONTS.body, color: '#334155', fontSize: 12, lineHeight: 18 },
  quoteActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 2 },
  feedbackSection: {
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    backgroundColor: '#F8FBFF',
    padding: 12,
  },
  feedbackSectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  feedbackSectionCopy: { flex: 1, gap: 3 },
  feedbackSectionTitle: { fontFamily: FONTS.subtitle, color: '#0F172A', fontSize: 13 },
  feedbackSectionHint: { fontFamily: FONTS.body, color: '#64748B', fontSize: 12, lineHeight: 18 },
  feedbackEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  feedbackEditBtnText: { fontFamily: FONTS.subtitle, color: '#1D4ED8', fontSize: 11 },
  feedbackSavedCard: {
    gap: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D1FAE5',
    backgroundColor: '#FFFFFF',
    padding: 12,
  },
  feedbackSavedHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  feedbackStarsRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  feedbackSavedMeta: { fontFamily: FONTS.subtitle, color: '#92400E', fontSize: 12 },
  feedbackSavedText: { fontFamily: FONTS.body, color: '#334155', fontSize: 12, lineHeight: 19 },
  feedbackSavedHint: { fontFamily: FONTS.body, color: '#166534', fontSize: 11 },
  feedbackSavedDate: { fontFamily: FONTS.body, color: '#64748B', fontSize: 11 },
  feedbackCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#FFFFFF',
    padding: 12,
  },
  feedbackCtaIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
  },
  feedbackCtaCopy: { flex: 1, gap: 2 },
  feedbackCtaTitle: { fontFamily: FONTS.subtitle, color: '#0F172A', fontSize: 12 },
  feedbackCtaText: { fontFamily: FONTS.body, color: '#64748B', fontSize: 11, lineHeight: 17 },
  feedbackComposer: {
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#FFFFFF',
    padding: 12,
  },
  feedbackComposerHint: { fontFamily: FONTS.body, color: '#475569', fontSize: 12, lineHeight: 18 },
  feedbackStarsSelector: { flexDirection: 'row', gap: 8 },
  feedbackStarBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  feedbackStarBtnSelected: {
    borderColor: '#FCD34D',
    backgroundColor: '#FFFBEB',
  },
  feedbackInput: {
    minHeight: 108,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: FONTS.body,
    color: '#0F172A',
    fontSize: 12,
    lineHeight: 18,
  },
  feedbackVisibilityRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  feedbackVisibilityBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  feedbackVisibilityBtnActive: {
    borderColor: '#86EFAC',
    backgroundColor: '#F0FDF4',
  },
  feedbackVisibilityBtnText: { fontFamily: FONTS.subtitle, color: '#475569', fontSize: 11 },
  feedbackVisibilityBtnTextActive: { color: '#166534' },
  feedbackActionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  requestActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  actionBtn: {
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  actionBtnText: { color: '#FFF', fontFamily: FONTS.subtitle, fontSize: 12 },
  primaryBtn: { backgroundColor: '#1D4ED8' },
  secondaryBtn: { backgroundColor: '#334155' },
  secondaryBtnText: { color: '#FFF', fontFamily: FONTS.subtitle, fontSize: 12 },
  acceptBtn: { backgroundColor: '#16A34A' },
  rejectBtn: { backgroundColor: '#DC2626' },
  cancelBtn: { backgroundColor: '#B91C1C' },
  selectedResponsePill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  selectedResponsePillText: {
    fontFamily: FONTS.subtitle,
    fontSize: 12,
    color: '#166534',
  },
});
