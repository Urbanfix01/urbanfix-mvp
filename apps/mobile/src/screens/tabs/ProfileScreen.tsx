import React, { useState, useCallback, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, ScrollView, 
  ActivityIndicator, Alert, Image, Platform, RefreshControl, TextInput, KeyboardAvoidingView 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native'; 
import * as ImagePicker from 'expo-image-picker';

// --- IMPORTS DEL PROYECTO ---
import { supabase } from '../../lib/supabase';
import { COLORS, FONTS } from '../../utils/theme';
import { ScreenHeader } from '../../components/molecules/ScreenHeader';
import { uploadImageToSupabase } from '../../services/StorageService';

// --- COMPONENTES DE MAPAS ---
import { LocationAutocomplete } from '../../components/molecules/LocationAutocomplete';
import { WebGoogleMaps } from '../../components/molecules/WebGoogleMaps';

// --- DEFINICIÓN DE TIPOS CORREGIDA ---
// Ahora permitimos '| null' en los campos opcionales para evitar el error de TypeScript
interface Profile {
  id: string;
  full_name: string | null;
  business_name: string | null;
  company_logo_url: string | null;
  avatar_url: string | null;
  email?: string;
  phone?: string | null;
  company_address?: string | null;
  default_discount?: number | null;
  location_lat?: number | null;
  location_lng?: number | null;
}

export default function ProfileScreen() {
  const navigation = useNavigation();
  const isWeb = Platform.OS === 'web';
  
  // Estados de UI
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [uploadingImage, setUploadingImage] = useState<'logo' | 'avatar' | null>(null);
  
  // Estados de Datos (Formulario)
  const [profile, setProfile] = useState<Profile | null>(null);
  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [defaultDiscount, setDefaultDiscount] = useState('');
  const [location, setLocation] = useState({ lat: 0, lng: 0 });

  // --- 1. LÓGICA DE CARGA DE DATOS ---
  const getProfile = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user');

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      const userProfile: Profile = { ...data, email: user.email };
      setProfile(userProfile);

      // Rellenar formulario local
      setBusinessName(userProfile.business_name || '');
      setPhone(userProfile.phone || '');
      setAddress(userProfile.company_address || '');
      setDefaultDiscount(userProfile.default_discount !== null && userProfile.default_discount !== undefined ? String(userProfile.default_discount) : '');
      if (userProfile.location_lat && userProfile.location_lng) {
        setLocation({ lat: userProfile.location_lat, lng: userProfile.location_lng });
      }

    } catch (error) {
      console.log('Error perfil:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => { 
        getProfile(!!profile); 
    }, [])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    getProfile(true);
  }, []);

  // --- 2. LÓGICA DE SUBIDA DE IMÁGENES ---
  const handleImagePick = async (type: 'logo' | 'avatar') => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: type === 'logo' ? [16, 9] : [1, 1],
        quality: 0.7,
      });

      if (result.canceled) return;

      setUploadingImage(type);
      const localUri = result.assets[0].uri;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sesión no válida");

      const fileName = `${type}_${Date.now()}.png`; 
      const publicUrl = await uploadImageToSupabase(localUri, user.id, fileName);

      if (!publicUrl) throw new Error("No se pudo obtener la URL pública");

      const column = type === 'logo' ? 'company_logo_url' : 'avatar_url';
      
      const { error: dbError } = await supabase
        .from('profiles')
        .update({ [column]: publicUrl })
        .eq('id', user.id);

      if (dbError) throw dbError;

      // Optimistic update
      setProfile(prev => prev ? ({ ...prev, [column]: publicUrl }) : null);

    } catch (error) {
      console.error(error);
      Alert.alert("Error", "No se pudo subir la imagen.");
    } finally {
      setUploadingImage(null);
    }
  };

  // --- 3. LÓGICA DE GUARDADO DE DATOS Y MAPA ---
  const handleLocationSelect = (data: { address: string, lat: number, lng: number }) => {
    console.log("📍 Base operativa seleccionada:", data);
    setAddress(data.address);
    setLocation({ lat: data.lat, lng: data.lng });
  };

  const saveProfileData = async () => {
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user');

      const updates = {
        business_name: businessName,
        phone: phone,
        company_address: address, 
        default_discount: parsePercent(defaultDiscount),
        location_lat: location.lat !== 0 ? location.lat : null,
        location_lng: location.lng !== 0 ? location.lng : null,
        updated_at: new Date(),
      };

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;

      // Actualizar estado local del perfil
      // TypeScript ahora estará feliz porque Profile acepta null en lat/lng
      setProfile(prev => prev ? ({ ...prev, ...updates }) : null);

      const msg = "Perfil actualizado correctamente";
      isWeb ? alert(msg) : Alert.alert("Éxito", msg);

    } catch (error: any) {
      console.error(error);
      const msg = error.message || "Error al actualizar";
      isWeb ? alert(msg) : Alert.alert("Error", msg);
    } finally {
      setSaving(false);
    }
  };

  // --- 4. HELPERS ---
  const handleLogout = async () => {
    const performLogout = async () => {
        try { await supabase.auth.signOut(); } 
        catch (error) { console.error("Error saliendo:", error); }
    };
    if (Platform.OS === 'web') {
        if (window.confirm("¿Cerrar sesión?")) await performLogout();
    } else {
        Alert.alert("Cerrar Sesión", "¿Seguro?", [
            { text: "Cancelar", style: "cancel" },
            { text: "Salir", style: "destructive", onPress: performLogout }
        ]);
    }
  };

  const getInitials = (name?: string | null) => {
    if (!name) return 'UF';
    return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
  };

  const isValidUrl = (url?: string | null) => !!url && url.startsWith('http');

  const parsePercent = (value: string) => {
    const cleaned = (value || '').replace(',', '.').replace(/[^\d.]/g, '');
    const parsed = Number(cleaned);
    if (!Number.isFinite(parsed)) return 0;
    return Math.min(100, Math.max(0, parsed));
  };

  // --- RENDER ---
  if (loading && !profile) return <View style={[styles.container, styles.center]}><ActivityIndicator color={COLORS.primary} /></View>;

  const MenuOption = ({ icon, label, onPress, isNew }: any) => (
    <TouchableOpacity style={styles.menuOption} onPress={onPress}>
      <View style={styles.menuLeft}>
        <View style={styles.iconBox}><Ionicons name={icon} size={22} color={COLORS.primary} /></View>
        <Text style={styles.menuText}>{label}</Text>
        {isNew && <View style={styles.badge}><Text style={styles.badgeText}>NUEVO</Text></View>}
      </View>
      <Ionicons name="chevron-forward" size={20} color="#CCC" />
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScreenHeader title="Mi Perfil" subtitle="Configuración y cuenta" />

      <ScrollView 
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        keyboardShouldPersistTaps="handled"
      >
        
        {/* === SECCIÓN 1: IMÁGENES === */}
        <View style={styles.brandCard}>
          {/* Banner */}
          <TouchableOpacity 
            style={styles.brandBanner} 
            onPress={() => handleImagePick('logo')}
            disabled={uploadingImage !== null}
            activeOpacity={0.9}
          >
            {uploadingImage === 'logo' ? (
               <ActivityIndicator color={COLORS.primary} size="large" />
            ) : isValidUrl(profile?.company_logo_url) ? (
              <Image source={{ uri: profile?.company_logo_url! }} style={styles.bannerImage} resizeMode="contain" />
            ) : (
              <View style={styles.bannerPlaceholder}>
                <Ionicons name="business" size={40} color="rgba(0,0,0,0.1)" />
                <Text style={styles.placeholderText}>Toca para subir Logo</Text>
              </View>
            )}
            {uploadingImage !== 'logo' && (
                <View style={styles.editIconBanner}><Ionicons name="pencil" size={12} color="#FFF" /></View>
            )}
          </TouchableOpacity>

          <View style={styles.brandContent}>
            {/* Avatar */}
            <TouchableOpacity 
                style={styles.avatarContainer}
                onPress={() => handleImagePick('avatar')}
                disabled={uploadingImage !== null}
                activeOpacity={0.9}
            >
              {uploadingImage === 'avatar' ? (
                <View style={[styles.avatarImage, styles.center]}><ActivityIndicator color={COLORS.primary} /></View>
              ) : isValidUrl(profile?.avatar_url) ? (
                <Image source={{ uri: profile?.avatar_url! }} style={styles.avatarImage} />
              ) : (
                <View style={[styles.avatarImage, styles.avatarPlaceholder]}>
                  <Text style={styles.avatarText}>{getInitials(profile?.full_name)}</Text>
                </View>
              )}
              {uploadingImage !== 'avatar' && (
                  <View style={styles.editIconAvatar}><Ionicons name="camera" size={14} color="#FFF" /></View>
              )}
            </TouchableOpacity>
            
            <View style={styles.brandInfo}>
              <Text style={styles.businessName}>{businessName || 'Tu Empresa Aquí'}</Text>
              <Text style={styles.personName}>{profile?.full_name || 'Nombre del Técnico'}</Text>
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={14} color="#FFF" />
                <Text style={styles.verifiedText}>Técnico Verificado</Text>
              </View>
            </View>
          </View>
        </View>

        {/* === SECCIÓN 2: DATOS EDITABLES === */}
        <Text style={styles.sectionTitle}>Datos de la Empresa</Text>
        <View style={styles.formContainer}>
            
            {/* Input Nombre Empresa */}
            <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>NOMBRE COMERCIAL</Text>
                <TextInput 
                    style={styles.inputField} 
                    value={businessName} 
                    onChangeText={setBusinessName}
                    placeholder="Ej: FixIt Soluciones"
                />
            </View>

            {/* Input Teléfono */}
            <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>TELÉFONO / WHATSAPP</Text>
                <TextInput 
                    style={styles.inputField} 
                    value={phone} 
                    onChangeText={setPhone}
                    placeholder="+54 9 11..."
                    keyboardType="phone-pad"
                />
            </View>

            {/* Descuento por defecto */}
            <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>DESCUENTO POR DEFECTO (%)</Text>
                <TextInput
                    style={styles.inputField}
                    value={defaultDiscount}
                    onChangeText={setDefaultDiscount}
                    placeholder="0"
                    keyboardType="numeric"
                />
            </View>

            {/* Selector de Mapa (Base Operativa) */}
            <View style={[styles.inputGroup, { zIndex: 100 }]}>
                <Text style={styles.inputLabel}>BASE OPERATIVA</Text>
                <View style={{ marginTop: 5, height: 60, zIndex: 100 }}>
                    {isWeb ? (
                        process.env.EXPO_PUBLIC_WEB_API_KEY ? (
                            <WebGoogleMaps
                                apiKey={process.env.EXPO_PUBLIC_WEB_API_KEY} 
                                initialValue={address}
                                onPlaceSelected={handleLocationSelect}
                            />
                        ) : <Text style={{color:'red'}}>Falta API Key Web</Text>
                    ) : (
                        <LocationAutocomplete 
                            initialValue={address}
                            onLocationSelect={handleLocationSelect}
                            apiKey={process.env.EXPO_PUBLIC_ANDROID_API_KEY} 
                        />
                    )}
                </View>
            </View>

            {/* Botón Guardar Cambios de Texto */}
            <TouchableOpacity 
                style={[styles.saveButton, saving && { opacity: 0.7 }]} 
                onPress={saveProfileData}
                disabled={saving}
            >
                {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveButtonText}>GUARDAR DATOS</Text>}
            </TouchableOpacity>
        </View>


        {/* === SECCIÓN 3: HERRAMIENTAS === */}
        <Text style={styles.sectionTitle}>Herramientas</Text>
        <View style={styles.menuContainer}>
          <MenuOption
            icon="calculator-outline"
            label="Configurar Precios"
            onPress={() => {
              // @ts-ignore
              navigation.navigate('Catálogo');
            }}
          />
          <MenuOption
            icon="chatbubble-ellipses-outline"
            label="Soporte"
            onPress={() => {
              // @ts-ignore
              navigation.navigate('Support');
            }}
          />
          <MenuOption
            icon="card-outline"
            label="Suscripcion"
            onPress={() => {
              // @ts-ignore
              navigation.navigate('Subscription');
            }}
          />
          <MenuOption 
            icon="document-text-outline" 
            label="Historial Completo" 
            onPress={() => {
               // @ts-ignore
               navigation.navigate('History');
            }} 
          />
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color={COLORS.danger} />
            <Text style={styles.logoutText}>Cerrar Sesión</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>UrbanFix App v1.2.0</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { justifyContent: 'center', alignItems: 'center' },
  content: { padding: 20, paddingBottom: 50 },

  // --- BRAND CARD ---
  brandCard: { backgroundColor: '#FFF', borderRadius: 16, overflow: 'hidden', marginBottom: 24, shadowColor: '#000', shadowOffset: {width:0, height:4}, shadowOpacity:0.1, elevation: 4 },
  brandBanner: { height: 120, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  bannerImage: { width: '80%', height: '80%' },
  bannerPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB', width: '100%' },
  placeholderText: { fontSize: 10, color: '#CCC', marginTop: 4, fontFamily: FONTS.subtitle },
  editIconBanner: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.3)', padding: 6, borderRadius: 20 },
  brandContent: { alignItems: 'center', paddingBottom: 24, marginTop: -50 },
  avatarContainer: { marginBottom: 12, shadowColor: "#000", shadowOffset: {width:0, height:4}, shadowOpacity:0.2, elevation: 5, position: 'relative' },
  avatarImage: { width: 100, height: 100, borderRadius: 50, borderWidth: 4, borderColor: '#FFF', backgroundColor: '#FFF' },
  avatarPlaceholder: { backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 32, fontFamily: FONTS.title, color: '#FFF' },
  editIconAvatar: { position: 'absolute', bottom: 0, right: 0, backgroundColor: COLORS.primary, padding: 6, borderRadius: 20, borderWidth: 2, borderColor: '#FFF' },
  brandInfo: { alignItems: 'center' },
  businessName: { fontFamily: FONTS.title, fontSize: 20, color: COLORS.text, marginBottom: 4, textAlign: 'center' },
  personName: { fontFamily: FONTS.body, fontSize: 14, color: COLORS.textLight, marginBottom: 8 },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.success, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  verifiedText: { fontSize: 10, color: '#FFF', marginLeft: 4, fontFamily: FONTS.subtitle },

  // --- FORMULARIO ---
  formContainer: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 24, shadowColor: '#000', shadowOpacity: 0.03, elevation: 1 },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 10, fontFamily: FONTS.subtitle, color: COLORS.textLight, marginBottom: 6, letterSpacing: 0.5 },
  inputField: { backgroundColor: '#F9FAFB', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#E5E7EB', fontSize: 14, fontFamily: FONTS.body, color: COLORS.text },
  saveButton: { backgroundColor: COLORS.primary, padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  saveButtonText: { color: '#FFF', fontFamily: FONTS.title, fontSize: 14 },

  // --- MENU ---
  sectionTitle: { fontFamily: FONTS.subtitle, fontSize: 12, color: COLORS.textLight, marginBottom: 8, marginLeft: 4, letterSpacing: 1 },
  menuContainer: { backgroundColor: '#FFF', borderRadius: 12, overflow: 'hidden', marginBottom: 24, shadowColor: '#000', shadowOpacity: 0.03, elevation: 1 },
  menuOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  menuLeft: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { marginRight: 12, width: 24, alignItems: 'center' },
  menuText: { fontSize: 14, fontFamily: FONTS.body, color: COLORS.text },
  badge: { backgroundColor: COLORS.primary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 8 },
  badgeText: { fontSize: 8, fontFamily: FONTS.title, color: '#FFF' },

  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FEF2F2', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#FEE2E2' },
  logoutText: { marginLeft: 8, fontSize: 14, fontFamily: FONTS.subtitle, color: COLORS.danger },
  versionText: { textAlign: 'center', marginTop: 24, color: '#CCC', fontFamily: FONTS.body, fontSize: 10 }
});
