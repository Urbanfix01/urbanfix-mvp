import React, { useEffect, useState } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, 
  TextInput, KeyboardAvoidingView, Platform, ScrollView, Alert // <--- ¡AQUÍ ESTABA EL FALTANTE!
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';

// Librerías de Mapas
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete'; // Móvil
import Autocomplete from 'react-google-autocomplete'; // Web

import { COLORS, FONTS } from '../../utils/theme';
import { useJobCalculator, JobItem } from '../../hooks/useJobCalculator';
import { ServiceBlueprint } from '../../types/database';
import { supabase } from '../../lib/supabase';
import { createQuote } from '../../api/quotes'; 
import ItemSelector from '../../components/organisms/ItemSelector';
import { ScreenHeader } from '../../components/molecules/ScreenHeader';

// 🔑 TU API KEY
const GOOGLE_API_KEY = 'AIzaSyCbb5w8l4ZI-lUsFWR5F0WYFHxidSbFzVQar';

export default function JobConfigScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const params = route.params as { blueprint?: ServiceBlueprint, quote?: any };
  const { blueprint, quote } = params || {};

  const { 
    items, setItems, totals, addItem,
    clientName, setClientName, clientAddress, setClientAddress,
    scheduledDate, setScheduledDate, applyTax, setApplyTax
  } = useJobCalculator([]);
  
  const [isSaving, setIsSaving] = useState(false); 
  const [isSelectorOpen, setSelectorOpen] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [location, setLocation] = useState({ lat: 0, lng: 0 });

  const isEditMode = !!quote;
  const isWeb = Platform.OS === 'web';

  // 1. CARGA INICIAL
  useEffect(() => {
    if (isEditMode && quote) {
      // ... (Lógica de carga de edición igual que antes) ...
      // Simplificado para brevedad, asumo que mantienes tu lógica aquí o la del anterior
      if (quote.client_name) setClientName(quote.client_name);
      if (quote.client_address) setClientAddress(quote.client_address);
      if (quote.location_lat) setLocation({ lat: quote.location_lat, lng: quote.location_lng });
      // ...
    }
  }, [blueprint, quote]);

  // 2. GUARDAR
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

        const newItems = items.filter(i => i.isActive).map(i => ({
            quote_id: targetQuoteId, 
            description: i.name, 
            unit_price: i.price, 
            quantity: i.quantity
        }));

        if (newItems.length > 0) {
            await supabase.from('quote_items').insert(newItems);
        }

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
        
        {/* NOMBRE CLIENTE */}
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

        {/* DIRECCIÓN (HÍBRIDO) */}
        <View style={[styles.formGroup, { zIndex: 9999 }]}> 
          <Text style={styles.label}>DIRECCIÓN DE LA OBRA</Text>
          
          {isWeb ? (
             // --- VERSIÓN WEB ---
             <View style={styles.inputWrapper}>
                <Ionicons name="location-outline" size={20} color={COLORS.primary} style={styles.icon} />
                <Autocomplete
                    apiKey={GOOGLE_API_KEY}
                    onPlaceSelected={(place) => {
                        if (place) {
                            setClientAddress(place.formatted_address);
                            if (place.geometry && place.geometry.location) {
                                const lat = place.geometry.location.lat();
                                const lng = place.geometry.location.lng();
                                setLocation({ lat, lng });
                            }
                        }
                    }}
                    options={{
                        types: ['address'],
                        componentRestrictions: { country: "ar" },
                    }}
                    defaultValue={clientAddress}
                    onChange={(e: any) => setClientAddress(e.target.value)}
                    placeholder="Escribe la dirección..."
                    style={{
                        flex: 1,
                        height: '100%',
                        border: 'none',
                        outline: 'none',
                        fontSize: '16px',
                        fontFamily: 'inherit',
                        color: COLORS.text,
                        backgroundColor: 'transparent'
                    }}
                />
             </View>
          ) : (
             // --- VERSIÓN MÓVIL ---
             <View style={styles.googleContainer}>
                <View style={styles.googleIconContainer}>
                    <Ionicons name="location-outline" size={20} color={COLORS.primary} />
                </View>
                <GooglePlacesAutocomplete
                  placeholder='Buscar calle y altura...'
                  onPress={(data, details = null) => {
                    const description = data.description;
                    const lat = details?.geometry?.location.lat || 0;
                    const lng = details?.geometry?.location.lng || 0;
                    setClientAddress(description);
                    setLocation({ lat, lng });
                  }}
                  query={{
                    key: GOOGLE_API_KEY,
                    language: 'es',
                    components: 'country:ar',
                  }}
                  fetchDetails={true}
                  enablePoweredByContainer={false}
                  textInputProps={{
                      value: clientAddress,
                      onChangeText: setClientAddress,
                      placeholderTextColor: '#999',
                  }}
                  styles={{
                    container: { flex: 1 },
                    textInputContainer: { backgroundColor: 'transparent', borderTopWidth: 0, height: 50 },
                    textInput: { height: 45, color: '#000', fontSize: 16, marginTop: 4 },
                    listView: { position: 'absolute', top: 55, width: '100%', backgroundColor: 'white', borderRadius: 8, elevation: 10, zIndex: 9999 },
                  }}
                />
             </View>
          )}
        </View>

        {/* Fecha (Simplificado) */}
        <View style={styles.formGroup}>
           <Text style={styles.label}>FECHA ESTIMADA</Text>
           <View style={styles.inputWrapper}>
             <Ionicons name="calendar-outline" size={20} color={COLORS.primary} style={styles.icon} />
             <TextInput value={scheduledDate ? new Date(scheduledDate).toLocaleDateString() : 'Hoy'} editable={false} />
           </View>
        </View>

      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.btnNext} onPress={proceedToNextStep}>
          <Text style={styles.btnText}>CONTINUAR</Text>
          <Ionicons name="arrow-forward" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>

      <ItemSelector visible={isSelectorOpen} onClose={() => setSelectorOpen(false)} onSelect={addItem} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 20 },
  formGroup: { marginBottom: 25 },
  label: { fontFamily: FONTS.subtitle, fontSize: 12, color: COLORS.textLight, marginBottom: 8 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 15, height: 55 },
  googleContainer: { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 10, zIndex: 9999 },
  googleIconContainer: { justifyContent: 'center', marginRight: 5, marginTop: 15 },
  icon: { marginRight: 10 },
  input: { flex: 1, fontFamily: FONTS.body, fontSize: 16, color: COLORS.text },
  footer: { padding: 20, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  btnNext: { backgroundColor: COLORS.primary, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 16, borderRadius: 12 },
  btnText: { color: '#FFF', fontFamily: FONTS.title, fontSize: 16, marginRight: 8 }
});