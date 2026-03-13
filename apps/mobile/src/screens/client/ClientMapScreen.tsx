import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

import MapCanvas from '../../components/molecules/MapCanvas';
import {
  ClientTechniciansMapPayload,
  ClientTechniciansMapTechnician,
  fetchClientTechniciansMap,
} from '../../api/client';
import { ScreenHeader } from '../../components/molecules/ScreenHeader';
import { MapPoint } from '../../types/maps';
import { COLORS, FONTS } from '../../utils/theme';

const ARGENTINA_DEFAULT_REGION = {
  latitude: -38.416097,
  longitude: -63.616672,
  latitudeDelta: 36,
  longitudeDelta: 28,
};

const toErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message.trim()) return error.message;
  return fallback;
};

const formatRating = (value: number | null) => {
  if (value === null || value === undefined || !Number.isFinite(Number(value)) || Number(value) <= 0) {
    return 'Sin rating';
  }
  return `${Number(value).toFixed(1)} pts`;
};

export default function ClientMapScreen() {
  const navigation = useNavigation<any>();
  const { height } = useWindowDimensions();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mapLoading, setMapLoading] = useState(false);
  const [mapError, setMapError] = useState('');
  const [fullscreenVisible, setFullscreenVisible] = useState(false);
  const [payload, setPayload] = useState<ClientTechniciansMapPayload | null>(null);
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string | null>(null);

  const loadMap = useCallback(
    async (mode: 'initial' | 'refresh' | 'manual' = 'initial') => {
      if (mode === 'refresh') setRefreshing(true);
      else if (mode === 'manual') setMapLoading(true);
      else setLoading(true);

      setMapError('');

      try {
        const nextPayload = await fetchClientTechniciansMap();
        setPayload(nextPayload);
        setSelectedTechnicianId((current) =>
          current && nextPayload.technicians.some((technician) => technician.id === current) ? current : null
        );
      } catch (error) {
        setMapError(toErrorMessage(error, 'No pudimos cargar el mapa nacional de tecnicos.'));
      } finally {
        setLoading(false);
        setRefreshing(false);
        setMapLoading(false);
      }
    },
    []
  );

  useFocusEffect(
    useCallback(() => {
      void loadMap('initial');
    }, [loadMap])
  );

  const technicians = payload?.technicians || [];
  const availableCount = payload?.stats?.available_now ?? technicians.filter((technician) => technician.available_now).length;
  const cityCount =
    payload?.stats?.cities ?? new Set(technicians.map((technician) => technician.city).filter(Boolean)).size;
  const selectedTechnician =
    technicians.find((technician) => technician.id === selectedTechnicianId) || null;

  const mapPoints = useMemo<MapPoint[]>(() => {
    return technicians
      .map((technician: ClientTechniciansMapTechnician) => {
        const lat = Number(technician.lat);
        const lng = Number(technician.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

        return {
          id: technician.id,
          title: technician.name,
          amount: Number(technician.rating || 0),
          address: [technician.address, technician.city].filter(Boolean).join(', '),
          createdAt: new Date().toISOString(),
          lat,
          lng,
          status: technician.available_now
            ? { key: 'available', label: 'Disponible ahora', color: '#10B981' }
            : { key: 'offline', label: 'Fuera de horario', color: '#F59E0B' },
        };
      })
      .filter(Boolean) as MapPoint[];
  }, [technicians]);

  const mapRegion = useMemo(() => {
    if (!mapPoints.length) return ARGENTINA_DEFAULT_REGION;

    const lats = mapPoints.map((point) => point.lat);
    const lngs = mapPoints.map((point) => point.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max(ARGENTINA_DEFAULT_REGION.latitudeDelta / 3, (maxLat - minLat) * 1.5),
      longitudeDelta: Math.max(ARGENTINA_DEFAULT_REGION.longitudeDelta / 3, (maxLng - minLng) * 1.5),
    };
  }, [mapPoints]);

  const mapKey = `${mapPoints.length}-${mapRegion.latitude}-${mapRegion.longitude}`;
  const fullscreenMapHeight = Math.max(440, height - 220);

  const handleOpenTechnicianProfile = useCallback(
    (technicianId: string | null | undefined) => {
      const safeTechnicianId = String(technicianId || '').trim();
      if (!safeTechnicianId) return;
      setFullscreenVisible(false);
      const parentNavigation = navigation.getParent?.();
      if (parentNavigation?.navigate) {
        parentNavigation.navigate('ClientTechnicianProfile', { technicianId: safeTechnicianId });
        return;
      }
      navigation.navigate('ClientTechnicianProfile', { technicianId: safeTechnicianId });
    },
    [navigation]
  );

  const renderSelectionPill = useCallback(
    (fullscreen = false) => {
      if (!selectedTechnician) return null;

      return (
        <View style={[styles.selectionPill, fullscreen && styles.selectionPillFullscreen]}>
          <View style={styles.selectionCopy}>
            <Text style={styles.selectionTitle}>{selectedTechnician.name}</Text>
            <Text style={styles.selectionMeta} numberOfLines={1}>
              {selectedTechnician.specialty || 'Servicios generales'} | {selectedTechnician.city || 'Sin ciudad'}
            </Text>
            <Text style={styles.selectionAddress} numberOfLines={1}>
              {selectedTechnician.address || 'Sin direccion visible'}
            </Text>
          </View>

          <View style={styles.selectionAside}>
            <Text style={styles.selectionRating}>{formatRating(selectedTechnician.rating)}</Text>
            <TouchableOpacity
              style={styles.selectionProfileBtn}
              onPress={() => handleOpenTechnicianProfile(selectedTechnician.id)}
            >
              <Text style={styles.selectionProfileBtnText}>Ver perfil</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    },
    [handleOpenTechnicianProfile, selectedTechnician]
  );

  const renderMapShell = useCallback(
    (mapHeight: number, fullscreen = false) => (
      <View style={[styles.mapShell, fullscreen && styles.mapShellFullscreen]}>
        <MapCanvas
          key={`${mapKey}-${fullscreen ? 'full' : 'inline'}`}
          points={mapPoints}
          region={mapRegion}
          onSelect={(point) => setSelectedTechnicianId(point.id)}
          formatMoney={(value) => (value > 0 ? `${value.toFixed(1)} pts` : 'Sin rating')}
          valuePrefix=""
          height={mapHeight}
        />

        <View style={[styles.mapOverlayTopRow, fullscreen && styles.mapOverlayTopRowFullscreen]}>
          <View style={styles.mapTopPill}>
            <Ionicons name="locate-outline" size={13} color="#0F172A" />
            <Text style={styles.mapTopPillText}>{technicians.length} tecnicos visibles</Text>
          </View>

          {!fullscreen ? (
            <TouchableOpacity style={styles.mapExpandBtn} onPress={() => setFullscreenVisible(true)}>
              <Ionicons name="expand-outline" size={14} color="#FFFFFF" />
              <Text style={styles.mapExpandBtnText}>Pantalla completa</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {selectedTechnician ? (
          <View style={[styles.selectionOverlay, fullscreen && styles.selectionOverlayFullscreen]}>
            {renderSelectionPill(fullscreen)}
          </View>
        ) : null}
      </View>
    ),
    [mapKey, mapPoints, mapRegion, renderSelectionPill, selectedTechnician, technicians.length]
  );

  return (
    <View style={styles.container}>
      <ScreenHeader title="Mapa tecnico" subtitle="Argentina" centerTitle />

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={COLORS.primary} />
          <Text style={styles.loadingText}>Cargando red nacional de tecnicos...</Text>
        </View>
      ) : (
        <>
          <ScrollView
            contentContainerStyle={styles.content}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadMap('refresh')} />}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.heroCard}>
              <View style={styles.heroGlowPrimary} />
              <View style={styles.heroGlowSecondary} />
              <Text style={styles.heroEyebrow}>Red nacional</Text>
              <Text style={styles.heroTitle}>Tecnicos publicados en Argentina</Text>
              <Text style={styles.heroText}>
                Explora cobertura real, abre el mapa completo por zona y entra al perfil del tecnico que selecciones.
              </Text>

              <View style={styles.metricsRow}>
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>En mapa</Text>
                  <Text style={styles.metricValue}>{technicians.length}</Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>Disponibles</Text>
                  <Text style={styles.metricValue}>{availableCount}</Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>Ciudades</Text>
                  <Text style={styles.metricValue}>{cityCount}</Text>
                </View>
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionCopy}>
                  <Text style={styles.sectionEyebrow}>Cobertura</Text>
                  <Text style={styles.cardTitle}>Mapa operativo cliente</Text>
                </View>
                <TouchableOpacity style={styles.inlineRefreshBtn} onPress={() => loadMap('manual')} disabled={mapLoading}>
                  <Ionicons name={mapLoading ? 'hourglass-outline' : 'refresh'} size={14} color="#334155" />
                  <Text style={styles.inlineRefreshText}>{mapLoading ? 'Actualizando' : 'Actualizar'}</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.sectionDescription}>
                Base del mapa: {payload?.center?.label || 'Argentina'} | Toca un tecnico para ver su pastilla y abrir su perfil.
              </Text>

              {!!payload?.warning && (
                <View style={styles.noticeCard}>
                  <Ionicons name="alert-circle-outline" size={16} color="#92400E" />
                  <Text style={styles.warningText}>{payload.warning}</Text>
                </View>
              )}
              {!!mapError && (
                <View style={[styles.noticeCard, styles.noticeCardError]}>
                  <Ionicons name="warning-outline" size={16} color="#991B1B" />
                  <Text style={styles.errorInline}>{mapError}</Text>
                </View>
              )}

              {mapLoading && !mapPoints.length ? (
                <View style={styles.mapLoadingWrap}>
                  <ActivityIndicator color={COLORS.primary} />
                  <Text style={styles.mapLoadingText}>Actualizando tecnicos publicados...</Text>
                </View>
              ) : mapPoints.length ? (
                <>
                  {renderMapShell(360)}

                  <Text style={styles.mapHint}>
                    Usa la pantalla completa para recorrer mejor cada zona de Argentina y enfocar tecnicos por area.
                  </Text>

                  <View style={styles.listHeader}>
                    <Text style={styles.listTitle}>Tecnicos destacados</Text>
                    {technicians.length > 12 ? (
                      <Text style={styles.listHint}>Lista resumida. Todos siguen visibles en el mapa.</Text>
                    ) : null}
                  </View>

                  <View style={styles.listWrap}>
                    {technicians.slice(0, 12).map((technician) => {
                      const selected = technician.id === selectedTechnicianId;
                      return (
                        <TouchableOpacity
                          key={technician.id}
                          activeOpacity={0.9}
                          onPress={() => setSelectedTechnicianId(technician.id)}
                          style={[styles.techRow, selected && styles.techRowSelected]}
                        >
                          <View style={styles.techRowMain}>
                            <View style={styles.techRowTitleWrap}>
                              <Text style={styles.techName}>{technician.name}</Text>
                              <Text style={styles.techRating}>{formatRating(technician.rating)}</Text>
                            </View>
                            <Text style={styles.techMeta} numberOfLines={1}>
                              {technician.specialty || 'Servicios generales'} | {technician.city || 'Sin ciudad'}
                            </Text>
                            <Text style={styles.techAddress} numberOfLines={1}>
                              {technician.address || 'Sin direccion visible'}
                            </Text>
                          </View>

                          <View style={styles.techRowAside}>
                            <View
                              style={[
                                styles.rowBadge,
                                technician.available_now ? styles.rowBadgeOn : styles.rowBadgeOff,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.rowBadgeText,
                                  technician.available_now ? styles.rowBadgeTextOn : styles.rowBadgeTextOff,
                                ]}
                              >
                                {technician.available_now ? 'Ahora' : 'Horario'}
                              </Text>
                            </View>

                            {selected ? (
                              <TouchableOpacity
                                style={styles.rowProfileBtn}
                                onPress={() => handleOpenTechnicianProfile(technician.id)}
                              >
                                <Text style={styles.rowProfileBtnText}>Ver perfil</Text>
                              </TouchableOpacity>
                            ) : null}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              ) : (
                <View style={styles.emptyMapBox}>
                  <Ionicons name="map-outline" size={20} color="#94A3B8" />
                  <Text style={styles.emptyMapText}>
                    Aun no hay tecnicos publicados con geolocalizacion para mostrar en el mapa nacional.
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>

          <Modal visible={fullscreenVisible} animationType="slide" onRequestClose={() => setFullscreenVisible(false)}>
            <SafeAreaView style={styles.fullscreenContainer}>
              <View style={styles.fullscreenHeader}>
                <View style={styles.fullscreenCopy}>
                  <Text style={styles.fullscreenTitle}>Mapa tecnico Argentina</Text>
                  <Text style={styles.fullscreenText}>
                    Navega por zona, toca un tecnico y abre su perfil desde la pastilla inferior.
                  </Text>
                </View>

                <TouchableOpacity style={styles.fullscreenCloseBtn} onPress={() => setFullscreenVisible(false)}>
                  <Ionicons name="close" size={20} color="#0F172A" />
                </TouchableOpacity>
              </View>

              <View style={styles.fullscreenMapCard}>{renderMapShell(fullscreenMapHeight, true)}</View>
            </SafeAreaView>
          </Modal>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
  loadingText: { fontFamily: FONTS.body, color: COLORS.textSecondary },
  content: { padding: 16, gap: 14, paddingBottom: 30 },
  heroCard: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#F5F1E8',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E9DFC9',
    padding: 20,
    gap: 12,
  },
  heroGlowPrimary: {
    position: 'absolute',
    top: -40,
    right: -10,
    width: 150,
    height: 150,
    borderRadius: 999,
    backgroundColor: 'rgba(249, 115, 22, 0.14)',
  },
  heroGlowSecondary: {
    position: 'absolute',
    bottom: -54,
    left: -24,
    width: 150,
    height: 150,
    borderRadius: 999,
    backgroundColor: 'rgba(20, 184, 166, 0.12)',
  },
  heroEyebrow: {
    fontFamily: FONTS.subtitle,
    color: '#9A8F7B',
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  heroTitle: {
    fontFamily: FONTS.title,
    color: '#0F172A',
    fontSize: 22,
  },
  heroText: {
    fontFamily: FONTS.body,
    color: '#475569',
    fontSize: 13,
    lineHeight: 19,
    maxWidth: '92%',
  },
  metricsRow: { flexDirection: 'row', gap: 10 },
  metricCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EFE6D8',
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 4,
  },
  metricLabel: {
    fontFamily: FONTS.body,
    color: '#64748B',
    fontSize: 11,
  },
  metricValue: {
    fontFamily: FONTS.title,
    color: '#0F172A',
    fontSize: 22,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#EDE6DB',
    padding: 18,
    gap: 14,
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionCopy: { flex: 1, gap: 4 },
  sectionEyebrow: {
    fontFamily: FONTS.subtitle,
    color: '#9A8F7B',
    fontSize: 10,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  cardTitle: {
    fontFamily: FONTS.title,
    fontSize: 20,
    color: '#0F172A',
  },
  sectionDescription: {
    fontFamily: FONTS.body,
    color: '#64748B',
    fontSize: 12,
    lineHeight: 18,
  },
  inlineRefreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D7DEE7',
    backgroundColor: '#F8FAFC',
  },
  inlineRefreshText: {
    fontFamily: FONTS.subtitle,
    color: '#334155',
    fontSize: 11,
  },
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
    backgroundColor: '#FFFBEB',
  },
  noticeCardError: {
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
  },
  warningText: {
    flex: 1,
    fontFamily: FONTS.body,
    color: '#92400E',
    fontSize: 12,
    lineHeight: 17,
  },
  errorInline: {
    flex: 1,
    fontFamily: FONTS.body,
    color: '#991B1B',
    fontSize: 12,
    lineHeight: 17,
  },
  mapLoadingWrap: {
    height: 220,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EFE9DE',
    backgroundColor: '#FBFBF9',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  mapLoadingText: {
    fontFamily: FONTS.body,
    color: '#64748B',
    fontSize: 12,
  },
  mapShell: {
    position: 'relative',
  },
  mapShellFullscreen: {
    flex: 1,
  },
  mapOverlayTopRow: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  mapOverlayTopRowFullscreen: {
    top: 14,
  },
  mapTopPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  mapTopPillText: {
    fontFamily: FONTS.subtitle,
    color: '#0F172A',
    fontSize: 11,
  },
  mapExpandBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.88)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  mapExpandBtnText: {
    fontFamily: FONTS.subtitle,
    color: '#FFFFFF',
    fontSize: 11,
  },
  selectionOverlay: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
  },
  selectionOverlayFullscreen: {
    bottom: 16,
  },
  selectionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#F1E3C8',
    backgroundColor: 'rgba(255,249,240,0.98)',
    padding: 14,
  },
  selectionPillFullscreen: {
    borderColor: '#E2E8F0',
    backgroundColor: 'rgba(255,255,255,0.98)',
  },
  selectionCopy: {
    flex: 1,
    gap: 4,
  },
  selectionTitle: {
    fontFamily: FONTS.subtitle,
    color: '#0F172A',
    fontSize: 14,
  },
  selectionMeta: {
    fontFamily: FONTS.body,
    color: '#475569',
    fontSize: 12,
  },
  selectionAddress: {
    fontFamily: FONTS.body,
    color: '#64748B',
    fontSize: 11,
  },
  selectionAside: {
    alignItems: 'flex-end',
    gap: 8,
  },
  selectionRating: {
    fontFamily: FONTS.subtitle,
    color: '#C2410C',
    fontSize: 12,
  },
  selectionProfileBtn: {
    borderRadius: 999,
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  selectionProfileBtnText: {
    fontFamily: FONTS.subtitle,
    color: '#FFFFFF',
    fontSize: 11,
  },
  mapHint: {
    fontFamily: FONTS.body,
    color: '#64748B',
    fontSize: 12,
    lineHeight: 18,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  listTitle: {
    fontFamily: FONTS.subtitle,
    color: '#0F172A',
    fontSize: 13,
  },
  listHint: {
    fontFamily: FONTS.body,
    color: '#94A3B8',
    fontSize: 11,
    flex: 1,
    textAlign: 'right',
  },
  listWrap: { gap: 10 },
  techRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    padding: 14,
  },
  techRowSelected: {
    borderColor: '#F59E0B',
    backgroundColor: '#FFF7ED',
  },
  techRowMain: { flex: 1, gap: 4 },
  techRowTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  techName: {
    flex: 1,
    fontFamily: FONTS.subtitle,
    color: '#0F172A',
    fontSize: 13,
  },
  techRating: {
    fontFamily: FONTS.subtitle,
    color: '#C2410C',
    fontSize: 11,
  },
  techMeta: {
    fontFamily: FONTS.body,
    color: '#475569',
    fontSize: 12,
  },
  techAddress: {
    fontFamily: FONTS.body,
    color: '#64748B',
    fontSize: 11,
  },
  techRowAside: {
    alignItems: 'flex-end',
    gap: 8,
  },
  rowBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  rowBadgeOn: {
    borderColor: '#BBF7D0',
    backgroundColor: '#F0FDF4',
  },
  rowBadgeOff: {
    borderColor: '#FDE68A',
    backgroundColor: '#FFFBEB',
  },
  rowBadgeText: {
    fontFamily: FONTS.subtitle,
    fontSize: 10,
  },
  rowBadgeTextOn: { color: '#166534' },
  rowBadgeTextOff: { color: '#92400E' },
  rowProfileBtn: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D7DEE7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
  },
  rowProfileBtnText: {
    fontFamily: FONTS.subtitle,
    color: '#334155',
    fontSize: 10,
  },
  emptyMapBox: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyMapText: {
    textAlign: 'center',
    fontFamily: FONTS.body,
    color: '#64748B',
    fontSize: 12,
    lineHeight: 18,
  },
  fullscreenContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  fullscreenHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  fullscreenCopy: {
    flex: 1,
    gap: 4,
  },
  fullscreenTitle: {
    fontFamily: FONTS.title,
    color: '#0F172A',
    fontSize: 24,
  },
  fullscreenText: {
    fontFamily: FONTS.body,
    color: '#64748B',
    fontSize: 12,
    lineHeight: 18,
  },
  fullscreenCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  fullscreenMapCard: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
});
