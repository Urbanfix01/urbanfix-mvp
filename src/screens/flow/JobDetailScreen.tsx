import React, { useEffect, useState } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, ScrollView, 
  ActivityIndicator, Alert, Share, StatusBar 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { COLORS, FONTS } from '../../utils/theme';

const WEB_BASE_URL = 'https://urbanfix-web.vercel.app/p';

export default function JobDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { jobId } = route.params as { jobId: string };

  const [quote, setQuote] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // 1. CARGAR DATOS COMPLETOS
  const fetchQuoteDetail = async () => {
    try {
      const { data, error } = await supabase
        .from('quotes')
        .select('*, quote_items(*)') // Traemos la cabecera Y los items
        .eq('id', jobId)
        .single();

      if (error) throw error;
      setQuote(data);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "No se pudo cargar el presupuesto.");
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Usamos focus listener por si volvemos de editar y hay cambios
    const unsubscribe = navigation.addListener('focus', () => {
      setLoading(true);
      fetchQuoteDetail();
    });
    return unsubscribe;
  }, [navigation, jobId]);

// VERSIÓN "SIN MIEDO" (Directa, sin Alert)
  const handleDelete = async () => {
    console.log("⚡ BOTÓN PRESIONADO DIRECTO");

    try {
      // Intentamos borrar. Gracias al SQL anterior, el CASCADE se encarga de los hijos.
      const { error } = await supabase
        .from('quotes')
        .delete()
        .eq('id', jobId);

      if (error) {
        console.error("❌ Error Supabase:", error);
        alert("Error: " + error.message); // Usamos alert() nativo del navegador
        return;
      }

      console.log("✅ BORRADO OK");
      navigation.goBack();

    } catch (err) {
      console.error("❌ Error JS:", err);
    }
  };

  // 3. ACCIÓN: EDITAR (Ir a la pantalla de Configuración)
  const handleEdit = () => {
    // @ts-ignore
    navigation.navigate('JobConfig', { quote }); 
  };

  // 4. ACCIÓN: COMPARTIR
  const handleShare = async () => {
    const link = `${WEB_BASE_URL}/${jobId}`;
    const message = `Presupuesto UrbanFix: ${link}`;
    await Share.share({ message, url: link });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.secondary} />
      
      {/* HEADER */}
      <View style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Detalle del Trabajo</Text>
            <View style={{width: 24}} /> 
          </View>
        </SafeAreaView>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* RESUMEN CABECERA */}
        <View style={styles.summaryCard}>
          <View style={styles.rowBetween}>
            <Text style={styles.label}>FECHA</Text>
            <View style={[styles.badge, quote?.status === 'accepted' ? styles.bgSuccess : styles.bgDraft]}>
                <Text style={[styles.badgeText, quote?.status === 'accepted' ? styles.textSuccess : styles.textDraft]}>
                    {quote?.status === 'accepted' ? 'APROBADO' : 'BORRADOR'}
                </Text>
            </View>
          </View>
          <Text style={styles.dateText}>{new Date(quote?.created_at).toLocaleDateString()}</Text>
          
          <View style={styles.divider} />
          
          <Text style={styles.labelCenter}>Total Presupuestado</Text>
          <Text style={styles.totalAmount}>${quote?.total_amount?.toLocaleString('es-AR')}</Text>
        </View>

        <Text style={styles.sectionTitle}>Desglose</Text>

        {/* LISTA DE ÍTEMS (Solo Lectura) */}
        {quote?.quote_items?.map((item: any) => (
          <View key={item.id} style={styles.itemRow}>
            <View style={styles.iconBox}>
               <Ionicons name="cube-outline" size={20} color={COLORS.primary} />
            </View>
            <View style={{flex: 1}}>
                <Text style={styles.itemDesc}>{item.description}</Text>
                <Text style={styles.itemQty}>{item.quantity} u. x ${item.unit_price}</Text>
            </View>
            <Text style={styles.itemTotal}>
                ${(item.quantity * item.unit_price).toLocaleString('es-AR')}
            </Text>
          </View>
        ))}
      </ScrollView>

      {/* FOOTER DE ACCIONES (Aquí están tus botones perdidos) */}
      <SafeAreaView edges={['bottom']} style={styles.footer}>
        
        {/* Botón BORRAR (Rojo) */}
        <TouchableOpacity style={styles.circleBtnDanger} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={24} color={COLORS.danger} />
            <Text style={styles.miniLabelDanger}>Borrar</Text>
        </TouchableOpacity>

        {/* Botón EDITAR (Azul/Gris) */}
        <TouchableOpacity style={styles.circleBtn} onPress={handleEdit}>
            <Ionicons name="create-outline" size={24} color={COLORS.primary} />
            <Text style={styles.miniLabel}>Editar</Text>
        </TouchableOpacity>

        {/* Botón COMPARTIR (Grande) */}
        <TouchableOpacity style={styles.mainBtn} onPress={handleShare}>
            <Ionicons name="share-social" size={20} color="#FFF" style={{marginRight: 8}} />
            <Text style={styles.mainBtnText}>Compartir</Text>
        </TouchableOpacity>
        
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: COLORS.secondary, paddingBottom: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10 },
  headerTitle: { fontSize: 18, fontFamily: FONTS.title, color: '#FFF' },
  backBtn: { padding: 4 },
  
  content: { padding: 20, paddingBottom: 100 },
  
  summaryCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, marginBottom: 24, elevation: 2 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 10, fontFamily: FONTS.body, color: COLORS.textLight, letterSpacing: 1 },
  labelCenter: { fontSize: 12, fontFamily: FONTS.body, color: COLORS.textLight, textAlign: 'center', marginTop: 16 },
  dateText: { fontSize: 16, fontFamily: FONTS.subtitle, color: COLORS.text, marginTop: 4 },
  divider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 16 },
  totalAmount: { fontSize: 32, fontFamily: FONTS.title, color: COLORS.primary, textAlign: 'center', marginTop: 4 },
  
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  bgSuccess: { backgroundColor: '#D1FAE5' },
  bgDraft: { backgroundColor: '#F3F4F6' },
  badgeText: { fontSize: 10, fontFamily: FONTS.title },
  textSuccess: { color: '#065F46' },
  textDraft: { color: '#4B5563' },

  sectionTitle: { fontSize: 18, fontFamily: FONTS.title, color: COLORS.text, marginBottom: 12 },
  
  itemRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 12, borderRadius: 12, marginBottom: 8 },
  iconBox: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#FFF5E0', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  itemDesc: { fontSize: 14, fontFamily: FONTS.subtitle, color: COLORS.text },
  itemQty: { fontSize: 12, fontFamily: FONTS.body, color: COLORS.textLight },
  itemTotal: { fontSize: 14, fontFamily: FONTS.title, color: COLORS.text },

  footer: { 
      position: 'absolute', bottom: 0, left: 0, right: 0, 
      backgroundColor: '#FFF', 
      flexDirection: 'row', alignItems: 'center', 
      padding: 16, borderTopLeftRadius: 24, borderTopRightRadius: 24,
      elevation: 20, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 10
  },
  circleBtn: { alignItems: 'center', marginRight: 20, paddingHorizontal: 10 },
  circleBtnDanger: { alignItems: 'center', marginRight: 20, paddingHorizontal: 10 },
  miniLabel: { fontSize: 10, fontFamily: FONTS.body, color: COLORS.primary, marginTop: 4 },
  miniLabelDanger: { fontSize: 10, fontFamily: FONTS.body, color: COLORS.danger, marginTop: 4 },
  
  mainBtn: { 
      flex: 1, backgroundColor: COLORS.primary, 
      borderRadius: 12, height: 50, 
      flexDirection: 'row', justifyContent: 'center', alignItems: 'center' 
  },
  mainBtnText: { color: '#FFF', fontFamily: FONTS.title, fontSize: 16 }
});