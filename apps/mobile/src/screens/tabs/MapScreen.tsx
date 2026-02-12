import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { ScreenHeader } from '../../components/molecules/ScreenHeader';
import MapCanvas from '../../components/molecules/MapCanvas';
import { SkeletonBlock } from '../../components/molecules/SkeletonBlock';
import { supabase } from '../../lib/supabase';
import { MapPoint } from '../../types/maps';
import { COLORS, FONTS } from '../../utils/theme';
import { formatCurrency } from '../../utils/number';
import { isApproved, isClosed, isPending, normalizeStatus } from '../../utils/status';

type QuoteListItem = {
  id: string;
  client_name?: string | null;
  client_address?: string | null;
  address?: string | null;
  location_address?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
  total_amount?: number | null;
  status?: string | null;
  created_at: string;
};

const STATUS_COLORS = {
  pending: '#F59E0B',
  approved: '#10B981',
  closed: '#059669',
};

async function getQuotes(): Promise<QuoteListItem[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('quotes')
    .select('id, client_name, client_address, address, location_address, location_lat, location_lng, total_amount, status, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export default function MapScreen() {
  const navigation = useNavigation();
  const [mapSelection, setMapSelection] = useState<MapPoint | null>(null);
  const { data: jobs = [], isLoading, error, refetch } = useQuery<QuoteListItem[]>({
    queryKey: ['quotes-list'],
    queryFn: getQuotes,
    staleTime: 60000,
  });

  const formatMoney = useCallback((value: number) => formatCurrency(value), []);

  const mapPoints = useMemo<MapPoint[]>(() => {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - 3);

    const resolveStatus = (status: string) => {
      if (isClosed(status)) return { key: 'closed', label: 'Cerrado', color: STATUS_COLORS.closed };
      if (isApproved(status)) return { key: 'approved', label: 'Aprobado', color: STATUS_COLORS.approved };
      if (isPending(status)) return { key: 'pending', label: 'Presupuestado', color: STATUS_COLORS.pending };
      return null;
    };

    return jobs
      .map((job) => {
        const createdAt = new Date(job.created_at);
        if (Number.isNaN(createdAt.getTime()) || createdAt < cutoff) return null;
        const lat = Number(job.location_lat);
        const lng = Number(job.location_lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        const status = resolveStatus(normalizeStatus(job.status));
        if (!status) return null;
        return {
          id: job.id,
          title: job.client_name || `Presupuesto #${job.id.slice(0, 4).toUpperCase()}`,
          amount: job.total_amount || 0,
          address: job.client_address || job.address || job.location_address || '',
          createdAt: job.created_at,
          lat,
          lng,
          status,
        };
      })
      .filter(Boolean) as MapPoint[];
  }, [jobs]);

  const mapCounts = useMemo(() => {
    return mapPoints.reduce(
      (acc, point) => {
        if (point.status.key === 'pending') acc.pending += 1;
        if (point.status.key === 'approved') acc.approved += 1;
        if (point.status.key === 'closed') acc.closed += 1;
        return acc;
      },
      { pending: 0, approved: 0, closed: 0 }
    );
  }, [mapPoints]);

  const mapRegion = useMemo(() => {
    if (!mapPoints.length) {
      return {
        latitude: -34.6037,
        longitude: -58.3816,
        latitudeDelta: 0.35,
        longitudeDelta: 0.35,
      };
    }
    const lats = mapPoints.map((point) => point.lat);
    const lngs = mapPoints.map((point) => point.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const latitude = (minLat + maxLat) / 2;
    const longitude = (minLng + maxLng) / 2;
    const latitudeDelta = Math.max(0.05, (maxLat - minLat) * 1.6);
    const longitudeDelta = Math.max(0.05, (maxLng - minLng) * 1.6);
    return { latitude, longitude, latitudeDelta, longitudeDelta };
  }, [mapPoints]);

  const mapKey = `${mapPoints.length}-${mapRegion.latitude}-${mapRegion.longitude}`;
  const subtitle = `${mapPoints.length} trabajos · últimos 3 meses`;

  return (
    <View style={styles.container}>
      <ScreenHeader title="MAPA" subtitle={subtitle} centerTitle />
      <View style={styles.content}>
        {isLoading ? (
          <View style={styles.mapPanel}>
            <View style={styles.mapHeader}>
              <View style={styles.mapTitleRow}>
                <SkeletonBlock width={160} height={12} radius={6} />
                <SkeletonBlock width={70} height={12} radius={6} />
              </View>
              <View style={styles.mapPills}>
                <SkeletonBlock width={120} height={22} radius={999} />
                <SkeletonBlock width={110} height={22} radius={999} />
                <SkeletonBlock width={100} height={22} radius={999} />
              </View>
            </View>
            <SkeletonBlock height={420} radius={14} />
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Ionicons name="alert-circle-outline" size={40} color={COLORS.danger} />
            <Text style={styles.emptyText}>No pudimos cargar el mapa.</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
              <Text style={styles.retryText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.mapPanel}>
              <View style={styles.mapHeader}>
                <View style={styles.mapTitleRow}>
                  <Text style={styles.mapTitle}>MAPA · ULTIMOS 3 MESES</Text>
                  <Text style={styles.mapCountText}>{mapPoints.length} trabajos</Text>
                </View>
                <View style={styles.mapPills}>
                  <View style={[styles.mapPill, { borderColor: STATUS_COLORS.pending }]}>
                    <View style={[styles.mapPillDot, { backgroundColor: STATUS_COLORS.pending }]} />
                    <Text style={styles.mapPillText}>Presupuestados {mapCounts.pending}</Text>
                  </View>
                  <View style={[styles.mapPill, { borderColor: STATUS_COLORS.approved }]}>
                    <View style={[styles.mapPillDot, { backgroundColor: STATUS_COLORS.approved }]} />
                    <Text style={styles.mapPillText}>Aprobados {mapCounts.approved}</Text>
                  </View>
                  <View style={[styles.mapPill, { borderColor: STATUS_COLORS.closed }]}>
                    <View style={[styles.mapPillDot, { backgroundColor: STATUS_COLORS.closed }]} />
                    <Text style={styles.mapPillText}>Cerrados {mapCounts.closed}</Text>
                  </View>
                </View>
              </View>
              <MapCanvas
                key={mapKey}
                points={mapPoints}
                region={mapRegion}
                onSelect={(point) => setMapSelection(point)}
                formatMoney={formatMoney}
                height={420}
              />
              {!mapPoints.length && (
                <Text style={styles.emptyHint}>
                  Agregá ubicaciones en tus presupuestos para verlos en el mapa.
                </Text>
              )}
            </View>
          </>
        )}
      </View>

      {mapSelection && (
        <MapDetailSheet
          point={mapSelection}
          onClose={() => setMapSelection(null)}
          onOpen={(id) => {
            setMapSelection(null);
            // @ts-ignore
            navigation.navigate('JobDetail', { jobId: id });
          }}
        />
      )}
    </View>
  );
}

const MapDetailSheet = ({
  point,
  onClose,
  onOpen,
}: {
  point: MapPoint;
  onClose: () => void;
  onOpen: (id: string) => void;
}) => (
  <Modal transparent animationType="fade" visible onRequestClose={onClose}>
    <Pressable style={styles.sheetOverlay} onPress={onClose}>
      <Pressable style={styles.sheetContainer} onPress={() => null}>
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetTitle}>{point.title}</Text>
        {!!point.address && <Text style={styles.sheetAddress}>{point.address}</Text>}
        <Text style={styles.sheetMeta}>
          {point.status.label} · ${formatCurrency(point.amount || 0)}
        </Text>
        <Text style={styles.sheetDate}>
          {new Date(point.createdAt).toLocaleDateString()}
        </Text>
        <View style={styles.sheetActions}>
          <TouchableOpacity style={styles.sheetBtnGhost} onPress={onClose}>
            <Text style={styles.sheetBtnGhostText}>Cerrar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.sheetBtnPrimary} onPress={() => onOpen(point.id)}>
            <Text style={styles.sheetBtnPrimaryText}>Ver detalle</Text>
            <Ionicons name="arrow-forward" size={16} color="#FFF" />
          </TouchableOpacity>
        </View>
      </Pressable>
    </Pressable>
  </Modal>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
  emptyText: { fontSize: 13, fontFamily: FONTS.body, color: '#64748B' },
  retryBtn: {
    marginTop: 6,
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 999,
    backgroundColor: COLORS.secondary,
  },
  retryText: { fontSize: 12, fontFamily: FONTS.subtitle, color: '#FFF' },
  mapPanel: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EFE9DE',
    shadowColor: '#1F2937',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: Platform.OS === 'web' ? 0 : 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  mapHeader: { gap: 10, marginBottom: 12 },
  mapTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  mapTitle: { fontSize: 11, fontFamily: FONTS.subtitle, color: '#9A8F7B', letterSpacing: 1.2 },
  mapCountText: { fontSize: 11, fontFamily: FONTS.subtitle, color: '#94A3B8' },
  mapPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  mapPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#FFFFFF',
  },
  mapPillDot: { width: 6, height: 6, borderRadius: 999 },
  mapPillText: { fontSize: 11, fontFamily: FONTS.subtitle, color: '#475569' },
  emptyHint: { marginTop: 10, fontSize: 11, fontFamily: FONTS.body, color: '#94A3B8' },
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sheetHandle: {
    width: 42,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginBottom: 12,
  },
  sheetTitle: { fontSize: 16, fontFamily: FONTS.title, color: '#0F172A' },
  sheetAddress: { fontSize: 12, fontFamily: FONTS.body, color: '#64748B', marginTop: 4 },
  sheetMeta: { fontSize: 13, fontFamily: FONTS.subtitle, color: '#0F172A', marginTop: 8 },
  sheetDate: { fontSize: 11, fontFamily: FONTS.body, color: '#94A3B8', marginTop: 4 },
  sheetActions: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginTop: 16 },
  sheetBtnGhost: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  sheetBtnGhostText: { fontSize: 12, fontFamily: FONTS.subtitle, color: '#475569', letterSpacing: 0.4 },
  sheetBtnPrimary: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  sheetBtnPrimaryText: { fontSize: 12, fontFamily: FONTS.subtitle, color: '#FFF', letterSpacing: 0.4 },
});
