import React, { useEffect, useState } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, Switch, 
  Modal, TextInput, KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
  Share 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { COLORS, FONTS } from '../../utils/theme';
import { useJobCalculator, JobItem } from '../../hooks/useJobCalculator';
import { ServiceBlueprint } from '../../types/database';
import { supabase } from '../../lib/supabase';
import { createQuote } from '../../api/quotes'; 

const WEB_BASE_URL = 'https://urbanfix-web.vercel.app/p';

export default function JobConfigScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  
  // Recibimos 'blueprint' (si es nuevo) O 'quote' (si es edición)
  const params = route.params as { blueprint?: ServiceBlueprint, quote?: any };
  const { blueprint, quote } = params || {};

  const { items, setItems, updateQuantity, toggleItem, setDiscount, totals } = useJobCalculator([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false); 
  
  // 🔥 ESTADO PARA CONTROLAR EL INPUT DEL DESCUENTO VISUALMENTE
  const [discountInput, setDiscountInput] = useState('');

  const isEditMode = !!quote; // ¿Estamos editando?

  // 1. INICIALIZAR DATOS
  useEffect(() => {
    if (isEditMode && quote) {
   // BLINDAJE: Si quote_items viene undefined, usamos array vacío []
   const itemsToLoad = quote.quote_items || []; 
   
   const loadedItems: JobItem[] = itemsToLoad.map((item: any, index: number) => ({
        id: item.id || `edit-${index}`, 
        name: item.description,
        price: item.unit_price,
        quantity: item.quantity,
        isActive: true,
        type: 'material',
      }));
      
      setItems(loadedItems);

      // 🔥 RECUPERAR DESCUENTO ANTERIOR
      // Calculamos cuánto suman los ítems puros
      const subtotal = loadedItems.reduce((acc, i) => acc + (i.price * i.quantity), 0);
      // La diferencia con el total guardado es el descuento
      const previousDiscount = subtotal - quote.total_amount;
      
      if (previousDiscount > 1) { // Margen de error de $1
        setDiscount(previousDiscount);
        setDiscountInput(previousDiscount.toString()); // Llenamos la cajita visual
      }

      setIsLoading(false);

    } else if (blueprint && blueprint.blueprint_components) {
      // --- MODO CREACIÓN ---
      const mappedItems: JobItem[] = blueprint.blueprint_components.map((comp: any, index: number) => ({
        id: comp.item_id || `temp-${index}`,
        name: comp.master_items?.name || 'Material',
        price: Number(comp.master_items?.suggested_price) || 0,
        quantity: Number(comp.quantity) || 1,
        isActive: true,
        type: comp.master_items?.type || 'material',
      }));
      setItems(mappedItems);
      setIsLoading(false);
    } else {
      setIsLoading(false);
    }
  }, [blueprint, quote]);

  const shareQuote = async (quoteId: string, total: number) => {
    const link = `${WEB_BASE_URL}/${quoteId}`;
    const message = `Hola! 👋 Te paso el presupuesto oficial de UrbanFix por $${total.toLocaleString('es-AR')}. Podés verlo y aceptarlo acá: ${link}`;

    try {
      await Share.share({
        message: message,
        title: 'Presupuesto UrbanFix',
        url: link,
      });
    } catch (error) {
      Alert.alert("Error", "No se pudo abrir el menú de compartir.");
    }
  };

  // --- LÓGICA DE GUARDADO INTELIGENTE ---
  const proceedToNextStep = async () => {
    try {
      setIsSaving(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No hay sesión activa");

      let targetQuoteId = '';

      if (isEditMode) {
        // A. ACTUALIZAR EXISTENTE (UPDATE)
        targetQuoteId = quote.id;

        // 1. Actualizar cabecera (Total y estado a borrador)
        const { error: updateError } = await supabase
          .from('quotes')
          .update({ total_amount: totals.total, status: 'draft' })
          .eq('id', targetQuoteId);
        
        if (updateError) throw updateError;

        // 2. Borrar ítems viejos
        await supabase.from('quote_items').delete().eq('quote_id', targetQuoteId);

        // 3. Insertar ítems nuevos (Solo los activos)
        const newItems = items.filter(i => i.isActive).map(i => ({
          quote_id: targetQuoteId,
          description: i.name,
          unit_price: i.price,
          quantity: i.quantity
        }));
        
        if (newItems.length > 0) {
          await supabase.from('quote_items').insert(newItems);
        }

      } else {
        // B. CREAR NUEVO (INSERT)
        const newQuote = await createQuote({
          userId: user.id,
          totalAmount: totals.total,
          items: items,
          blueprintName: blueprint?.name || 'Trabajo Personalizado'
        });
        targetQuoteId = newQuote?.id || newQuote?.[0]?.id;
      }

      if (!targetQuoteId) throw new Error("No se obtuvo ID");

      // ÉXITO
      Alert.alert(
        isEditMode ? "¡Actualizado! ✏️" : "¡Creado! 🚀", 
        "¿Qué querés hacer ahora?",
        [
          { 
            text: "Volver", 
            onPress: () => navigation.goBack(), 
            style: "cancel"
          },
          { 
            text: "Compartir", 
            onPress: () => {
              shareQuote(targetQuoteId, totals.total);
              navigation.navigate('Main' as never); 
            } 
          }
        ]
      );

    } catch (error) {
      console.error(error);
      Alert.alert("Error", "No se pudo guardar los cambios.");
    } finally {
      setIsSaving(false);
    }
  };
  
  // --- LÓGICA UI (Auditoría) ---
  const [modalVisible, setModalVisible] = useState(false);
  const [justification, setJustification] = useState('');

  const handleContinue = () => {
    if (totals.isRisk) {
      setModalVisible(true);
    } else {
      proceedToNextStep();
    }
  };

  const handleAuditSubmit = () => {
    if (justification.length < 20) {
      Alert.alert("Falta detalle", "Escribe al menos 20 caracteres.");
      return;
    }
    setModalVisible(false);
    proceedToNextStep();
  };

  const renderItem = ({ item }: { item: JobItem }) => (
    <View style={[styles.itemRow, !item.isActive && styles.itemDisabled]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemPrice}>${item.price.toLocaleString('es-AR')} u.</Text>
      </View>
      {item.isActive && (
        <View style={styles.qtyContainer}>
          <TouchableOpacity onPress={() => updateQuantity(item.id, -1)} style={styles.qtyBtn}>
            <Ionicons name="remove" size={16} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.qtyText}>{item.quantity}</Text>
          <TouchableOpacity onPress={() => updateQuantity(item.id, 1)} style={styles.qtyBtn}>
            <Ionicons name="add" size={16} color={COLORS.text} />
          </TouchableOpacity>
        </View>
      )}
      <View style={{ marginLeft: 10 }}>
        <Switch
          trackColor={{ false: "#767577", true: COLORS.primary }}
          thumbColor={item.isActive ? "#fff" : "#f4f3f4"}
          onValueChange={() => toggleItem(item.id)}
          value={item.isActive}
        />
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <View style={[styles.container, {justifyContent:'center', alignItems:'center'}]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.header} edges={['top']}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isEditMode ? "Editar Presupuesto" : "Configurar Trabajo"}
          </Text>
          <View style={{ width: 24 }} />
        </View>
        {/* 🔥 AQUÍ ESTABA LA CONFUSIÓN. CAMBIAMOS EL TEXTO */}
        <Text style={styles.subHeader}>
          {isEditMode ? "Edición en Curso ✏️" : (blueprint?.name || 'Trabajo Personalizado')}
        </Text>
      </SafeAreaView>

      <FlatList
        data={items}
        keyExtractor={(item, index) => item.id + index} 
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListFooterComponent={
          <View style={styles.discountContainer}>
            <Text style={styles.discountLabel}>Aplicar Descuento Global ($)</Text>
            <TextInput 
              style={styles.discountInput}
              keyboardType="numeric"
              placeholder="0"
              // Vinculamos el input visual con el estado
              value={discountInput}
              onChangeText={(text) => {
                setDiscountInput(text); // Actualiza visual
                setDiscount(Number(text) || 0); // Actualiza lógica
              }}
            />
             {totals.isRisk && (
              <Text style={styles.riskText}>⚠️ Precio por debajo del costo seguro</Text>
            )}
          </View>
        }
      />

      <View style={[styles.footer, totals.isRisk && { borderTopColor: COLORS.danger, borderTopWidth: 2 }]}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total Estimado:</Text>
          <Text style={[styles.totalAmount, totals.isRisk && { color: COLORS.danger }]}>
            ${totals.total.toLocaleString('es-AR')}
          </Text>
        </View>
        <TouchableOpacity 
          style={[styles.confirmButton, totals.isRisk && { backgroundColor: COLORS.danger }]} 
          onPress={handleContinue}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Text style={styles.confirmText}>
                {totals.isRisk ? "AUDITAR Y GUARDAR" : (isEditMode ? "GUARDAR CAMBIOS" : "CONTINUAR")}
              </Text>
              <Ionicons name={totals.isRisk ? "warning" : "checkmark-circle"} size={20} color="#FFF" />
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Modal Auditoría */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="warning" size={40} color={COLORS.danger} />
              <Text style={styles.modalTitle}>Control de Rentabilidad</Text>
            </View>
            <Text style={styles.modalText}>Estás por debajo del costo seguro.</Text>
            <TextInput
              style={styles.auditInput}
              placeholder="Justificación obligatoria..."
              multiline
              value={justification}
              onChangeText={setJustification}
            />
            <TouchableOpacity 
              style={[styles.modalBtn, styles.modalBtnConfirm]}
              onPress={handleAuditSubmit}
            >
              <Text style={styles.modalBtnTextConfirm}>Confirmar</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={{marginTop: 15}}>
                <Text style={{color: '#999'}}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { backgroundColor: COLORS.secondary, paddingHorizontal: 20, paddingBottom: 20 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  headerTitle: { fontSize: 18, fontFamily: FONTS.title, color: '#FFF' },
  subHeader: { fontSize: 22, fontFamily: FONTS.title, color: COLORS.primary, textAlign: 'center' },
  listContent: { padding: 20, paddingBottom: 150 },
  itemRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 12, borderRadius: 12, marginBottom: 10, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  itemDisabled: { opacity: 0.5, backgroundColor: '#F0F0F0' },
  itemName: { fontSize: 14, fontFamily: FONTS.subtitle, color: COLORS.text },
  itemPrice: { fontSize: 12, fontFamily: FONTS.body, color: COLORS.textLight },
  qtyContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F4F6F8', borderRadius: 8, padding: 4 },
  qtyBtn: { width: 28, height: 28, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 6 },
  qtyText: { marginHorizontal: 10, fontFamily: FONTS.title, fontSize: 14 },
  discountContainer: { marginTop: 20, padding: 16, backgroundColor: '#FFF', borderRadius: 12 },
  discountLabel: { fontFamily: FONTS.subtitle, color: COLORS.text, marginBottom: 8 },
  discountInput: { backgroundColor: '#F4F6F8', padding: 12, borderRadius: 8, fontSize: 16, fontFamily: FONTS.title, color: COLORS.primary },
  riskText: { color: COLORS.danger, marginTop: 8, fontSize: 12, fontWeight: 'bold' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFF', padding: 20, paddingBottom: 30, borderTopLeftRadius: 20, borderTopRightRadius: 20, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 10, elevation: 20 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  totalLabel: { fontSize: 16, fontFamily: FONTS.subtitle, color: COLORS.text },
  totalAmount: { fontSize: 24, fontFamily: FONTS.title, color: COLORS.text },
  confirmButton: { backgroundColor: COLORS.primary, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 16, borderRadius: 12 },
  confirmText: { color: '#FFF', fontFamily: FONTS.title, fontSize: 16, marginRight: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFF', borderRadius: 20, padding: 24, alignItems: 'center' },
  modalHeader: { alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontFamily: FONTS.title, fontSize: 20, color: COLORS.danger, marginTop: 10 },
  modalText: { textAlign: 'center', fontFamily: FONTS.body, fontSize: 16, color: COLORS.text, marginBottom: 10 },
  auditInput: { width: '100%', backgroundColor: '#F9F9F9', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 12, padding: 12, height: 80, textAlignVertical: 'top', marginBottom: 20 },
  modalBtn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center', width: '100%' },
  modalBtnConfirm: { backgroundColor: COLORS.danger },
  modalBtnTextConfirm: { color: '#FFF', fontWeight: 'bold' }
});