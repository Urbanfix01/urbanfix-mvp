import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, 
  StatusBar, ActivityIndicator, Alert, Share, Platform, Modal, Pressable, LayoutAnimation, UIManager,
  type DimensionValue, type ViewStyle
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Polyline, Circle, Line, Text as SvgText } from 'react-native-svg';
import { FlashList } from '@shopify/flash-list';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  fetchQuoteFeedbackLink,
  fetchTechnicianDashboardBilling,
  TechnicianDashboardBillingItem,
} from '../../api/marketplace';
import { COLORS, FONTS } from '../../utils/theme';
import { ServiceBlueprint } from '../../types/database';
import MapCanvas from '../../components/molecules/MapCanvas';
import { SkeletonBlock } from '../../components/molecules/SkeletonBlock';
import JobListCard from '../../components/molecules/JobListCard';
import { MapPoint } from '../../types/maps';
import { supabase } from '../../lib/supabase'; 
import { getPublicQuoteUrl } from '../../utils/config';
import {
  getStatusLabelEs,
  getStatusUiKey,
  isApproved,
  isClosed,
  isPaid,
  isPending,
  isPresented,
  normalizeStatus,
} from '../../utils/status';

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
  paid_at?: string | null;
  scheduled_date?: string | null;
  archived_at?: string | null;
};

type DashboardFinancialItem = Pick<
  QuoteListItem,
  'id' | 'total_amount' | 'status' | 'created_at' | 'paid_at' | 'scheduled_date'
>;

type DashboardFilter = 'total' | 'pending' | 'approved' | 'paid';
type DashboardSectionKey = 'summary' | 'billing' | 'trend';
type TrendCoord = { x: number; totalY: number; pendingY: number; paidY: number };

const DASHBOARD_CACHE_KEY = 'dashboard_quotes_cache_v1';
const DASHBOARD_CACHE_TTL = 6 * 60 * 60 * 1000; // 6 horas
const QUOTES_QUERY_KEY = ['quotes-list'] as const;
const ALL_QUOTES_QUERY_KEY = ['quotes-list-all'] as const;
const DASHBOARD_BILLING_QUERY_KEY = ['technician-dashboard-billing'] as const;

const TrendChart = React.memo(
  ({
    width,
    height,
    padding,
    innerHeight,
    midY,
    maxLabel,
    midLabel,
    totalPoints,
    pendingPoints,
    paidPoints,
    coords,
  }: {
    width: number;
    height: number;
    padding: number;
    innerHeight: number;
    midY: number;
    maxLabel: string;
    midLabel: string;
    totalPoints: string;
    pendingPoints: string;
    paidPoints: string;
    coords: TrendCoord[];
  }) => (
    <Svg width="100%" height={height}>
      <Line
        x1={padding}
        x2={Math.max(padding, width - padding)}
        y1={padding}
        y2={padding}
        stroke="#E2E8F0"
        strokeWidth={1}
      />
      <Line
        x1={padding}
        x2={Math.max(padding, width - padding)}
        y1={midY}
        y2={midY}
        stroke="#E2E8F0"
        strokeWidth={1}
        strokeDasharray="4 4"
      />
      <Line
        x1={padding}
        x2={Math.max(padding, width - padding)}
        y1={padding + innerHeight}
        y2={padding + innerHeight}
        stroke="#E2E8F0"
        strokeWidth={1}
      />
      <SvgText
        x={padding}
        y={padding - 3}
        fontSize="9"
        fill="#94A3B8"
        textAnchor="start"
        fontFamily={FONTS.body}
      >
        {maxLabel}
      </SvgText>
      <SvgText
        x={padding}
        y={midY - 3}
        fontSize="9"
        fill="#94A3B8"
        textAnchor="start"
        fontFamily={FONTS.body}
      >
        {midLabel}
      </SvgText>
      <SvgText
        x={padding}
        y={padding + innerHeight + 12}
        fontSize="9"
        fill="#94A3B8"
        textAnchor="start"
        fontFamily={FONTS.body}
      >
        0
      </SvgText>
      {!!totalPoints && (
        <Polyline points={totalPoints} fill="none" stroke={STATUS_COLORS.total} strokeWidth={2} />
      )}
      {!!pendingPoints && (
        <Polyline points={pendingPoints} fill="none" stroke={STATUS_COLORS.pending} strokeWidth={2} />
      )}
      {!!paidPoints && (
        <Polyline points={paidPoints} fill="none" stroke={STATUS_COLORS.paid} strokeWidth={2} />
      )}
      {coords.map((point, index) => (
        <React.Fragment key={`point-${index}`}>
          <Circle cx={point.x} cy={point.totalY} r={3} fill={STATUS_COLORS.total} />
          <Circle cx={point.x} cy={point.pendingY} r={3} fill={STATUS_COLORS.pending} />
          <Circle cx={point.x} cy={point.paidY} r={3} fill={STATUS_COLORS.paid} />
        </React.Fragment>
      ))}
    </Svg>
  )
);

const StatusChart = React.memo(
  ({ data, max }: { data: { key: string; label: string; value: number; color: string }[]; max: number }) => (
    <>
      {data.map((item) => {
        const height = Math.max(10, (item.value / max) * 80);
        return (
          <View key={item.key} style={styles.statusColumn}>
            <Text style={[styles.statusValue, { color: item.color }]}>{item.value}</Text>
            <View style={[styles.statusBar, { height, backgroundColor: item.color }]} />
            <Text style={styles.statusLabel}>{item.label}</Text>
          </View>
        );
      })}
    </>
  )
);

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

const createCollapsedDashboardSections = (): Record<DashboardSectionKey, boolean> => ({
  summary: false,
  billing: false,
  trend: false,
});

const showPlatformAlert = (title: string, message: string) => {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      window.alert(`${title}\n\n${message}`);
    }
    return;
  }

  Alert.alert(title, message);
};

