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

export default function JobConfigScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const params = route.params as { blueprint?: ServiceBlueprint, quote?: any };
  const { blueprint, quote } = params || {};

  // Hook de lógica
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
  const hasHydratedQuote = useRef(false);
  const hasHydratedBlueprint = useRef(false);

  const isEditMode = !!quote;
  const isWeb = Platform.OS === 'web';

  // --- CARGA INICIAL ---
  useEffect(() => {
    if (isEditMode && quote) {
      if (quote.client_name) setClientName(quote.client_name);
      if (quote.client_address) setClientAddress(quote.client_address);
      if (quote.location_lat) setLocation({ lat: quote.location_lat, lng: quote.location_lng });
      if (quote.tax_rate) setApplyTax(quote.tax_rate > 0);

      if (quote.quote_items && !hasHydratedQuote.current) {
        const mappedItems = quote.quote_items.map((item: any) => {
            const itemType = item?.metadata?.type || item?.type || 'labor';
            return {
                id: item.id?.toString() || `quote-item-${item.description}-${item.quote_id || Date.now()}`,
                name: item.description || 'Item',
                price: Number(item.unit_price || 0),
                quantity: Number(item.quantity || 1),
                isActive: true,
                type: itemType,
                category: itemType
            };
        });
        setItems(mappedItems);
        hasHydratedQuote.current = true;
      }
    }
  }, [blueprint, quote, isEditMode]);

  useEffect(() => {
    if (!isEditMode && blueprint?.blueprint_components?.length && !hasHydratedBlueprint.current) {
        const mapped = blueprint.blueprint_components
          .map((comp: any) => {
              const base = comp.master_items || {};
              const itemType = base.type || 'material';
              return {
                  id: (base.id || comp.item_id || `blueprint-${Date.now()}`)?.toString(),
                  name: base.name || 'Item',
                  price: Number(base.suggested_price || 0),
                  quantity: Number(comp.quantity || 1),
                  isActive: true,
                  type: itemType,
                  category: itemType
              };
          });
        setItems(mapped);
        hasHydratedBlueprint.current = true;
    }
  }, [isEditMode, blueprint]);

  // --- HANDLERS ---
  const handleLocationSelect = (data: { address: string, lat: number, lng: number }) => {
    setClientAddress(data.address);
    setLocation({ lat: data.lat, lng: data.lng });
  };

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

  // Normalizamos para cálculos y render (evita NaN)
  const normalizedItems = items.map(i => {
    const qty = Math.max(1, Number(i.quantity) || 1);
    const price = Math.max(0, Number(i.price) || 0);
    return {
      ...i,
      quantity: qty,
      price,
      type: getItemType(i),
      isActive: i.isActive !== false
    };
  });

  const filteredByCategory = (category: 'labor' | 'material') =>
    normalizedItems.filter(i => {
      const type = i.type;
      return type === category || (!type && category === 'labor');
    });

  // --- RENDERIZADO DE ÍTEMS ---
  const renderItemList = (category: 'labor' | 'material') => {
    const filteredItems = filteredByCategory(category);
    
    if (filteredItems.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <Ionicons name={category === 'labor' ? "hammer-outline" : "cube-outline"} size={40} color="#CBD5E1" />
                <Text style={styles.emptyText}>
                    No hay {category === 'labor' ? 'mano de obra' : 'materiales'}
                </Text>
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
                            const val = parseInt(text || '1', 10);
                            if (!isNaN(val) && val > 0) {
                                updateQuantity(item.id, val - item.quantity);
                            } else if (text === '') {
                                updateQuantity(item.id, 1 - item.quantity);
                            }
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
                            const cleaned = text.trim();
                            if (cleaned === '') {
                                updateItemPrice(item.id, 0);
                                return;
                            }
                            const val = parseFloat(cleaned);
                            if (!isNaN(val)) {
                                const unit = val / Math.max(1, item.quantity);
                                updateItemPrice(item.id, unit);
                            }
                        }}
                        onBlur={() => {
                            if (!item.price || isNaN(item.price)) {
                                updateItemPrice(item.id, 0);
                            }
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

  // Totales
  const laborItems = normalizedItems.filter(i => i.type !== 'material');
  const materialItems = normalizedItems.filter(i => i.type === 'material');
  const laborTotal = laborItems.filter(i => i.isActive).reduce((acc, i) => acc + (i.price * i.quantity), 0);
  const materialTotal = materialItems.filter(i => i.isActive).reduce((acc, i) => acc + (i.price * i.quantity), 0);
  const subtotal = laborTotal + materialTotal;
  const subtotalAfterDiscount = Math.max(0, subtotal - discount);
  const taxAmount = applyTax ? subtotalAfterDiscount * 0.21 : 0;
  const totalWithTax = subtotalAfterDiscount + taxAmount;
  const hasActiveItems = normalizedItems.some(i => i.isActive);

  // --- GUARDAR ---
  const proceedToNextStep = async () => {
    if (!clientName.trim()) {
        const msg = "Por favor ingresa el nombre del cliente";
        isWeb ? alert(msg) : Alert.alert("Falta información", msg);
        return;
    }

    if (!hasActiveItems) {
        const msg = "Agrega al menos un ítem al presupuesto";
        isWeb ? alert(msg) : Alert.alert("Falta información", msg);
        return;
    }

    try {
        setIsSaving(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("No hay sesion activa");

        const quoteData = {
            total_amount: totalWithTax,
            status: 'draft',
            tax_rate: applyTax ? 0.21 : 0,
            client_name: clientName,
            client_address: clientAddress,
            scheduled_date: scheduledDate ? scheduledDate.toISOString().split('T')[0] : null,
            location_lat: location.lat !== 0 ? location.lat : null,
            location_lng: location.lng !== 0 ? location.lng : null
        };

        let targetId = quote?.id;

        if (isEditMode) {
            if (!targetId) throw new Error("No hay ID de presupuesto para editar");
            const { error: updateError } = await supabase.from('quotes').update(quoteData).eq('id', targetId);
            if (updateError) throw updateError;
            await supabase.from('quote_items').delete().eq('quote_id', targetId);
        } else {
            const insertPayload = {
                ...quoteData,
                user_id: user.id
            } as any;
            const { data: newQuote, error: insertError } = await supabase
              .from('quotes')
              .insert(insertPayload)
              .select()
              .single();
            if (insertError) throw insertError;
            targetId = newQuote?.id;
            if (!targetId) throw new Error("No se pudo crear el presupuesto");
        }

        const dbItems = items.filter(i => i.isActive).map(i => ({
            quote_id: targetId, 
            description: i.name, 
            unit_price: i.price, 
            quantity: i.quantity
        }));

        if (dbItems.length > 0) {
            const { error: itemsError } = await supabase.from('quote_items').insert(dbItems);
            if (itemsError) throw itemsError;
        }

        navigation.navigate('JobDetail', { 
            jobId: targetId,
            quote: { 
              ...(quote || {}), 
              ...quoteData, 
              id: targetId, 
              client_address: clientAddress, 
              location_lat: location.lat !== 0 ? location.lat : null,
              location_lng: location.lng !== 0 ? location.lng : null,
            } 
        }); 

    } catch (e: any) {
        console.error(e);
        Alert.alert("Error", "No se pudo guardar el presupuesto.");
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScreenHeader title="Nuevo Presupuesto" subtitle="Define cliente y costos" showBack />

      <ScrollView 
        contentContainerStyle={styles.content} 
        keyboardShouldPersistTaps="handled"
        // IMPORTANTE: Esto permite que el contenido sobresalga de los contenedores
        overScrollMode="always"
      >
        
        {/* === TARJETA 1: CLIENTE (Z-INDEX ALTO) === */}
        {/* 👇 AQUÍ ESTÁ EL ARREGLO: style específico con zIndex alto */}
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

            {/* Contenedor del Mapa con zIndex interno alto */}
            <View style={[styles.inputContainer, { zIndex: 9000, marginBottom: 0 }]}>
                <Text style={styles.inputLabel}>Ubicación de la Obra</Text>
                <View style={{ height: 50, zIndex: 9000 }}>
                   {isWeb ? (
                       process.env.EXPO_PUBLIC_WEB_API_KEY && !disableWebAutocomplete ? (
                           <WebGoogleMaps 
                              apiKey={process.env.EXPO_PUBLIC_WEB_API_KEY} 
                              initialValue={clientAddress} 
                              value={clientAddress}
                              onManualInput={(text) => {
                                setClientAddress(text);
                                setLocation({ lat: 0, lng: 0 });
                              }}
                              onPlaceSelected={handleLocationSelect}
                              onError={() => setDisableWebAutocomplete(true)}
                           />
                       ) : (
                          <TextInput
                            style={[styles.textInput, { height: 50 }]}
                            placeholder="Escribe la direcciИn..."
                            placeholderTextColor="#94A3B8"
                            value={clientAddress}
                            onChangeText={(text) => {
                                setClientAddress(text);
                                setLocation({ lat: 0, lng: 0 });
                            }}
                          />
                       )
                   ) : (
                       <LocationAutocomplete apiKey={process.env.EXPO_PUBLIC_ANDROID_API_KEY} initialValue={clientAddress} onLocationSelect={handleLocationSelect} />
                   )}
                </View>
                {/* Campo manual para asegurar sincronizacion y permitir edicion directa */}
                <TextInput
                    style={[styles.textInput, { marginTop: 10 }]}
                    placeholder="Confirma o corrige la direccion"
                    placeholderTextColor="#94A3B8"
                    value={clientAddress}
                    onChangeText={(text) => {
                        setClientAddress(text);
                        setLocation({ lat: 0, lng: 0 });
                    }}
                />
            </View>
        </View>

        {/* === TARJETA 2: COSTOS (Z-INDEX BAJO) === */}
        <View style={styles.costsCard}>
            <Text style={styles.cardHeader}>💰 ÍTEMS DEL PRESUPUESTO</Text>
            
            <View style={styles.tabsContainer}>
                <TouchableOpacity onPress={() => setActiveCategory('labor')} style={[styles.tab, activeCategory === 'labor' && styles.activeTab]}>
                    <Text style={[styles.tabText, activeCategory === 'labor' && styles.activeTabText]}>
                        Mano de Obra ({laborItems.length})
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setActiveCategory('material')} style={[styles.tab, activeCategory === 'material' && styles.activeTab]}>
                    <Text style={[styles.tabText, activeCategory === 'material' && styles.activeTabText]}>
                        Materiales ({materialItems.length})
                    </Text>
                </TouchableOpacity>
            </View>

            <View style={styles.listContainer}>
                {renderItemList(activeCategory)}
            </View>

            <TouchableOpacity style={styles.addBlockBtn} onPress={() => setSelectorOpen(true)}>
                <Ionicons name="add-circle" size={24} color={COLORS.primary} />
                <Text style={styles.addBlockText}>
                    Agregar {activeCategory === 'labor' ? 'Mano de Obra' : 'Material'}
                </Text>
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
                    <Text style={styles.summaryLabel}>Subtotal (sin IVA)</Text>
                    <Text style={styles.summaryValue}>${formatCurrency(subtotal)}</Text>
                </View>

                <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Descuento</Text>
                    <View style={styles.discountInputWrapper}>
                        <Text style={styles.currencySymbol}>$</Text>
                        <TextInput
                          style={styles.discountInput}
                          keyboardType="numeric"
                          value={discount ? discount.toString() : ''}
                          placeholder="0"
                          onChangeText={(text) => {
                            const next = parseFloat(text || '0');
                            setDiscount(!isNaN(next) ? Math.max(0, next) : 0);
                          }}
                        />
                    </View>
                </View>

                <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>IVA (21%)</Text>
                    <Switch value={applyTax} onValueChange={setApplyTax} thumbColor={applyTax ? COLORS.primary : '#fff'} />
                </View>
                {discount > 0 && (
                  <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Descuento aplicado</Text>
                      <Text style={styles.summaryValue}>- ${formatCurrency(discount)}</Text>
                  </View>
                )}
                {applyTax && (
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>IVA calculado</Text>
                        <Text style={styles.summaryValue}>+ ${formatCurrency(taxAmount)}</Text>
                    </View>
                )}
                <View style={styles.divider} />
                <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>ESTIMADO FINAL</Text>
                    <Text style={styles.totalValue}>${formatCurrency(totalWithTax)}</Text>
                </View>
            </View>
        </View>

      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.mainBtn} onPress={proceedToNextStep} disabled={isSaving}>
            {isSaving ? <ActivityIndicator color="#FFF" /> : (
                <>
                    <Text style={styles.mainBtnText}>CONTINUAR</Text>
                    <Ionicons name="arrow-forward" size={20} color="#FFF" />
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
  
  // --- Z-INDEX FIX: Estilos separados para tarjetas ---
  clientCard: { 
    backgroundColor: '#FFF', 
    borderRadius: 16, 
    padding: 20, 
    marginBottom: 16, 
    shadowColor: '#000', 
    shadowOffset: {width:0, height:2}, 
    shadowOpacity:0.03, 
    elevation: 2,
    zIndex: 2000, // <--- ESTO ARREGLA EL SOLAPAMIENTO
    position: 'relative' // Necesario para que zIndex funcione en algunos casos
  },

  costsCard: {
    backgroundColor: '#FFF', 
    borderRadius: 16, 
    padding: 20, 
    marginBottom: 16, 
    shadowColor: '#000', 
    shadowOffset: {width:0, height:2}, 
    shadowOpacity:0.03, 
    elevation: 2,
    zIndex: 1, // <--- Menor prioridad
  },

  cardHeader: { fontSize: 13, fontFamily: FONTS.title, color: '#64748B', letterSpacing: 1, marginBottom: 16, fontWeight: '700' },
  
  inputContainer: { marginBottom: 16 },
  inputLabel: { fontSize: 12, color: '#475569', marginBottom: 6, fontWeight: '600' },
  textInput: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, padding: 12, fontSize: 15, color: '#1E293B' },

  tabsContainer: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 12, padding: 4, marginBottom: 20 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  activeTab: { backgroundColor: '#FFF', shadowColor: '#000', shadowOpacity: 0.05, shadowOffset:{width:0,height:1}, elevation: 1 },
  tabText: { fontSize: 13, color: '#64748B', fontWeight: '600' },
  activeTabText: { color: COLORS.primary, fontWeight: '700' },

  listContainer: { marginBottom: 10 },
  emptyContainer: { padding: 30, alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, backgroundColor: '#F8FAFC' },
  emptyText: { color: '#64748B', fontSize: 14, marginTop: 10, fontWeight: '500' },
  emptyLink: { color: COLORS.primary, marginTop: 4, fontWeight: 'bold' },

  itemCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingVertical: 14 },
  itemInfo: { flex: 1, paddingRight: 10 },
  itemName: { fontSize: 15, color: '#1E293B', fontWeight: '500', marginBottom: 4 },
  quantityBadge: { alignSelf: 'flex-start', backgroundColor: '#F1F5F9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  quantityText: { fontSize: 11, color: '#64748B', fontWeight: '600' },
  quantityControls: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  qtyBtn: { width: 28, height: 28, borderRadius: 6, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF' },
  qtyInput: { width: 50, height: 34, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 6, textAlign: 'center', fontSize: 14, color: '#1E293B', paddingVertical: 2, paddingHorizontal: 4, backgroundColor: '#FFF' },
  
  itemActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  priceInputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 8, paddingHorizontal: 10, height: 42, borderWidth: 1, borderColor: '#E2E8F0', minWidth: 100 },
  currencySymbol: { color: '#94A3B8', marginRight: 4, fontWeight: 'bold' },
  priceInput: { flex: 1, fontSize: 15, fontWeight: '700', color: '#1E293B', textAlign: 'right', padding: 0 },
  deleteBtn: { padding: 8, backgroundColor: '#FEF2F2', borderRadius: 8 },
  discountInputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 8, paddingHorizontal: 10, height: 38, borderWidth: 1, borderColor: '#E2E8F0', minWidth: 120 },
  discountInput: { flex: 1, fontSize: 14, fontWeight: '700', color: '#1E293B', textAlign: 'right', padding: 0 },

  addBlockBtn: { flexDirection: 'row', backgroundColor: '#FFF', padding: 16, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 10, borderWidth: 1, borderColor: COLORS.primary, borderStyle: 'dashed' },
  addBlockText: { marginLeft: 8, color: COLORS.primary, fontWeight: '700', fontSize: 14 },

  summaryBox: { marginTop: 24, backgroundColor: '#F8FAFC', padding: 16, borderRadius: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
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
