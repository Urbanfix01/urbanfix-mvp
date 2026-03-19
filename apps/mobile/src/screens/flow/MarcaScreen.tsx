import React, { useState, useEffect } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  Image, Alert, ActivityIndicator, ScrollView, Platform, StatusBar, SafeAreaView 
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons'; 
import { supabase } from '../../lib/supabase';
import { uploadImageToSupabase } from '../../services/StorageService'; // ✅ Tu nuevo servicio

// Colores del Tema (Mismos que tu diseño original)
const COLORS = {
  headerBg: '#172B4D',
  primary: '#FB6340',
  bg: '#F8F9FE',
  card: '#FFFFFF',
  text: '#32325D',
  muted: '#8898AA',
  border: '#E9ECEF'
};

export default function MarcaScreen({ navigation }: any) {
  // Estados de carga independientes para mejor UX
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [fantasyName, setFantasyName] = useState('');
  const [fullName, setFullName] = useState('');
  
  // URLs públicas de Supabase
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (data) {
          setFantasyName(data.business_name || '');
          setFullName(data.full_name || '');
          // Si ya existen, las mostramos (Supabase URLs)
          if (data.company_logo_url) setLogoUri(data.company_logo_url);
          if (data.avatar_url) setAvatarUri(data.avatar_url);
        }
      }
    } catch (e) {
      console.error('Error cargando perfil', e);
    }
  };

  // 🚀 LÓGICA V1.2: Selección + Subida Inmediata
  const handleImageUpdate = async (type: 'logo' | 'avatar') => {
    try {
      // 1. Elegir Imagen
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: type === 'logo' ? [16, 9] : [1, 1],
        quality: 0.5, // Optimizado para web
      });

      if (result.canceled) return;

      const localUri = result.assets[0].uri;

      // 2. Activar Spinner específico
      if (type === 'logo') setUploadingLogo(true);
      else setUploadingAvatar(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user");

      // 3. Subir usando el StorageService
      // Usamos nombres fijos (logo.png / avatar.png) para no llenar el bucket de basura
      const fileName = `${type}.png`; 
      const publicUrl = await uploadImageToSupabase(localUri, user.id, fileName);

      // 4. Actualizar Estado con "Cache Busing"
      // Agregamos ?t=timestamp para obligar a React Native a refrescar la imagen
      const freshUrl = `${publicUrl}?t=${new Date().getTime()}`;

      if (type === 'logo') setLogoUri(freshUrl);
      else setAvatarUri(freshUrl);

      // 5. Guardar la URL en la BD inmediatamente (Opcional, pero recomendado para persistencia rápida)
      const field = type === 'logo' ? 'company_logo_url' : 'avatar_url';
      await supabase.from('profiles').update({ [field]: publicUrl }).eq('id', user.id);

    } catch (error) {
      Alert.alert('Error', 'No se pudo subir la imagen.');
      console.error(error);
    } finally {
      setUploadingLogo(false);
      setUploadingAvatar(false);
    }
  };

  const handleSaveTextData = async () => {
    if (!fullName || !fantasyName) return Alert.alert('Atención', 'Completa los nombres para continuar.');
    
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sin sesión");

      // Solo guardamos los textos (las imágenes ya se subieron en handleImageUpdate)
      const updates = {
        updated_at: new Date(),
        business_name: fantasyName,
        full_name: fullName,
        // No necesitamos enviar las URLs de nuevo aquí, pero no hace daño
      };

      const { error } = await supabase.from('profiles').update(updates).eq('id', user.id);
      if (error) throw error;

      if (Platform.OS === 'web') window.alert("✅ Identidad Actualizada");
      else Alert.alert("¡Éxito!", "Tu marca se ha guardado correctamente.");
      
      navigation.goBack(); 

    } catch (e) {
      Alert.alert("Error", "No se pudieron guardar los cambios.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* HEADER */}
      <View style={styles.headerBackground}>
        <SafeAreaView>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Diseña tu Marca</Text>
            <View style={{width: 24}} /> 
          </View>
        </SafeAreaView>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* CARD PRINCIPAL */}
        <View style={styles.mainCard}>
          <Text style={styles.sectionLabel}>LOGO DE TU EMPRESA</Text>
          
          {/* LOGO AREA */}
          <TouchableOpacity 
            style={[styles.logoContainer, !logoUri && styles.logoDashed]} 
            onPress={() => handleImageUpdate('logo')}
            activeOpacity={0.9}
            disabled={uploadingLogo}
          >
            {uploadingLogo ? (
              <View style={styles.centerSpinner}>
                <ActivityIndicator color={COLORS.primary} size="large" />
              </View>
            ) : logoUri ? (
              <Image source={{ uri: logoUri }} style={styles.logoImage} resizeMode="cover" />
            ) : (
              <View style={styles.emptyStateLogo}>
                <Ionicons name="image-outline" size={40} color="#CED4DA" />
                <Text style={styles.uploadText}>Toca para subir logo</Text>
              </View>
            )}
            
            {!uploadingLogo && (
              <View style={styles.cameraBtn}>
                <Ionicons name="camera" size={18} color="#fff" />
              </View>
            )}
          </TouchableOpacity>

          {/* AVATAR AREA */}
          <View style={styles.avatarWrapper}>
            <TouchableOpacity 
              onPress={() => handleImageUpdate('avatar')} 
              style={styles.avatarContainer}
              disabled={uploadingAvatar}
            >
              {uploadingAvatar ? (
                <View style={[styles.avatarImage, styles.avatarEmpty]}>
                   <ActivityIndicator color={COLORS.primary} />
                </View>
              ) : avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
              ) : (
                <View style={[styles.avatarImage, styles.avatarEmpty]}>
                  <Ionicons name="person" size={36} color="#ADB5BD" />
                </View>
              )}
              
              {!uploadingAvatar && (
                <View style={styles.editBadge}>
                  <Ionicons name="pencil" size={12} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
            <Text style={styles.avatarLabel}>FOTO DE PERFIL</Text>
          </View>
        </View>

        {/* FORMULARIO */}
        <View style={styles.formContainer}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>NOMBRE DE FANTASÍA (EMPRESA)</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="business-outline" size={20} color={COLORS.muted} style={styles.inputIcon} />
              <TextInput 
                style={styles.input}
                value={fantasyName}
                onChangeText={setFantasyName}
                placeholder="Ej: UrbanFix"
                placeholderTextColor="#ADB5BD"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>TU NOMBRE REAL</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="person-outline" size={20} color={COLORS.muted} style={styles.inputIcon} />
              <TextInput 
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Ej: Sergio Castillo"
                placeholderTextColor="#ADB5BD"
              />
            </View>
          </View>
        </View>

        {/* BOTÓN */}
        <TouchableOpacity 
          style={styles.saveButton} 
          onPress={handleSaveTextData} 
          disabled={isSaving || uploadingLogo || uploadingAvatar}
          activeOpacity={0.8}
        >
          {isSaving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>GUARDAR IDENTIDAD</Text>
          )}
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

// ESTILOS INTACTOS (Mismos que tu versión original)
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  headerBackground: {
    backgroundColor: COLORS.headerBg,
    paddingBottom: 50, 
    paddingTop: Platform.OS === 'android' ? 40 : 0,
  },
  headerContent: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 15,
  },
  backButton: { padding: 5 },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  scrollContent: { paddingHorizontal: 20, marginTop: -40 }, 
  mainCard: {
    backgroundColor: COLORS.card, borderRadius: 12, padding: 20, paddingBottom: 35,
    marginBottom: 50, shadowColor: '#000', shadowOpacity: 0.1,
    shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 5,
  },
  sectionLabel: { fontSize: 11, fontWeight: 'bold', color: COLORS.muted, marginBottom: 15, letterSpacing: 1 },
  logoContainer: {
    height: 140, borderRadius: 8, backgroundColor: '#F6F9FC',
    overflow: 'hidden', position: 'relative',
  },
  logoDashed: { borderWidth: 1, borderColor: '#CED4DA', borderStyle: 'dashed' },
  logoImage: { width: '100%', height: '100%' },
  emptyStateLogo: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  centerSpinner: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  uploadText: { marginTop: 8, fontSize: 12, color: COLORS.muted },
  cameraBtn: {
    position: 'absolute', bottom: 10, right: 10,
    backgroundColor: 'rgba(0,0,0,0.6)', padding: 8, borderRadius: 20
  },
  avatarWrapper: { position: 'absolute', bottom: -40, alignSelf: 'center', alignItems: 'center' },
  avatarContainer: {
    position: 'relative', marginBottom: 5,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 5, elevation: 5
  },
  avatarImage: {
    width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: '#FFF',
  },
  avatarEmpty: { backgroundColor: '#E9ECEF', justifyContent: 'center', alignItems: 'center' },
  editBadge: {
    position: 'absolute', bottom: 0, right: 0,
    backgroundColor: COLORS.headerBg, width: 24, height: 24, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF'
  },
  avatarLabel: { fontSize: 10, fontWeight: 'bold', color: COLORS.muted, marginTop: 4 },
  formContainer: { marginBottom: 30 },
  inputGroup: { marginBottom: 20 },
  inputLabel: { fontSize: 12, fontWeight: 'bold', color: COLORS.muted, marginBottom: 8, letterSpacing: 0.5 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF',
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, paddingHorizontal: 15, height: 50
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 16, color: COLORS.text, fontWeight: '500' },
  saveButton: {
    backgroundColor: COLORS.primary, borderRadius: 8, height: 55,
    justifyContent: 'center', alignItems: 'center', shadowColor: COLORS.primary,
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 4, marginBottom: 40
  },
  saveButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});