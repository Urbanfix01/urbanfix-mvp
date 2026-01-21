import React, { useEffect, useRef, useState } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, 
  TextInput, KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator, Switch,
  LayoutAnimation, UIManager, useWindowDimensions 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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

const IS_WEB = Platform.OS === 'web';
const WEB_MAX_WIDTH = 960;
const WEB_WIDE_MAX_WIDTH = 1200;
const WEB_WIDE_BREAKPOINT = 1100;

type LaborToolKey =
  | 'none'
  | 'ceiling_m2'
  | 'roof_chapa_m2'
  | 'masonry_020_m2'
  | 'masonry_030_m2'
  | 'perimetral_flashing_ml'
  | 'rough_exterior_height_m2'
  | 'custom';

type LaborTool = {
  key: LaborToolKey;
  label: string;
  itemName: string;
  unitLabel: string;
  quantityLabel: string;
  rateLabel: string;
};

const LABOR_TOOLS: LaborTool[] = [
  {
    key: 'ceiling_m2',
    label: 'Cielorraso (m2)',
    itemName: 'Cielorraso',
    unitLabel: 'm2',
    quantityLabel: 'Metros cuadrados',
    rateLabel: 'Precio por m2',
  },
  {
    key: 'roof_chapa_m2',
    label: 'Cubierta chapa (m2)',
    itemName: 'Coloc. cubierta chapa (estructura + chapas)',
    unitLabel: 'm2',
    quantityLabel: 'Metros cuadrados',
    rateLabel: 'Precio por m2',
  },
  {
    key: 'masonry_020_m2',
    label: 'Mamposteria 0,20 (m2)',
    itemName: 'Mamposteria 0,20',
    unitLabel: 'm2',
    quantityLabel: 'Metros cuadrados',
    rateLabel: 'Precio por m2',
  },
  {
    key: 'masonry_030_m2',
    label: 'Mamposteria 0,30 (m2)',
    itemName: 'Mamposteria 0,30',
    unitLabel: 'm2',
    quantityLabel: 'Metros cuadrados',
    rateLabel: 'Precio por m2',
  },
  {
    key: 'perimetral_flashing_ml',
    label: 'Cenefa zingueria perimetral (ml)',
    itemName: 'Cenefa zingueria perimetral cubierta',
    unitLabel: 'ml',
    quantityLabel: 'Metros lineales',
    rateLabel: 'Precio por ml',
  },
  {
    key: 'rough_exterior_height_m2',
    label: 'Rustico exterior en altura (m2)',
    itemName: 'Rustico exterior en altura',
    unitLabel: 'm2',
    quantityLabel: 'Metros cuadrados',
    rateLabel: 'Precio por m2',
  },
  {
    key: 'custom',
    label: 'Personalizado (m2 / ml)',
    itemName: 'Item personalizado',
    unitLabel: 'm2',
    quantityLabel: 'Metros cuadrados',
    rateLabel: 'Precio por m2',
  },
];

