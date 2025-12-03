import React, { useState, useCallback } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, ScrollView, 
  ActivityIndicator, Alert, Image, Platform, RefreshControl 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native'; 
import * as ImagePicker from 'expo-image-picker'; // IMPORTANTE: Asegúrate de tener instalado expo-image-picker

// --- IMPORTS DEL PROYECTO ---
import { supabase } from '../../lib/supabase';
import { COLORS, FONTS } from '../../utils/theme';
import { ScreenHeader } from '../../components/molecules/ScreenHeader';
import { uploadImageToSupabase } from '../../services/StorageService'; // <--- RUTA CORREGIDA

// --- DEFINICIÓN DE TIPOS (Para evitar 'any') ---
interface Profile {
  id: string;
  full_name: string | null;
  business_name: string | null;
  company_logo_url: string | null;
  avatar_url: string | null;
  email?: string;
}

export default function ProfileScreen() {
  const navigation = useNavigation();
  
  // Estados
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploadingImage, setUploadingImage] = useState<'logo' | 'avatar' | null>(null); // Nuevo estado para feedback de subida
  const [profile, setProfile] = useState<Profile | null>(null);

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
      
      setProfile({ ...data, email: user.email });

    } catch (error) {
      console.log('Error perfil:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => { 
        // Carga inicial solo si no tenemos perfil para evitar parpadeos
        getProfile(!!profile); 
    }, [])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    getProfile(true);
  }, []);

  // --- 2. LÓGICA DE SUBIDA DE IMÁGENES (NUEVO) ---
  const handleImagePick = async (type: 'logo' | 'avatar') => {
    try {
      // A. Abrir Galería
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: type === 'logo' ? [16, 9] : [1, 1], // Banner rectangular, Avatar cuadrado
        quality: 0.7, // Compresión para optimizar red
      });

      if (result.canceled) return;

      setUploadingImage(type); // Activar spinner
      
      const localUri = result.assets[0].uri;
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error("Sesión no válida");

      // B. Subir a Storage
      // Nombre único: tipo_timestamp.png
      const fileName = `${type}_${Date.now()}.png`; 
      const publicUrl = await uploadImageToSupabase(localUri, user.id, fileName);

      if (!publicUrl) throw new Error("No se pudo obtener la URL pública");

      // C. Actualizar Base de Datos
      const column = type === 'logo' ? 'company_logo_url' : 'avatar_url';
      
      const { error: dbError } = await supabase
        .from('profiles')
        .update({ [column]: publicUrl })
        .eq('id', user.id);

      if (dbError) throw dbError;

      // D. Actualizar UI Local (Optimistic update)
      setProfile(prev => prev ? ({ ...prev, [column]: publicUrl }) : null);
      
      // Opcional: Feedback sutil
      // Alert.alert("Éxito", "Imagen actualizada"); 

    } catch (error) {
      console.error(error);
      Alert.alert("Error", "No se pudo subir la imagen. Verifica tu conexión.");
    } finally {
      setUploadingImage(null); // Desactivar spinner
    }
  };

  // --- 3. HELPERS ---
  const handleLogout = async () => {
    const performLogout = async () => {
        try { await supabase.auth.signOut(); } 
        catch (error) { console.error("Error saliendo:", error); }
    };

    if (Platform.OS === 'web') {
        if (window.confirm("¿Estás seguro que quieres cerrar sesión?")) await performLogout();
    } else {
        Alert.alert("Cerrar Sesión", "¿Seguro?", [
            { text: "Cancelar", style: "cancel" },
            { text: "Salir", style: "destructive", onPress: performLogout }
        ]);
    }
  };

  // Helpers robustos (aceptan undefined)
  const getInitials = (name?: string | null) => {
    if (!name) return 'UF';
    return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
  };

  const isValidUrl = (url?: string | null) => {
      return !!url && url.startsWith('http');
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
    <View style={styles.container}>
      <ScreenHeader title="Mi Perfil" subtitle="Configuración y cuenta" />

      <ScrollView 
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        
        {/* BRAND CARD */}
        <View style={styles.brandCard}>
          
          {/* BANNER / LOGO (Ahora es Touchable) */}
          <TouchableOpacity 
            style={styles.brandBanner} 
            onPress={() => handleImagePick('logo')}
            disabled={uploadingImage !== null} // Bloquear toques mientras sube
            activeOpacity={0.9}
          >
            {uploadingImage === 'logo' ? (
               <ActivityIndicator color={COLORS.primary} size="large" />
            ) : isValidUrl(profile?.company_logo_url) ? (
              <Image 
                source={{ uri: profile?.company_logo_url! }} 
                style={styles.bannerImage} 
                resizeMode="contain" 
              />
            ) : (
              <View style={styles.bannerPlaceholder}>
                <Ionicons name="business" size={40} color="rgba(0,0,0,0.1)" />
                <Text style={styles.placeholderText}>Toca para subir Logo</Text>
              </View>
            )}
            
            {/* Overlay Edit Icon */}
            {uploadingImage !== 'logo' && (
                <View style={styles.editIconBanner}>
                    <Ionicons name="pencil" size={12} color="#FFF" />
                </View>
            )}
          </TouchableOpacity>

          <View style={styles.brandContent}>
            
            {/* AVATAR (Ahora es Touchable) */}
            <TouchableOpacity 
                style={styles.avatarContainer}
                onPress={() => handleImagePick('avatar')}
                disabled={uploadingImage !== null}
                activeOpacity={0.9}
            >
              {uploadingImage === 'avatar' ? (
                <View style={[styles.avatarImage, styles.center]}>
                     <ActivityIndicator color={COLORS.primary} />
                </View>
              ) : isValidUrl(profile?.avatar_url) ? (
                <Image source={{ uri: profile?.avatar_url! }} style={styles.avatarImage} />
              ) : (
                <View style={[styles.avatarImage, styles.avatarPlaceholder]}>
                  <Text style={styles.avatarText}>{getInitials(profile?.full_name)}</Text>
                </View>
              )}
              
              {/* Overlay Edit Icon */}
              {uploadingImage !== 'avatar' && (
                  <View style={styles.editIconAvatar}>
                      <Ionicons name="camera" size={14} color="#FFF" />
                  </View>
              )}
            </TouchableOpacity>
            
            <View style={styles.brandInfo}>
              <Text style={styles.businessName}>
                {profile?.business_name || 'Tu Empresa Aquí'}
              </Text>
              <Text style={styles.personName}>{profile?.full_name || 'Nombre del Técnico'}</Text>
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={14} color="#FFF" />
                <Text style={styles.verifiedText}>Técnico Verificado</Text>
              </View>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Cuenta</Text>
        <View style={styles.menuContainer}>
          <MenuOption 
            icon="person-outline" 
            label="Editar Datos de Texto" 
            onPress={() => {
               // @ts-ignore
               navigation.navigate('MarcaScreen'); 
            }} 
          />
          <MenuOption icon="briefcase-outline" label="Suscripción" onPress={() => {}} />
        </View>

        <Text style={styles.sectionTitle}>Herramientas</Text>
        <View style={styles.menuContainer}>
          <MenuOption icon="calculator-outline" label="Márgenes de Ganancia" isNew onPress={() => {}} />
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { justifyContent: 'center', alignItems: 'center' },
  content: { padding: 20 },

  brandCard: { backgroundColor: '#FFF', borderRadius: 16, overflow: 'hidden', marginBottom: 24, shadowColor: '#000', shadowOffset: {width:0, height:4}, shadowOpacity:0.1, elevation: 4 },
  
  // Banner
  brandBanner: { height: 120, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  bannerImage: { width: '80%', height: '80%' },
  bannerPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB', width: '100%' },
  placeholderText: { fontSize: 10, color: '#CCC', marginTop: 4, fontFamily: FONTS.subtitle },
  editIconBanner: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.3)', padding: 6, borderRadius: 20 },
  
  brandContent: { alignItems: 'center', paddingBottom: 24, marginTop: -50 },
  
  // Avatar
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