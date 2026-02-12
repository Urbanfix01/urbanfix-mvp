import React, { useMemo, useRef, useState } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, 
  StatusBar, ActivityIndicator, Alert, Share, Platform, Modal, Pressable, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Polyline, Circle, Line, Text as SvgText } from 'react-native-svg';
import { FlashList } from '@shopify/flash-list';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { COLORS, FONTS } from '../../utils/theme';
import { ServiceBlueprint } from '../../types/database';
import MapCanvas from '../../components/molecules/MapCanvas';
import { MapPoint } from '../../types/maps';
import { supabase } from '../../lib/supabase'; 
import { getPublicQuoteUrl } from '../../utils/config';

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

type DashboardFilter = 'total' | 'pending' | 'approved' | 'paid';

const STATUS_COLORS = {
  total: '#0F172A',
  pending: '#F59E0B',
  presented: '#3B82F6',
  approved: '#10B981',
  paid: '#059669',
  closed: '#059669',
};

const FILTER_LABELS: Record<DashboardFilter, string> = {
  total: 'Todos',
  pending: 'Pendientes',
  approved: 'Aprobados',
  paid: 'Cobrados',
};

async function getQuotes(): Promise<QuoteListItem[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('quotes')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export default function JobsScreen() {
  const navigation = useNavigation();
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [trendWidth, setTrendWidth] = useState(0);
  const [mapSelection, setMapSelection] = useState<MapPoint | null>(null);
  const [activeFilter, setActiveFilter] = useState<DashboardFilter>('total');
  const [listAnchor, setListAnchor] = useState(0);
  const listRef = useRef<any>(null);

  const queryClient = useQueryClient();
  const { data: jobs = [], isLoading, error, refetch, isFetching } = useQuery<QuoteListItem[]>({
    queryKey: ['quotes-list'],
    queryFn: getQuotes,
    staleTime: 60000,
  });

  const visibleJobs = useMemo(() => {
    const normalized = (value?: string | null) => (value || '').toLowerCase().trim();
    const isPending = (status: string) => ['pending', 'draft', 'pendiente', 'presented', 'sent'].includes(status);
    const isApproved = (status: string) => ['approved', 'aprobado', 'accepted'].includes(status);
    const isPaid = (status: string) => ['paid', 'cobrado', 'cobrados', 'pagado', 'pagados', 'charged'].includes(status);

    return jobs.filter((job) => {
      const status = normalized(job.status);
      if (activeFilter === 'total') return true;
      if (activeFilter === 'pending') return isPending(status);
      if (activeFilter === 'approved') return isApproved(status);
      if (activeFilter === 'paid') return isPaid(status);
      return true;
    });
  }, [jobs, activeFilter]);

  // --- FIX 1: ESTADISTICAS ROBUSTAS (Suma todo lo que sea similar) ---
  const stats = useMemo(() => {
    let totalCount = 0;
    let pendingCount = 0;
    let approvedCount = 0;
    let paidCount = 0;
    let totalAmount = 0;
    let pendingAmount = 0;
    let approvedAmount = 0;
    let paidAmount = 0;

    jobs.forEach((job) => {
      const status = (job.status || '').toLowerCase().trim();
      const amount = job.total_amount || 0;
      const isPending = ['pending', 'draft', 'pendiente', 'presented', 'sent'].includes(status);
      const isApproved = ['approved', 'aprobado', 'accepted'].includes(status);
      const isPaid = ['paid', 'cobrado', 'cobrados', 'pagado', 'pagados', 'charged'].includes(status);

      totalCount += 1;
      totalAmount += amount;
      if (isPending) {
        pendingCount += 1;
        pendingAmount += amount;
      }
      if (isApproved) {
        approvedCount += 1;
        approvedAmount += amount;
      }
      if (isPaid) {
        paidCount += 1;
        paidAmount += amount;
      }
    });

    return {
      totalCount,
      pendingCount,
      approvedCount,
      paidCount,
      totalAmount,
      pendingAmount,
      approvedAmount,
      paidAmount,
    };
  }, [jobs]);

  const monthStats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    let totalAmount = 0;
    let approvedAmount = 0;
    let paidAmount = 0;

    jobs.forEach((job) => {
      const createdAt = new Date(job.created_at);
      if (Number.isNaN(createdAt.getTime())) return;
      if (createdAt.getFullYear() !== currentYear || createdAt.getMonth() !== currentMonth) return;

      const amount = job.total_amount || 0;
      const status = (job.status || '').toLowerCase().trim();
      const isApproved = ['approved', 'aprobado', 'accepted'].includes(status);
      const isPaid = ['paid', 'cobrado', 'cobrados', 'pagado', 'pagados', 'charged'].includes(status);

      totalAmount += amount;
      if (isApproved) approvedAmount += amount;
      if (isPaid) paidAmount += amount;
    });

    return { totalAmount, approvedAmount, paidAmount };
  }, [jobs]);

  const formatNumberSafe = (value: number) => {
    const safe = Number(value || 0);
    try {
      // Intl puede fallar en Android si falta el locale; usamos fallback.
      return new Intl.NumberFormat('es-AR').format(safe);
    } catch (_err) {
      const [intPart, decPart] = safe.toString().split('.');
      const withSeparators = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      if (decPart) return `${withSeparators},${decPart}`;
      return withSeparators;
    }
  };
  const formatMoney = (value: number) => formatNumberSafe(value);
  const formatCompact = (value: number) => {
    const safe = Number(value || 0);
    if (safe >= 1_000_000) return `${(safe / 1_000_000).toFixed(1)}M`;
    if (safe >= 1_000) return `${Math.round(safe / 1_000)}k`;
    return `${Math.round(safe)}`;
  };

  const dashboardCards = [
    {
      key: 'total',
      filter: 'total' as DashboardFilter,
      label: 'Total presupuestos',
      value: stats.totalCount,
      hint: 'Activos en tu cuenta',
      accent: STATUS_COLORS.total,
    },
    {
      key: 'pending',
      filter: 'pending' as DashboardFilter,
      label: 'Pendientes',
      value: stats.pendingCount,
      hint: 'En espera de respuesta',
      accent: STATUS_COLORS.pending,
    },
    {
      key: 'approved',
      filter: 'approved' as DashboardFilter,
      label: 'Aprobados',
      value: stats.approvedCount,
      hint: 'Listos para ejecutar',
      accent: STATUS_COLORS.approved,
    },
    {
      key: 'paid',
      filter: 'paid' as DashboardFilter,
      label: 'Cobrados',
      value: stats.paidCount,
      hint: 'Pagos confirmados',
      accent: STATUS_COLORS.paid,
    },
  ];

  const billingCards = [
    {
      key: 'billing-total',
      label: 'Total',
      value: `$${formatMoney(monthStats.totalAmount)}`,
      hint: 'Presupuestos del mes',
      accent: STATUS_COLORS.total,
    },
    {
      key: 'billing-approved',
      label: 'Aprobados',
      value: `$${formatMoney(monthStats.approvedAmount)}`,
      hint: 'Aprobados del mes',
      accent: STATUS_COLORS.approved,
    },
    {
      key: 'billing-paid',
      label: 'Cobrados',
      value: `$${formatMoney(monthStats.paidAmount)}`,
      hint: 'Monto cobrado del mes',
      accent: STATUS_COLORS.paid,
    },
  ];

  const statusCounts = useMemo(() => {
    let pending = 0;
    let approved = 0;
    let closed = 0;

    jobs.forEach((job) => {
      const status = (job.status || '').toLowerCase().trim();
      const isPending = ['pending', 'draft', 'pendiente', 'presented', 'sent'].includes(status);
      const isApproved = ['approved', 'aprobado', 'accepted'].includes(status);
      const isClosed = [
        'completed',
        'completado',
        'finalizado',
        'finalizados',
        'paid',
        'cobrado',
        'cobrados',
        'pagado',
        'pagados',
        'charged',
      ].includes(status);

      if (isPending) pending += 1;
      if (isApproved) approved += 1;
      if (isClosed) closed += 1;
    });

    return { pending, approved, closed };
  }, [jobs]);

  const statusChart = [
    { key: 'pending', label: 'Pendientes', value: statusCounts.pending, color: STATUS_COLORS.pending },
    { key: 'approved', label: 'Aprobados', value: statusCounts.approved, color: STATUS_COLORS.approved },
    { key: 'closed', label: 'Cerrados', value: statusCounts.closed, color: STATUS_COLORS.closed },
  ];

  const maxStatusCount = Math.max(1, ...statusChart.map((item) => item.value));

  const mapPoints = useMemo<MapPoint[]>(() => {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - 3);

    const normalizeStatus = (status?: string | null) => (status || '').toLowerCase().trim();
    const isPending = (status: string) => ['pending', 'draft', 'pendiente', 'presented', 'sent'].includes(status);
    const isApproved = (status: string) => ['approved', 'aprobado', 'accepted'].includes(status);
    const isClosed = (status: string) =>
      [
        'completed',
        'completado',
        'finalizado',
        'finalizados',
        'paid',
        'cobrado',
        'cobrados',
        'pagado',
        'pagados',
        'charged',
      ].includes(status);

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
          title: job.client_name || `Presupuesto #${job.id.slice(0,4).toUpperCase()}`,
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

  const handleOpenMapDetail = (point: MapPoint) => {
    setMapSelection(point);
  };

  const handleCloseMapDetail = () => setMapSelection(null);

  const trendData = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const monthLabels = [
      'Ene',
      'Feb',
      'Mar',
      'Abr',
      'May',
      'Jun',
      'Jul',
      'Ago',
      'Sep',
      'Oct',
      'Nov',
      'Dic',
    ];
    const months = monthLabels.map((label, index) => ({
      key: `${year}-${String(index + 1).padStart(2, '0')}`,
      label,
      month: index,
      year,
    }));

    const totals = new Map<string, { total: number; paid: number }>();
    months.forEach((month) => totals.set(month.key, { total: 0, paid: 0 }));

    jobs.forEach((job) => {
      const createdAt = new Date(job.created_at);
      if (Number.isNaN(createdAt.getTime())) return;
      if (createdAt.getFullYear() !== year) return;
      const key = `${year}-${String(createdAt.getMonth() + 1).padStart(2, '0')}`;
      const bucket = totals.get(key);
      if (!bucket) return;
      const amount = job.total_amount || 0;
      const status = (job.status || '').toLowerCase().trim();
      const isPaid = ['paid', 'cobrado', 'cobrados', 'pagado', 'pagados', 'charged'].includes(status);
      bucket.total += amount;
      if (isPaid) bucket.paid += amount;
    });

    return months.map((month) => ({
      ...month,
      total: totals.get(month.key)?.total || 0,
      paid: totals.get(month.key)?.paid || 0,
    }));
  }, [jobs]);

  const trendSummary = useMemo(() => {
    const lastIndex = trendData.reduce((acc, entry, index) => {
      if (entry.total > 0 || entry.paid > 0) return index;
      return acc;
    }, -1);
    const finalIndex = lastIndex === -1 ? trendData.length - 1 : lastIndex;
    const startIndex = Math.max(0, finalIndex - 5);
    return trendData.slice(startIndex, finalIndex + 1);
  }, [trendData]);

  const maxTrendValue = useMemo(() => {
    const values = trendData.map((entry) => Math.max(entry.total, entry.paid));
    return Math.max(1, ...values);
  }, [trendData]);

  const trendHeight = 160;
  const trendPadding = 14;
  const trendInnerHeight = trendHeight - trendPadding * 2;
  const trendMidY = trendPadding + trendInnerHeight / 2;

  const trendPoints = useMemo(() => {
    if (!trendWidth) return { total: '', paid: '', coords: [] as { x: number; totalY: number; paidY: number }[] };
    const availableWidth = trendWidth - trendPadding * 2;
    const step = trendData.length > 1 ? availableWidth / (trendData.length - 1) : 0;
    const coords = trendData.map((entry, index) => {
      const x = trendPadding + index * step;
      const totalY = trendPadding + (1 - entry.total / maxTrendValue) * trendInnerHeight;
      const paidY = trendPadding + (1 - entry.paid / maxTrendValue) * trendInnerHeight;
      return { x, totalY, paidY };
    });
    const total = coords.map((point) => `${point.x},${point.totalY}`).join(' ');
    const paid = coords.map((point) => `${point.x},${point.paidY}`).join(' ');
    return { total, paid, coords };
  }, [trendWidth, trendData, maxTrendValue, trendInnerHeight]);

  // --- ACCIONES ---
  const handleCreateJob = () => {
    const blankBlueprint: ServiceBlueprint = {
      id: 'custom',
      name: 'Trabajo a Medida',
      description: 'Empieza con un presupuesto vacío',
      blueprint_components: [],
    };
    // @ts-ignore
    navigation.navigate('JobConfig', { blueprint: blankBlueprint });
  };

  const ensureShareableStatus = async (job: QuoteListItem) => {
    const normalizedStatus = (job.status || '').toLowerCase().trim();
    const isDraft = ['draft', 'borrador'].includes(normalizedStatus);
    if (!isDraft) return;

    try {
      const { error } = await supabase.rpc('update_quote_status', {
        quote_id: job.id,
        next_status: 'sent',
      });
      if (error) {
        await supabase.from('quotes').update({ status: 'sent' }).eq('id', job.id);
      }
      await queryClient.invalidateQueries({ queryKey: ['quotes-list'] });
    } catch (err) {
      console.warn('No se pudo confirmar el presupuesto antes de compartir.', err);
    }
  };

  const handleShareJob = async (job: QuoteListItem) => {
    await ensureShareableStatus(job);

    const link = getPublicQuoteUrl(job.id);
    const safeTotal = formatMoney(job.total_amount || 0);
    const message = `Hola! Te paso el presupuesto por $${safeTotal}: ${link}`;

    try {
      await Share.share({ message, title: 'Presupuesto UrbanFix', url: link });
    } catch (_err) {
      Alert.alert("Error", "No se pudo compartir.");
    }
  };

  // --- FIX 2: NORMALIZADOR VISUAL DE ESTADOS ---
  const getStatusConfig = (status?: string | null) => {
    const normalized = status?.toLowerCase().trim() || '';

    if (['approved', 'aprobado', 'accepted'].includes(normalized)) {
        return { label: 'APROBADO', color: STATUS_COLORS.approved, bg: '#D1FAE5' }; // Emerald
    }

    if (['presented', 'sent'].includes(normalized)) {
        return { label: 'PRESENTADO', color: STATUS_COLORS.presented, bg: '#DBEAFE' }; // Azul
    }

    if (['pending', 'draft', 'pendiente'].includes(normalized)) {
        return { label: 'PENDIENTE', color: STATUS_COLORS.pending, bg: '#FFF7ED' }; // Amber
    }

    return { label: normalized.toUpperCase() || 'N/A', color: '#6B7280', bg: '#E5E7EB' };
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleDashboardFilter = (filter: DashboardFilter) => {
    setActiveFilter(filter);
    setSelectionMode(false);
    setSelectedIds([]);
    requestAnimationFrame(() => {
      listRef.current?.scrollToOffset({ offset: listAnchor, animated: true });
    });
  };

  const emptyMessage =
    activeFilter === 'total'
      ? 'No tienes presupuestos todavía.\nToca (+) para empezar.'
      : `No tienes trabajos ${FILTER_LABELS[activeFilter].toLowerCase()}.`;

  // --- RENDER ITEM ---
  const renderItem = ({ item }: { item: QuoteListItem }) => {
    const status = getStatusConfig(item.status);
    const isSelected = selectedIds.includes(item.id);
    
    return (
      <TouchableOpacity 
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => {
          if (selectionMode) {
            toggleSelect(item.id);
          } else {
            // @ts-ignore
            navigation.navigate('JobDetail', { 
              jobId: item.id,
              quote: item,
              client_address: item.client_address || item.address || item.location_address,
              location_lat: item.location_lat,
              location_lng: item.location_lng,
            });
          }
        }}
        onLongPress={() => {
          setSelectionMode(true);
          toggleSelect(item.id);
        }}
      >
        <View style={[styles.iconBar, { backgroundColor: status.color }]} />
        
        <View style={styles.cardContent}>
            {selectionMode && (
              <Ionicons 
                name={isSelected ? "checkbox" : "square-outline"} 
                size={22} 
                color={isSelected ? COLORS.primary : '#CBD5E1'} 
                style={{ marginRight: 8 }}
              />
            )}
            <View style={styles.rowBetween}>
                <Text style={styles.clientName} numberOfLines={1}>
                    {item.client_name || `Presupuesto #${item.id.slice(0,4).toUpperCase()}`}
                </Text>
                <Text style={styles.amountText}>
                    ${formatMoney(item.total_amount || 0)}
                </Text>
            </View>

            <View style={styles.rowBetween}>
                <Text style={styles.jobDate}>
                    {new Date(item.created_at).toLocaleDateString()}
                </Text>
                
                <View style={[styles.badge, { backgroundColor: status.bg, borderColor: status.color }]}>
                    <Text style={[styles.badgeText, { color: status.color }]}>{status.label}</Text>
                </View>
            </View>
        </View>

        {!selectionMode && (
          <TouchableOpacity 
              style={styles.shareBtn}
              onPress={() => handleShareJob(item)}
          >
               <Ionicons name="paper-plane-outline" size={20} color={COLORS.textLight} />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.secondary} />
      
      {/* HEADER DASHBOARD */}
      <View style={styles.header}>
        <SafeAreaView edges={['top']}>
           <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>PANEL DE CONTROL</Text>
            
           </View>
        </SafeAreaView>
      </View>

      {/* LISTA */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color={COLORS.danger} />
          <Text style={styles.emptyText}>No pudimos cargar tus trabajos.</Text>
          <TouchableOpacity style={styles.selectBtn} onPress={() => refetch()}>
            <Text style={styles.selectBtnText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlashList
            ref={listRef}
            data={visibleJobs}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            extraData={{ selectionMode, selectedIds }}
            contentContainerStyle={styles.listContent}
            estimatedItemSize={150}
            onRefresh={refetch}
            refreshing={isFetching && !isLoading}
            ListHeaderComponent={
                <View>
                  <View style={styles.dashboardWrapper}>
                  <View style={styles.dashboardPanel}>
                    
                    <View style={styles.dashboardGrid}>
                      {dashboardCards.map((card) => (
                        <TouchableOpacity
                          key={card.key}
                          style={[
                            styles.dashboardCard,
                            activeFilter === card.filter && styles.dashboardCardActive,
                          ]}
                          activeOpacity={0.85}
                          onPress={() => handleDashboardFilter(card.filter)}
                        >
                          <View style={styles.dashboardTopRow}>
                            <View style={styles.dashboardLabelRow}>
                              <View style={[styles.dashboardDot, { backgroundColor: card.accent }]} />
                              <Text style={styles.dashboardLabel}>{card.label}</Text>
                            </View>
                          </View>
                          <Text style={[styles.dashboardValue, { color: card.accent }]}>{card.value}</Text>
                          <Text style={styles.dashboardHint}>{card.hint}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View style={styles.billingPanel}>
                    <Text style={styles.panelTitle}>Facturacion estimada</Text>
                    <View style={styles.billingGrid}>
                      {billingCards.map((card) => (
                        <View key={card.key} style={styles.billingCard}>
                          <View style={styles.billingLabelRow}>
                            <View style={[styles.billingDot, { backgroundColor: card.accent }]} />
                            <Text style={styles.billingLabel}>{card.label}</Text>
                          </View>
                          <Text style={[styles.billingValue, { color: card.accent }]}>{card.value}</Text>
                          <Text style={styles.billingHint}>{card.hint}</Text>
                        </View>
                      ))}
                    </View>
                    <View style={styles.trendPanel}>
                      <View style={styles.trendHeader}>
                        <Text style={styles.trendTitle}>TENDENCIA ANUAL · ENE-DIC</Text>
                        <View style={styles.trendLegend}>
                          <View style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: STATUS_COLORS.total }]} />
                            <Text style={styles.legendText}>Presupuestos</Text>
                          </View>
                          <View style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: STATUS_COLORS.paid }]} />
                            <Text style={styles.legendText}>Cobrados</Text>
                          </View>
                        </View>
                      </View>
                      <View
                        style={styles.trendChart}
                        onLayout={(event) => setTrendWidth(event.nativeEvent.layout.width)}
                      >
                        <Svg width="100%" height={trendHeight}>
                          <Line
                            x1={trendPadding}
                            x2={Math.max(trendPadding, trendWidth - trendPadding)}
                            y1={trendPadding}
                            y2={trendPadding}
                            stroke="#E2E8F0"
                            strokeWidth={1}
                          />
                          <Line
                            x1={trendPadding}
                            x2={Math.max(trendPadding, trendWidth - trendPadding)}
                            y1={trendMidY}
                            y2={trendMidY}
                            stroke="#E2E8F0"
                            strokeWidth={1}
                            strokeDasharray="4 4"
                          />
                          <Line
                            x1={trendPadding}
                            x2={Math.max(trendPadding, trendWidth - trendPadding)}
                            y1={trendPadding + trendInnerHeight}
                            y2={trendPadding + trendInnerHeight}
                            stroke="#E2E8F0"
                            strokeWidth={1}
                          />
                          <SvgText
                            x={trendPadding}
                            y={trendPadding - 3}
                            fontSize="9"
                            fill="#94A3B8"
                            textAnchor="start"
                            fontFamily={FONTS.body}
                          >
                            {formatCompact(maxTrendValue)}
                          </SvgText>
                          <SvgText
                            x={trendPadding}
                            y={trendMidY - 3}
                            fontSize="9"
                            fill="#94A3B8"
                            textAnchor="start"
                            fontFamily={FONTS.body}
                          >
                            {formatCompact(maxTrendValue / 2)}
                          </SvgText>
                          <SvgText
                            x={trendPadding}
                            y={trendPadding + trendInnerHeight + 12}
                            fontSize="9"
                            fill="#94A3B8"
                            textAnchor="start"
                            fontFamily={FONTS.body}
                          >
                            0
                          </SvgText>
                          {!!trendPoints.total && (
                            <Polyline points={trendPoints.total} fill="none" stroke={STATUS_COLORS.total} strokeWidth={2} />
                          )}
                          {!!trendPoints.paid && (
                            <Polyline points={trendPoints.paid} fill="none" stroke={STATUS_COLORS.paid} strokeWidth={2} />
                          )}
                          {trendPoints.coords.map((point, index) => (
                            <React.Fragment key={`point-${index}`}>
                              <Circle cx={point.x} cy={point.totalY} r={3} fill={STATUS_COLORS.total} />
                              <Circle cx={point.x} cy={point.paidY} r={3} fill={STATUS_COLORS.paid} />
                            </React.Fragment>
                          ))}
                        </Svg>
                      </View>
                      <View style={styles.trendLabels}>
                        {trendData.map((entry) => (
                          <Text key={entry.key} style={styles.trendLabel}>{entry.label}</Text>
                        ))}
                      </View>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.trendSummaryRow}
                      >
                        {trendSummary.map((entry) => (
                          <View key={entry.key} style={styles.trendSummaryCard}>
                            <Text style={styles.trendSummaryMonth}>{entry.label}</Text>
                            <View style={styles.trendSummaryLine}>
                              <View style={[styles.trendSummaryDot, { backgroundColor: STATUS_COLORS.total }]} />
                              <Text style={styles.trendSummaryLabel}>Presup.</Text>
                            </View>
                            <Text style={[styles.trendSummaryValue, { color: STATUS_COLORS.total }]}>
                              ${formatMoney(entry.total)}
                            </Text>
                            <View style={styles.trendSummaryLine}>
                              <View style={[styles.trendSummaryDot, { backgroundColor: STATUS_COLORS.paid }]} />
                              <Text style={styles.trendSummaryLabel}>Cobrados</Text>
                            </View>
                            <Text style={[styles.trendSummaryValue, { color: STATUS_COLORS.paid }]}>
                              ${formatMoney(entry.paid)}
                            </Text>
                          </View>
                        ))}
                      </ScrollView>
                    </View>
                    <View style={styles.statusPanel}>
                      <Text style={styles.trendTitle}>TRABAJOS POR ESTADO</Text>
                      <View style={styles.statusChart}>
                      {statusChart.map((item) => {
                        const height = Math.max(10, (item.value / maxStatusCount) * 80);
                        return (
                          <View key={item.key} style={styles.statusColumn}>
                            <Text style={[styles.statusValue, { color: item.color }]}>{item.value}</Text>
                            <View style={[styles.statusBar, { height, backgroundColor: item.color }]} />
                            <Text style={styles.statusLabel}>{item.label}</Text>
                          </View>
                        );
                      })}
                      </View>
                    </View>
                  </View>

                  <View style={styles.mapPanel}>
                    <View style={styles.mapHeader}>
                      <View style={styles.mapTitleRow}>
                        <Text style={styles.trendTitle}>MAPA · ULTIMOS 3 MESES</Text>
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
                      onSelect={handleOpenMapDetail}
                      formatMoney={formatMoney}
                      height={260}
                    />
                    <TouchableOpacity
                      style={styles.mapCta}
                      onPress={() => {
                        // @ts-ignore
                        navigation.navigate('Mapa');
                      }}
                    >
                      <Text style={styles.mapCtaText}>Ver mapa completo</Text>
                      <Ionicons name="arrow-forward" size={16} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                  </View>

                  <View style={styles.latestHeader}>
                    <Text style={styles.sectionTitle}>
                      {activeFilter === 'total'
                        ? 'ULTIMOS PRESUPUESTOS'
                        : `TRABAJOS ${FILTER_LABELS[activeFilter].toUpperCase()}`}
                    </Text>
                    <View style={styles.latestActions}>
                      {selectionMode && (
                        <TouchableOpacity 
                          onPress={() => {
                            setSelectionMode(false);
                            setSelectedIds([]);
                          }} 
                          style={[styles.selectBtn, {backgroundColor:'#E5E7EB'}]}
                        >
                          <Text style={[styles.selectBtnText, {color:'#0F172A'}]}>Cancelar</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity 
                        onPress={() => {
                          if (selectionMode && selectedIds.length === 0) {
                            setSelectionMode(false);
                            return;
                          }
                          setSelectionMode(prev => !prev);
                          if (!selectionMode) setSelectedIds([]);
                        }} 
                        style={styles.selectBtn}
                      >
                        <Text style={styles.selectBtnText}>{selectionMode ? 'Listo' : 'Seleccionar'}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View
                    style={styles.filterBar}
                    onLayout={(event) => setListAnchor(event.nativeEvent.layout.y)}
                  >
                    {activeFilter !== 'total' ? (
                      <>
                        <View style={styles.filterPill}>
                          <Text style={styles.filterPillText}>
                            Filtro: {FILTER_LABELS[activeFilter]}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.clearFilterBtn}
                          onPress={() => setActiveFilter('total')}
                        >
                          <Text style={styles.clearFilterText}>Ver todos</Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <Text style={styles.filterHint}>Selecciona una tarjeta para filtrar.</Text>
                    )}
                  </View>
                </View>
            }
            ListEmptyComponent={
                <View style={styles.center}>
                   <Ionicons name="file-tray-outline" size={60} color="#E5E7EB" />
                   <Text style={styles.emptyText}>{emptyMessage}</Text>
                </View>
            }
        />
      )}

      {/* FAB (Boton Flotante) */}
      <TouchableOpacity style={styles.fab} onPress={handleCreateJob}>
        <Ionicons name="add" size={32} color="#FFF" />
      </TouchableOpacity>

      {selectionMode && selectedIds.length > 0 && (
        <TouchableOpacity 
          style={styles.bulkDeleteBar} 
          onPress={async () => {
            const performDelete = async () => {
              try {
                for (const id of selectedIds) {
                  const { error } = await supabase.rpc('delete_quote', { p_quote_id: id });
                  if (error) throw error;
                }
                await queryClient.invalidateQueries({ queryKey: ['quotes-list'] });
                setSelectedIds([]);
                setSelectionMode(false);
              } catch (_err) {
                Alert.alert("Error", "No se pudieron borrar los presupuestos seleccionados.");
              }
            };

            if (Platform.OS === 'web') {
              // @ts-ignore
              if (window.confirm(`¿Borrar ${selectedIds.length} presupuestos?`)) {
                await performDelete();
              }
              return;
            }

            Alert.alert(
              'Borrar presupuestos',
              `¿Seguro que quieres borrar ${selectedIds.length} presupuestos?`,
              [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Borrar', style: 'destructive', onPress: () => void performDelete() },
              ]
            );
          }}
        >
          <Ionicons name="trash" size={22} color="#FFF" />
          <Text style={styles.bulkDeleteText}>Borrar {selectedIds.length} seleccionados</Text>
        </TouchableOpacity>
      )}

      {mapSelection && (
        <MapDetailSheet
          point={mapSelection}
          onClose={handleCloseMapDetail}
          onOpen={(id) => {
            handleCloseMapDetail();
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
          {point.status.label} · ${formatMoney(Number(point.amount || 0))}
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
  container: { flex: 1, backgroundColor: '#F5F4F0' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 50 },
  
  // Header
  header: Platform.select({
    web: {
      backgroundColor: COLORS.secondary,
      paddingBottom: 30,
      borderBottomLeftRadius: 24,
      borderBottomRightRadius: 24,
      zIndex: 10,
      boxShadow: '0 6px 12px rgba(0,0,0,0.2)',
    },
    default: {
      backgroundColor: COLORS.secondary,
      paddingBottom: 30,
      borderBottomLeftRadius: 24,
      borderBottomRightRadius: 24,
      shadowColor: "#000", shadowOffset: {width:0, height:4}, shadowOpacity:0.2, elevation: 8,
      zIndex: 10
    }
  }),
  headerContent: { paddingHorizontal: 20, paddingTop: 10 },
  headerTitle: { fontSize: 24, fontFamily: FONTS.title, color: '#F8FAFC', marginBottom: 6, textAlign: 'center', letterSpacing: 0.6 },
  headerSubtitle: { fontSize: 13, fontFamily: FONTS.body, color: 'rgba(248,250,252,0.7)', textAlign: 'center', marginBottom: 16 },
  
  dashboardWrapper: { gap: 16, marginBottom: 6 },
  dashboardPanel: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E6DED2',
    shadowColor: '#C7BBA8',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 14,
    elevation: 6,
  },
  panelTitle: { fontSize: 11, fontFamily: FONTS.subtitle, color: '#8D8270', letterSpacing: 2.4, marginBottom: 12 },
  dashboardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  dashboardCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#EFE6D8',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#E6DCCB',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 4,
  },
  dashboardCardActive: {
    borderColor: '#0F172A',
    shadowColor: '#BDB1A0',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 7,
  },
  dashboardLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, flexWrap: 'wrap' },
  dashboardDot: { width: 7, height: 7, borderRadius: 999 },
  dashboardTopRow: { alignItems: 'center', justifyContent: 'center', gap: 6 },
  dashboardLabel: {
    fontSize: 11,
    fontFamily: FONTS.subtitle,
    color: '#9A8F7B',
    letterSpacing: 0.6,
    textAlign: 'center',
  },
  dashboardValue: { fontSize: 26, fontFamily: FONTS.title, marginTop: 8, textAlign: 'center', alignSelf: 'center' },
  dashboardHint: { fontSize: 11, fontFamily: FONTS.body, color: '#6B7280', marginTop: 4, textAlign: 'center' },
  billingPanel: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E6DED2',
    shadowColor: '#C7BBA8',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  billingGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  billingCard: {
    flexGrow: 1,
    flexBasis: '30%',
    minWidth: 140,
    backgroundColor: '#FBFBF9',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EFE9DE',
  },
  billingLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  billingDot: { width: 6, height: 6, borderRadius: 999 },
  billingLabel: { fontSize: 11, fontFamily: FONTS.subtitle, color: '#A8A29E', letterSpacing: 1.4 },
  billingValue: { fontSize: 22, fontFamily: FONTS.title, marginTop: 6, textAlign: 'center', alignSelf: 'center' },
  billingHint: { fontSize: 11, fontFamily: FONTS.body, color: '#6B7280', marginTop: 4, textAlign: 'center' },
  trendPanel: {
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EFE9DE',
  },
  trendHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 10 },
  trendTitle: { fontSize: 11, fontFamily: FONTS.subtitle, color: '#9A8F7B', letterSpacing: 1.2 },
  trendLegend: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 6, height: 6, borderRadius: 3 },
  legendText: { fontSize: 10, fontFamily: FONTS.body, color: '#6B7280' },
  trendChart: { height: 160 },
  trendLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  trendLabel: { fontSize: 10, fontFamily: FONTS.subtitle, color: '#A8A29E' },
  trendSummaryRow: { gap: 10, paddingTop: 12, paddingBottom: 4 },
  trendSummaryCard: {
    width: 120,
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: '#EFE9DE',
    backgroundColor: '#FBFBF9',
  },
  trendSummaryMonth: { fontSize: 11, fontFamily: FONTS.subtitle, color: '#9A8F7B', marginBottom: 6 },
  trendSummaryLine: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  trendSummaryDot: { width: 6, height: 6, borderRadius: 999 },
  trendSummaryLabel: { fontSize: 10, fontFamily: FONTS.body, color: '#6B7280' },
  trendSummaryValue: { fontSize: 13, fontFamily: FONTS.subtitle, marginTop: 2 },
  statusPanel: {
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EFE9DE',
  },
  statusChart: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginTop: 10 },
  statusColumn: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  statusValue: { fontSize: 18, fontFamily: FONTS.title, marginBottom: 6 },
  statusBar: { width: '100%', borderRadius: 8, alignSelf: 'stretch' },
  statusLabel: { fontSize: 11, fontFamily: FONTS.subtitle, color: '#A8A29E', marginTop: 6, textAlign: 'center', letterSpacing: 0.3 },
  mapPanel: {
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EFE9DE',
  },
  mapHeader: { gap: 10, marginBottom: 12 },
  mapTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  mapCountText: { fontSize: 11, fontFamily: FONTS.subtitle, color: '#94A3B8' },
  mapLegend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
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
  mapCta: {
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: COLORS.secondary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  mapCtaText: { fontSize: 12, fontFamily: FONTS.subtitle, color: '#FFFFFF', letterSpacing: 0.4 },
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
  latestHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  latestActions: { flexDirection: 'row', gap: 10 },
  filterBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFE9DE',
  },
  filterPillText: { fontSize: 11, fontFamily: FONTS.subtitle, color: '#475569' },
  clearFilterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  clearFilterText: { fontSize: 11, fontFamily: FONTS.subtitle, color: '#475569' },
  filterHint: { fontSize: 11, fontFamily: FONTS.body, color: '#94A3B8' },

  // List
  listContent: { padding: 18, paddingBottom: 110 },
  sectionTitle: { fontSize: 11, fontFamily: FONTS.subtitle, color: '#94A3B8', marginBottom: 12, letterSpacing: 1.8, marginTop: 10, textTransform: 'uppercase' },
  emptyText: { textAlign: 'center', marginTop: 16, color: COLORS.textLight, fontFamily: FONTS.body, fontSize: 12 },

  // Cards
  card: Platform.select({
    web: {
      backgroundColor: '#FFFFFF', borderRadius: 16, marginBottom: 12, flexDirection: 'row', overflow: 'hidden',
      boxShadow: '0 3px 10px rgba(0,0,0,0.08)',
    },
    default: {
      backgroundColor: '#FFFFFF', borderRadius: 16, marginBottom: 12, flexDirection: 'row', overflow: 'hidden',
      shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, elevation: 2,
    }
  }),
  iconBar: { width: 6, height: '100%' },
  cardContent: { flex: 1, padding: 16 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  
  clientName: { fontSize: 17, fontFamily: FONTS.subtitle, color: COLORS.text, width: '60%' },
  amountText: { fontSize: 17, fontFamily: FONTS.title, color: COLORS.text },
  jobDate: { fontSize: 13, fontFamily: FONTS.body, color: COLORS.textLight },
  
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
  badgeText: { fontSize: 10, fontFamily: FONTS.subtitle, letterSpacing: 0.7, textTransform: 'uppercase' },
  
  shareBtn: { padding: 16, justifyContent: 'center', borderLeftWidth: 1, borderLeftColor: '#F3F4F6' },

  fab: Platform.select({
    web: {
      position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28,
      backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center',
      boxShadow: '0 8px 16px rgba(0,0,0,0.25)',
    },
    default: {
      position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28,
      backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center',
      shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, elevation: 5,
    }
  }),
  selectBtn: { paddingHorizontal: 14, paddingVertical: 6, backgroundColor: COLORS.primary, borderRadius: 999 },
  selectBtnText: { color: '#FFF', fontFamily: FONTS.subtitle, fontSize: 12, letterSpacing: 0.5 },
  bulkDeleteBar: { position: 'absolute', left: 16, right: 16, bottom: 16, backgroundColor: COLORS.danger, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 12, borderRadius: 12, gap: 8 },
  bulkDeleteText: { color: '#FFF', fontFamily: FONTS.title, fontSize: 15 }
});
