import React, { useEffect, useState } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, Switch, 
  TextInput, KeyboardAvoidingView, Platform, Alert, ActivityIndicator 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { COLORS, FONTS } from '../../utils/theme';
import { useJobCalculator, JobItem } from '../../hooks/useJobCalculator';
import { ServiceBlueprint } from '../../types/database';
import { supabase } from '../../lib/supabase';
import { createQuote } from '../../api/quotes'; 
import ItemSelector from '../../components/organisms/ItemSelector';

export default function JobConfigScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const params = route.params as { blueprint?: ServiceBlueprint, quote?: any };
  const { blueprint, quote } = params || {};

  const { 
    items, setItems, updateQuantity, updatePrice, toggleItem, addItem, removeItem, 
    discount, setDiscount, applyTax, setApplyTax, totals 
  } = useJobCalculator([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false); 
  const [discountInput, setDiscountInput] = useState('');
  
  const [isSelectorOpen, setSelectorOpen] = useState(false);

  const isEditMode = !!quote;

  // 1. CARGA INICIAL
  useEffect(() => {
    if (isEditMode && quote) {
      const loadedItems: JobItem[] = (quote.quote_items || []).map((item: any, index: number) => ({
        id: item.id || `edit-${index}`, 
        name: item.description,
        price: item.unit_price,
        quantity: item.quantity,
        isActive: true,
        type: 'material',
      }));
      setItems(loadedItems);
      if (quote.tax_rate > 0) setApplyTax(true);
      setIsLoading(false);

    } else if (blueprint && blueprint.blueprint_components) {
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

  // 2. GUARDAR
  const proceedToNextStep = async () => {
    try {
        setIsSaving(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("No hay sesión activa");

        let targetQuoteId = '';
        
        const quoteData = {
            total_amount: totals.total,
            status: 'draft',
            tax_rate: applyTax ? 0.21 : 0,
        };

        if (isEditMode) {
            await supabase.from('quotes').update(quoteData).eq('id', quote.id);
            await supabase.from('quote_items').delete().eq('quote_id', quote.id);
            targetQuoteId = quote.id;
        } else {
            const newQuote = await createQuote({
                userId: user.id,
                totalAmount: totals.total,
                items: [], 
                blueprintName: blueprint?.name || 'Trabajo a Medida'
            });
            if (newQuote?.id) {
                targetQuoteId = newQuote.id;
                await supabase.from('quotes').update({ tax_rate: quoteData.tax_rate }).eq('id', targetQuoteId);
            }
        }

        const newItems = items.filter(i => i.isActive).map(i => ({
            quote_id: targetQuoteId, 
            description: i.name, 
            unit_price: i.price, 
            quantity: i.quantity
        }));

        if (newItems.length > 0) {
            const { error: itemsError } = await supabase.from('quote_items').insert(newItems);
            if (itemsError) throw itemsError;
        }

        navigation.goBack();

    } catch (e: any) {
        Alert.alert("Error al guardar", e.message || "Intenta nuevamente");
    } finally {
        setIsSaving(false);
    }
  };

  // 3. RENDER ITEM
  const renderItem = ({ item }: { item: JobItem }) => (
    <View style={[styles.itemRow, !item.isActive && styles.itemDisabled]}>
      <TouchableOpacity onPress={() => removeItem(item.id)} style={{marginRight: 8}}>
         <Ionicons name="trash-outline" size={20} color="#CCC" />
      </TouchableOpacity>
      
      <View style={{ flex: 1 }}>
        <Text style={styles.itemName}>{item.name}</Text>
        <View style={styles.priceRow}>
            <Text style={styles.currency}>$</Text>
            <TextInput 
                style={styles.priceInput}
                keyboardType="numeric"
                value={item.price.toString()}
                onChangeText={(text) => updatePrice(item.id, Number(text) || 0)}
            />
        </View>
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

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.header} edges={['top']}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Cotizador</Text>
          <TouchableOpacity onPress={() => setSelectorOpen(true)}>
             <Ionicons name="add-circle" size={28} color="#FFF" />
          </TouchableOpacity>
        </View>
        <Text style={styles.subHeader}>
          {isEditMode ? "Modificando..." : (blueprint?.name || 'A Medida')}
        </Text>
      </SafeAreaView>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{flex: 1}}>
        <FlatList
            data={items}
            keyExtractor={(item, index) => item.id + index} 
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            
            ListEmptyComponent={
                <View style={{alignItems:'center', marginTop: 50}}>
                    <Text style={{color:'#999', marginBottom: 20}}>Comienza agregando materiales.</Text>
                    <TouchableOpacity style={styles.addBtnEmpty} onPress={() => setSelectorOpen(true)}>
                        <Text style={{color: COLORS.primary, fontWeight:'bold'}}>+ AGREGAR PRIMER ÍTEM</Text>
                    </TouchableOpacity>
                </View>
            }

            ListFooterComponent={
            items.length > 0 ? (
                <View>
                    <TouchableOpacity style={styles.addBtnRow} onPress={() => setSelectorOpen(true)}>
                        <Ionicons name="add" size={20} color={COLORS.primary} />
                        <Text style={styles.addBtnText}>Agregar Flete, Ayudante, etc.</Text>
                    </TouchableOpacity>

                    <View style={styles.summaryContainer}>
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Descuento ($)</Text>
                            <TextInput 
                                style={styles.smallInput}
                                keyboardType="numeric"
                                placeholder="0"
                                value={discountInput}
                                onChangeText={(text) => {
                                    setDiscountInput(text);
                                    setDiscount(Number(text) || 0);
                                }}
                            />
                        </View>

                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Aplicar IVA (21%)</Text>
                            <Switch
                                trackColor={{ false: "#E0E0E0", true: COLORS.primary }}
                                thumbColor={"#FFF"}
                                onValueChange={setApplyTax}
                                value={applyTax}
                            />
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.summaryRow}>
                            <Text style={styles.subtotalLabel}>Subtotal</Text>
                            <Text style={styles.subtotalValue}>${totals.subtotal.toLocaleString('es-AR')}</Text>
                        </View>
                        
                        {applyTax && (
                            <View style={styles.summaryRow}>
                                <Text style={styles.taxLabel}>IVA 21%</Text>
                                <Text style={styles.taxValue}>+ ${totals.taxAmount.toLocaleString('es-AR')}</Text>
                            </View>
                        )}

                        {totals.isRisk && (
                            <Text style={styles.riskText}>⚠️ Margen bajo riesgo</Text>
                        )}
                    </View>
                </View>
            ) : null
            }
        />
      </KeyboardAvoidingView>

      <View style={[styles.footer, totals.isRisk && { borderTopColor: COLORS.danger, borderTopWidth: 2 }]}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total Final:</Text>
          <Text style={[styles.totalAmount, totals.isRisk && { color: COLORS.danger }]}>
            ${totals.total.toLocaleString('es-AR')}
          </Text>
        </View>
        <TouchableOpacity 
          style={[styles.confirmButton, totals.isRisk && { backgroundColor: COLORS.danger }]} 
          onPress={proceedToNextStep}
          disabled={isSaving}
        >
          {isSaving ? <ActivityIndicator color="#FFF" /> : (
            <>
              <Text style={styles.confirmText}>GUARDAR</Text>
              <Ionicons name="checkmark-circle" size={20} color="#FFF" style={{marginLeft:8}}/>
            </>
          )}
        </TouchableOpacity>
      </View>

      <ItemSelector 
        visible={isSelectorOpen} 
        onClose={() => setSelectorOpen(false)}
        // @ts-ignore
        onSelect={(newItem) => {
            addItem(newItem);
            setSelectorOpen(false);
        }} 
      />

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { backgroundColor: COLORS.secondary, paddingHorizontal: 20, paddingBottom: 20 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  headerTitle: { fontSize: 18, fontFamily: FONTS.title, color: '#FFF' },
  subHeader: { fontSize: 22, fontFamily: FONTS.title, color: COLORS.primary, textAlign: 'center' },
  listContent: { padding: 16, paddingBottom: 150 },
  
  itemRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 12, borderRadius: 12, marginBottom: 8, shadowColor: "#000", shadowOpacity: 0.03, elevation: 1 },
  itemDisabled: { opacity: 0.5, backgroundColor: '#F9F9F9' },
  itemName: { fontSize: 14, fontFamily: FONTS.subtitle, color: COLORS.text, marginBottom: 4 },
  
  priceRow: { flexDirection: 'row', alignItems: 'center' },
  currency: { fontSize: 12, color: COLORS.textLight, marginRight: 2 },
  
  // --- AQUÍ ESTABA EL ERROR (CORREGIDO) ---
  priceInput: { 
      fontSize: 14, 
      fontFamily: FONTS.body, 
      borderBottomWidth: 1, 
      borderBottomColor: '#EEE', 
      minWidth: 80, 
      paddingVertical: 0,
      color: COLORS.primary, 
      fontWeight: 'bold'
  },

  qtyContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F4F6F8', borderRadius: 8, padding: 4 },
  qtyBtn: { width: 28, height: 28, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 6 },
  qtyText: { marginHorizontal: 10, fontFamily: FONTS.title, fontSize: 14 },
  
  addBtnEmpty: { padding: 15, marginTop:20, borderWidth: 1, borderColor: COLORS.primary, borderRadius: 8, borderStyle:'dashed' },
  addBtnRow: { flexDirection: 'row', alignItems: 'center', justifyContent:'center', padding: 12, marginBottom: 20, borderWidth: 1, borderColor: '#DDD', borderRadius: 8, borderStyle: 'dashed', backgroundColor: '#FAFAFA' },
  addBtnText: { color: COLORS.primary, marginLeft: 8, fontWeight: 'bold' },

  summaryContainer: { padding: 16, backgroundColor: '#FFF', borderRadius: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  summaryLabel: { fontFamily: FONTS.subtitle, color: COLORS.text },
  smallInput: { backgroundColor: '#F4F6F8', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, fontSize: 14, fontFamily: FONTS.title, color: COLORS.primary, width: 80, textAlign: 'right' },
  divider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 8 },
  
  subtotalLabel: { fontFamily: FONTS.body, color: COLORS.textLight },
  subtotalValue: { fontFamily: FONTS.body, color: COLORS.text },
  taxLabel: { fontFamily: FONTS.body, color: COLORS.textLight },
  taxValue: { fontFamily: FONTS.body, color: COLORS.text },
  riskText: { color: COLORS.danger, marginTop: 8, fontSize: 12, fontWeight: 'bold', textAlign: 'center' },
  
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFF', padding: 20, paddingBottom: 30, borderTopLeftRadius: 20, borderTopRightRadius: 20, shadowColor: "#000", shadowOpacity: 0.1, elevation: 20 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  totalLabel: { fontSize: 16, fontFamily: FONTS.subtitle, color: COLORS.text },
  totalAmount: { fontSize: 24, fontFamily: FONTS.title, color: COLORS.text },
  confirmButton: { backgroundColor: COLORS.primary, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 16, borderRadius: 12 },
  confirmText: { color: '#FFF', fontFamily: FONTS.title, fontSize: 16, marginRight: 8 },
});