import React, { useEffect, useRef, useState } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, 
  TextInput, KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator, Switch 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';

// --- COMPONENTES ---
import { ScreenHeader } from '../../components/molecules/ScreenHeader';
import ItemSelector from '../../components/organisms/ItemSelector';
import { LocationAutocomplete } from '../../components/molecules/LocationAutocomplete'; 
import { WebGoogleMaps } from '../../components/molecules/WebGoogleMaps'; 

// --- UTILS ---
import { COLORS, FONTS } from '../../utils/theme';
import { useJobCalculator } from '../../hooks/useJobCalculator';
import { ServiceBlueprint } from '../../types/database';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../utils/number';
import { useQueryClient } from '@tanstack/react-query';

export default function JobConfigScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  
  const params = route.params as { blueprint?: ServiceBlueprint, quote?: any } | undefined;
  const { blueprint, quote } = params || {};
  const queryClient = useQueryClient();

  const { 
    items, setItems, addItem, removeItem, updateItemPrice, updateQuantity,
    clientName, setClientName, clientAddress, setClientAddress,
    scheduledDate, applyTax, setApplyTax,
    discount, setDiscount
  } = useJobCalculator([]);
  
  const [isSaving, setIsSaving] = useState(false); 
  const [isSelectorOpen, setSelectorOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<'labor' | 'material'>('labor');
  const [location, setLocation] = useState({ lat: 0, lng: 0 });
  const [disableWebAutocomplete, setDisableWebAutocomplete] = useState(false);
  
  const hasLoadedData = useRef(false);
  const isEditMode = !!(quote && quote.id);
  const isWeb = Platform.OS === 'web';

  // --- 1. CARGA INICIAL ---
  useEffect(() => {
    if (hasLoadedData.current) return;

    const initData = async () => {
        try {
            if (isEditMode && quote?.id) {
                const { data, error } = await supabase
                    .from('quotes')
                    .select('*')
                    .eq('id', quote.id)
                    .single();

                if (error) throw error;

                if (data) {
                    setClientName(data.client_name || '');
                    // Leemos SOLO la columna correcta
                    setClientAddress(data.client_address || '');

                    if (data.location_lat && data.location_lng) {
                        setLocation({ lat: data.location_lat, lng: data.location_lng });
                    }
                    setApplyTax(data.tax_rate > 0);

                    const { data: itemsData } = await supabase
                        .from('quote_items')
                        .select('*')
                        .eq('quote_id', quote.id);

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

  // --- HANDLERS ---
  const handleAddItem = (item: any) => {
    const normalizedType = activeCategory;
    addItem({ 
      ...item, 
      category: normalizedType, 
      type: normalizedType, 
      price: Number(item.price ?? item.suggested_price ?? 0),
      quantity: item.quantity && item.quantity > 0 ? item.quantity : 1,
      isActive: true
    });
    setSelectorOpen(false);
  };

  const getItemType = (itm: any) => ((itm.category || itm.type || 'labor') as string).toLowerCase();

  const normalizedItems = items.map(i => ({
      ...i,
      quantity: Math.max(1, Number(i.quantity) || 1),
      price: Math.max(0, Number(i.price) || 0),
      type: getItemType(i),
      isActive: i.isActive !== false
  }));

  const filteredByCategory = (category: 'labor' | 'material') =>
    normalizedItems.filter(i => {
      const type = i.type;
      return type === category || (!type && category === 'labor');
    });

  // --- RENDER LISTA ---
  const renderItemList = (category: 'labor' | 'material') => {
    const filteredItems = filteredByCategory(category);
    
    if (filteredItems.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <Ionicons name={category === 'labor' ? "hammer-outline" : "cube-outline"} size={40} color="#CBD5E1" />
                <Text style={styles.emptyText}>No hay {category === 'labor' ? 'mano de obra' : 'materiales'}</Text>
                <TouchableOpacity onPress={() => setSelectorOpen(true)}>
                    <Text style={styles.emptyLink}>+ Agregar ahora</Text>
                </TouchableOpacity>
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
                        placeholder="0"
                    />
                </View>
                <TouchableOpacity onPress={() => removeItem(item.id)} style={styles.deleteBtn}>
                    <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                </TouchableOpacity>
            </View>
        </View>
    ));
  };

  const laborTotal = normalizedItems.filter(i => i.type !== 'material' && i.isActive).reduce((acc, i) => acc + (i.price * i.quantity), 0);
  const materialTotal = normalizedItems.filter(i => i.type === 'material' && i.isActive).reduce((acc, i) => acc + (i.price * i.quantity), 0);
  const subtotal = laborTotal + materialTotal;
  const subtotalAfterDiscount = Math.max(0, subtotal - discount);
  const taxAmount = applyTax ? subtotalAfterDiscount * 0.21 : 0;
  const totalWithTax = subtotalAfterDiscount + taxAmount;
  const hasActiveItems = normalizedItems.some(i => i.isActive);

  // --- GUARDAR SIN ERRORES ---
  const proceedToNextStep = async () => {
    const cleanAddress = (clientAddress || '').trim();

    if (!clientName.trim()) return Alert.alert("Atención", "Ingresa el nombre del cliente.");
    if (!cleanAddress) return Alert.alert("Atención", "Ingresa la dirección.");
    if (!hasActiveItems) return Alert.alert("Atención", "Agrega al menos un ítem.");

    try {
        setIsSaving(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Sesión expirada");

        // --- CORRECCIÓN AQUÍ: Solo enviamos columnas que existen en tu tabla ---
        const quoteData = {
            client_name: clientName,
            client_address: cleanAddress, // ✅ Columna correcta
            // address: cleanAddress,     // ❌ ELIMINADA: Esta columna NO existe y causaba el error PGRST204
            
            location_lat: (location.lat && location.lat !== 0) ? location.lat : null,
            location_lng: (location.lng && location.lng !== 0) ? location.lng : null,
            
            total_amount: totalWithTax,
            tax_rate: applyTax ? 0.21 : 0,
            status: quote?.status || 'draft',
            scheduled_date: scheduledDate ? scheduledDate.toISOString().split('T')[0] : null,
        };

        let targetId = quote?.id;

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
        if (quote?.id) {
            await queryClient.invalidateQueries({ queryKey: ['quote', quote.id] });
        }

        navigation.navigate('JobDetail', { 
            jobId: targetId,
            quote: { ...quoteData, id: targetId } 
        });

    } catch (e: any) {
        console.error("Error guardando:", e);
        Alert.alert("Error", "No se pudo guardar: " + e.message);
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScreenHeader title={isEditMode ? "Editar Trabajo" : "Nuevo Presupuesto"} subtitle="Detalles y costos" showBack />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        
        {/* === ÚNICO BLOQUE DE CLIENTE Y DIRECCIÓN === */}
        <View style={styles.clientCard}>
            <Text style={styles.cardHeader}>👤 DATOS DEL CLIENTE</Text>
            
            <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Nombre Completo</Text>
                <TextInput 
                    style={styles.textInput} 
                    placeholder="Ej: Juan Pérez" 
                    value={clientName} 
                    onChangeText={setClientName}
                    placeholderTextColor="#94A3B8"
                />
            </View>

            <View style={[styles.inputContainer, { zIndex: 9000 }]}>
                <Text style={styles.inputLabel}>Ubicación de la Obra</Text>
                
                {/* 1. INPUT MANUAL (Principal) */}
                <TextInput
                    style={[styles.textInput, { marginBottom: 12, backgroundColor: '#FFF', fontWeight: 'bold' }]}
                    placeholder="Escribe calle y altura (Ej: Húsares 1234)"
                    value={clientAddress}
                    onChangeText={(text) => setClientAddress(text)}
                    placeholderTextColor="#94A3B8"
                />

                {/* 2. MAPA (Ayuda visual) */}
                <View style={{ height: 200, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0' }}>
                    {isWeb && process.env.EXPO_PUBLIC_WEB_API_KEY && !disableWebAutocomplete ? (
                         <WebGoogleMaps 
                            key={`map-${clientAddress}`}
                            apiKey={process.env.EXPO_PUBLIC_WEB_API_KEY} 
                            initialValue={clientAddress} 
                            onPlaceSelected={(data) => {
                                setClientAddress(data.address); 
                                setLocation({ lat: data.lat, lng: data.lng });
                            }}
                            onError={() => setDisableWebAutocomplete(true)}
                        />
                    ) : (
                         <LocationAutocomplete 
                            key={`native-${clientAddress}`}
                            apiKey={process.env.EXPO_PUBLIC_ANDROID_API_KEY}
                            initialValue={clientAddress}
                            onLocationSelect={(data) => {
                                setClientAddress(data.address);
                                setLocation({ lat: data.lat, lng: data.lng });
                            }}
                         />
                    )}
                </View>
                <Text style={styles.helperText}>* Escribe la dirección exacta arriba para guardarla.</Text>
            </View>
        </View>

        {/* TARJETA COSTOS */}
        <View style={styles.costsCard}>
            <Text style={styles.cardHeader}>💰 ÍTEMS DEL PRESUPUESTO</Text>
            
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
                    <Text style={styles.summaryLabel}>Subtotal</Text>
                    <Text style={styles.summaryValue}>${formatCurrency(subtotal)}</Text>
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
  
  clientCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOffset: {width:0, height:2}, shadowOpacity:0.03, elevation: 2, zIndex: 2000 },
  costsCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOffset: {width:0, height:2}, shadowOpacity:0.03, elevation: 2, zIndex: 1 },
  
  cardHeader: { fontSize: 13, fontFamily: FONTS.title, color: '#64748B', letterSpacing: 1, marginBottom: 16, fontWeight: '700' },
  inputContainer: { marginBottom: 16 },
  inputLabel: { fontSize: 12, color: '#475569', marginBottom: 6, fontWeight: '600' },
  textInput: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, padding: 12, fontSize: 15, color: '#1E293B' },
  helperText: { fontSize: 11, color: '#64748B', marginTop: 6, fontStyle: 'italic' },
  
  tabsContainer: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 12, padding: 4, marginBottom: 20 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  activeTab: { backgroundColor: '#FFF', shadowColor: '#000', shadowOpacity: 0.05, elevation: 1 },
  tabText: { fontSize: 13, color: '#64748B', fontWeight: '600' },
  activeTabText: { color: COLORS.primary, fontWeight: '700' },
  
  listContainer: { marginBottom: 10 },
  emptyContainer: { padding: 30, alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, backgroundColor: '#F8FAFC' },
  emptyText: { color: '#64748B', fontSize: 14, marginTop: 10, fontWeight: '500' },
  emptyLink: { color: COLORS.primary, marginTop: 4, fontWeight: 'bold' },
  
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
