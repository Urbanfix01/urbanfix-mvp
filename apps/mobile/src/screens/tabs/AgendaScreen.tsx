import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Modal, Platform } from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { useNavigation } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '../../lib/supabase';
import { COLORS, FONTS } from '../../utils/theme';
import { ScreenHeader } from '../../components/molecules/ScreenHeader';
import { EmptyState } from '../../components/molecules/EmptyState';
import { Ionicons } from '@expo/vector-icons';

// --- CONFIGURACIÓN DE IDIOMA ---
LocaleConfig.locales['es'] = {
  monthNames: ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'],
  monthNamesShort: ['Ene.','Feb.','Mar.','Abr.','May.','Jun.','Jul.','Ago.','Sep.','Oct.','Nov.','Dic.'],
  dayNames: ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'],
  dayNamesShort: ['Dom.','Lun.','Mar.','Mié.','Jue.','Vie.','Sáb.'],
  today: "Hoy"
};
LocaleConfig.defaultLocale = 'es';

const TODAY = new Date().toISOString().split('T')[0];

export default function AgendaScreen() {
  const navigation = useNavigation();
  
  const [selectedDate, setSelectedDate] = useState(TODAY);
  const [items, setItems] = useState<any>({}); 
  const [unscheduledItems, setUnscheduledItems] = useState<any[]>([]); 
  const [markedDates, setMarkedDates] = useState<any>({});
  const [loading, setLoading] = useState(true);

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

  const loadItems = async () => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
        .from('quotes')
        .select('id, client_name, total_amount, status, scheduled_date, created_at')
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

            newMarks[dateKey] = { 
                marked: true, 
                dotColor: job.status === 'draft' || job.status === 'pending' ? COLORS.primary : '#10B981' 
            };
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
  const onDateSelected = async (event: any, date?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    
    if (date && targetJobId) {
        // Obtenemos YYYY-MM-DD localmente para guardar en DB
        const offset = date.getTimezoneOffset(); 
        const localDate = new Date(date.getTime() - (offset*60*1000));
        const dateString = localDate.toISOString().split('T')[0];
        
        // 1. Actualizar en DB
        await supabase.from('quotes').update({ scheduled_date: dateString }).eq('id', targetJobId);
        
        // 2. Recargar todo
        setTargetJobId(null);
        setLoading(true);
        loadItems();
    }
  };

  const openScheduler = (jobId: string) => {
      setTargetJobId(jobId);
      setShowDatePicker(true);
  };

  // --- RENDERS ---
  const renderUnscheduledItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.unscheduledCard} onPress={() => openScheduler(item.id)}>
        <View style={{flex:1}}>
            <Text style={styles.unscheduledName} numberOfLines={1}>{item.client_name || 'Sin Nombre'}</Text>
            <Text style={styles.unscheduledAmount}>${item.total_amount?.toLocaleString('es-AR')}</Text>
        </View>
        <View style={styles.assignBtn}>
            <Text style={styles.assignBtnText}>Asignar</Text>
            <Ionicons name="calendar" size={14} color="#FFF" style={{marginLeft:4}}/>
        </View>
    </TouchableOpacity>
  );

  const renderItem = ({ item }: { item: any }) => {
    const isPending = item.status === 'draft' || item.status === 'pending';
    return (
      <TouchableOpacity 
        style={[styles.itemCard, { borderLeftColor: isPending ? COLORS.primary : '#10B981' }]}
        onPress={() => {
             // @ts-ignore
             navigation.navigate('JobDetail', { jobId: item.id });
        }}
      >
        <View>
            <Text style={styles.itemTitle}>{item.client_name || 'Sin Nombre'}</Text>
            <Text style={styles.itemStatus}>
                {isPending ? 'Pendiente de aprobar' : 'Confirmado'}
            </Text>
        </View>
        <Text style={styles.itemPrice}>${item.total_amount?.toLocaleString('es-AR')}</Text>
      </TouchableOpacity>
    );
  };

  const dayItems = items[selectedDate] || [];

  return (
    <View style={styles.container}>
        <ScreenHeader title="Mi Agenda" subtitle="Organiza tus visitas" />
        
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

        <Calendar
            current={TODAY}
            onDayPress={(day: any) => setSelectedDate(day.dateString)}
            markedDates={{
                ...markedDates,
                [selectedDate]: { ...(markedDates[selectedDate] || {}), selected: true, selectedColor: COLORS.primary }
            }}
            theme={{
                todayTextColor: COLORS.primary,
                arrowColor: COLORS.primary,
                textDayFontFamily: FONTS.body,
                textMonthFontFamily: FONTS.title,
                textDayHeaderFontFamily: FONTS.subtitle,
            }}
        />

        <View style={styles.listHeader}>
            {/* AQUÍ ESTABA EL ERROR: Usamos la función corregida */}
            <Text style={styles.dateTitle}>
                Agenda del {formatDateForDisplay(selectedDate)}
            </Text>
        </View>

        {loading ? (
            <ActivityIndicator color={COLORS.primary} style={{ marginTop: 20 }} />
        ) : (
            <FlatList
                data={dayItems}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <EmptyState icon="calendar-outline" title="Día Libre" message="No tienes visitas hoy." />
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

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  
  // Estilos Por Agendar
  unscheduledContainer: { backgroundColor: '#FFF5E0', paddingTop: 10, paddingBottom: 5 },
  sectionTitle: { fontSize: 10, fontFamily: FONTS.title, color: '#D97706', marginLeft: 16, marginBottom: 6, letterSpacing: 1 },
  unscheduledCard: { 
      backgroundColor: '#FFF', width: 140, padding: 10, borderRadius: 8, marginRight: 10,
      shadowColor: "#000", shadowOpacity: 0.05, elevation: 1, borderLeftWidth: 3, borderLeftColor: '#F59E0B'
  },
  unscheduledName: { fontSize: 12, fontFamily: FONTS.subtitle, color: COLORS.text, marginBottom: 2 },
  unscheduledAmount: { fontSize: 12, fontFamily: FONTS.body, color: COLORS.textLight },
  assignBtn: { 
      marginTop: 8, backgroundColor: COLORS.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      paddingVertical: 4, borderRadius: 4
  },
  assignBtnText: { color: '#FFF', fontSize: 10, fontFamily: FONTS.title },

  // Resto
  listHeader: { padding: 20, paddingBottom: 10, backgroundColor: '#F8F9FA' },
  dateTitle: { fontFamily: FONTS.title, fontSize: 16, color: COLORS.textLight, textTransform: 'uppercase' },
  listContent: { padding: 16 },

  itemCard: {
    backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 12,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderLeftWidth: 5, shadowColor: "#000", shadowOffset: {width:0, height:2}, shadowOpacity:0.05, elevation: 2
  },
  itemTitle: { fontSize: 16, fontFamily: FONTS.subtitle, color: COLORS.text, marginBottom: 4 },
  itemStatus: { fontSize: 12, fontFamily: FONTS.body, color: COLORS.textLight },
  itemPrice: { fontSize: 16, fontFamily: FONTS.title, color: COLORS.text },

  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' },
  iosPickerContainer: { backgroundColor: 'white', borderRadius: 12, padding: 20, width: '90%' },
  closeModalBtn: { marginTop: 10, alignItems: 'center', padding: 10 }
});