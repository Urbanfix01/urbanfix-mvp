import React, { useEffect, useRef, useState } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, 
  TextInput, KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator, Switch 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';

// --- TUS COMPONENTES EXISTENTES ---
import { ScreenHeader } from '../../components/molecules/ScreenHeader';
import ItemSelector from '../../components/organisms/ItemSelector';

// --- EL NUEVO COMPONENTE QUE ACABAS DE CREAR ---
import { ClientAddressForm } from '../../components/molecules/ClientAddressForm'; 

// --- UTILS & HOOKS ---
import { COLORS, FONTS } from '../../utils/theme';
import { useJobCalculator } from '../../hooks/useJobCalculator';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../utils/number';

export default function JobConfigScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const queryClient = useQueryClient();
  
  const params = route.params as { blueprint?: any, quote?: any } | undefined;
  const { blueprint, quote } = params || {};

  // --- 1. HOOK DE LÓGICA DE NEGOCIO (Calculadora) ---
  const { 
    items, setItems, addItem, removeItem, updateItemPrice, updateQuantity,
    clientName, setClientName, clientAddress, setClientAddress,
    applyTax, setApplyTax, discount, setDiscount
  } = useJobCalculator([]);
  
  // --- 2. ESTADOS LOCALES DE LA VISTA ---
  const [isSaving, setIsSaving] = useState(false); 
  const [isSelectorOpen, setSelectorOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<'labor' | 'material'>('labor');
  const [location, setLocation] = useState({ lat: 0, lng: 0 }); // Solo guardamos coords finales
  
  const hasLoadedData = useRef(false);
  const isEditMode = !!(quote && quote.id);

  // --- 3. CARGA DE DATOS (Supabase) ---
  useEffect(() => {
    if (hasLoadedData.current) return;

    const initData = async () => {
        try {
            if (isEditMode && quote?.id) {
                const { data, error } = await supabase.from('quotes').select('*').eq('id', quote.id).single();
                if (error) throw error;

                if (data) {
                    setClientName(data.client_name || '');
                    setClientAddress(data.client_address || ''); 
                    
                    if (data.location_lat && data.location_lng) {
                        setLocation({ lat: data.location_lat, lng: data.location_lng });
                    }
                    setApplyTax(data.tax_rate > 0);
                    
                    const { data: itemsData } = await supabase.from('quote_items').select('*').eq('quote_id', quote.id);
                    if (itemsData) {
                        const mappedItems = itemsData.map((item: any) => ({
                            id: item.id?.toString(),
                            name: item.description || 'Item',
                            price: Number(item.unit_price || 0),
                            quantity: Number(item.quantity || 1),
                            isActive: true,
                            type: item?.metadata?.type || 'labor',
                            category: item?.metadata?.type || 'labor'
                        }));
                        setItems(mappedItems);
                    }
                }
            } else if (blueprint) {
                const mapped = blueprint.blueprint_components?.map((comp: any) => {
                    const base = comp.master_items || {};
                    const itemType = base.type || 'material';
                    return {
                        id: (base.id || comp.item_id || `new-${Date.now()}-${Math.random()}`).toString(),
                        name: base.name || 'Item',
                        price: Number(base.suggested_price || 0),
                        quantity: Number(comp.quantity || 1),
                        isActive: true,
                        type: itemType,
                        category: itemType
                    };
                });
                if (mapped) setItems(mapped);
            }
            hasLoadedData.current = true;
        } catch (err) {
            console.error("Error cargando datos:", err);
        }
    };
    initData();
  }, [quote?.id, blueprint, isEditMode]);

  // --- 4. HANDLERS SIMPLIFICADOS ---
  
  // Este es el puente con tu nuevo componente
  const handleLocationChange = (addr: string, lat: number, lng: number) => {
      setClientAddress(addr);
      setLocation({ lat, lng });
  };

  const handleAddItem = (item: any) => {
    const normalizedType = activeCategory;
    addItem({ 
      ...item, 
      category: normalizedType, 
      type: normalizedType, 
      price: Number(item.price ?? item.suggested_price ?? 0),
      quantity: item.quantity > 0 ? item.quantity : 1,
      isActive: true
    });
    setSelectorOpen(false);
  };

  // Cálculos reactivos (sin useEffects innecesarios)
  const normalizedItems = items.map(i => ({ ...i, isActive: i.isActive !== false }));
  const laborTotal = normalizedItems.filter(i => i.type !== 'material' && i.isActive).reduce((acc, i) => acc + (i.price * i.quantity), 0);
  const materialTotal = normalizedItems.filter(i => i.type === 'material' && i.isActive).reduce((acc, i) => acc + (i.price * i.quantity), 0);
  const subtotal = laborTotal + materialTotal;
  const subtotalAfterDiscount = Math.max(0, subtotal - discount);
  const totalWithTax = subtotalAfterDiscount + (applyTax ? subtotalAfterDiscount * 0.21 : 0);

  // Renderizado de lista (recuperado de tu código original)
  const renderItemList = (category: 'labor' | 'material') => {
    const filteredItems = normalizedItems.filter(i => {
        const type = (i.type || 'labor').toLowerCase();
        return type === category || (!type && category === 'labor');
    });
    
    if (filteredItems.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <Ionicons name={category === 'labor' ? "hammer-outline" : "cube-outline"} size={40} color="#CBD5E1" />
                <Text style={styles.emptyText}>No hay {category === 'labor' ? 'mano de obra' : 'materiales'}</Text>
            </View>
        );
    }

    return filteredItems.map((item, index) => (
        <View key={item.id || index} style={styles.itemCard}>
            <View style={styles.itemInfo}>
                <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
                <View style={styles.quantityControls}>
                    <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQuantity(item.id, -1)}>
                        <Ionicons name="remove" size={16} color={COLORS.primary} />
                    </TouchableOpacity>
                    <TextInput
                        style={styles.qtyInput}
                        keyboardType="numeric"
                        value={item.quantity.toString()}
                        onChangeText={(text) => {
                            const val = parseInt(text || '0', 10);
                            if (!isNaN(val) && val >= 0) updateQuantity(item.id, val - item.quantity);
                        }}
                    />
                    <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQuantity(item.id, 1)}>
                        <Ionicons name="add" size={16} color={COLORS.primary} />
                    </TouchableOpacity>
                </View>
            </View>
            <View style={styles.itemActions}>
                <View style={styles.priceInputWrapper}>
                    <Text style={styles.currencySymbol}>$</Text>
                    <TextInput 
                        style={styles.priceInput}
                        keyboardType="numeric"
                        value={(item.price * item.quantity).toString()}
                        onChangeText={(text) => {
                            const total = parseFloat(text.trim() || '0');
                            const unit = total / (item.quantity || 1);
                            updateItemPrice(item.id, unit);
                        }}
                    />
                </View>
                <TouchableOpacity onPress={() => removeItem(item.id)} style={styles.deleteBtn}>
                    <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                </TouchableOpacity>
            </View>
        </View>
    ));
  };

  // --- 5. GUARDADO (Lógica robusta) ---
  const proceedToNextStep = async () => {
    // Validaciones
    if (!clientName.trim()) return Alert.alert("Atención", "Ingresa el nombre del cliente.");
    if (!clientAddress?.trim()) return Alert.alert("Atención", "Ingresa la dirección.");
    if (normalizedItems.length === 0) return Alert.alert("Atención", "Agrega al menos un item.");

    try {
        setIsSaving(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Sesión expirada");

        const quoteData = {
            client_name: clientName,
            client_address: clientAddress, // ✅ CORREGIDO: Usamos el campo que sí existe en tu DB
            location_lat: location.lat || null,
            location_lng: location.lng || null,
            total_amount: totalWithTax,
            tax_rate: applyTax ? 0.21 : 0,
            status: quote?.status || 'draft',
            scheduled_date: params?.quote?.scheduled_date || null,
        };

        let targetId = quote?.id;

        // Upsert logic
        if (isEditMode && targetId) {
            const { error } = await supabase.from('quotes').update(quoteData).eq('id', targetId);
            if (error) throw error;
            await supabase.from('quote_items').delete().eq('quote_id', targetId);
        } else {
            const { data: newQuote, error } = await supabase
                .from('quotes')
                .insert({ ...quoteData, user_id: user.id })
                .select()
                .single();
            if (error) throw error;
            targetId = newQuote.id;
        }

        // Insert items
        if (items.length > 0) {
            const itemsPayload = items.map(i => ({
                quote_id: targetId,
                description: i.name,
                unit_price: i.price,
                quantity: i.quantity,
                metadata: { type: i.type }
            }));
            const { error: itemsError } = await supabase.from('quote_items').insert(itemsPayload);
            if (itemsError) throw itemsError;
        }

        await queryClient.invalidateQueries({ queryKey: ['quotes-list'] });
        
        navigation.navigate('JobDetail', { 
            jobId: targetId, 
            quote: { ...quoteData, id: targetId } 
        });

    } catch (e: any) {
        Alert.alert("Error", "No se pudo guardar: " + e.message);
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScreenHeader title={isEditMode ? "Editar Trabajo" : "Nuevo Presupuesto"} showBack />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        
        {/* 🔥 AQUÍ ESTÁ LA MAGIA: Todo el bloque feo de inputs y mapas se reduce a esto: */}
        <ClientAddressForm 
            initialName={clientName}
            initialAddress={clientAddress}
            initialLocation={location}
            onClientNameChange={setClientName}
            onLocationChange={handleLocationChange}
        />

        {/* TARJETA DE COSTOS (Sin cambios funcionales, solo limpieza visual) */}
        <View style={styles.costsCard}>
            <Text style={styles.cardHeader}>ITEMS DEL PRESUPUESTO</Text>
            
            <View style={styles.tabsContainer}>
                <TouchableOpacity onPress={() => setActiveCategory('labor')} style={[styles.tab, activeCategory === 'labor' && styles.activeTab]}>
                    <Text style={[styles.tabText, activeCategory === 'labor' && styles.activeTabText]}>Mano de Obra</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setActiveCategory('material')} style={[styles.tab, activeCategory === 'material' && styles.activeTab]}>
                    <Text style={[styles.tabText, activeCategory === 'material' && styles.activeTabText]}>Materiales</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.listContainer}>
                {renderItemList(activeCategory)}
            </View>

            <TouchableOpacity style={styles.addBlockBtn} onPress={() => setSelectorOpen(true)}>
                <Ionicons name="add-circle" size={24} color={COLORS.primary} />
                <Text style={styles.addBlockText}>Agregar {activeCategory === 'labor' ? 'Mano de Obra' : 'Material'}</Text>
            </TouchableOpacity>

            <View style={styles.summaryBox}>
                <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Total Mano de Obra</Text>
                    <Text style={styles.summaryValue}>${formatCurrency(laborTotal)}</Text>
                </View>
                <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Total Materiales</Text>
                    <Text style={styles.summaryValue}>${formatCurrency(materialTotal)}</Text>
                </View>
                <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Descuento</Text>
                    <TextInput
                        style={styles.discountInput}
                        keyboardType="numeric"
                        value={discount.toString()}
                        onChangeText={(t) => setDiscount(parseFloat(t) || 0)}
                        placeholder="$0"
                    />
                </View>
                <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>IVA (21%)</Text>
                    <Switch value={applyTax} onValueChange={setApplyTax} thumbColor={applyTax ? COLORS.primary : '#fff'} />
                </View>
                <View style={styles.divider} />
                <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>TOTAL FINAL</Text>
                    <Text style={styles.totalValue}>${formatCurrency(totalWithTax)}</Text>
                </View>
            </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.mainBtn} onPress={proceedToNextStep} disabled={isSaving}>
            {isSaving ? <ActivityIndicator color="#FFF" /> : (
                <>
                    <Text style={styles.mainBtnText}>GUARDAR CAMBIOS</Text>
                    <Ionicons name="save-outline" size={20} color="#FFF" />
                </>
            )}
        </TouchableOpacity>
      </View>

      <ItemSelector 
        visible={isSelectorOpen} 
        onClose={() => setSelectorOpen(false)} 
        onSelect={handleAddItem}
        filterType={activeCategory} 
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  content: { padding: 16, paddingBottom: 100 },
  costsCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOffset: {width:0, height:2}, shadowOpacity:0.03, elevation: 2, zIndex: 1 },
  cardHeader: { fontSize: 13, fontFamily: FONTS.title, color: '#64748B', letterSpacing: 1, marginBottom: 16, fontWeight: '700' },
  tabsContainer: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 12, padding: 4, marginBottom: 20 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  activeTab: { backgroundColor: '#FFF', shadowColor: '#000', shadowOpacity: 0.05, elevation: 1 },
  tabText: { fontSize: 13, color: '#64748B', fontWeight: '600' },
  activeTabText: { color: COLORS.primary, fontWeight: '700' },
  listContainer: { marginBottom: 10 },
  emptyContainer: { padding: 30, alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, backgroundColor: '#F8FAFC' },
  emptyText: { color: '#64748B', fontSize: 14, marginTop: 10, fontWeight: '500' },
  itemCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingVertical: 14 },
  itemInfo: { flex: 1, paddingRight: 10 },
  itemName: { fontSize: 15, color: '#1E293B', fontWeight: '500', marginBottom: 4 },
  quantityControls: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  qtyBtn: { width: 28, height: 28, borderRadius: 6, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF' },
  qtyInput: { width: 50, height: 34, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 6, textAlign: 'center', fontSize: 14, color: '#1E293B', paddingVertical: 2, paddingHorizontal: 4, backgroundColor: '#FFF' },
  itemActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  priceInputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 8, paddingHorizontal: 10, height: 42, borderWidth: 1, borderColor: '#E2E8F0', minWidth: 100 },
  currencySymbol: { color: '#94A3B8', marginRight: 4, fontWeight: 'bold' },
  priceInput: { flex: 1, fontSize: 15, fontWeight: '700', color: '#1E293B', textAlign: 'right', padding: 0 },
  deleteBtn: { padding: 8, backgroundColor: '#FEF2F2', borderRadius: 8 },
  discountInput: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, padding: 8, width: 80, textAlign: 'right', fontWeight: 'bold' },
  addBlockBtn: { flexDirection: 'row', backgroundColor: '#FFF', padding: 16, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 10, borderWidth: 1, borderColor: COLORS.primary, borderStyle: 'dashed' },
  addBlockText: { marginLeft: 8, color: COLORS.primary, fontWeight: '700', fontSize: 14 },
  summaryBox: { marginTop: 24, backgroundColor: '#F8FAFC', padding: 16, borderRadius: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  summaryLabel: { fontSize: 13, color: '#64748B' },
  summaryValue: { fontSize: 13, color: '#1E293B', fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 10 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 14, fontWeight: '800', color: '#1E293B', letterSpacing: 0.5 },
  totalValue: { fontSize: 20, fontWeight: '800', color: COLORS.primary },
  footer: { padding: 20, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#F1F5F9', elevation: 15 },
  mainBtn: { flexDirection: 'row', backgroundColor: COLORS.primary, padding: 18, borderRadius: 14, justifyContent: 'center', alignItems: 'center', gap: 10, shadowColor: COLORS.primary, shadowOffset: {width:0, height:4}, shadowOpacity: 0.25, elevation: 6 },
  mainBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 }
});