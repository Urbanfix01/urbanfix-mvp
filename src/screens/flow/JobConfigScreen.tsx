import React, { useEffect, useState } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, 
  TextInput, KeyboardAvoidingView, Platform, ScrollView, Alert 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';

// --- COMPONENTES ---
import { ScreenHeader } from '../../components/molecules/ScreenHeader';
import ItemSelector from '../../components/organisms/ItemSelector';

// 1. Componente Móvil (Nativo)
import { LocationAutocomplete } from '../../components/molecules/LocationAutocomplete'; 

// 2. Componente Web (NUEVO: Solución Google Maps 2025)
import { WebGoogleMaps } from '../../components/molecules/WebGoogleMaps'; 

// Utils y Hooks
import { COLORS, FONTS } from '../../utils/theme';
import { useJobCalculator } from '../../hooks/useJobCalculator';
import { ServiceBlueprint } from '../../types/database';
import { supabase } from '../../lib/supabase';
import { createQuote } from '../../api/quotes'; 

export default function JobConfigScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const params = route.params as { blueprint?: ServiceBlueprint, quote?: any };
  const { blueprint, quote } = params || {};

  // Hook de lógica de negocio
  const { 
    items, totals, addItem,
    clientName, setClientName, clientAddress, setClientAddress,
    scheduledDate, applyTax
  } = useJobCalculator([]);
  
  // Estados locales
  const [isSaving, setIsSaving] = useState(false); 
  const [isSelectorOpen, setSelectorOpen] = useState(false);
  const [location, setLocation] = useState({ lat: 0, lng: 0 });

  const isEditMode = !!quote;
  const isWeb = Platform.OS === 'web';

  // 1. CARGA INICIAL (Modo Edición)
  useEffect(() => {
    if (isEditMode && quote) {
      if (quote.client_name) setClientName(quote.client_name);
      if (quote.client_address) setClientAddress(quote.client_address);
      if (quote.location_lat) setLocation({ lat: quote.location_lat, lng: quote.location_lng });
    }
  }, [blueprint, quote]);

  // 2. MANEJO DE SELECCIÓN DE UBICACIÓN (Callback unificado)
  const handleLocationSelect = (data: { address: string, lat: number, lng: number }) => {
    console.log(`📍 Ubicación seleccionada:`, data);
    setClientAddress(data.address);
    setLocation({ lat: data.lat, lng: data.lng });
  };

  // 3. GUARDAR Y CONTINUAR
  const proceedToNextStep = async () => {
    if (!clientName.trim()) {
        const msg = "Por favor ingresa el nombre del cliente.";
        isWeb ? alert(msg) : Alert.alert("Falta información", msg);
        return;
    }

    try {
        setIsSaving(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("No hay sesión activa");

        let targetQuoteId = '';
        let dateString = scheduledDate ? scheduledDate.toISOString().split('T')[0] : null;

        const quoteData = {
            total_amount: totals.total,
            status: 'draft',
            tax_rate: applyTax ? 0.21 : 0,
            client_name: clientName,
            client_address: clientAddress,
            scheduled_date: dateString,
            location_lat: location.lat !== 0 ? location.lat : null,
            location_lng: location.lng !== 0 ? location.lng : null
        };

        if (isEditMode) {
            await supabase.from('quotes').update(quoteData).eq('id', quote.id);
            // En edición simple, limpiamos items viejos para reescribir
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
                await supabase.from('quotes').update(quoteData).eq('id', targetQuoteId);
            }
        }

        // Guardamos los ítems
        const newItems = items.filter(i => i.isActive).map(i => ({
            quote_id: targetQuoteId, 
            description: i.name, 
            unit_price: i.price, 
            quantity: i.quantity
        }));

        if (newItems.length > 0) {
            await supabase.from('quote_items').insert(newItems);
        }

        // Navegación
        // @ts-ignore
        navigation.navigate('ItemSelectorScreen'); 

    } catch (e: any) {
        console.error(e);
        const msg = e.message || "Intenta nuevamente";
        isWeb ? alert(msg) : Alert.alert("Error al guardar", msg);
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScreenHeader title="Nuevo Trabajo" subtitle="Datos del cliente" showBack />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        
        {/* INPUT: NOMBRE DEL CLIENTE */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>NOMBRE DEL CLIENTE</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="person-outline" size={20} color={COLORS.primary} style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Ej: Juan Pérez"
              value={clientName}
              onChangeText={setClientName}
            />
          </View>
        </View>

        {/* INPUT: DIRECCIÓN (Lógica Híbrida Web/Móvil) */}
        <View style={{ marginBottom: 25, zIndex: 9999 }}> 
          
          {isWeb ? (
             // --- VERSIÓN WEB: Usa el nuevo componente WebGoogleMaps ---
             <View style={styles.formGroup}>
                <Text style={styles.label}>DIRECCIÓN DE LA OBRA</Text>
                {/* Contenedor sin bordes extras, el WebComponent se encarga del estilo */}
                <View style={{ marginTop: 4, height: 55, zIndex: 9999 }}>
                   <WebGoogleMaps
                       // Usamos la clave restringida para Web (EXPO_PUBLIC_WEB_API_KEY)
                       apiKey={process.env.EXPO_PUBLIC_WEB_API_KEY!} 
                       initialValue={clientAddress}
                       onPlaceSelected={handleLocationSelect}
                   />
                </View>
             </View>
          ) : (
             // --- VERSIÓN MÓVIL: Usa el componente nativo ---
             <LocationAutocomplete 
                initialValue={clientAddress}
                onLocationSelect={handleLocationSelect}
                // Usamos la clave restringida para Android (EXPO_PUBLIC_ANDROID_API_KEY)
                apiKey={process.env.EXPO_PUBLIC_ANDROID_API_KEY} 
             />
          )}
        </View>

        {/* INPUT: FECHA ESTIMADA */}
        <View style={styles.formGroup}>
           <Text style={styles.label}>FECHA ESTIMADA</Text>
           <View style={styles.inputWrapper}>
             <Ionicons name="calendar-outline" size={20} color={COLORS.primary} style={styles.icon} />
             <TextInput 
                value={scheduledDate ? new Date(scheduledDate).toLocaleDateString() : 'Hoy'} 
                editable={false} 
                style={{ color: COLORS.text }}
             />
           </View>
        </View>

      </ScrollView>

      {/* FOOTER: BOTÓN CONTINUAR */}
      <View style={styles.footer}>
        <TouchableOpacity 
            style={[styles.btnNext, isSaving && { opacity: 0.7 }]} 
            onPress={proceedToNextStep}
            disabled={isSaving}
        >
          <Text style={styles.btnText}>{isSaving ? "GUARDANDO..." : "CONTINUAR"}</Text>
          {!isSaving && <Ionicons name="arrow-forward" size={20} color="#FFF" />}
        </TouchableOpacity>
      </View>

      {/* MODAL: SELECTOR DE ÍTEMS (Si se usa en este paso) */}
      <ItemSelector visible={isSelectorOpen} onClose={() => setSelectorOpen(false)} onSelect={addItem} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 20, paddingBottom: 100 },
  formGroup: { marginBottom: 25 },
  label: { fontFamily: FONTS.subtitle, fontSize: 12, color: COLORS.textLight, marginBottom: 8 },
  inputWrapper: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#FFF', 
    borderRadius: 12, 
    borderWidth: 1, 
    borderColor: '#E5E7EB', 
    paddingHorizontal: 15, 
    height: 55 
  },
  icon: { marginRight: 10 },
  input: { flex: 1, fontFamily: FONTS.body, fontSize: 16, color: COLORS.text },
  footer: { padding: 20, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  btnNext: { 
    backgroundColor: COLORS.primary, 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 16, 
    borderRadius: 12 
  },
  btnText: { color: '#FFF', fontFamily: FONTS.title, fontSize: 16, marginRight: 8 }
});