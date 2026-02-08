import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Modal, Platform, ScrollView, Pressable } from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { useNavigation } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '../../lib/supabase';
import { COLORS, FONTS } from '../../utils/theme';
import MapCanvas from '../../components/molecules/MapCanvas';
import { MapPoint } from '../../types/maps';
import { ScreenHeader } from '../../components/molecules/ScreenHeader';
import { EmptyState } from '../../components/molecules/EmptyState';
import { Ionicons } from '@expo/vector-icons';

// --- CONFIGURACIÓN DE IDIOMA ---
LocaleConfig.locales['es'] = {
  monthNames: ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'],
  monthNamesShort: ['Ene.','Feb.','Mar.','Abr.','May.','Jun.','Jul.','Ago.','Sep.','Oct.','Nov.','Dic.'],
  dayNames: ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'],
  dayNamesShort: ['Dom','Lun','Mar','Mié','Jue','Vi','Sáb'],
  today: "Hoy"
};
LocaleConfig.defaultLocale = 'es';

const toDateKey = (date: Date) => {
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);
  return localDate.toISOString().split('T')[0];
};

const TODAY = toDateKey(new Date());
const DAY_HEADERS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vi', 'Sáb'];

const NoTranslateText = ({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: any;
}) => {
  if (Platform.OS !== 'web') {
    return <Text style={style}>{children}</Text>;
  }
  const WebText = Text as any;
  return (
    <WebText
      style={style}
      className="notranslate"
      dataSet={{ notranslate: 'true' }}
      translate={false}
    >
      {children}
    </WebText>
  );
};

const NoTranslateView = ({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: any;
}) => {
  if (Platform.OS !== 'web') {
    return <View style={style}>{children}</View>;
  }
  const WebView = View as any;
  return (
    <WebView
      style={style}
      className="notranslate"
      dataSet={{ notranslate: 'true' }}
      translate={false}
    >
      {children}
    </WebView>
  );
};

