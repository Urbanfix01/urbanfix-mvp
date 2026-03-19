import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker'; 
import { supabase } from '../../lib/supabase';
import { COLORS, FONTS } from '../../utils/theme';
import { ScreenHeader } from '../../components/molecules/ScreenHeader';

export default function EditProfileScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { profile } = route.params as { profile: any } || { profile: {} };

  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [businessName, setBusinessName] = useState(profile?.business_name || '');
  
  const [avatar, setAvatar] = useState(profile?.avatar_url || null);
  const [logo, setLogo] = useState(profile?.company_logo_url || null);
  
  const [loading, setLoading] = useState(false);

  const pickImage = async (type: 'avatar' | 'logo') => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert("Permiso denegado", "Necesitamos acceso a la galería.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      // 👇 CORRECCIÓN AQUÍ: Usamos MediaTypeOptions
      mediaTypes: ImagePicker.MediaTypeOptions.Images, 
      allowsEditing: true,
      aspect: type === 'avatar' ? [1, 1] : [16, 9],
      quality: 0.5, 
      base64: false, 
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      
      if (uri.length > 100000) {
         console.warn("⚠️ Imagen muy grande para guardar en texto plano.");
      }

      if (type === 'avatar') setAvatar(uri);
      else setLogo(uri);
    }
  };

  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert("Falta información", "El nombre es obligatorio.");
      return;
    }

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No hay usuario activo");

      const updates = {
        full_name: fullName,
        business_name: businessName,
        avatar_url: avatar, 
        company_logo_url: logo,
        updated_at: new Date().toISOString(), 
      };

      console.log("📤 Enviando actualización:", updates);

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) {
        console.error("🔴 Error Supabase:", error);
        throw error;
      }

      Alert.alert("¡Éxito! ✅", "Perfil actualizado correctamente.", [
        { text: "OK", onPress: () => navigation.goBack() }
      ]);

    } catch (error: any) {
      Alert.alert("Error al guardar", error.message || "Verifica tu conexión.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Diseña tu Marca" showBack />

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content}>
          
          {/* LOGO */}
          <Text style={styles.sectionLabel}>LOGO DE TU EMPRESA</Text>
          <TouchableOpacity style={styles.logoUpload} onPress={() => pickImage('logo')}>
            {logo ? (
              <Image source={{ uri: logo }} style={styles.logoImage} resizeMode="contain" />
            ) : (
              <View style={styles.logoPlaceholder}>
                <Ionicons name="image-outline" size={40} color={COLORS.textLight} />
                <Text style={styles.uploadText}>Toca para subir Logo</Text>
              </View>
            )}
            <View style={styles.editIconBadge}>
              <Ionicons name="camera" size={16} color="#FFF" />
            </View>
          </TouchableOpacity>

          {/* AVATAR */}
          <View style={styles.avatarSection}>
            <TouchableOpacity onPress={() => pickImage('avatar')}>
              <View style={styles.avatarContainer}>
                {avatar ? (
                  <Image source={{ uri: avatar }} style={styles.avatarImage} resizeMode="cover" />
                ) : (
                  <View style={[styles.avatarImage, styles.avatarPlaceholder]}>
                    <Text style={styles.initials}>{fullName ? fullName.charAt(0).toUpperCase() : 'U'}</Text>
                  </View>
                )}
                <View style={styles.miniEditBadge}>
                  <Ionicons name="pencil" size={12} color="#FFF" />
                </View>
              </View>
            </TouchableOpacity>
            <Text style={styles.sectionLabelCenter}>FOTO DE PERFIL</Text>
          </View>

          {/* FORMULARIO */}
          <View style={styles.formContainer}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Nombre de Fantasía (Empresa)</Text>
              <TextInput 
                style={[styles.input, { fontWeight: 'bold' }]}
                value={businessName}
                onChangeText={setBusinessName}
                placeholder="Ej: HidroSoluciones"
                placeholderTextColor="#CCC"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Tu Nombre Real</Text>
              <TextInput 
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Ej: Juan Pérez"
                placeholderTextColor="#CCC"
              />
            </View>
          </View>

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}>
            {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveText}>Guardar Identidad</Text>}
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 20 },
  sectionLabel: { fontFamily: FONTS.subtitle, fontSize: 12, color: COLORS.textLight, marginBottom: 8, letterSpacing: 1 },
  sectionLabelCenter: { fontFamily: FONTS.subtitle, fontSize: 10, color: COLORS.textLight, marginTop: 8, letterSpacing: 1 },
  
  logoUpload: {
    height: 150, backgroundColor: '#FFFFFF', borderRadius: 16, marginBottom: -40,
    justifyContent: 'center', alignItems: 'center', overflow: 'hidden', borderWidth: 1, borderColor: '#E0E0E0', borderStyle: 'dashed'
  },
  logoImage: { width: '100%', height: '100%' },
  logoPlaceholder: { alignItems: 'center' },
  uploadText: { fontFamily: FONTS.body, color: COLORS.textLight, marginTop: 4 },
  
  avatarSection: { alignItems: 'center', marginBottom: 20 },
  avatarContainer: { position: 'relative' },
  avatarImage: { width: 100, height: 100, borderRadius: 50, borderWidth: 4, borderColor: COLORS.background },
  avatarPlaceholder: { backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  initials: { fontSize: 32, fontFamily: FONTS.title, color: '#FFF' },
  
  editIconBadge: { position: 'absolute', bottom: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.6)', padding: 6, borderRadius: 20 },
  miniEditBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: COLORS.secondary, padding: 6, borderRadius: 20, borderWidth: 2, borderColor: COLORS.background },

  formContainer: { backgroundColor: '#FFF', padding: 20, borderRadius: 16, marginTop: 10, shadowColor: '#000', shadowOpacity: 0.05, elevation: 2 },
  formGroup: { marginBottom: 16 },
  label: { fontFamily: FONTS.body, fontSize: 12, color: COLORS.textLight, marginBottom: 4 },
  input: { fontFamily: FONTS.subtitle, fontSize: 16, color: COLORS.text, borderBottomWidth: 1, borderBottomColor: '#EEE', paddingVertical: 8 },

  saveBtn: {
    backgroundColor: COLORS.primary, paddingVertical: 16, borderRadius: 12, marginTop: 24,
    alignItems: 'center', shadowColor: COLORS.primary, shadowOpacity: 0.3, elevation: 4
  },
  saveText: { color: '#FFF', fontFamily: FONTS.title, fontSize: 16 }
});