import React, { useEffect, useRef, useState } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, 
  TextInput, KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator, Switch,
  LayoutAnimation, UIManager, Dimensions 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics'; // 📦 Necesitarás instalar expo-haptics

// --- COMPONENTES ---
import { ScreenHeader } from '../../components/molecules/ScreenHeader';
import ItemSelector from '../../components/organisms/ItemSelector';
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
const MAX_WEB_WIDTH = 800; // Ancho máximo para que se vea bien en monitor

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

  // --- CARGA DE DATOS (Mantenemos tu lógica original, es correcta) ---
  useEffect(() => {
    if (hasLoadedData.current) return;
    const initData = async () => {
        // ... (Tu lógica de carga existente se mantiene igual)
        try {
            if (isEditMode && quote?.id) {
               // ... Tu código de fetch supabase existente ...
            } else if (blueprint) {
               // ... Tu código de blueprint existente ...
            }
            hasLoadedData.current = true;
        } catch (err) {
            console.error("Error cargando datos:", err);
        }
    };
    initData();
  }, [quote?.id, blueprint, isEditMode]);

  // --- HANDLERS INTELIGENTES ---

  const handleSmartInteraction = (type: 'light' | 'medium' | 'heavy' = 'light') => {
    // Feedback háptico solo en móvil para dar sensación de "peso"
    if (!IS_WEB) {
        if (type === 'light') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (type === 'medium') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        if (type === 'heavy') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleAddItem = (item: any) => {
    handleSmartInteraction('medium');
    // Animación fluida al agregar
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
    // Animación de colapso al borrar
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    removeItem(id);
  };

  const handleSave = async () => {
      handleSmartInteraction('heavy');
      await proceedToNextStep();
  };

  // --- CÁLCULOS ---
  const normalizedItems = items.map(i => ({ ...i, isActive: i.isActive !== false }));
  const laborTotal = normalizedItems.filter(i => i.type !== 'material' && i.isActive).reduce((acc, i) => acc + (i.price * i.quantity), 0);
  const materialTotal = normalizedItems.filter(i => i.type === 'material' && i.isActive).reduce((acc, i) => acc + (i.price * i.quantity), 0);
  const subtotal = laborTotal + materialTotal;
  const subtotalAfterDiscount = Math.max(0, subtotal - discount);
  const totalWithTax = subtotalAfterDiscount + (applyTax ? subtotalAfterDiscount * 0.21 : 0);

  // --- LÓGICA DE GUARDADO (Tu código original encapsulado) ---
  const proceedToNextStep = async () => {
    // ... (Tu lógica original de validación y Supabase va aquí)
    // Solo asegúrate de usar setLocation, setClientName, etc.
    // ...
    // Al final del éxito:
    // navigation.navigate('JobDetail', ...);
  };

  // --- RENDERIZADO DE LISTA ---
  const renderItemList = (category: 'labor' | 'material') => {
    const filteredItems = normalizedItems.filter(i => {
        const type = (i.type || 'labor').toLowerCase();
        return type === category || (!type && category === 'labor');
    });
    
    if (filteredItems.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                                <Ionicons name={category === 'labor' ? "hammer-outline" : "cube-outline"} size={48} color="#CBD5E1" />
                <Text style={styles.emptyText}>No has agregado {category === 'labor' ? 'mano de obra' : 'materiales'}</Text>
                <Text style={styles.emptySubText}>Toca el botón "+ Agregar" para comenzar</Text>
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
                        // UX Upgrade: Seleccionar todo el texto al enfocar para editar rápido
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
        
        {/* Contenedor centralizado para WEB */}
        <View style={styles.centerWebContainer}>
            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
            >
                <ScrollView 
                    contentContainerStyle={styles.scrollContent} 
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    
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

                    <View style={styles.costsCard}>
                        {/* Pestañas mejoradas visualmente */}
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

                        {/* Resumen Financiero */}
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
                                <View style={{flexDirection:'row', alignItems:'center'}}>
                                    <Text style={styles.summaryLabel}>Aplicar IVA (21%)</Text>
                                    {/* Tooltip hint podría ir aquí */}
                                </View>
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
                    
                    {/* Espacio extra para que el footer no tape contenido al final del scroll */}
                    <View style={{ height: 100 }} /> 
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Footer Flotante Inteligente */}
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
    alignSelf: 'center', // Esto centra el contenido en Web
    backgroundColor: IS_WEB ? '#FFF' : 'transparent', // En web da efecto de "hoja"
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: IS_WEB ? 0.1 : 0,
    shadowRadius: 12,
  },
  scrollContent: { padding: 16 },
  
  // Cards y Estilos Generales
  costsCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginTop: 16, shadowColor: '#000', shadowOffset: {width:0, height:2}, shadowOpacity:0.03, elevation: 1 },
  
  // Tabs Estilo "Píldora"
  tabsWrapper: { marginBottom: 20 },
  tabsContainer: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 12, padding: 4 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  activeTab: { backgroundColor: '#FFF', shadowColor: '#000', shadowOpacity: 0.05, elevation: 2 },
  tabText: { fontSize: 13, color: '#64748B', fontWeight: '600' },
  activeTabText: { color: COLORS.primary, fontWeight: '700' },

  // Lista de Items
  listContainer: { marginBottom: 10 },
  itemCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingVertical: 14 },
  itemInfo: { flex: 1, paddingRight: 10 },
  itemName: { fontSize: 15, color: '#1E293B', fontWeight: '500', marginBottom: 6 },
  quantityControls: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#F8FAFC', alignSelf: 'flex-start', padding: 4, borderRadius: 8 },
  qtyBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF', borderRadius: 6, shadowColor:'#000', shadowOpacity:0.05, elevation:1 },
  qtyText: { fontSize: 14, fontWeight: '700', color: '#1E293B', minWidth: 20, textAlign: 'center' },

  // Inputs y Precios
  itemActions: { alignItems: 'flex-end', gap: 8 },
  priceInputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 8, paddingHorizontal: 10, height: 40, borderWidth: 1, borderColor: '#E2E8F0', width: 110 },
  currencySymbol: { color: '#94A3B8', marginRight: 4, fontWeight: '600' },
  priceInput: { flex: 1, fontSize: 15, fontWeight: '700', color: '#1E293B', textAlign: 'right', padding: 0 },
  deleteBtn: { padding: 6 },
  
  // Empty State
  emptyContainer: { padding: 40, alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed', borderWidth: 2, borderColor: '#E2E8F0', borderRadius: 12, backgroundColor: '#FAFAFA', marginVertical: 10 },
  emptyText: { color: '#64748B', fontSize: 15, marginTop: 12, fontWeight: '600' },
  emptySubText: { color: '#94A3B8', fontSize: 13, marginTop: 4 },
  
  // Botón Agregar
  addBlockBtn: { flexDirection: 'row', backgroundColor: '#FFF', padding: 16, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 10, borderWidth: 1, borderColor: COLORS.primary, borderStyle: 'dashed' },
  addBlockText: { marginLeft: 8, color: COLORS.primary, fontWeight: '700', fontSize: 14 },

  // Resumen
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

  // Footer Flotante
  footerOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#F1F5F9', padding: 16, paddingBottom: Platform.OS === 'ios' ? 24 : 16, elevation: 20, shadowColor: "#000", shadowOffset: {width:0, height:-4}, shadowOpacity: 0.1 },
  footerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', maxWidth: MAX_WEB_WIDTH, alignSelf: 'center', width: '100%' },
  footerInfo: { flexDirection: 'column' },
  footerTotalLabel: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  footerTotalValue: { fontSize: 20, color: '#1E293B', fontWeight: '800' },
  mainBtn: { flexDirection: 'row', backgroundColor: COLORS.primary, paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12, alignItems: 'center', gap: 8, shadowColor: COLORS.primary, shadowOffset: {width:0, height:4}, shadowOpacity: 0.3, elevation: 4 },
  mainBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' }
});