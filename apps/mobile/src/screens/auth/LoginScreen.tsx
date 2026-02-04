import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import Constants from 'expo-constants';
import { supabase } from '../../lib/supabase';
import { COLORS, FONTS, SPACING } from '../../utils/theme';

WebBrowser.maybeCompleteAuthSession();

const logo = require('../../../assets/icon.png');

export default function AuthScreen() {
  // Estado para cambiar entre Login y Registro
  const [isLogin, setIsLogin] = useState(true);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // 🔥 NUEVOS CAMPOS PARA EL PERFIL
  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState('');

  const getRedirectUrl = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      return window.location.origin;
    }
    const isExpoGo = Platform.OS !== 'web' && Constants.appOwnership === 'expo';
    if (isExpoGo) {
      return AuthSession.makeRedirectUri({ useProxy: true } as any);
    }
    return AuthSession.makeRedirectUri({
      scheme: 'urbanfix',
      path: 'auth/callback',
    });
  };

  const handleGoogleAuth = async () => {
    try {
      if (Platform.OS === 'web') {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: getRedirectUrl() },
        });
        if (error) throw error;
        return;
      }

      const redirectTo = getRedirectUrl();
      if (__DEV__) {
        setDebugInfo(`redirectTo: ${redirectTo}`);
      }
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });
      if (error) throw error;
      if (!data?.url) throw new Error('No se pudo iniciar Google Sign-In');

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (result.type === 'success' && result.url) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(result.url);
        if (exchangeError) throw exchangeError;
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  async function handleAuth() {
    setLoading(true);
    try {
      if (isLogin) {
        // --- LOGIN NORMAL ---
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        // La navegación se maneja sola por el cambio de sesión en App.tsx
      } else {
        // --- REGISTRO CON PERFIL ---
        if (!fullName || !businessName) {
          Alert.alert('Faltan datos', 'Por favor completa tu nombre y el de tu negocio.');
          setLoading(false);
          return;
        }

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            // Estos datos viajan al Trigger que creamos en SQL
            data: {
              full_name: fullName,
              business_name: businessName,
            },
          },
        });

        if (error) throw error;
        Alert.alert('¡Registro Exitoso!', 'Bienvenido a UrbanFix.');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <LinearGradient colors={['#0B1221', COLORS.secondary, '#0B1221']} style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="always">
          <View style={styles.brandBlock}>
            <View style={styles.logoWrap}>
              <Image source={logo} style={styles.logo} />
            </View>
            <Text style={styles.brandTitle}>UrbanFix</Text>
            <Text style={styles.brandTagline}>Gestion clara para tecnicos en movimiento</Text>
          </View>

          {/* FORMULARIO */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{isLogin ? 'Ingresa a tu cuenta' : 'Crea tu perfil profesional'}</Text>
            <Text style={styles.cardSubtitle}>Accede con Google o con tu correo.</Text>

            <TouchableOpacity 
              style={styles.googleButton} 
              onPress={handleGoogleAuth}
              disabled={loading}
              activeOpacity={0.85}
            >
              <Text style={styles.googleButtonText}>CONTINUAR CON GOOGLE</Text>
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>o</Text>
              <View style={styles.dividerLine} />
            </View>
            {!!debugInfo && __DEV__ && (
              <Text style={styles.debugText}>{debugInfo}</Text>
            )}
            
            {/* 🔥 CAMPOS EXTRA SOLO SI ES REGISTRO */}
            {!isLogin && (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Nombre Completo (ej: Carlos Gómez)"
                  placeholderTextColor="#94A3B8"
                  value={fullName}
                  onChangeText={setFullName}
                  autoCapitalize="words"
                />
                <TextInput
                  style={styles.input}
                  placeholder="Nombre de tu Negocio (ej: ElectroFix)"
                  placeholderTextColor="#94A3B8"
                  value={businessName}
                  onChangeText={setBusinessName}
                  autoCapitalize="words"
                />
              </>
            )}

            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#94A3B8"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TextInput
              style={styles.input}
              placeholder="Contraseña"
              placeholderTextColor="#94A3B8"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <TouchableOpacity 
              onPress={handleAuth}
              disabled={loading}
              activeOpacity={0.85}
            >
              <LinearGradient colors={[COLORS.primary, '#F59E0B']} style={styles.button}>
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.buttonText}>
                    {isLogin ? 'INGRESAR' : 'REGISTRARSE'}
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* SWITCH LOGIN/REGISTER */}
            <TouchableOpacity 
              style={styles.switchBtn} 
              onPress={() => setIsLogin(!isLogin)}
            >
              <Text style={styles.switchText}>
                {isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Ingresa'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: SPACING.lg, gap: 20 },
  brandBlock: { alignItems: 'center', gap: 8 },
  logoWrap: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  logo: { width: 44, height: 44, resizeMode: 'contain' },
  brandTitle: { fontSize: 34, fontFamily: FONTS.title, color: '#FFF' },
  brandTagline: { fontSize: 14, fontFamily: FONTS.body, color: 'rgba(255,255,255,0.65)' },
  card: {
    gap: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
  },
  cardTitle: { fontSize: 18, fontFamily: FONTS.title, color: '#FFF' },
  cardSubtitle: { fontSize: 13, fontFamily: FONTS.body, color: 'rgba(255,255,255,0.7)' },
  input: {
    backgroundColor: 'rgba(15,23,42,0.7)',
    padding: 16,
    borderRadius: 14,
    fontSize: 15,
    fontFamily: FONTS.body,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.2)',
    color: '#F8FAFC',
  },
  googleButton: {
    backgroundColor: 'rgba(17,24,39,0.9)',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  googleButtonText: { color: '#FFF', fontFamily: FONTS.title, fontSize: 14, letterSpacing: 0.5 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(148,163,184,0.25)' },
  dividerText: { color: 'rgba(255,255,255,0.6)', fontFamily: FONTS.body },
  debugText: { fontSize: 10, color: 'rgba(255,255,255,0.6)', textAlign: 'center' },
  button: {
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: { color: '#FFF', fontFamily: FONTS.title, fontSize: 16 },
  switchBtn: { alignItems: 'center', marginTop: 8 },
  switchText: { color: COLORS.primary, fontFamily: FONTS.subtitle },
});