const shareOrCopyLink = async (link: string, options?: { title?: string; message?: string; promptLabel?: string }) => {
  const title = options?.title || 'UrbanFix';
  const message = options?.message || link;
  const promptLabel = options?.promptLabel || 'Link listo para copiar';

  if (Platform.OS === 'web') {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(link);
      }
    } catch (_err) {
      // fallback below
    }

    if (typeof window !== 'undefined') {
      window.prompt(promptLabel, link);
    }
    return;
  }

  await Share.share({ message, title, url: link });
};

const DashboardAccordion = ({
  title,
  subtitle,
  expanded,
  accent,
  onPress,
  children,
}: {
  title: string;
  subtitle: string;
  expanded: boolean;
  accent: string;
  onPress: () => void;
  children: React.ReactNode;
}) => (
  <View style={styles.accordionSection}>
    <TouchableOpacity
      style={[styles.accordionTrigger, expanded && styles.accordionTriggerExpanded]}
      onPress={onPress}
      activeOpacity={0.9}
      accessibilityRole="button"
      accessibilityState={{ expanded }}
    >
      <View style={styles.accordionTriggerMain}>
        <View style={[styles.accordionAccent, { backgroundColor: accent }]} />
        <View style={styles.accordionCopy}>
          <Text style={styles.accordionTitle}>{title}</Text>
          <Text style={styles.accordionSubtitle}>{subtitle}</Text>
        </View>
      </View>
      <View style={[styles.accordionChevronWrap, expanded && styles.accordionChevronWrapExpanded]}>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={expanded ? '#FFFFFF' : '#475569'} />
      </View>
    </TouchableOpacity>
    {expanded ? <View style={styles.accordionBody}>{children}</View> : null}
  </View>
);