export default function JobConfigScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const queryClient = useQueryClient();
  const { width: windowWidth } = useWindowDimensions();
  
  const params = route.params as { blueprint?: any, quote?: any } | undefined;
  const { blueprint, quote } = params || {};
  const isWideLayout = IS_WEB && windowWidth >= WEB_WIDE_BREAKPOINT;
  const contentMaxWidth = IS_WEB ? (isWideLayout ? WEB_WIDE_MAX_WIDTH : WEB_MAX_WIDTH) : undefined;

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
  const [laborToolOpen, setLaborToolOpen] = useState(false);
  const [selectedLaborTool, setSelectedLaborTool] = useState<LaborToolKey>('none');
  const [toolQuantity, setToolQuantity] = useState('');
  const [toolRate, setToolRate] = useState('');
  const [customToolName, setCustomToolName] = useState('');
  const [customToolUnit, setCustomToolUnit] = useState<'m2' | 'ml'>('m2');
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});
  
  const hasLoadedData = useRef<string | null>(null);
  const isEditMode = !!(quote && quote.id);
  const initKey = isEditMode && quote?.id
    ? `quote:${quote.id}`
    : blueprint?.id
      ? `blueprint:${blueprint.id}`
      : `new:${route.key}`;

  // --- CARGA DE DATOS ---
  useEffect(() => {
    if (hasLoadedData.current === initKey) return;
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
                        setPriceDrafts({});
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
                setClientName('');
                setClientAddress('');
                setLocation({ lat: 0, lng: 0 });
                setApplyTax(false);
                setDiscount(0);
                setSelectedLaborTool('none');
                setLaborToolOpen(false);
                setToolQuantity('');
                setToolRate('');
                setCustomToolName('');
                setCustomToolUnit('m2');
                setItems(mapped || []);
                setPriceDrafts({});
            } else {
                setClientName('');
                setClientAddress('');
                setLocation({ lat: 0, lng: 0 });
                setApplyTax(false);
                setDiscount(0);
                setSelectedLaborTool('none');
                setLaborToolOpen(false);
                setToolQuantity('');
                setToolRate('');
                setCustomToolName('');
                setCustomToolUnit('m2');
                setItems([]);
                setPriceDrafts({});
            }
            hasLoadedData.current = initKey;
        } catch (err) {
            console.error("Error cargando datos:", err);
        }
    };
    initData();
  }, [initKey, quote?.id, blueprint, isEditMode]);

  useEffect(() => {
    if (activeCategory !== 'labor') {
      setLaborToolOpen(false);
    }
  }, [activeCategory]);

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
    setPriceDrafts((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const parseNumber = (value: string) => {
    const trimmed = value.replace(/\s+/g, '').trim();
    if (!trimmed) return 0;

    const hasComma = trimmed.includes(',');
    const hasDot = trimmed.includes('.');
    let normalized = trimmed;

    if (hasComma && hasDot) {
      normalized = normalized.replace(/\./g, '').replace(',', '.');
    } else if (hasComma) {
      normalized = normalized.replace(/\./g, '').replace(',', '.');
    } else if (hasDot) {
      const parts = normalized.split('.');
      if (parts.length > 2) {
        normalized = parts.join('');
      } else if (parts.length === 2 && parts[1].length === 3) {
        normalized = parts.join('');
      }
    }

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  };
  const toNumber = (value: unknown) => {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    if (typeof value === 'string') return parseNumber(value);
    return 0;
  };

  const selectedTool = LABOR_TOOLS.find((tool) => tool.key === selectedLaborTool) || null;
  const customUnit = customToolUnit === 'ml' ? 'ml' : 'm2';
  const effectiveTool = selectedTool && selectedTool.key === 'custom'
    ? {
        ...selectedTool,
        unitLabel: customUnit,
        quantityLabel: customUnit === 'ml' ? 'Metros lineales' : 'Metros cuadrados',
        rateLabel: `Precio por ${customUnit}`,
        itemName: customToolName.trim() || selectedTool.itemName,
      }
    : selectedTool;
  const laborToolDisplay = effectiveTool
    ? effectiveTool.key === 'custom' && customToolName.trim()
      ? customToolName.trim()
      : effectiveTool.label
    : 'Seleccionar';
  const toolQuantityValue = parseNumber(toolQuantity);
  const toolRateValue = parseNumber(toolRate);
  const toolTotal = toolQuantityValue * toolRateValue;

  const handleAddLaborCalculator = () => {
    if (!effectiveTool) return;
    if (effectiveTool.key === 'custom' && !customToolName.trim()) {
      Alert.alert('Falta informacion', 'Ingresa el nombre del item personalizado.');
      return;
    }
    if (toolQuantityValue <= 0 || toolRateValue <= 0) {
      Alert.alert('Falta informacion', 'Ingresa la cantidad y el precio por unidad.');
      return;
    }

    addItem({
      name: `${effectiveTool.itemName} ${toolQuantityValue} ${effectiveTool.unitLabel}`,
      price: toolRateValue,
      quantity: toolQuantityValue,
      category: 'labor',
      type: 'labor',
      isActive: true,
    });

    setToolQuantity('');
    setToolRate('');
    setCustomToolName('');
    setCustomToolUnit('m2');
    setSelectedLaborTool('none');
    setLaborToolOpen(false);
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
  const normalizedItems = items.map(i => ({
    ...i,
    isActive: i.isActive !== false,
    type: (i.type || 'labor').toLowerCase(),
  }));
  const laborItems = normalizedItems.filter((i) => i.type !== 'material');
  const materialItems = normalizedItems.filter((i) => i.type === 'material');
  const laborTotal = laborItems.reduce((acc, i) => acc + (toNumber(i.price) * toNumber(i.quantity)), 0);
  const materialTotal = materialItems.reduce((acc, i) => acc + (toNumber(i.price) * toNumber(i.quantity)), 0);
  const subtotal = laborTotal + materialTotal;
  const subtotalAfterDiscount = Math.max(0, subtotal - discount);
  const taxAmount = applyTax ? subtotalAfterDiscount * 0.21 : 0;
  const totalWithTax = subtotalAfterDiscount + taxAmount;
  const laborCount = laborItems.length;
  const materialCount = materialItems.length;
  const hasClientInfo = clientName.trim().length > 0 && !!clientAddress?.trim();
  const hasItems = normalizedItems.length > 0;

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

    return filteredItems.map((item, index) => {
        const unitPrice = toNumber(item.price);
        const quantity = toNumber(item.quantity);
        const totalPrice = unitPrice * quantity;
        const itemName = item.name || '';
        const isByArea = itemName.toLowerCase().includes('m2');
        const unitLabel = isByArea ? 'Precio por m2' : 'Precio unitario';
        const accentColor = item.type === 'material' ? '#38BDF8' : COLORS.primary;
        const itemId = item.id ? item.id.toString() : undefined;
        const priceDraft = itemId ? priceDrafts[itemId] : undefined;
        const displayPrice = priceDraft ?? (unitPrice ? unitPrice.toString() : '');

        return (
            <View key={item.id || index} style={[styles.itemCard, { borderLeftColor: accentColor }]}>
                <View style={styles.itemInfo}>
                    <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
                    <Text style={styles.itemMeta}>
                        {unitLabel}: ${formatCurrency(unitPrice)} · Total: ${formatCurrency(totalPrice)}
                    </Text>
                    <View style={styles.quantityControls}>
                        <TouchableOpacity style={[styles.qtyBtn, { borderColor: accentColor }]} onPress={() => handleUpdateQty(item.id, -1)}>
                            <Ionicons name="remove" size={16} color={accentColor} />
                        </TouchableOpacity>
                        <Text style={styles.qtyText}>{item.quantity}</Text>
                        <TouchableOpacity style={[styles.qtyBtn, { borderColor: accentColor }]} onPress={() => handleUpdateQty(item.id, 1)}>
                            <Ionicons name="add" size={16} color={accentColor} />
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
                            value={displayPrice}
                            onChangeText={(text) => {
                              if (!itemId) return;
                              setPriceDrafts((prev) => ({ ...prev, [itemId]: text }));
                              updateItemPrice(itemId, parseNumber(text));
                            }}
                            onBlur={() => {
                              if (!itemId) return;
                              setPriceDrafts((prev) => ({
                                ...prev,
                                [itemId]: unitPrice ? unitPrice.toString() : '',
                              }));
                            }}
                        />
                    </View>
                    <TouchableOpacity onPress={() => handleRemoveItem(item.id)} style={styles.deleteBtn}>
                        <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                    </TouchableOpacity>
                </View>
            </View>
        );
    });
  };

  const renderSummary = (variant: 'stack' | 'side') => (
    <View style={[styles.summaryBox, variant === 'side' && styles.summaryBoxSide]}>
        <View style={styles.summaryTop}>
            <View>
                <Text style={styles.summaryTitle}>Ticket</Text>
                <Text style={styles.summarySubtitle}>Resumen del presupuesto</Text>
            </View>
            <View style={[styles.summaryStatus, hasClientInfo && hasItems && styles.summaryStatusActive]}>
                <Ionicons
                    name={hasClientInfo && hasItems ? 'checkmark-circle' : 'time-outline'}
                    size={14}
                    color={hasClientInfo && hasItems ? '#16A34A' : '#94A3B8'}
                />
                <Text style={[styles.summaryStatusText, hasClientInfo && hasItems && styles.summaryStatusTextActive]}>
                    {hasClientInfo && hasItems ? 'Listo' : 'En curso'}
                </Text>
            </View>
        </View>

        <View style={styles.summaryLine}>
            <Text style={styles.summaryLineLabel}>Mano de obra</Text>
            <Text style={styles.summaryLineValue}>${formatCurrency(laborTotal)}</Text>
        </View>
        <View style={styles.summaryLine}>
            <Text style={styles.summaryLineLabel}>Materiales</Text>
            <Text style={styles.summaryLineValue}>${formatCurrency(materialTotal)}</Text>
        </View>
        <View style={styles.summaryLine}>
            <Text style={styles.summaryLineLabel}>Descuento</Text>
            <View style={styles.discountInputContainer}>
                <Text style={styles.currencyPrefix}>- $</Text>
                <TextInput
                    style={styles.discountInput}
                    keyboardType="numeric"
                    placeholder="0"
                    selectTextOnFocus
                    value={discount.toString()}
                    onChangeText={(t) => setDiscount(parseNumber(t))}
                />
            </View>
        </View>
        <View style={styles.summaryLine}>
            <View>
                <Text style={styles.summaryLineLabel}>IVA 21%</Text>
                <Text style={styles.summaryLineHint}>{applyTax ? 'Aplicado' : 'No aplicado'}</Text>
            </View>
            <Text style={styles.summaryLineValue}>${formatCurrency(taxAmount)}</Text>
        </View>
        <View style={styles.summaryToggleRow}>
            <Text style={styles.summaryToggleLabel}>Aplicar IVA</Text>
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
        <View style={styles.summaryDivider} />
        <View style={styles.summaryTotalRow}>
            <Text style={styles.summaryTotalLabel}>Total estimado</Text>
            <Text style={styles.summaryTotalValue}>${formatCurrency(totalWithTax)}</Text>
        </View>
        <View style={styles.summaryFootnote}>
            <Ionicons name="shield-checkmark-outline" size={16} color="#94A3B8" />
            <Text style={styles.summaryFootnoteText}>Guarda para confirmar el presupuesto.</Text>
        </View>
    </View>
  );

  // --- UI PRINCIPAL ---
  return (
    <View style={styles.mainContainer}>
        <ScreenHeader title={isEditMode ? "Editar Trabajo" : "Nuevo Presupuesto"} showBack />
        
        <View style={[styles.centerWebContainer, IS_WEB && contentMaxWidth ? { maxWidth: contentMaxWidth } : null]}>
            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
                style={{ flex: 1 }}
                // Ajuste fino para que el teclado no tape el input de Google
                keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
            >
                <View style={[styles.addressWrapper, IS_WEB && styles.addressWrapperWeb]}>
                    <LinearGradient
                        colors={['#0F172A', '#1F2937']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[styles.hero, !isWideLayout && styles.heroCompact]}
                    >
                        <View style={styles.heroGlow} />
                        <View style={[styles.heroContent, isWideLayout && styles.heroContentWide]}>
                            <View style={styles.heroLeft}>
                                <Text style={styles.heroEyebrow}>COTIZADOR URBANFIX</Text>
                                <Text style={styles.heroTitle}>
                                    {isEditMode ? 'Editar presupuesto' : 'Nuevo presupuesto'}
                                </Text>
                                <Text style={styles.heroSubtitle}>
                                    Crea una propuesta clara, con totales al instante.
                                </Text>
                            </View>
                            <View style={styles.heroTotalCard}>
                                <Text style={styles.heroTotalLabel}>Total estimado</Text>
                                <Text style={styles.heroTotalValue}>${formatCurrency(totalWithTax)}</Text>
                                <Text style={styles.heroTotalMeta}>{applyTax ? 'IVA incluido' : 'Sin IVA'}</Text>
                            </View>
                        </View>
                        <View style={styles.heroSteps}>
                            <View style={[styles.stepChip, hasClientInfo && styles.stepChipActive]}>
                                <Ionicons
                                    name="person-outline"
                                    size={14}
                                    color={hasClientInfo ? '#0F172A' : '#E2E8F0'}
                                />
                                <Text style={[styles.stepChipText, hasClientInfo && styles.stepChipTextActive]}>
                                    Cliente
                                </Text>
                            </View>
                            <View style={[styles.stepChip, hasItems && styles.stepChipActive]}>
                                <Ionicons
                                    name="hammer-outline"
                                    size={14}
                                    color={hasItems ? '#0F172A' : '#E2E8F0'}
                                />
                                <Text style={[styles.stepChipText, hasItems && styles.stepChipTextActive]}>
                                    Items
                                </Text>
                            </View>
                            <View style={[styles.stepChip, hasItems && hasClientInfo && styles.stepChipActive]}>
                                <Ionicons
                                    name="document-text-outline"
                                    size={14}
                                    color={hasItems && hasClientInfo ? '#0F172A' : '#E2E8F0'}
                                />
                                <Text
                                    style={[
                                        styles.stepChipText,
                                        hasItems && hasClientInfo && styles.stepChipTextActive,
                                    ]}
                                >
                                    Total
                                </Text>
                            </View>
                        </View>
                    </LinearGradient>

                    <View style={styles.panel}>
                        <View style={styles.panelHeader}>
                            <View style={styles.panelHeaderLeft}>
                                <Text style={styles.panelEyebrow}>PASO 1</Text>
                                <Text style={styles.panelTitle}>Datos del cliente</Text>
                                <Text style={styles.panelHint}>Agrega nombre y direccion para iniciar.</Text>
                            </View>
                            <View style={[styles.statusBadge, hasClientInfo && styles.statusBadgeActive]}>
                                <Ionicons
                                    name={hasClientInfo ? 'checkmark-circle' : 'time-outline'}
                                    size={14}
                                    color={hasClientInfo ? '#16A34A' : '#94A3B8'}
                                />
                                <Text style={[styles.statusBadgeText, hasClientInfo && styles.statusBadgeTextActive]}>
                                    {hasClientInfo ? 'Listo' : 'Pendiente'}
                                </Text>
                            </View>
                        </View>
                        <ClientAddressForm 
                            variant="inline"
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
                </View>

                {/* 🔥 LA SOLUCIÓN ESTÁ AQUÍ: keyboardShouldPersistTaps="always" */}
                <ScrollView 
                    contentContainerStyle={[styles.scrollContent, IS_WEB && styles.scrollContentWeb]} 
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="always" 
                >
                    {/* ZIndex bajo para el resto */}
                    <View style={{ zIndex: 1, marginTop: 12 }}>
                        <View style={[styles.contentGrid, isWideLayout && styles.contentGridWide]}>
                            <View style={styles.mainColumn}>
                                <View style={styles.panel}>
                                    <View style={styles.panelHeader}>
                                        <View style={styles.panelHeaderLeft}>
                                            <Text style={styles.panelEyebrow}>PASO 2</Text>
                                            <Text style={styles.panelTitle}>Cargar items</Text>
                                            <Text style={styles.panelHint}>Selecciona tareas y materiales para cotizar.</Text>
                                        </View>
                                        <View style={styles.panelCounter}>
                                            <Text style={styles.panelCounterLabel}>Items</Text>
                                            <Text style={styles.panelCounterValue}>{laborCount + materialCount}</Text>
                                        </View>
                                    </View>
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
                                                    <Text style={[styles.tabText, activeCategory === 'labor' && styles.activeTabText]}>
                                                        Mano de obra
                                                    </Text>
                                                    <View style={[styles.tabBadge, activeCategory === 'labor' && styles.tabBadgeActive]}>
                                                        <Text style={[styles.tabBadgeText, activeCategory === 'labor' && styles.tabBadgeTextActive]}>
                                                            {laborCount}
                                                        </Text>
                                                    </View>
                                                </TouchableOpacity>
                                                <TouchableOpacity 
                                                    onPress={() => {
                                                        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                                                        setActiveCategory('material');
                                                    }} 
                                                    style={[styles.tab, activeCategory === 'material' && styles.activeTab]}
                                                >
                                                    <Text style={[styles.tabText, activeCategory === 'material' && styles.activeTabText]}>
                                                        Materiales
                                                    </Text>
                                                    <View style={[styles.tabBadge, activeCategory === 'material' && styles.tabBadgeActive]}>
                                                        <Text style={[styles.tabBadgeText, activeCategory === 'material' && styles.tabBadgeTextActive]}>
                                                            {materialCount}
                                                        </Text>
                                                    </View>
                                                </TouchableOpacity>
                                            </View>
                                        </View>

                                        {activeCategory === 'labor' && (
                                            <>
                                                <View style={styles.laborTools}>
                                                    <TouchableOpacity
                                                        style={styles.laborToolsHeader}
                                                        onPress={() => setLaborToolOpen(prev => !prev)}
                                                        activeOpacity={0.8}
                                                    >
                                                        <View>
                                                        <Text style={styles.laborToolsLabel}>Presupuestador (m2 / ml)</Text>
                                                        <Text style={styles.laborToolsHint}>Calculadora rapida por unidad (m2 o ml)</Text>
                                                        </View>
                                                    <View style={styles.laborToolsValue}>
                                                        <Text style={styles.laborToolsValueText} numberOfLines={1}>
                                                            {laborToolDisplay}
                                                        </Text>
                                                        <Ionicons
                                                            name={laborToolOpen ? 'chevron-up' : 'chevron-down'}
                                                            size={18}
                                                            color="#64748B"
                                                            />
                                                        </View>
                                                    </TouchableOpacity>

                                                    {laborToolOpen && (
                                                        <View style={styles.laborToolsMenu}>
                                                            {LABOR_TOOLS.map((tool) => (
                                                            <TouchableOpacity
                                                                key={tool.key}
                                                                style={styles.laborToolsOption}
                                                                onPress={() => {
                                                                    setSelectedLaborTool(tool.key);
                                                                    setLaborToolOpen(false);
                                                                    setToolQuantity('');
                                                                    setToolRate('');
                                                                    if (tool.key !== 'custom') {
                                                                        setCustomToolName('');
                                                                        setCustomToolUnit('m2');
                                                                    }
                                                                }}
                                                            >
                                                                <Text style={styles.laborToolsOptionText}>{tool.label}</Text>
                                                            </TouchableOpacity>
                                                        ))}
                                                        {selectedLaborTool !== 'none' && (
                                                            <TouchableOpacity
                                                                style={styles.laborToolsOption}
                                                                onPress={() => {
                                                                    setSelectedLaborTool('none');
                                                                    setLaborToolOpen(false);
                                                                    setToolQuantity('');
                                                                    setToolRate('');
                                                                    setCustomToolName('');
                                                                    setCustomToolUnit('m2');
                                                                }}
                                                            >
                                                                <Text style={styles.laborToolsOptionText}>Sin calculadora</Text>
                                                            </TouchableOpacity>
                                                        )}
                                                    </View>
                                                )}
                                            </View>

                                            {effectiveTool && (
                                                <View style={styles.calculatorCard}>
                                                    <View style={styles.calculatorHeader}>
                                                        <Ionicons name="grid-outline" size={18} color={COLORS.primary} />
                                                        <Text style={styles.calculatorTitle}>{effectiveTool.label}</Text>
                                                    </View>

                                                    {effectiveTool.key === 'custom' && (
                                                        <View style={styles.customToolRow}>
                                                            <View style={styles.customToolField}>
                                                                <Text style={styles.calculatorLabel}>Nombre del item</Text>
                                                                <TextInput
                                                                    style={styles.customToolInput}
                                                                    placeholder="Ej: Revoque exterior"
                                                                    value={customToolName}
                                                                    onChangeText={setCustomToolName}
                                                                />
                                                            </View>
                                                            <View style={styles.customUnitGroup}>
                                                                <Text style={styles.calculatorLabel}>Unidad</Text>
                                                                <View style={styles.unitChips}>
                                                                    <TouchableOpacity
                                                                        style={[
                                                                            styles.unitChip,
                                                                            customUnit === 'm2' && styles.unitChipActive,
                                                                        ]}
                                                                        onPress={() => setCustomToolUnit('m2')}
                                                                    >
                                                                        <Text
                                                                            style={[
                                                                                styles.unitChipText,
                                                                                customUnit === 'm2' && styles.unitChipTextActive,
                                                                            ]}
                                                                        >
                                                                            m2
                                                                        </Text>
                                                                    </TouchableOpacity>
                                                                    <TouchableOpacity
                                                                        style={[
                                                                            styles.unitChip,
                                                                            customUnit === 'ml' && styles.unitChipActive,
                                                                        ]}
                                                                        onPress={() => setCustomToolUnit('ml')}
                                                                    >
                                                                        <Text
                                                                            style={[
                                                                                styles.unitChipText,
                                                                                customUnit === 'ml' && styles.unitChipTextActive,
                                                                            ]}
                                                                        >
                                                                            ml
                                                                        </Text>
                                                                    </TouchableOpacity>
                                                                </View>
                                                            </View>
                                                        </View>
                                                    )}

                                                    <View style={styles.calculatorRow}>
                                                        <View style={styles.calculatorField}>
                                                            <Text style={styles.calculatorLabel}>{effectiveTool.quantityLabel}</Text>
                                                            <TextInput
                                                                style={styles.calculatorInput}
                                                                placeholder="Ej: 24"
                                                                keyboardType="decimal-pad"
                                                                value={toolQuantity}
                                                                onChangeText={setToolQuantity}
                                                            />
                                                        </View>
                                                        <View style={styles.calculatorField}>
                                                            <Text style={styles.calculatorLabel}>{effectiveTool.rateLabel}</Text>
                                                            <TextInput
                                                                style={styles.calculatorInput}
                                                                placeholder="Ej: 4500"
                                                                keyboardType="decimal-pad"
                                                                value={toolRate}
                                                                    onChangeText={setToolRate}
                                                                />
                                                            </View>
                                                        </View>

                                                        <View style={styles.calculatorTotalRow}>
                                                            <Text style={styles.calculatorTotalLabel}>Total estimado</Text>
                                                            <Text style={styles.calculatorTotalValue}>${formatCurrency(toolTotal)}</Text>
                                                        </View>

                                                        <TouchableOpacity
                                                            style={styles.calculatorAddBtn}
                                                            onPress={handleAddLaborCalculator}
                                                            activeOpacity={0.9}
                                                        >
                                                            <Ionicons name="add-circle" size={20} color="#FFF" />
                                                            <Text style={styles.calculatorAddText}>Agregar a Mano de Obra</Text>
                                                        </TouchableOpacity>
                                                    </View>
                                                )}
                                            </>
                                        )}

                                        <View style={styles.listHeader}>
                                            <Text style={styles.listTitle}>
                                                {activeCategory === 'labor' ? 'Items de mano de obra' : 'Items de materiales'}
                                            </Text>
                                            <Text style={styles.listCount}>
                                                {(activeCategory === 'labor' ? laborCount : materialCount)} items
                                            </Text>
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
                                    </View>
                                </View>
                                {!isWideLayout && renderSummary('stack')}
                            </View>
                            {isWideLayout && (
                                <View style={styles.sideColumn}>
                                    {renderSummary('side')}
                                </View>
                            )}
                        </View>
                        
                        <View style={{ height: 120 }} /> 
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            <View style={styles.footerOverlay}>
                <View style={[styles.footerContent, IS_WEB && contentMaxWidth ? { maxWidth: contentMaxWidth } : null]}>
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
  mainContainer: { flex: 1, backgroundColor: '#EEF2F6' },
  centerWebContainer: { 
    flex: 1, 
    width: '100%', 
    alignSelf: 'center',
  },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 24 },
  scrollContentWeb: { paddingHorizontal: 20 },
  addressWrapper: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
    zIndex: 9999,
    elevation: 30,
    position: 'relative',
    overflow: 'visible',
    gap: 16,
  },
  addressWrapperWeb: {
    paddingHorizontal: 20,
  },
  hero: {
    borderRadius: 20,
    padding: 18,
    minHeight: 170,
    justifyContent: 'space-between',
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  heroCompact: { padding: 14, minHeight: 150 },
  heroGlow: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#F59E0B',
    opacity: 0.18,
    top: -80,
    right: -40,
  },
  heroContent: { gap: 12 },
  heroContentWide: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroLeft: { flex: 1, paddingRight: 16 },
  heroEyebrow: { color: '#FDBA74', fontSize: 11, letterSpacing: 2, fontWeight: '800' },
  heroTitle: { color: '#F8FAFC', fontSize: 22, fontWeight: '800', fontFamily: FONTS.title || 'System', marginTop: 6 },
  heroSubtitle: { color: '#E2E8F0', fontSize: 13, lineHeight: 18, marginTop: 6, fontFamily: FONTS.body || 'System' },
  heroTotalCard: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'flex-start',
  },
  heroTotalLabel: { color: '#E2E8F0', fontSize: 11, fontWeight: '600' },
  heroTotalValue: { color: '#FCD34D', fontSize: 20, fontWeight: '800', marginTop: 4 },
  heroTotalMeta: { color: '#E2E8F0', fontSize: 11, marginTop: 4 },
  heroSteps: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  stepChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(15,23,42,0.3)',
  },
  stepChipActive: { backgroundColor: '#FCD34D', borderColor: '#FCD34D' },
  stepChipText: { fontSize: 11, color: '#E2E8F0', fontWeight: '600' },
  stepChipTextActive: { color: '#0F172A' },

  panel: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  panelHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 },
  panelHeaderLeft: { flex: 1 },
  panelEyebrow: { fontSize: 11, letterSpacing: 1.6, color: '#94A3B8', fontWeight: '700' },
  panelTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A', marginTop: 4, fontFamily: FONTS.title || 'System' },
  panelHint: { fontSize: 12, color: '#64748B', marginTop: 4, fontFamily: FONTS.body || 'System' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' },
  statusBadgeActive: { backgroundColor: '#DCFCE7', borderColor: '#86EFAC' },
  statusBadgeText: { fontSize: 11, fontWeight: '700', color: '#64748B' },
  statusBadgeTextActive: { color: '#15803D' },
  panelCounter: { alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, backgroundColor: '#FFF7ED', borderWidth: 1, borderColor: '#FCD34D' },
  panelCounterLabel: { fontSize: 11, color: '#9A3412', fontWeight: '700' },
  panelCounterValue: { fontSize: 18, color: '#9A3412', fontWeight: '800', marginTop: 2 },

  contentGrid: { gap: 18 },
  contentGridWide: { flexDirection: 'row', alignItems: 'flex-start' },
  mainColumn: { flex: 1, minWidth: 0, gap: 16 },
  sideColumn: { width: 340, flexShrink: 0, gap: 16 },
  
  costsCard: { backgroundColor: '#F8FAFC', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  
  tabsWrapper: { marginBottom: 12 },
  tabsContainer: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 14, padding: 4, borderWidth: 1, borderColor: '#E2E8F0' },
  tab: { flex: 1, flexDirection: 'row', gap: 8, paddingVertical: 10, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  activeTab: { backgroundColor: '#0F172A' },
  tabText: { fontSize: 13, color: '#64748B', fontWeight: '700' },
  activeTabText: { color: '#F8FAFC', fontWeight: '800' },
  tabBadge: { minWidth: 22, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999, backgroundColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' },
  tabBadgeActive: { backgroundColor: '#FCD34D' },
  tabBadgeText: { fontSize: 11, fontWeight: '800', color: '#475569' },
  tabBadgeTextActive: { color: '#0F172A' },

  laborTools: { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 14, overflow: 'hidden' },
  laborToolsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, gap: 12 },
  laborToolsLabel: { fontSize: 13, fontWeight: '700', color: '#0F172A' },
  laborToolsHint: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  laborToolsValue: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F8FAFC', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1, borderColor: '#E2E8F0' },
  laborToolsValueText: { fontSize: 12, color: '#334155', fontWeight: '600', maxWidth: 170 },
  laborToolsMenu: { borderTopWidth: 1, borderTopColor: '#E2E8F0', backgroundColor: '#FFFFFF' },
  laborToolsOption: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  laborToolsOptionText: { fontSize: 13, color: '#1E293B', fontWeight: '600' },

  calculatorCard: { backgroundColor: '#FFF', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 16 },
  calculatorHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  calculatorTitle: { fontSize: 14, fontWeight: '700', color: '#0F172A', marginLeft: 8 },
  customToolRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap', marginBottom: 12 },
  customToolField: { flex: 1, minWidth: 200 },
  customToolInput: { height: 44, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC', paddingHorizontal: 10, fontWeight: '700', color: '#0F172A' },
  customUnitGroup: { minWidth: 120 },
  unitChips: { flexDirection: 'row', gap: 8 },
  unitChip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#FFFFFF' },
  unitChipActive: { backgroundColor: '#0F172A', borderColor: '#0F172A' },
  unitChipText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  unitChipTextActive: { color: '#F8FAFC' },
  calculatorRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  calculatorField: { flex: 1 },
  calculatorLabel: { fontSize: 11, color: '#64748B', marginBottom: 6 },
  calculatorInput: { height: 44, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC', paddingHorizontal: 10, fontWeight: '700', color: '#0F172A' },
  calculatorTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  calculatorTotalLabel: { fontSize: 12, color: '#64748B' },
  calculatorTotalValue: { fontSize: 16, fontWeight: '800', color: COLORS.primary },
  calculatorAddBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 10, backgroundColor: COLORS.primary },
  calculatorAddText: { color: '#FFF', fontWeight: '700' },

  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, marginTop: 4 },
  listTitle: { fontSize: 13, fontWeight: '700', color: '#0F172A' },
  listCount: { fontSize: 12, color: '#94A3B8', fontWeight: '600' },
  listContainer: { marginBottom: 12 },
  itemCard: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderLeftWidth: 4, borderLeftColor: '#F59E0B', borderRadius: 12, padding: 12, marginBottom: 12, shadowColor: '#0F172A', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: {width:0, height:2}, elevation: 2 },
  itemInfo: { flex: 1, paddingRight: 8 },
  itemName: { fontSize: 15, color: '#0F172A', fontWeight: '700', marginBottom: 6 },
  itemMeta: { fontSize: 12, color: '#64748B', fontWeight: '600', marginBottom: 6 },
  quantityControls: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#F8FAFC', alignSelf: 'flex-start', padding: 4, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  qtyBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF', borderRadius: 6, borderWidth: 1 },
  qtyText: { fontSize: 14, fontWeight: '700', color: '#1E293B', minWidth: 20, textAlign: 'center' },

  itemActions: { alignItems: 'flex-end', gap: 8 },
  priceInputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 8, paddingHorizontal: 10, height: 42, borderWidth: 1, borderColor: '#E2E8F0', width: 120, gap: 6 },
  currencySymbol: { color: '#94A3B8', fontWeight: '600' },
  priceInput: { flex: 1, minWidth: 0, fontSize: 15, fontWeight: '700', color: '#1E293B', textAlign: 'right', padding: 0, paddingVertical: 0, height: '100%', textAlignVertical: 'center', backgroundColor: 'transparent', outlineStyle: 'none', outlineWidth: 0, outlineColor: 'transparent', borderWidth: 0, lineHeight: 18 },
  deleteBtn: { padding: 6 },
  
  emptyContainer: { padding: 40, alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed', borderWidth: 2, borderColor: '#E2E8F0', borderRadius: 12, backgroundColor: '#FAFAFA', marginVertical: 10 },
  emptyText: { color: '#64748B', fontSize: 15, marginTop: 12, fontWeight: '600' },
  
  addBlockBtn: { flexDirection: 'row', backgroundColor: '#FFFFFF', padding: 14, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginTop: 12, borderWidth: 1, borderColor: '#FDBA74', borderStyle: 'dashed' },
  addBlockText: { marginLeft: 8, color: '#B45309', fontWeight: '700', fontSize: 14 },

  summaryBox: { marginTop: 16, backgroundColor: '#FFFFFF', padding: 16, borderRadius: 18, borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#0F172A', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  summaryBoxSide: { marginTop: 0 },
  summaryTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  summaryTitle: { fontSize: 15, fontWeight: '800', color: '#0F172A', fontFamily: FONTS.title || 'System' },
  summarySubtitle: { fontSize: 12, color: '#64748B', marginTop: 4, fontFamily: FONTS.body || 'System' },
  summaryStatus: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 999, backgroundColor: '#F1F5F9' },
  summaryStatusActive: { backgroundColor: '#DCFCE7', borderWidth: 1, borderColor: '#86EFAC' },
  summaryStatusText: { fontSize: 11, fontWeight: '700', color: '#64748B' },
  summaryStatusTextActive: { color: '#15803D' },
  summaryLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  summaryLineLabel: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  summaryLineValue: { fontSize: 13, color: '#0F172A', fontWeight: '700' },
  summaryLineHint: { fontSize: 10, color: '#94A3B8', marginTop: 2 },
  summaryToggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },
  summaryToggleLabel: { fontSize: 12, color: '#475569', fontWeight: '600' },
  discountInputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, paddingHorizontal: 8, height: 34 },
  currencyPrefix: { color: COLORS.danger, fontWeight: '700', fontSize: 12, marginRight: 2 },
  discountInput: { minWidth: 60, textAlign: 'right', fontWeight: '700', color: COLORS.danger },
  summaryDivider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 12 },
  summaryTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#0F172A', borderRadius: 12, padding: 12 },
  summaryTotalLabel: { fontSize: 12, fontWeight: '800', color: '#E2E8F0', letterSpacing: 1 },
  summaryTotalValue: { fontSize: 20, fontWeight: '800', color: '#FCD34D' },
  summaryFootnote: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  summaryFootnoteText: { fontSize: 11, color: '#94A3B8', flex: 1 },

  footerOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#0F172A', borderTopWidth: 1, borderTopColor: '#1F2937', padding: 16, paddingBottom: Platform.OS === 'ios' ? 24 : 16, elevation: 20, shadowColor: "#000", shadowOffset: {width:0, height:-4}, shadowOpacity: 0.2 },
  footerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', alignSelf: 'center', width: '100%' },
  footerInfo: { flexDirection: 'column' },
  footerTotalLabel: { fontSize: 12, color: '#94A3B8', fontWeight: '600' },
  footerTotalValue: { fontSize: 20, color: '#F8FAFC', fontWeight: '800' },
  mainBtn: { flexDirection: 'row', backgroundColor: COLORS.primary, paddingVertical: 14, paddingHorizontal: 24, borderRadius: 999, alignItems: 'center', gap: 8, shadowColor: COLORS.primary, shadowOffset: {width:0, height:4}, shadowOpacity: 0.3, elevation: 4 },
  mainBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' }
});