export default function AgendaScreen() {
  const navigation = useNavigation();
  
  const [selectedDate, setSelectedDate] = useState(TODAY);
  const [items, setItems] = useState<any>({}); 
  const [unscheduledItems, setUnscheduledItems] = useState<any[]>([]); 
  const [markedDates, setMarkedDates] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [dayFilter, setDayFilter] = useState<'all' | 'pending' | 'confirmed' | 'cancelled'>('all');
  const [quickDetail, setQuickDetail] = useState<any | null>(null);

  // Estado para asignar fecha rápida
  const [targetJobId, setTargetJobId] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // --- FIX FECHA: Función para mostrar la fecha correcta sin restar horas ---
  const formatDateForDisplay = (dateString: string) => {
    // Rompemos el string "2025-12-01" en partes
    const [year, month, day] = dateString.split('-').map(Number);
    // Creamos la fecha localmente (Mes en JS es índice 0, por eso month - 1)
    const localDate = new Date(year, month - 1, day);
    return localDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
  };

  const formatMoney = (value: number) => Number(value || 0).toLocaleString('es-AR');

  const statusConfig = {
    pending: { label: 'Pendiente', color: '#F59E0B', bg: '#FFF7ED' },
    confirmed: { label: 'Confirmado', color: '#10B981', bg: '#D1FAE5' },
    cancelled: { label: 'Cancelado', color: '#EF4444', bg: '#FEE2E2' },
  };

  const resolveAgendaStatus = (status?: string | null) => {
    const normalized = (status || '').toLowerCase().trim();
    if (['cancelled', 'canceled', 'cancelado', 'rechazado', 'rejected'].includes(normalized)) {
      return { key: 'cancelled', ...statusConfig.cancelled };
    }
    if (['approved', 'aprobado', 'accepted', 'paid', 'cobrado', 'cobrados', 'pagado', 'pagados', 'charged'].includes(normalized)) {
      return { key: 'confirmed', ...statusConfig.confirmed };
    }
    if (['draft', 'pending', 'pendiente', 'presented', 'sent'].includes(normalized)) {
      return { key: 'pending', ...statusConfig.pending };
    }
    return { key: 'pending', ...statusConfig.pending };
  };

  const loadItems = async () => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
        .from('quotes')
        .select('id, client_name, total_amount, status, scheduled_date, created_at, client_address, address, location_address, location_lat, location_lng')
        .eq('user_id', user.id)
        .neq('status', 'completed');

        if (error) throw error;

        const newItems: any = {};
        const newMarks: any = {};
        const pendingList: any[] = [];

        data?.forEach((job) => {
            if (!job.scheduled_date) {
                pendingList.push(job);
                return;
            }

            const dateKey = job.scheduled_date; 
            
            if (!newItems[dateKey]) newItems[dateKey] = [];
            newItems[dateKey].push(job);

            const status = resolveAgendaStatus(job.status);
            if (!newMarks[dateKey]) {
                newMarks[dateKey] = { marked: true, dots: [] as { key: string; color: string }[] };
            }
            if (!newMarks[dateKey].dots.find((dot: any) => dot.key === status.key)) {
                newMarks[dateKey].dots.push({ key: status.key, color: status.color });
            }
        });

        setItems(newItems);
        setMarkedDates(newMarks);
        setUnscheduledItems(pendingList);

    } catch (e) {
        console.error("Error agenda:", e);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => { loadItems(); }, []);

  // --- ACCIÓN: ASIGNAR FECHA ---
  const updateSchedule = async (jobId: string, dateString: string) => {
    await supabase.from('quotes').update({ scheduled_date: dateString }).eq('id', jobId);
    setTargetJobId(null);
    setLoading(true);
    loadItems();
  };

  const quickAssign = async (jobId: string, offsetDays: number) => {
    const date = new Date();
    date.setDate(date.getDate() + offsetDays);
    await updateSchedule(jobId, toDateKey(date));
  };

  const onDateSelected = async (_event: any, date?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    
    if (date && targetJobId) {
        await updateSchedule(targetJobId, toDateKey(date));
        if (Platform.OS === 'ios') setShowDatePicker(false);
    }
  };

  const openScheduler = (jobId: string) => {
      setTargetJobId(jobId);
      setShowDatePicker(true);
  };

  // --- RENDERS ---
  const renderUnscheduledItem = ({ item }: { item: any }) => (
    <View style={styles.unscheduledCard}>
        <View style={styles.unscheduledInfo}>
            <Text style={styles.unscheduledName} numberOfLines={1}>{item.client_name || 'Sin Nombre'}</Text>
            <Text style={styles.unscheduledAmount}>${formatMoney(item.total_amount || 0)}</Text>
        </View>
        <View style={styles.quickRow}>
            <TouchableOpacity style={styles.quickChip} onPress={() => quickAssign(item.id, 0)}>
              <Text style={styles.quickChipText}>Hoy</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickChip} onPress={() => quickAssign(item.id, 1)}>
              <Text style={styles.quickChipText}>Mañana</Text>
            </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.assignBtn} onPress={() => openScheduler(item.id)}>
            <Text style={styles.assignBtnText}>Asignar fecha</Text>
            <Ionicons name="calendar" size={14} color="#FFF" style={{marginLeft:6}}/>
        </TouchableOpacity>
    </View>
  );

  const renderItem = ({ item }: { item: any }) => {
    const status = resolveAgendaStatus(item.status);
    return (
      <TouchableOpacity 
        style={[styles.itemCard, { borderLeftColor: status.color }]}
        onPress={() => {
             // @ts-ignore
             navigation.navigate('JobDetail', { jobId: item.id });
        }}
        onLongPress={() => setQuickDetail(item)}
      >
        <View>
            <Text style={styles.itemTitle}>{item.client_name || 'Sin Nombre'}</Text>
            <View style={[styles.badge, { backgroundColor: status.bg, borderColor: status.color }]}>
                <Text style={[styles.badgeText, { color: status.color }]}>{status.label}</Text>
            </View>
        </View>
        <Text style={styles.itemPrice}>${item.total_amount?.toLocaleString('es-AR')}</Text>
      </TouchableOpacity>
    );
  };

  const dayItems = useMemo(() => items[selectedDate] || [], [items, selectedDate]);
  const filteredDayItems = useMemo(() => {
    if (dayFilter === 'all') return dayItems;
    return dayItems.filter((item: any) => resolveAgendaStatus(item.status).key === dayFilter);
  }, [dayItems, dayFilter]);

  const daySummary = useMemo(() => {
    let pending = 0;
    let confirmed = 0;
    let cancelled = 0;
    let totalAmount = 0;

    dayItems.forEach((item: any) => {
      const status = resolveAgendaStatus(item.status);
      if (status.key === 'pending') pending += 1;
      if (status.key === 'confirmed') confirmed += 1;
      if (status.key === 'cancelled') cancelled += 1;
      totalAmount += item.total_amount || 0;
    });

    return {
      totalVisits: dayItems.length,
      pending,
      confirmed,
      cancelled,
      totalAmount,
    };
  }, [dayItems]);

  const summaryCards = [
    { key: 'visits', label: 'Visitas', value: daySummary.totalVisits, accent: '#0F172A' },
    { key: 'pending', label: 'Pendientes', value: daySummary.pending, accent: statusConfig.pending.color },
    { key: 'confirmed', label: 'Confirmadas', value: daySummary.confirmed, accent: statusConfig.confirmed.color },
    { key: 'total', label: 'Estimado', value: `$${formatMoney(daySummary.totalAmount)}`, accent: '#0F172A' },
  ];

  const weekDays = useMemo(() => {
    const [year, month, day] = selectedDate.split('-').map(Number);
    const base = new Date(year, month - 1, day);
    const start = new Date(base);
    start.setDate(base.getDate() - start.getDay());
    const labels = DAY_HEADERS;

    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      const dateKey = toDateKey(date);
      return {
        dateKey,
        label: labels[date.getDay()],
        day: date.getDate(),
        count: (items[dateKey] || []).length,
        isToday: dateKey === TODAY,
      };
    });
  }, [selectedDate, items]);

  const dayMapPoints = useMemo<MapPoint[]>(() => {
    return dayItems
      .map((item: any) => {
        const lat = Number(item.location_lat);
        const lng = Number(item.location_lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        const status = resolveAgendaStatus(item.status);
        return {
          id: item.id,
          title: item.client_name || 'Sin nombre',
          amount: item.total_amount || 0,
          address: item.client_address || item.address || item.location_address || '',
          createdAt: item.created_at,
          lat,
          lng,
          status: { key: status.key, label: status.label, color: status.color },
        };
      })
      .filter(Boolean) as MapPoint[];
  }, [dayItems]);

  const dayMapRegion = useMemo(() => {
    if (!dayMapPoints.length) {
      return {
        latitude: -34.6037,
        longitude: -58.3816,
        latitudeDelta: 0.2,
        longitudeDelta: 0.2,
      };
    }
    const lats = dayMapPoints.map((point) => point.lat);
    const lngs = dayMapPoints.map((point) => point.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const latitude = (minLat + maxLat) / 2;
    const longitude = (minLng + maxLng) / 2;
    const latitudeDelta = Math.max(0.03, (maxLat - minLat) * 1.6);
    const longitudeDelta = Math.max(0.03, (maxLng - minLng) * 1.6);
    return { latitude, longitude, latitudeDelta, longitudeDelta };
  }, [dayMapPoints]);

  const emptyMessage =
    dayFilter === 'all'
      ? 'No tienes visitas hoy.'
      : 'No hay visitas para este filtro.';

  return (
    <View style={styles.container}>
        <ScreenHeader title="MI AGENDA" subtitle="Organiza tus visitas" centerTitle />
        
        {/* --- SECCIÓN: POR AGENDAR --- */}
        {unscheduledItems.length > 0 && (
            <View style={styles.unscheduledContainer}>
                <Text style={styles.sectionTitle}>⚠️ POR AGENDAR ({unscheduledItems.length})</Text>
                <FlatList 
                    horizontal 
                    data={unscheduledItems}
                    renderItem={renderUnscheduledItem}
                    keyExtractor={item => item.id}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 10 }}
                />
            </View>
        )}

        <View style={styles.summarySection}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.summaryRow}
            >
                {summaryCards.map((card) => (
                    <View key={card.key} style={styles.summaryCard}>
                        <Text style={styles.summaryLabel}>{card.label}</Text>
                        <Text style={[styles.summaryValue, { color: card.accent }]}>{card.value}</Text>
                        {card.key === 'total' && (
                          <Text style={styles.summaryHint}>Total estimado</Text>
                        )}
                    </View>
                ))}
            </ScrollView>
        </View>

        <NoTranslateView style={styles.calendarCard}>
            <View style={styles.calendarDayHeader}>
              {DAY_HEADERS.map((label) => (
                <NoTranslateText key={label} style={styles.calendarDayHeaderText}>
                  {label}
                </NoTranslateText>
              ))}
            </View>
            {(() => {
              const calendarTheme: any = {
                todayTextColor: COLORS.primary,
                arrowColor: COLORS.primary,
                textDayFontFamily: FONTS.body,
                textMonthFontFamily: FONTS.title,
                textDayHeaderFontFamily: FONTS.subtitle,
                textMonthFontSize: 16,
                textDayFontSize: 12,
                textDayHeaderFontSize: 10,
                monthTextColor: COLORS.text,
                calendarBackground: '#FFFFFF',
                dayTextColor: COLORS.text,
                'stylesheet.calendar.header': {
                  dayHeader: {
                    height: 0,
                    opacity: 0,
                    marginTop: 0,
                  },
                  week: {
                    marginTop: 0,
                    flexDirection: 'row',
                    justifyContent: 'space-around',
                  },
                },
              };
              return (
                <Calendar
                current={selectedDate}
                onDayPress={(day: any) => setSelectedDate(day.dateString)}
                markedDates={{
                    ...markedDates,
                    [selectedDate]: { ...(markedDates[selectedDate] || {}), selected: true, selectedColor: COLORS.primary }
                }}
                markingType="multi-dot"
                hideDayNames
                theme={calendarTheme}
                />
              );
            })()}
        </NoTranslateView>

        <NoTranslateView style={styles.weekRow}>
            {weekDays.map((day) => {
              const isSelected = day.dateKey === selectedDate;
              return (
                <TouchableOpacity
                  key={day.dateKey}
                  style={[styles.weekDay, isSelected && styles.weekDayActive]}
                  onPress={() => setSelectedDate(day.dateKey)}
                  activeOpacity={0.85}
                >
                  <NoTranslateText style={[styles.weekLabel, isSelected && styles.weekLabelActive]}>
                    {day.label}
                  </NoTranslateText>
                  <Text style={[styles.weekNumber, isSelected && styles.weekNumberActive]}>
                    {day.day}
                  </Text>
                  {day.count > 0 && (
                    <View style={[styles.weekCount, isSelected && styles.weekCountActive]}>
                      <Text style={[styles.weekCountText, isSelected && styles.weekCountTextActive]}>
                        {day.count}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
        </NoTranslateView>

        {dayMapPoints.length > 0 && (
            <View style={styles.mapCard}>
                <View style={styles.mapHeader}>
                    <Text style={styles.sectionTitle}>MAPA DEL DIA</Text>
                    <Text style={styles.mapCount}>{dayMapPoints.length} visitas</Text>
                </View>
                <MapCanvas
                  points={dayMapPoints}
                  region={dayMapRegion}
                  onSelect={(point: MapPoint) => {
                    // @ts-ignore
                    navigation.navigate('JobDetail', { jobId: point.id });
                  }}
                  formatMoney={formatMoney}
                />
            </View>
        )}

        <View style={styles.listHeader}>
            {/* AQUÍ ESTABA EL ERROR: Usamos la función corregida */}
            <Text style={styles.dateTitle}>
                Agenda del {formatDateForDisplay(selectedDate)}
            </Text>
            <Text style={styles.dateMeta}>
                {daySummary.totalVisits} visitas · {daySummary.pending} pendientes · {daySummary.confirmed} confirmadas
            </Text>
        </View>

        <View style={styles.filtersRow}>
            {[
              { key: 'all', label: 'Todas' },
              { key: 'pending', label: 'Pendientes' },
              { key: 'confirmed', label: 'Confirmadas' },
              { key: 'cancelled', label: 'Canceladas' },
            ].map((filter) => (
              <TouchableOpacity
                key={filter.key}
                style={[
                  styles.filterPill,
                  dayFilter === filter.key && styles.filterPillActive,
                ]}
                onPress={() => setDayFilter(filter.key as any)}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    dayFilter === filter.key && styles.filterPillTextActive,
                  ]}
                >
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))}
        </View>

        {loading ? (
            <ActivityIndicator color={COLORS.primary} style={{ marginTop: 20 }} />
        ) : (
            <FlatList
                data={filteredDayItems}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <EmptyState icon="calendar-outline" title="Día Libre" message={emptyMessage} />
                }
            />
        )}

        {/* CALENDARIO MODAL */}
        {showDatePicker && (
             Platform.OS === 'ios' ? (
                <Modal transparent animationType="fade">
                    <View style={styles.modalOverlay}>
                        <View style={styles.iosPickerContainer}>
                             <DateTimePicker value={new Date()} mode="date" display="inline" onChange={onDateSelected} />
                             <TouchableOpacity onPress={() => setShowDatePicker(false)} style={styles.closeModalBtn}>
                                 <Text style={{color:'blue', fontWeight:'bold'}}>Cerrar</Text>
                             </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
             ) : (
                <DateTimePicker value={new Date()} mode="date" onChange={onDateSelected} />
             )
        )}

        {quickDetail && (
            <Modal transparent animationType="fade" visible onRequestClose={() => setQuickDetail(null)}>
                <Pressable style={styles.sheetOverlay} onPress={() => setQuickDetail(null)}>
                    <Pressable style={styles.sheetContainer} onPress={() => null}>
                        <View style={styles.sheetHandle} />
                        <Text style={styles.sheetTitle}>{quickDetail.client_name || 'Sin nombre'}</Text>
                        <Text style={styles.sheetAmount}>${formatMoney(quickDetail.total_amount || 0)}</Text>
                        <View style={styles.sheetMetaRow}>
                            <View
                                style={[
                                  styles.sheetBadge,
                                  {
                                    backgroundColor: resolveAgendaStatus(quickDetail.status).bg,
                                    borderColor: resolveAgendaStatus(quickDetail.status).color,
                                  },
                                ]}
                            >
                                <Text
                                  style={[
                                    styles.sheetBadgeText,
                                    { color: resolveAgendaStatus(quickDetail.status).color },
                                  ]}
                                >
                                  {resolveAgendaStatus(quickDetail.status).label}
                                </Text>
                            </View>
                            {!!quickDetail.scheduled_date && (
                              <Text style={styles.sheetDate}>
                                {formatDateForDisplay(quickDetail.scheduled_date)}
                              </Text>
                            )}
                        </View>
                        <View style={styles.sheetActions}>
                            <TouchableOpacity style={styles.sheetGhostBtn} onPress={() => setQuickDetail(null)}>
                                <Text style={styles.sheetGhostText}>Cerrar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.sheetPrimaryBtn}
                                onPress={() => {
                                  setQuickDetail(null);
                                  // @ts-ignore
                                  navigation.navigate('JobDetail', { jobId: quickDetail.id });
                                }}
                            >
                                <Text style={styles.sheetPrimaryText}>Ver detalle</Text>
                                <Ionicons name="arrow-forward" size={16} color="#FFF" />
                            </TouchableOpacity>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>
        )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F4F0' },
  
  // Estilos Por Agendar
  unscheduledContainer: { backgroundColor: '#FFF5E0', paddingTop: 12, paddingBottom: 8 },
  sectionTitle: { fontSize: 10, fontFamily: FONTS.subtitle, color: '#B45309', marginLeft: 16, marginBottom: 8, letterSpacing: 1.6 },
  unscheduledCard: { 
      backgroundColor: '#FFFFFF', width: 180, padding: 12, borderRadius: 14, marginRight: 12,
      borderWidth: 1, borderColor: '#F3E6CF', shadowColor: "#BFA57A", shadowOpacity: 0.15, elevation: 2
  },
  unscheduledInfo: { gap: 4 },
  unscheduledName: { fontSize: 13, fontFamily: FONTS.subtitle, color: COLORS.text },
  unscheduledAmount: { fontSize: 12, fontFamily: FONTS.body, color: COLORS.textLight },
  quickRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  quickChip: {
      flex: 1,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: '#F3E6CF',
      backgroundColor: '#FFFDF9',
      alignItems: 'center',
  },
  quickChipText: { fontSize: 10, fontFamily: FONTS.subtitle, color: '#92400E' },
  assignBtn: { 
      marginTop: 10, backgroundColor: COLORS.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      paddingVertical: 8, borderRadius: 10
  },
  assignBtnText: { color: '#FFF', fontSize: 11, fontFamily: FONTS.subtitle },

  // Resumen
  summarySection: { paddingVertical: 14 },
  summaryRow: { paddingHorizontal: 16, gap: 12 },
  summaryCard: {
    width: 150,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#EFE6D8',
    alignItems: 'center',
  },
  summaryLabel: { fontSize: 10, fontFamily: FONTS.subtitle, color: '#9A8F7B', letterSpacing: 1.4, textTransform: 'uppercase', textAlign: 'center' },
  summaryValue: { fontSize: 20, fontFamily: FONTS.title, marginTop: 6, textAlign: 'center' },
  summaryHint: { fontSize: 10, fontFamily: FONTS.body, color: '#94A3B8', marginTop: 4, textAlign: 'center' },

  calendarCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#EFE6D8',
    backgroundColor: '#FFFFFF',
  },
  calendarDayHeader: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F3EDE2',
    backgroundColor: '#FFFFFF',
  },
  calendarDayHeaderText: {
    flex: 1,
    textAlign: 'center',
    fontFamily: FONTS.subtitle,
    fontSize: 10,
    color: '#94A3B8',
  },

  weekRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, marginTop: 12 },
  weekDay: {
    width: 44,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFE6D8',
  },
  weekDayActive: { backgroundColor: '#0F172A', borderColor: '#0F172A' },
  weekLabel: { fontSize: 9, fontFamily: FONTS.subtitle, color: '#94A3B8', letterSpacing: 0.6 },
  weekLabelActive: { color: '#F8FAFC' },
  weekNumber: { fontSize: 14, fontFamily: FONTS.title, color: '#0F172A', marginTop: 2 },
  weekNumberActive: { color: '#FFFFFF' },
  weekCount: {
    marginTop: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: '#F3F4F6',
  },
  weekCountActive: { backgroundColor: 'rgba(248,250,252,0.15)' },
  weekCountText: { fontSize: 9, fontFamily: FONTS.subtitle, color: '#475569' },
  weekCountTextActive: { color: '#F8FAFC' },

  mapCard: {
    marginTop: 16,
    marginHorizontal: 16,
    backgroundColor: '#FBFBF9',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EFE6D8',
  },
  mapHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  mapCount: { fontSize: 11, fontFamily: FONTS.subtitle, color: '#94A3B8' },

  // Resto
  listHeader: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 6, backgroundColor: '#F5F4F0' },
  dateTitle: { fontFamily: FONTS.title, fontSize: 16, color: COLORS.text, textTransform: 'uppercase' },
  dateMeta: { fontFamily: FONTS.body, fontSize: 11, color: COLORS.textLight, marginTop: 4 },
  filtersRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingBottom: 6 },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  filterPillActive: { backgroundColor: '#0F172A', borderColor: '#0F172A' },
  filterPillText: { fontSize: 11, fontFamily: FONTS.subtitle, color: '#475569' },
  filterPillTextActive: { color: '#FFFFFF' },
  listContent: { padding: 16 },

  itemCard: {
    backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 12,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderLeftWidth: 5, shadowColor: "#000", shadowOffset: {width:0, height:2}, shadowOpacity:0.05, elevation: 2
  },
  itemTitle: { fontSize: 16, fontFamily: FONTS.subtitle, color: COLORS.text, marginBottom: 4 },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgeText: { fontSize: 10, fontFamily: FONTS.subtitle, letterSpacing: 0.6 },
  itemPrice: { fontSize: 16, fontFamily: FONTS.title, color: COLORS.text },

  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' },
  iosPickerContainer: { backgroundColor: 'white', borderRadius: 12, padding: 20, width: '90%' },
  closeModalBtn: { marginTop: 10, alignItems: 'center', padding: 10 },

  sheetOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.35)', justifyContent: 'flex-end' },
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
  sheetAmount: { fontSize: 18, fontFamily: FONTS.title, color: '#0F172A', marginTop: 6 },
  sheetMetaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  sheetBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  sheetBadgeText: { fontSize: 10, fontFamily: FONTS.subtitle, letterSpacing: 0.6 },
  sheetDate: { fontSize: 11, fontFamily: FONTS.body, color: '#94A3B8' },
  sheetActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  sheetGhostBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  sheetGhostText: { fontSize: 12, fontFamily: FONTS.subtitle, color: '#475569' },
  sheetPrimaryBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  sheetPrimaryText: { fontSize: 12, fontFamily: FONTS.subtitle, color: '#FFFFFF' },
});
