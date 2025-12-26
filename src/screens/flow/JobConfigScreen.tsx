import React, { useEffect, useRef, useState } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, 
  TextInput, KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator, Switch,
  LayoutAnimation, UIManager, Dimensions 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics'; 

// --- COMPONENTES ---
import { ScreenHeader } from '../../components/molecules/ScreenHeader';
import ItemSelector from '../../components/organisms/ItemSelector';
// Asegúrate de que este import apunte a tu nuevo componente corregido
import { ClientAddressForm } from '../../components/molecules/ClientAddressForm'; 

// --- UTILS & HOOKS ---
import { COLORS, FONTS } from '../../utils/theme';
import { useJobCalculator } from '../../hooks/useJobCalculator';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../utils/number';

// Habilitar animaciones en Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width } = Dimensions.get('window');
const IS_WEB = Platform.OS === 'web';
const MAX_WEB_WIDTH = 800;

export default function JobConfigScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const queryClient = useQueryClient();
  
  const params = route.params as { blueprint?: any, quote?: any } | undefined;
  const { blueprint, quote } = params || {};

  // --- LÓGICA DE NEGOCIO ---
  const { 
    items, setItems, addItem, removeItem, updateItemPrice, updateQuantity,
    clientName, setClientName, clientAddress, setClientAddress,
    applyTax, setApplyTax, discount, setDiscount
  } = useJobCalculator([]);
  
  // --- ESTADOS LOCALES ---
  const [isSaving, setIsSaving] = useState(false); 
  const [isSelectorOpen, setSelectorOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<'labor' | 'material'>('labor');
  const [location, setLocation] = useState({ lat: 0, lng: 0 }); 
  
  const hasLoadedData = useRef(false);
  const isEditMode = !!(quote && quote.id);

  // --- CARGA DE DATOS ---
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
                            category: item?.metadata?.category || item?.metadata?.type || 'labor'
                        }));
                        setItems(mappedItems);
                    }
                }
            } else if (blueprint) {
                // Lógica para cargar desde blueprint (sin cambios)
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
  const handleSmartInteraction = (type: 'light' | 'medium' | 'heavy' = 'light') => {
    if (!IS_WEB) {
        if (type === 'light') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (type === 'medium') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        if (type === 'heavy') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleAddItem = (item: any) => {
    handleSmartInteraction('medium');
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
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

  const handleUpdateQty = (id: string, delta: number) => {
    handleSmartInteraction('light');
    updateQuantity(id, delta);
  };

  const handleRemoveItem = (id: string) => {
    handleSmartInteraction('medium');
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    removeItem(id);
  };

  const handleSave = async () => {
      // Validaciones
      if (!clientName.trim()) return Alert.alert("Falta información", "Ingresa el nombre del cliente.");
      if (!clientAddress?.trim()) return Alert.alert("Falta información", "Ingresa la dirección.");
      if (items.length === 0) return Alert.alert("Atención", "Agrega al menos un item.");

      try {
        setIsSaving(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Sesión expirada");

        // Datos listos para guardar
        const quoteData = {
            client_name: clientName,
            client_address: clientAddress,
            location_lat: location.lat || null,
            location_lng: location.lng || null,
            total_amount: totalWithTax,
            tax_rate: applyTax ? 0.21 : 0,
            status: quote?.status || 'draft',
            user_id: user.id,
            scheduled_date: params?.quote?.scheduled_date || null,
        };

        let targetId = quote?.id;

        // Lógica de Upsert
        if (isEditMode && targetId) {
            const { error } = await supabase.from('quotes').update(quoteData).eq('id', targetId);
            if (error) throw error;
            await supabase.from('quote_items').delete().eq('quote_id', targetId);
        } else {
            const { data: newQuote, error } = await supabase.from('quotes').insert(quoteData).select().single();
            if (error) throw error;
            targetId = newQuote.id;
        }

        // Guardar items
        if (items.length > 0) {
            const itemsPayload = items.map(i => ({
                quote_id: targetId,
                description: i.name,
                unit_price: i.price,
                quantity: i.quantity,
                metadata: { type: i.type, category: i.category }
            }));
            const { error: itemsError } = await supabase.from('quote_items').insert(itemsPayload);
            if (itemsError) throw itemsError;
        }

        handleSmartInteraction('heavy');
        await queryClient.invalidateQueries({ queryKey: ['quotes-list'] });
        navigation.navigate('JobDetail', { jobId: targetId });

      } catch (e: any) {
        Alert.alert("Error", e.message);
      } finally {
        setIsSaving(false);
      }
  };

  // --- CÁLCULOS ---
  const normalizedItems = items.map(i => ({ ...i, isActive: i.isActive !== false }));
  const laborTotal = normalizedItems.filter(i => i.type !== 'material' && i.isActive).reduce((acc, i) => acc + (i.price * i.quantity), 0);
  const materialTotal = normalizedItems.filter(i => i.type === 'material' && i.isActive).reduce((acc, i) => acc + (i.price * i.quantity), 0);
  const subtotal = laborTotal + materialTotal;
  const subtotalAfterDiscount = Math.max(0, subtotal - discount);
  const totalWithTax = subtotalAfterDiscount + (applyTax ? subtotalAfterDiscount * 0.21 : 0);

  // --- RENDERIZADO DE ITEMS ---
  const renderItemList = (category: 'labor' | 'material') => {
    const filteredItems = normalizedItems.filter(i => {
        const type = (i.type || 'labor').toLowerCase();
        return type === category || (!type && category === 'labor');
    });
    
    if (filteredItems.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <Ionicons name={category === 'labor' ? "hammer-outline" : "cube-outline"} size={48} color="#CBD5E1" />
                <Text style={styles.emptyText}>No hay {category === 'labor' ? 'mano de obra' : 'materiales'}</Text>
            </View>
        );
    }

    return filteredItems.map((item, index) => (
        <View key={item.id || index} style={styles.itemCard}>
            <View style={styles.itemInfo}>
                <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
                <View style={styles.quantityControls}>
                    <TouchableOpacity style={styles.qtyBtn} onPress={() => handleUpdateQty(item.id, -1)}>
                        <Ionicons name="remove" size={16} color={COLORS.primary} />
                    </TouchableOpacity>
                    <Text style={styles.qtyText}>{item.quantity}</Text>
                    <TouchableOpacity style={styles.qtyBtn} onPress={() => handleUpdateQty(item.id, 1)}>
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
                        selectTextOnFocus
                        value={(item.price * item.quantity).toString()}
                        onChangeText={(text) => {
                            const total = parseFloat(text.trim() || '0');
                            const unit = total / (item.quantity || 1);
                            updateItemPrice(item.id, unit);
                        }}
                    />
                </View>
                <TouchableOpacity onPress={() => handleRemoveItem(item.id)} style={styles.deleteBtn}>
                    <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                </TouchableOpacity>
            </View>
        </View>
    ));
  };

  // --- UI PRINCIPAL ---
  return (
    <View style={styles.mainContainer}>
        <ScreenHeader title={isEditMode ? "Editar Trabajo" : "Nuevo Presupuesto"} showBack />
        
        <View style={styles.centerWebContainer}>
            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
                style={{ flex: 1 }}
                // Ajuste fino para que el teclado no tape el input de Google
                keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
            >
                <View style={styles.addressWrapper}>
                    <ClientAddressForm 
                        initialName={clientName}
                        initialAddress={clientAddress}
                        initialLocation={location}
                        onClientNameChange={setClientName}
                        onLocationChange={(addr, lat, lng) => {
                            setClientAddress(addr);
                            setLocation({ lat, lng });
                        }}
                    />
                </View>

                {/* 🔥 LA SOLUCIÓN ESTÁ AQUÍ: keyboardShouldPersistTaps="always" */}
                <ScrollView 
                    contentContainerStyle={styles.scrollContent} 
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="always" 
                >
                    {/* ZIndex bajo para el resto */}
                    <View style={{ zIndex: 1, marginTop: 10 }}>
                        <View style={styles.costsCard}>
                            <View style={styles.tabsWrapper}>
                                <View style={styles.tabsContainer}>
                                    <TouchableOpacity 
                                        onPress={() => {
                                            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                                            setActiveCategory('labor');
                                        }} 
                                        style={[styles.tab, activeCategory === 'labor' && styles.activeTab]}
                                    >
                                        <Text style={[styles.tabText, activeCategory === 'labor' && styles.activeTabText]}>👷 Mano de Obra</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity 
                                        onPress={() => {
                                            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                                            setActiveCategory('material');
                                        }} 
                                        style={[styles.tab, activeCategory === 'material' && styles.activeTab]}
                                    >
                                        <Text style={[styles.tabText, activeCategory === 'material' && styles.activeTabText]}>🧱 Materiales</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View style={styles.listContainer}>
                                {renderItemList(activeCategory)}
                            </View>

                            <TouchableOpacity 
                                style={styles.addBlockBtn} 
                                onPress={() => {
                                    handleSmartInteraction('light');
                                    setSelectorOpen(true);
                                }}
                            >
                                <Ionicons name="add-circle" size={24} color={COLORS.primary} />
                                <Text style={styles.addBlockText}>Agregar {activeCategory === 'labor' ? 'Item' : 'Material'}</Text>
                            </TouchableOpacity>

                            <View style={styles.summaryBox}>
                                <View style={styles.summaryRow}>
                                    <Text style={styles.summaryLabel}>Subtotal</Text>
                                    <Text style={styles.summaryValue}>${formatCurrency(subtotal)}</Text>
                                </View>
                                <View style={styles.summaryRow}>
                                    <Text style={styles.summaryLabel}>Descuento</Text>
                                    <View style={styles.discountInputContainer}>
                                        <Text style={styles.currencyPrefix}>- $</Text>
                                        <TextInput
                                            style={styles.discountInput}
                                            keyboardType="numeric"
                                            placeholder="0"
                                            selectTextOnFocus
                                            value={discount.toString()}
                                            onChangeText={(t) => setDiscount(parseFloat(t) || 0)}
                                        />
                                    </View>
                                </View>
                                <View style={styles.summaryRow}>
                                    <Text style={styles.summaryLabel}>IVA (21%)</Text>
                                    <Switch 
                                        value={applyTax} 
                                        onValueChange={(v) => {
                                            handleSmartInteraction('light');
                                            setApplyTax(v);
                                        }} 
                                        trackColor={{ false: "#E2E8F0", true: COLORS.primary + "50" }}
                                        thumbColor={applyTax ? COLORS.primary : '#f4f3f4'} 
                                    />
                                </View>
                                <View style={styles.divider} />
                                <View style={styles.totalRow}>
                                    <Text style={styles.totalLabel}>TOTAL ESTIMADO</Text>
                                    <Text style={styles.totalValue}>${formatCurrency(totalWithTax)}</Text>
                                </View>
                            </View>
                        </View>
                        
                        <View style={{ height: 120 }} /> 
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            <View style={styles.footerOverlay}>
                <View style={styles.footerContent}>
                    <View style={styles.footerInfo}>
                        <Text style={styles.footerTotalLabel}>Total</Text>
                        <Text style={styles.footerTotalValue}>${formatCurrency(totalWithTax)}</Text>
                    </View>
                    <TouchableOpacity style={styles.mainBtn} onPress={handleSave} disabled={isSaving}>
                        {isSaving ? <ActivityIndicator color="#FFF" /> : (
                            <>
                                <Text style={styles.mainBtnText}>GUARDAR</Text>
                                <Ionicons name="arrow-forward" size={20} color="#FFF" />
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </View>

        <ItemSelector 
            visible={isSelectorOpen} 
            onClose={() => setSelectorOpen(false)} 
            onSelect={handleAddItem}
            filterType={activeCategory} 
        />
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#F8FAFC' },
  centerWebContainer: { 
    flex: 1, 
    width: '100%', 
    maxWidth: IS_WEB ? MAX_WEB_WIDTH : '100%', 
    alignSelf: 'center', 
    backgroundColor: IS_WEB ? '#FFF' : 'transparent', 
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: IS_WEB ? 0.1 : 0,
    shadowRadius: 12,
  },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 16 },
  addressWrapper: {
    paddingHorizontal: 16,
    paddingTop: 16,
    zIndex: 9999,
    elevation: 30,
    position: 'relative',
    overflow: 'visible',
  },
  
  costsCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginTop: 16, shadowColor: '#000', shadowOffset: {width:0, height:2}, shadowOpacity:0.03, elevation: 1 },
  
  tabsWrapper: { marginBottom: 20 },
  tabsContainer: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 12, padding: 4 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  activeTab: { backgroundColor: '#FFF', shadowColor: '#000', shadowOpacity: 0.05, elevation: 2 },
  tabText: { fontSize: 13, color: '#64748B', fontWeight: '600' },
  activeTabText: { color: COLORS.primary, fontWeight: '700' },

  listContainer: { marginBottom: 10 },
  itemCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingVertical: 14 },
  itemInfo: { flex: 1, paddingRight: 10 },
  itemName: { fontSize: 15, color: '#1E293B', fontWeight: '500', marginBottom: 6 },
  quantityControls: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#F8FAFC', alignSelf: 'flex-start', padding: 4, borderRadius: 8 },
  qtyBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF', borderRadius: 6, shadowColor:'#000', shadowOpacity:0.05, elevation:1 },
  qtyText: { fontSize: 14, fontWeight: '700', color: '#1E293B', minWidth: 20, textAlign: 'center' },

  itemActions: { alignItems: 'flex-end', gap: 8 },
  priceInputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 8, paddingHorizontal: 10, height: 40, borderWidth: 1, borderColor: '#E2E8F0', width: 110 },
  currencySymbol: { color: '#94A3B8', marginRight: 4, fontWeight: '600' },
  priceInput: { flex: 1, fontSize: 15, fontWeight: '700', color: '#1E293B', textAlign: 'right', padding: 0 },
  deleteBtn: { padding: 6 },
  
  emptyContainer: { padding: 40, alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed', borderWidth: 2, borderColor: '#E2E8F0', borderRadius: 12, backgroundColor: '#FAFAFA', marginVertical: 10 },
  emptyText: { color: '#64748B', fontSize: 15, marginTop: 12, fontWeight: '600' },
  
  addBlockBtn: { flexDirection: 'row', backgroundColor: '#FFF', padding: 16, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 10, borderWidth: 1, borderColor: COLORS.primary, borderStyle: 'dashed' },
  addBlockText: { marginLeft: 8, color: COLORS.primary, fontWeight: '700', fontSize: 14 },

  summaryBox: { marginTop: 24, backgroundColor: '#F8FAFC', padding: 20, borderRadius: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  summaryLabel: { fontSize: 14, color: '#64748B' },
  summaryValue: { fontSize: 14, color: '#1E293B', fontWeight: '600' },
  discountInputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, paddingHorizontal: 8, height: 36 },
  currencyPrefix: { color: COLORS.danger, fontWeight: '700', fontSize: 12, marginRight: 2 },
  discountInput: { minWidth: 60, textAlign: 'right', fontWeight: 'bold', color: COLORS.danger },
  divider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 12 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 16, fontWeight: '800', color: '#1E293B' },
  totalValue: { fontSize: 22, fontWeight: '800', color: COLORS.primary },

  footerOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#F1F5F9', padding: 16, paddingBottom: Platform.OS === 'ios' ? 24 : 16, elevation: 20, shadowColor: "#000", shadowOffset: {width:0, height:-4}, shadowOpacity: 0.1 },
  footerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', maxWidth: MAX_WEB_WIDTH, alignSelf: 'center', width: '100%' },
  footerInfo: { flexDirection: 'column' },
  footerTotalLabel: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  footerTotalValue: { fontSize: 20, color: '#1E293B', fontWeight: '800' },
  mainBtn: { flexDirection: 'row', backgroundColor: COLORS.primary, paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12, alignItems: 'center', gap: 8, shadowColor: COLORS.primary, shadowOffset: {width:0, height:4}, shadowOpacity: 0.3, elevation: 4 },
  mainBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' }
});