async function getQuotes(includeArchived = false): Promise<QuoteListItem[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const attempts = [
    {
      select:
        'id, client_name, client_address, address, location_address, location_lat, location_lng, total_amount, status, created_at, paid_at, scheduled_date, archived_at',
      filterArchived: true,
      map: (items: any[]) => items as QuoteListItem[],
    },
    {
      select:
        'id, client_name, client_address, address, location_address, location_lat, location_lng, total_amount, status, created_at, paid_at, scheduled_date',
      filterArchived: false,
      map: (items: any[]) => items.map((item) => ({ ...item, archived_at: null })) as QuoteListItem[],
    },
    {
      select:
        'id, client_name, client_address, address, location_address, location_lat, location_lng, total_amount, status, created_at, scheduled_date',
      filterArchived: false,
      map: (items: any[]) =>
        items.map((item) => ({
          ...item,
          paid_at: null,
          archived_at: null,
        })) as QuoteListItem[],
    },
  ] as const;

  let lastError: unknown = null;
  for (const attempt of attempts) {
    let query = supabase.from('quotes').select(attempt.select).eq('user_id', user.id).order('created_at', {
      ascending: false,
    });
    if (attempt.filterArchived && !includeArchived) {
      query = query.is('archived_at', null);
    }
    const { data, error } = await query;
    if (!error) {
      return attempt.map(data || []);
    }
    lastError = error;
  }

  throw lastError;
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
  const [dashboardWidth, setDashboardWidth] = useState(0);
  const [expandedSections, setExpandedSections] = useState<Record<DashboardSectionKey, boolean>>(
    createCollapsedDashboardSections
  );
  const dashboardGap = 6;
  const dashboardColumns = dashboardWidth && dashboardWidth < 300 ? 1 : 2;
  const isDashboardCompact = dashboardWidth > 0 && dashboardWidth < 380;
  const dashboardCardWidth =
    dashboardWidth > 0 ? (dashboardWidth - dashboardGap * (dashboardColumns - 1)) / dashboardColumns : undefined;

  const queryClient = useQueryClient();
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const { data: jobsData, isLoading, error, refetch, isFetching } = useQuery<QuoteListItem[]>({
    queryKey: QUOTES_QUERY_KEY,
    queryFn: () => getQuotes(false),
    staleTime: 60000,
  });
  const jobs: QuoteListItem[] = jobsData ?? [];
  const { data: allJobsData } = useQuery<QuoteListItem[]>({
    queryKey: ALL_QUOTES_QUERY_KEY,
    queryFn: () => getQuotes(true),
    staleTime: 60000,
  });
  const allJobs: QuoteListItem[] = allJobsData ?? jobs;
  const { data: billingData } = useQuery<{ items: TechnicianDashboardBillingItem[] }>({
    queryKey: DASHBOARD_BILLING_QUERY_KEY,
    queryFn: fetchTechnicianDashboardBilling,
    staleTime: 60000,
  });
  const marketplaceBillingItems = billingData?.items ?? [];

  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadCache = async () => {
      try {
        const raw = await AsyncStorage.getItem(DASHBOARD_CACHE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw) as { timestamp?: number; data?: QuoteListItem[] } | null;
        if (!parsed || !Array.isArray(parsed.data)) return;
        const cacheTimestamp = typeof parsed.timestamp === 'number' ? parsed.timestamp : null;
        if (cacheTimestamp && Date.now() - cacheTimestamp > DASHBOARD_CACHE_TTL) return;
        if (!mounted) return;
        queryClient.setQueryData<QuoteListItem[]>(QUOTES_QUERY_KEY, parsed.data);
        setLastUpdatedAt(cacheTimestamp ? new Date(cacheTimestamp) : null);
      } catch (_err) {
        // ignore cache errors
      }
    };
    loadCache();
    return () => {
      mounted = false;
    };
  }, [queryClient]);

  useEffect(() => {
    if (isLoading) return;
    const persistCache = async () => {
      try {
        const timestamp = Date.now();
        await AsyncStorage.setItem(
          DASHBOARD_CACHE_KEY,
          JSON.stringify({ timestamp, data: jobs })
        );
        setLastUpdatedAt(new Date(timestamp));
      } catch (_err) {
        // cache best-effort
      }
    };
    void persistCache();
  }, [isLoading, jobs]);

  const visibleJobs = useMemo(() => {
    return jobs.filter((job) => {
      const status = job.status;
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
      const status = job.status;
      const amount = job.total_amount || 0;

      totalCount += 1;
      totalAmount += amount;
      if (isPending(status)) {
        pendingCount += 1;
        pendingAmount += amount;
      }
      if (isApproved(status)) {
        approvedCount += 1;
        approvedAmount += amount;
      }
      if (isPaid(status)) {
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

  const financialEntries = useMemo<DashboardFinancialItem[]>(
    () => [
      ...allJobs.map((job) => ({
        id: job.id,
        total_amount: job.total_amount ?? 0,
        status: job.status ?? null,
        created_at: job.created_at,
        paid_at: job.paid_at ?? null,
        scheduled_date: job.scheduled_date ?? null,
      })),
      ...marketplaceBillingItems,
    ],
    [allJobs, marketplaceBillingItems]
  );

  const isSameMonth = useCallback((value: string | null | undefined, month: number, year: number) => {
    if (!value) return false;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return false;
    return date.getFullYear() === year && date.getMonth() === month;
  }, []);

  const monthStats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    let pendingAmount = 0;
    let approvedAmount = 0;
    let paidAmount = 0;

    financialEntries.forEach((entry) => {
      const amount = entry.total_amount || 0;
      const status = entry.status;
      if (isPending(status)) pendingAmount += amount;
      if (isApproved(status)) approvedAmount += amount;
      if (isPaid(status) && isSameMonth(entry.paid_at || entry.created_at, currentMonth, currentYear)) {
        paidAmount += amount;
      }
    });

    return {
      totalAmount: pendingAmount + approvedAmount,
      pendingAmount,
      approvedAmount,
      paidAmount,
    };
  }, [financialEntries, isSameMonth]);

  const formatNumberSafe = useCallback((value: number) => {
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
  }, []);
  const formatMoney = useCallback((value: number) => formatNumberSafe(value), [formatNumberSafe]);
  const formatCompact = useCallback((value: number) => {
    const safe = Number(value || 0);
    if (safe >= 1_000_000) return `${(safe / 1_000_000).toFixed(1)}M`;
    if (safe >= 1_000) return `${Math.round(safe / 1_000)}k`;
    return `${Math.round(safe)}`;
  }, []);

  const dashboardCards = useMemo(
    () => [
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
    ],
    [stats]
  );

  const billingCards = useMemo(
    () => [
      {
        key: 'billing-total',
        label: 'Total',
        value: `$${formatMoney(monthStats.totalAmount)}`,
        hint: 'Pipeline activo',
        accent: STATUS_COLORS.total,
      },
      {
        key: 'billing-pending',
        label: 'Pendientes',
        value: `$${formatMoney(monthStats.pendingAmount)}`,
        hint: 'Pendientes de aprobacion',
        accent: STATUS_COLORS.pending,
      },
      {
        key: 'billing-approved',
        label: 'Aprobados',
        value: `$${formatMoney(monthStats.approvedAmount)}`,
        hint: 'Aprobados por cobrar',
        accent: STATUS_COLORS.approved,
      },
      {
        key: 'billing-paid',
        label: 'Cobrados',
        value: `$${formatMoney(monthStats.paidAmount)}`,
        hint: 'Monto cobrado del mes',
        accent: STATUS_COLORS.paid,
      },
    ],
    [formatMoney, monthStats]
  );

  const statusCounts = useMemo(() => {
    let pending = 0;
    let approved = 0;
    let closed = 0;

    jobs.forEach((job) => {
      const status = job.status;
      if (isPending(status)) pending += 1;
      if (isApproved(status)) approved += 1;
      if (isClosed(status)) closed += 1;
    });

    return { pending, approved, closed };
  }, [jobs]);

  const statusChart = useMemo(
    () => [
      { key: 'pending', label: 'Pendientes', value: statusCounts.pending, color: STATUS_COLORS.pending },
      { key: 'approved', label: 'Aprobados', value: statusCounts.approved, color: STATUS_COLORS.approved },
      { key: 'closed', label: 'Cerrados', value: statusCounts.closed, color: STATUS_COLORS.closed },
    ],
    [statusCounts]
  );

  const maxStatusCount = useMemo(
    () => Math.max(1, ...statusChart.map((item) => item.value)),
    [statusChart]
  );

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
    const latSpan = maxLat - minLat;
    const lngSpan = maxLng - minLng;
    const latitudeDelta = latSpan > 0 ? Math.max(0.012, latSpan * 1.18) : 0.018;
    const longitudeDelta = lngSpan > 0 ? Math.max(0.012, lngSpan * 1.18) : 0.018;
    return { latitude, longitude, latitudeDelta, longitudeDelta };
  }, [mapPoints]);

  const mapKey = [
    mapPoints.length,
    mapRegion.latitude.toFixed(4),
    mapRegion.longitude.toFixed(4),
    mapRegion.latitudeDelta.toFixed(4),
    mapRegion.longitudeDelta.toFixed(4),
  ].join('-');

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
    const formatDateKey = (date: Date) =>
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const formatDateLabel = (date: Date) => `${date.getDate()} ${monthLabels[date.getMonth()]}`;

    const timeline = new Map<
      string,
      {
        key: string;
        label: string;
        timestamp: number;
        total: number;
        pending: number;
        paid: number;
        paidCumulative: number;
      }
    >();

    const ensureBucket = (value: string | null | undefined) => {
      if (!value) return null;
      const date = new Date(value);
      if (Number.isNaN(date.getTime()) || date.getFullYear() !== year) return null;
      const key = formatDateKey(date);
      const existing = timeline.get(key);
      if (existing) return existing;
      const next = {
        key,
        label: formatDateLabel(date),
        timestamp: date.getTime(),
        total: 0,
        pending: 0,
        paid: 0,
        paidCumulative: 0,
      };
      timeline.set(key, next);
      return next;
    };

    financialEntries.forEach((entry) => {
      const amount = entry.total_amount || 0;
      const createdBucket = ensureBucket(entry.created_at);
      if (createdBucket) {
        createdBucket.total += amount;
        if (isPending(entry.status)) {
          createdBucket.pending += amount;
        }
      }

      if (isPaid(entry.status)) {
        const paidBucket = ensureBucket(entry.paid_at || entry.created_at);
        if (!paidBucket) return;
        paidBucket.paid += amount;
      }
    });

    const points = Array.from(timeline.values()).sort((a, b) => a.timestamp - b.timestamp);
    let runningPaid = 0;
    const pointsWithCumulative = points.map((point) => {
      runningPaid += point.paid;
      return {
        ...point,
        paidCumulative: runningPaid,
      };
    });
    if (pointsWithCumulative.length > 0) return pointsWithCumulative;

    return monthLabels.map((label, index) => ({
      key: `${year}-${String(index + 1).padStart(2, '0')}`,
      label,
      timestamp: new Date(year, index, 1).getTime(),
      total: 0,
      pending: 0,
      paid: 0,
      paidCumulative: 0,
    }));
  }, [financialEntries]);

  const trendSummary = useMemo(() => {
    const lastIndex = trendData.reduce((acc, entry, index) => {
      if (entry.total > 0 || entry.pending > 0 || entry.paid > 0 || entry.paidCumulative > 0) return index;
      return acc;
    }, -1);
    const finalIndex = lastIndex === -1 ? trendData.length - 1 : lastIndex;
    const startIndex = Math.max(0, finalIndex - 5);
    return trendData.slice(startIndex, finalIndex + 1);
  }, [trendData]);

  const maxTrendValue = useMemo(() => {
    const values = trendData.map((entry) => Math.max(entry.total, entry.pending, entry.paidCumulative));
    return Math.max(1, ...values);
  }, [trendData]);

  const trendHeight = 160;
  const trendPadding = 14;
  const trendInnerHeight = trendHeight - trendPadding * 2;
  const trendMidY = trendPadding + trendInnerHeight / 2;
  const showTrendSkeleton = isLoading || trendWidth === 0;
  const showStatusSkeleton = isLoading;
  const showMapSkeleton = isLoading;

  const trendPoints = useMemo(() => {
    if (!trendWidth) {
      return {
        total: '',
        pending: '',
        paid: '',
        coords: [] as { x: number; totalY: number; pendingY: number; paidY: number }[],
      };
    }
    const availableWidth = trendWidth - trendPadding * 2;
    const step = trendData.length > 1 ? availableWidth / (trendData.length - 1) : 0;
    const coords = trendData.map((entry, index) => {
      const x = trendPadding + index * step;
      const totalY = trendPadding + (1 - entry.total / maxTrendValue) * trendInnerHeight;
      const pendingY = trendPadding + (1 - entry.pending / maxTrendValue) * trendInnerHeight;
      const paidY = trendPadding + (1 - entry.paidCumulative / maxTrendValue) * trendInnerHeight;
      return { x, totalY, pendingY, paidY };
    });
    const total = coords.map((point) => `${point.x},${point.totalY}`).join(' ');
    const pending = coords.map((point) => `${point.x},${point.pendingY}`).join(' ');
    const paid = coords.map((point) => `${point.x},${point.paidY}`).join(' ');
    return { total, pending, paid, coords };
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

  const ensureShareableStatus = useCallback(async (job: QuoteListItem) => {
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
      await queryClient.invalidateQueries({ queryKey: QUOTES_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: ALL_QUOTES_QUERY_KEY });
    } catch (err) {
      console.warn('No se pudo confirmar el presupuesto antes de compartir.', err);
    }
  }, [queryClient]);

  const handleShareJob = useCallback(async (job: QuoteListItem) => {
    await ensureShareableStatus(job);

    const closedJob = isClosed(job.status);

    try {
      if (closedJob) {
        const payload = await fetchQuoteFeedbackLink(job.id);
        const message = payload.alreadyReviewed
          ? `EDITA TU CALIFICACION de mi trabajo en UrbanFix: ${payload.url}`
          : `CALIFICA MI TRABAJO en UrbanFix: ${payload.url}`;
        await shareOrCopyLink(payload.url, {
          message,
          title: 'Calificacion UrbanFix',
          promptLabel: payload.alreadyReviewed
            ? 'Link de calificacion listo. El cliente puede editar su resena con este mismo link.'
            : 'Link de calificacion listo para copiar o compartir',
        });
        return;
      }

      const link = getPublicQuoteUrl(job.id);
      const shareLink = `${link}${link.includes('?') ? '&' : '?'}share=${Date.now()}`;
      const safeTotal = formatMoney(job.total_amount || 0);
      const quoteReference = `#${String(job.id || '').slice(0, 8).toUpperCase()}`;
      const clientLabel = String(job.client_name || '').trim();
      const intro = clientLabel ? `Hola ${clientLabel},` : 'Hola,';
      const message = `${intro} te comparto tu presupuesto ${quoteReference} por $${safeTotal} para revisarlo online: ${shareLink}`;
      await shareOrCopyLink(shareLink, {
        message,
        title: `Presupuesto ${quoteReference}`,
        promptLabel: 'Link del presupuesto listo para copiar o compartir',
      });
    } catch (err: any) {
      showPlatformAlert('Error', err?.message || 'No se pudo compartir.');
    }
  }, [ensureShareableStatus, formatMoney]);

  // --- FIX 2: NORMALIZADOR VISUAL DE ESTADOS ---
  const getStatusConfig = useCallback((status?: string | null) => {
    const label = getStatusLabelEs(status);
    const statusKey = getStatusUiKey(status);

    if (statusKey === 'paid') {
      return { label, color: STATUS_COLORS.paid, bg: '#DCFCE7' };
    }

    if (statusKey === 'completed') {
      return { label, color: '#4F46E5', bg: '#E0E7FF' };
    }

    if (statusKey === 'approved') {
      return { label, color: STATUS_COLORS.approved, bg: '#D1FAE5' };
    }

    if (statusKey === 'presented') {
      return { label, color: STATUS_COLORS.presented, bg: '#DBEAFE' };
    }

    if (statusKey === 'draft' || statusKey === 'pending') {
      return { label, color: STATUS_COLORS.pending, bg: '#FFF7ED' };
    }

    if (statusKey === 'cancelled') {
      return { label, color: '#BE123C', bg: '#FFE4E6' };
    }

    return { label, color: '#6B7280', bg: '#E5E7EB' };
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds([]);
    setSelectionMode(false);
  }, []);

  const archiveSelectedQuotes = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Sesion expirada.');
    }

    const { error } = await supabase
      .from('quotes')
      .update({ archived_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .in('id', selectedIds);

    if (error) throw error;

    await queryClient.invalidateQueries({ queryKey: QUOTES_QUERY_KEY });
    await queryClient.invalidateQueries({ queryKey: ALL_QUOTES_QUERY_KEY });
    await queryClient.invalidateQueries({ queryKey: ['job_history'] });
    clearSelection();
  }, [clearSelection, queryClient, selectedIds]);

  const deleteSelectedQuotes = useCallback(async () => {
    for (const id of selectedIds) {
      const { error } = await supabase.rpc('delete_quote', { p_quote_id: id });
      if (error) throw error;
    }

    await queryClient.invalidateQueries({ queryKey: QUOTES_QUERY_KEY });
    await queryClient.invalidateQueries({ queryKey: ALL_QUOTES_QUERY_KEY });
    await queryClient.invalidateQueries({ queryKey: ['job_history'] });
    clearSelection();
  }, [clearSelection, queryClient, selectedIds]);

  const handleDashboardFilter = useCallback((filter: DashboardFilter) => {
    setActiveFilter(filter);
    setSelectionMode(false);
    setSelectedIds([]);
    requestAnimationFrame(() => {
      listRef.current?.scrollToOffset({ offset: listAnchor, animated: true });
    });
  }, [listAnchor]);

  const toggleDashboardSection = useCallback((section: DashboardSectionKey) => {
    if (Platform.OS !== 'web') {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    setExpandedSections((current) => {
      return {
        ...current,
        [section]: !current[section],
      };
    });
  }, []);

  const handleOpenLaborCatalog = useCallback(() => {
    // @ts-ignore
    navigation.navigate('Catalogo', { initialTab: 'labor' });
  }, [navigation]);

  const handleOpenPublicProfile = useCallback(() => {
    // @ts-ignore
    navigation.navigate('TechnicianPublicProfile');
  }, [navigation]);

  const renderDashboardCard = useCallback(
    ({ item, index }: { item: typeof dashboardCards[number]; index: number }) => {
      const isLastInRow =
        dashboardColumns > 1 && (index + 1) % dashboardColumns === 0;
      const cardStyle: ViewStyle = {
        width: (dashboardCardWidth ?? '48%') as DimensionValue,
        marginRight: dashboardColumns === 1 || isLastInRow ? 0 : dashboardGap,
        marginBottom: dashboardGap,
      };
      return (
        <TouchableOpacity
          style={[
            styles.dashboardCard,
            isDashboardCompact && styles.dashboardCardCompact,
            cardStyle,
            activeFilter === item.filter && styles.dashboardCardActive,
          ]}
          activeOpacity={0.85}
          onPress={() => handleDashboardFilter(item.filter)}
        >
          <View style={styles.dashboardTopRow}>
            <View style={styles.dashboardLabelRow}>
              <View style={[styles.dashboardDot, { backgroundColor: item.accent }]} />
              <Text
                style={[styles.dashboardLabel, isDashboardCompact && styles.dashboardLabelCompact]}
                numberOfLines={2}
              >
                {item.label}
              </Text>
            </View>
          </View>
          <Text
            style={[
              styles.dashboardValue,
              { color: item.accent },
              isDashboardCompact && styles.dashboardValueCompact,
            ]}
          >
            {item.value}
          </Text>
          <Text
            style={[styles.dashboardHint, isDashboardCompact && styles.dashboardHintCompact]}
            numberOfLines={2}
          >
            {item.hint}
          </Text>
        </TouchableOpacity>
      );
    },
    [
      activeFilter,
      dashboardCardWidth,
      dashboardColumns,
      dashboardGap,
      handleDashboardFilter,
      isDashboardCompact,
    ]
  );

  const emptyMessage =
    activeFilter === 'total'
      ? 'No tienes presupuestos todavía.\nToca (+) para empezar.'
      : `No tienes trabajos ${FILTER_LABELS[activeFilter].toLowerCase()}.`;
  const lastUpdatedLabel = useMemo(() => {
    if (!lastUpdatedAt) return null;
    try {
      return lastUpdatedAt.toLocaleString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (_err) {
      return lastUpdatedAt.toISOString();
    }
  }, [lastUpdatedAt]);

  // --- RENDER ITEM ---
  const renderItem = useCallback(({ item }: { item: QuoteListItem }) => {
    const status = getStatusConfig(item.status);
    const isSelected = selectedIds.includes(item.id);
    const clientName = item.client_name || `Presupuesto #${item.id.slice(0,4).toUpperCase()}`;
    const amountText = `$${formatMoney(item.total_amount || 0)}`;
    const dateText = new Date(item.created_at).toLocaleDateString();

    return (
      <JobListCard
        id={item.id}
        clientName={clientName}
        amountText={amountText}
        dateText={dateText}
        statusLabel={status.label}
        statusColor={status.color}
        statusBg={status.bg}
        isSelected={isSelected}
        selectionMode={selectionMode}
        onPress={() => {
          if (selectionMode) {
            toggleSelect(item.id);
            return;
          }
          // @ts-ignore
          navigation.navigate('JobDetail', { 
            jobId: item.id,
            quote: item,
            client_address: item.client_address || item.address || item.location_address,
            location_lat: item.location_lat,
            location_lng: item.location_lng,
          });
        }}
        onLongPress={() => {
          setSelectionMode(true);
          toggleSelect(item.id);
        }}
        onShare={() => handleShareJob(item)}
      />
    );
  }, [formatMoney, getStatusConfig, handleShareJob, navigation, selectedIds, selectionMode, toggleSelect]);

  const keyExtractor = useCallback((item: QuoteListItem) => item.id, []);

  const renderTrendSummaryItem = useCallback(
    ({ item }: { item: typeof trendSummary[number] }) => (
      <View style={styles.trendSummaryCard}>
        <Text style={styles.trendSummaryMonth}>{item.label}</Text>
        <View style={styles.trendSummaryLine}>
          <View style={[styles.trendSummaryDot, { backgroundColor: STATUS_COLORS.total }]} />
          <Text style={styles.trendSummaryLabel}>Presup.</Text>
        </View>
        <Text style={[styles.trendSummaryValue, { color: STATUS_COLORS.total }]}>
          ${formatMoney(item.total)}
        </Text>
        <View style={styles.trendSummaryLine}>
          <View style={[styles.trendSummaryDot, { backgroundColor: STATUS_COLORS.pending }]} />
          <Text style={styles.trendSummaryLabel}>Pendientes</Text>
        </View>
        <Text style={[styles.trendSummaryValue, { color: STATUS_COLORS.pending }]}>
          ${formatMoney(item.pending)}
        </Text>
        <View style={styles.trendSummaryLine}>
          <View style={[styles.trendSummaryDot, { backgroundColor: STATUS_COLORS.paid }]} />
          <Text style={styles.trendSummaryLabel}>Cobrados acum.</Text>
        </View>
        <Text style={[styles.trendSummaryValue, { color: STATUS_COLORS.paid }]}>
          ${formatMoney(item.paidCumulative)}
        </Text>
      </View>
    ),
    [formatMoney]
  );

  const trendMaxLabel = useMemo(() => formatCompact(maxTrendValue), [formatCompact, maxTrendValue]);
  const trendMidLabel = useMemo(() => formatCompact(maxTrendValue / 2), [formatCompact, maxTrendValue]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F4F0" />
      <View style={styles.headerCompact}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerCompactRow}>
            <View style={styles.headerCompactCopy}>
              <Text style={styles.headerCompactTitle}>Dashboard</Text>
              <Text style={styles.headerCompactMeta}>
                {lastUpdatedLabel ? `Actualizado ${lastUpdatedLabel}` : 'Panel general'}
              </Text>
            </View>
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
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            extraData={{ selectionMode, selectedIds }}
            contentContainerStyle={styles.listContent}
            estimatedItemSize={150}
            removeClippedSubviews={Platform.OS === 'android'}
            onRefresh={refetch}
            refreshing={isFetching && !isLoading}
            ListHeaderComponent={
                <View>
                  <View style={styles.dashboardWrapper}>
                    <DashboardAccordion
                      title="Resumen rapido"
                      subtitle={`${stats.totalCount} presupuestos | toca una tarjeta para filtrar`}
                      expanded={expandedSections.summary}
                      accent={COLORS.secondary}
                      onPress={() => toggleDashboardSection('summary')}
                    >
                      <View style={styles.dashboardPanelHeader}>
                        <Text style={styles.panelTitle}>Resumen rapido</Text>
                        <Text style={styles.dashboardPanelHint}>Toca una tarjeta para filtrar tu lista.</Text>
                      </View>

                      <View
                        style={styles.dashboardGrid}
                        onLayout={(event) => setDashboardWidth(event.nativeEvent.layout.width)}
                      >
                        <FlashList
                          key={`dashboard-${dashboardColumns}`}
                          data={dashboardCards}
                          numColumns={dashboardColumns}
                          keyExtractor={(item) => item.key}
                          renderItem={renderDashboardCard}
                          scrollEnabled={false}
                          estimatedItemSize={120}
                        />
                      </View>

                      <View style={styles.summaryStatusSection}>
                        <Text style={styles.trendTitle}>TRABAJOS POR ESTADO</Text>
                        <Text style={styles.dashboardPanelHint}>
                          {`${statusCounts.pending} pendientes | ${statusCounts.approved} aprobados | ${statusCounts.closed} cerrados`}
                        </Text>
                        <View style={styles.statusChart}>
                          {showStatusSkeleton ? (
                            Array.from({ length: 3 }).map((_, index) => (
                              <View key={`status-skel-${index}`} style={styles.statusColumn}>
                                <SkeletonBlock width={24} height={14} radius={6} />
                                <SkeletonBlock
                                  width="100%"
                                  height={60 - index * 8}
                                  radius={8}
                                  style={styles.statusSkeletonBar}
                                />
                                <SkeletonBlock width={50} height={10} radius={6} style={styles.statusSkeletonLabel} />
                              </View>
                            ))
                          ) : (
                            <StatusChart data={statusChart} max={maxStatusCount} />
                          )}
                        </View>
                      </View>

                      <View style={styles.summaryMapSection}>
                        <View style={styles.mapHeader}>
                          <View style={styles.mapTitleRow}>
                            <Text style={styles.trendTitle}>MAPA DE TRABAJOS</Text>
                            {showMapSkeleton ? (
                              <SkeletonBlock width={70} height={12} radius={6} />
                            ) : (
                              <Text style={styles.mapCountText}>{mapPoints.length} trabajos</Text>
                            )}
                          </View>
                          <Text style={styles.dashboardPanelHint}>
                            Ultimos 3 meses | foco en las zonas reales de trabajo
                          </Text>
                          <View style={styles.mapPills}>
                            {showMapSkeleton ? (
                              <>
                                <SkeletonBlock width={120} height={22} radius={999} />
                                <SkeletonBlock width={110} height={22} radius={999} />
                                <SkeletonBlock width={100} height={22} radius={999} />
                              </>
                            ) : (
                              <>
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
                              </>
                            )}
                          </View>
                        </View>
                        {showMapSkeleton ? (
                          <SkeletonBlock height={260} radius={14} />
                        ) : (
                          <>
                            <MapCanvas
                              key={mapKey}
                              points={mapPoints}
                              region={mapRegion}
                              onSelect={handleOpenMapDetail}
                              formatMoney={formatMoney}
                              height={260}
                            />
                            {!mapPoints.length && (
                              <Text style={styles.mapEmptyText}>Agrega ubicaciones en tus presupuestos.</Text>
                            )}
                          </>
                        )}
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
                    </DashboardAccordion>

                    <DashboardAccordion
                      title="Facturacion estimada"
                      subtitle={`Pipeline activo | $${formatMoney(monthStats.totalAmount)}`}
                      expanded={expandedSections.billing}
                      accent={STATUS_COLORS.approved}
                      onPress={() => toggleDashboardSection('billing')}
                    >
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
                    </DashboardAccordion>

                    <DashboardAccordion
                      title="Tendencia anual"
                      subtitle="Presupuestos, pendientes y cobrados | fechas reales"
                      expanded={expandedSections.trend}
                      accent={STATUS_COLORS.total}
                      onPress={() => toggleDashboardSection('trend')}
                    >
                      <View style={styles.trendPanel}>
                        <View style={styles.trendHeader}>
                          <Text style={styles.trendTitle}>TENDENCIA ANUAL | FECHAS REALES</Text>
                          <View style={styles.trendLegend}>
                            <View style={styles.legendItem}>
                              <View style={[styles.legendDot, { backgroundColor: STATUS_COLORS.total }]} />
                              <Text style={styles.legendText}>Presupuestos</Text>
                            </View>
                            <View style={styles.legendItem}>
                              <View style={[styles.legendDot, { backgroundColor: STATUS_COLORS.pending }]} />
                              <Text style={styles.legendText}>Pendientes</Text>
                            </View>
                            <View style={styles.legendItem}>
                              <View style={[styles.legendDot, { backgroundColor: STATUS_COLORS.paid }]} />
                              <Text style={styles.legendText}>Cobrados acumulados</Text>
                            </View>
                          </View>
                        </View>
                        <View
                          style={styles.trendChart}
                          onLayout={(event) => setTrendWidth(event.nativeEvent.layout.width)}
                        >
                          {showTrendSkeleton ? (
                            <SkeletonBlock height={trendHeight} radius={12} />
                          ) : (
                            <TrendChart
                              width={trendWidth}
                              height={trendHeight}
                              padding={trendPadding}
                              innerHeight={trendInnerHeight}
                              midY={trendMidY}
                              maxLabel={trendMaxLabel}
                              midLabel={trendMidLabel}
                              totalPoints={trendPoints.total}
                              pendingPoints={trendPoints.pending}
                              paidPoints={trendPoints.paid}
                              coords={trendPoints.coords}
                            />
                          )}
                        </View>
                        {showTrendSkeleton ? (
                          <>
                            <View style={styles.trendLabelSkeletonRow}>
                              {Array.from({ length: 6 }).map((_, index) => (
                                <SkeletonBlock key={`trend-label-${index}`} width={24} height={8} radius={4} />
                              ))}
                            </View>
                            <View style={styles.trendSummarySkeletonRow}>
                              {Array.from({ length: 2 }).map((_, index) => (
                                <SkeletonBlock
                                  key={`trend-card-${index}`}
                                  width={120}
                                  height={88}
                                  radius={14}
                                  style={styles.trendSummarySkeleton}
                                />
                              ))}
                            </View>
                          </>
                        ) : (
                          <>
                            <View style={styles.trendLabels}>
                              {trendData.map((entry) => (
                                <Text key={entry.key} style={styles.trendLabel}>{entry.label}</Text>
                              ))}
                            </View>
                            <FlashList
                              horizontal
                              data={trendSummary}
                              keyExtractor={(item) => item.key}
                              renderItem={renderTrendSummaryItem}
                              showsHorizontalScrollIndicator={false}
                              contentContainerStyle={styles.trendSummaryRow}
                              estimatedItemSize={120}
                            />
                          </>
                        )}
                      </View>
                    </DashboardAccordion>

                    <TouchableOpacity
                      style={styles.dashboardShortcutCard}
                      onPress={handleOpenLaborCatalog}
                      activeOpacity={0.9}
                    >
                      <View style={styles.dashboardShortcutMain}>
                        <View style={styles.dashboardShortcutIconWrap}>
                          <Ionicons name="construct-outline" size={20} color="#FFFFFF" />
                        </View>
                        <View style={styles.dashboardShortcutCopy}>
                          <Text style={styles.dashboardShortcutTitle}>Precios de mano de obra</Text>
                          <Text style={styles.dashboardShortcutSubtitle}>
                            Abrir el listado de referencia del catalogo
                          </Text>
                        </View>
                      </View>
                      <Ionicons name="arrow-forward" size={18} color="#0F172A" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.dashboardShortcutCard}
                      onPress={handleOpenPublicProfile}
                      activeOpacity={0.9}
                    >
                      <View style={styles.dashboardShortcutMain}>
                        <View style={[styles.dashboardShortcutIconWrap, styles.dashboardShortcutIconWrapDark]}>
                          <Ionicons name="storefront-outline" size={20} color="#FFFFFF" />
                        </View>
                        <View style={styles.dashboardShortcutCopy}>
                          <Text style={styles.dashboardShortcutTitle}>Mi perfil publico</Text>
                          <Text style={styles.dashboardShortcutSubtitle}>
                            Vista previa de tu ficha en la vidriera de tecnicos
                          </Text>
                        </View>
                      </View>
                      <Ionicons name="arrow-forward" size={18} color="#0F172A" />
                    </TouchableOpacity>

                  </View>

                  <View style={styles.latestHeader}>
                    <Text style={styles.sectionTitle}>
                      {activeFilter === 'total'
                        ? 'ULTIMOS PRESUPUESTOS'
                        : `TRABAJOS ${FILTER_LABELS[activeFilter].toUpperCase()}`}
                    </Text>
                    <View style={styles.latestActions}>
                      {selectionMode && selectedIds.length > 0 && (
                        <TouchableOpacity
                          onPress={async () => {
                            const performArchive = async () => {
                              try {
                                await archiveSelectedQuotes();
                              } catch (_err) {
                                Alert.alert('Error', 'No se pudieron archivar los presupuestos seleccionados.');
                              }
                            };

                            if (Platform.OS === 'web') {
                              // @ts-ignore
                              if (window.confirm(`¿Archivar ${selectedIds.length} presupuestos? Se quitaran de la lista activa.`)) {
                                await performArchive();
                              }
                              return;
                            }

                            Alert.alert(
                              'Archivar presupuestos',
                              `¿Seguro que quieres archivar ${selectedIds.length} presupuestos? Se quitaran de la lista activa.`,
                              [
                                { text: 'Cancelar', style: 'cancel' },
                                { text: 'Archivar', onPress: () => void performArchive() },
                              ]
                            );
                          }}
                          style={[styles.selectBtn, styles.archiveSelectBtn]}
                        >
                          <Ionicons name="archive-outline" size={14} color="#0F172A" />
                          <Text style={[styles.selectBtnText, styles.archiveSelectBtnText]}>Archivar</Text>
                        </TouchableOpacity>
                      )}
                      {selectionMode && (
                        <TouchableOpacity 
                          onPress={clearSelection}
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
                await deleteSelectedQuotes();
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
          formatMoney={formatMoney}
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
  formatMoney,
  onClose,
  onOpen,
}: {
  point: MapPoint;
  formatMoney: (value: number) => string;
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
  headerCompact: {
    backgroundColor: '#F5F4F0',
    paddingHorizontal: 18,
    paddingBottom: 6,
  },
  headerCompactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
  },
  headerCompactCopy: {
    flex: 1,
    gap: 2,
  },
  headerCompactTitle: {
    fontSize: 24,
    fontFamily: FONTS.title,
    color: '#0F172A',
    letterSpacing: 0.1,
  },
  headerCompactMeta: {
    fontSize: 11,
    fontFamily: FONTS.body,
    color: '#8D8270',
  },
  dashboardWrapper: { gap: 16, marginTop: 2, marginBottom: 6 },
  dashboardShortcutCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E6DED2',
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    shadowColor: '#C7BBA8',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 14,
    elevation: 6,
  },
  dashboardShortcutMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dashboardShortcutIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dashboardShortcutIconWrapDark: {
    backgroundColor: COLORS.secondary,
  },
  dashboardShortcutCopy: {
    flex: 1,
    gap: 3,
  },
  dashboardShortcutTitle: {
    fontSize: 14,
    fontFamily: FONTS.title,
    color: '#0F172A',
  },
  dashboardShortcutSubtitle: {
    fontSize: 11,
    fontFamily: FONTS.body,
    color: '#6B7280',
  },
  accordionSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E6DED2',
    shadowColor: '#C7BBA8',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 14,
    elevation: 6,
    overflow: 'hidden',
  },
  accordionTrigger: {
    minHeight: 76,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    backgroundColor: '#FFFDF8',
  },
  accordionTriggerExpanded: {
    backgroundColor: '#FFF8EE',
    borderBottomWidth: 1,
    borderBottomColor: '#F1E6D7',
  },
  accordionTriggerMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  accordionAccent: {
    width: 8,
    height: 44,
    borderRadius: 999,
    shadowColor: '#C7BBA8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 2,
  },
  accordionCopy: { flex: 1, gap: 4 },
  accordionTitle: {
    fontSize: 14,
    fontFamily: FONTS.title,
    color: '#0F172A',
  },
  accordionSubtitle: {
    fontSize: 11,
    fontFamily: FONTS.body,
    color: '#6B7280',
  },
  accordionChevronWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accordionChevronWrapExpanded: {
    backgroundColor: COLORS.secondary,
  },
  accordionBody: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
  },
  dashboardPanelHeader: { marginBottom: 12, gap: 4 },
  dashboardPanelHint: {
    fontSize: 11,
    fontFamily: FONTS.body,
    color: '#8D8270',
  },
  panelTitle: { fontSize: 11, fontFamily: FONTS.subtitle, color: '#8D8270', letterSpacing: 2.4, marginBottom: 12 },
  dashboardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  dashboardCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 8,
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
    fontSize: 10,
    fontFamily: FONTS.subtitle,
    color: '#9A8F7B',
    letterSpacing: 0.6,
    textAlign: 'center',
  },
  dashboardValue: { fontSize: 22, fontFamily: FONTS.title, marginTop: 6, textAlign: 'center', alignSelf: 'center' },
  dashboardHint: { fontSize: 10, fontFamily: FONTS.body, color: '#6B7280', marginTop: 2, textAlign: 'center' },
  dashboardCardCompact: { paddingVertical: 8, paddingHorizontal: 6 },
  dashboardLabelCompact: { fontSize: 9 },
  dashboardValueCompact: { fontSize: 20, marginTop: 4 },
  dashboardHintCompact: { fontSize: 9, marginTop: 2 },
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
    gap: 12,
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
  trendLabelSkeletonRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  trendSummaryRow: { gap: 10, paddingTop: 12, paddingBottom: 4 },
  trendSummarySkeletonRow: { flexDirection: 'row', gap: 10, paddingTop: 12, paddingBottom: 4 },
  trendSummarySkeleton: { backgroundColor: '#EFE9DE' },
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
  summaryStatusSection: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1E6D7',
    gap: 6,
  },
  summaryMapSection: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1E6D7',
    gap: 12,
  },
  statusPanel: {
    gap: 10,
  },
  statusChart: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginTop: 10 },
  statusColumn: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  statusValue: { fontSize: 18, fontFamily: FONTS.title, marginBottom: 6 },
  statusBar: { width: '100%', borderRadius: 8, alignSelf: 'stretch' },
  statusLabel: { fontSize: 11, fontFamily: FONTS.subtitle, color: '#A8A29E', marginTop: 6, textAlign: 'center', letterSpacing: 0.3 },
  statusSkeletonBar: { marginTop: 6 },
  statusSkeletonLabel: { marginTop: 6 },
  mapPanel: {
    gap: 12,
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
  mapEmptyText: { marginTop: 8, fontSize: 11, fontFamily: FONTS.body, color: '#94A3B8' },
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
  archiveSelectBtn: {
    backgroundColor: '#FDE68A',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  archiveSelectBtnText: { color: '#0F172A' },
  bulkDeleteBar: { position: 'absolute', left: 16, right: 16, bottom: 16, backgroundColor: COLORS.danger, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 12, borderRadius: 12, gap: 8 },
  bulkDeleteText: { color: '#FFF', fontFamily: FONTS.title, fontSize: 15 }
});
