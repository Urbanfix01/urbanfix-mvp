import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import * as Linking from 'expo-linking';
import Constants from 'expo-constants';
import { supabase } from '../../lib/supabase';
import { getWebApiUrl } from '../../utils/config';
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
  const [recovering, setRecovering] = useState(false);
  const [debugInfo, setDebugInfo] = useState('');
  const [showRegisterHint, setShowRegisterHint] = useState(false);
  const fullNameRef = useRef<TextInput>(null);
  const businessNameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

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

  const parseAuthParams = (url: string) => {
    const params: Record<string, string> = {};
    const querySplit = url.split('?')[1];
    if (querySplit) {
      const queryString = querySplit.split('#')[0];
      const queryParams = new URLSearchParams(queryString);
      queryParams.forEach((value, key) => {
        params[key] = value;
      });
    }
    const hashString = url.split('#')[1];
    if (hashString) {
      const hashParams = new URLSearchParams(hashString);
      hashParams.forEach((value, key) => {
        if (!(key in params)) params[key] = value;
      });
    }
    return params;
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
      const authUrl = data?.url;
      if (!authUrl) throw new Error('No se pudo iniciar Google Sign-In (url vacía)');

      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectTo);

      if (result.type === 'success') {
        const urlResult = result.url;
        if (!urlResult) throw new Error('Respuesta de Google incompleta');
        const params = parseAuthParams(urlResult);
        const errorMessage = params.error_description || params.error;

        if (errorMessage) throw new Error(String(errorMessage));

        if (params.code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(String(params.code));
          if (exchangeError) throw exchangeError;
          return;
        }

        if (params.access_token && params.refresh_token) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: params.access_token,
            refresh_token: params.refresh_token,
          });
          if (sessionError) throw sessionError;
          return;
        }

        throw new Error('Respuesta de Google incompleta');
      }

      if (result.type === 'cancel' || result.type === 'dismiss') {
        throw new Error('Inicio con Google cancelado');
      }

      if (result.type === 'locked') {
        throw new Error('El navegador está ocupado. Intenta nuevamente.');
      }

      await WebBrowser.openBrowserAsync(data.url);
      Alert.alert('Continuar en Google', 'Si completaste el login, la app debería abrirse automáticamente.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo iniciar con Google.');
    }
  };

  async function handleAuth() {
    setLoading(true);
    try {
      const trimmedEmail = email.trim();
      if (!trimmedEmail || !password) {
        Alert.alert('Datos incompletos', 'Ingresa tu email y contraseña.');
        setLoading(false);
        return;
      }
      if (isLogin) {
        // --- LOGIN NORMAL ---
        const { error } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });
        if (error) throw error;
        // La navegación se maneja sola por el cambio de sesión en App.tsx
      } else {
        // --- REGISTRO CON PERFIL ---
        if (!fullName.trim() || !businessName.trim()) {
          Alert.alert('Faltan datos', 'Por favor completa tu nombre y el de tu negocio.');
          setLoading(false);
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: {
            // Estos datos viajan al Trigger que creamos en SQL
            data: {
              full_name: fullName.trim(),
              business_name: businessName.trim(),
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

  const handlePasswordRecovery = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      Alert.alert('Falta email', 'Ingresa tu email para recuperar la contraseña.');
      return;
    }
    setRecovering(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: getWebApiUrl('/tecnicos?recovery=1'),
      });
      if (error) throw error;
      Alert.alert('Revisa tu correo', 'Te enviamos un email para recuperar tu contraseña.');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setRecovering(false);
    }
  };

  const insets = useSafeAreaInsets();
  const isRegister = !isLogin;

  return (
    <LinearGradient colors={['#0B1221', '#1C2A3A', '#0B1221']} style={styles.container}>
      <View style={styles.orbOne} />
      <View style={styles.orbTwo} />
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: SPACING.lg + insets.top,
              paddingBottom: SPACING.lg + Math.max(0, insets.bottom),
            },
          ]}
          keyboardShouldPersistTaps="always"
        >
          <View style={styles.hero}>
            <View style={styles.logoWrap}>
              <Image source={logo} style={styles.logo} />
            </View>
            <View style={styles.badgeRow}>
              <View style={styles.badgeDot} />
            <Text style={styles.badgeText}>ACCESO TECNICOS</Text>
          </View>
            <Text style={styles.heroTitle}>Bienvenido a UrbanFix</Text>
            <Text style={styles.heroSubtitle}>Ingresa en segundos y empieza a presupuestar.</Text>
          </View>

          {/* FORMULARIO */}
          <View style={styles.card}>
            <View style={styles.segmented}>
              <TouchableOpacity
                style={[styles.segmentItem, isLogin && styles.segmentItemActive]}
                onPress={() => setIsLogin(true)}
              >
                <Text style={[styles.segmentText, isLogin && styles.segmentTextActive]}>Ingresar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.segmentItem, isRegister && styles.segmentItemActive]}
                onPress={() => {
                  setIsLogin(false);
                  setShowRegisterHint(true);
                }}
              >
                <Text style={[styles.segmentText, isRegister && styles.segmentTextActive]}>Crear cuenta</Text>
              </TouchableOpacity>
            </View>

            {showRegisterHint && isRegister && (
              <Text style={styles.registerHint}>Completa tu perfil y listo.</Text>
            )}

            <Text style={styles.cardTitle}>{isLogin ? 'Acceso rápido' : 'Registro profesional'}</Text>
            <Text style={styles.cardSubtitle}>Usa Google o tu correo. Rápido y seguro.</Text>

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
              <Text style={styles.dividerText}>o con tu correo</Text>
              <View style={styles.dividerLine} />
            </View>
            {!!debugInfo && __DEV__ && (
              <Text style={styles.debugText}>{debugInfo}</Text>
            )}
            
            {/* 🔥 CAMPOS EXTRA SOLO SI ES REGISTRO */}
            {isRegister && (
              <>
                <Text style={styles.sectionLabel}>Tu perfil</Text>
                <TextInput
                  ref={fullNameRef}
                  style={styles.input}
                  placeholder="Nombre completo (ej: Carlos Gómez)"
                  placeholderTextColor="#94A3B8"
                  value={fullName}
                  onChangeText={setFullName}
                  autoCapitalize="words"
                  returnKeyType="next"
                  onSubmitEditing={() => businessNameRef.current?.focus()}
                />
                <TextInput
                  ref={businessNameRef}
                  style={styles.input}
                  placeholder="Nombre de tu negocio (ej: ElectroFix)"
                  placeholderTextColor="#94A3B8"
                  value={businessName}
                  onChangeText={setBusinessName}
                  autoCapitalize="words"
                  returnKeyType="next"
                  onSubmitEditing={() => emailRef.current?.focus()}
                />
              </>
            )}

            <Text style={styles.sectionLabel}>Credenciales</Text>
            <TextInput
              ref={emailRef}
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#94A3B8"
              value={email}
              onChangeText={setEmail}
              onBlur={() => setEmail((prev) => prev.trim())}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              autoComplete="email"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />
            <TextInput
              ref={passwordRef}
              style={styles.input}
              placeholder="Contraseña"
              placeholderTextColor="#94A3B8"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCorrect={false}
              textContentType="password"
              autoComplete="password"
              returnKeyType="done"
              onSubmitEditing={handleAuth}
            />

            {isLogin && (
              <TouchableOpacity
                style={styles.recoveryBtn}
                onPress={handlePasswordRecovery}
                disabled={recovering}
              >
                <Text style={styles.recoveryText}>
                  {recovering ? 'Enviando...' : '¿Olvidaste tu contraseña?'}
                </Text>
              </TouchableOpacity>
            )}

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

            <TouchableOpacity 
              style={styles.switchBtn} 
              onPress={() => setIsLogin(!isLogin)}
            >
              <Text style={styles.switchText}>
                {isLogin ? '¿No tienes cuenta? Regístrate gratis' : '¿Ya tienes cuenta? Ingresa'}
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
  scrollContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: SPACING.lg, gap: 22 },
  orbOne: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: 'rgba(243,156,18,0.12)',
    top: -60,
    right: -40,
  },
  orbTwo: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 999,
    backgroundColor: 'rgba(56,189,248,0.08)',
    bottom: -90,
    left: -60,
  },
  hero: { alignItems: 'center', gap: 10 },
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
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: COLORS.primary,
  },
  badgeText: { fontSize: 11, letterSpacing: 1.5, color: '#F8FAFC', fontFamily: FONTS.subtitle },
  heroTitle: { fontSize: 28, textAlign: 'center', fontFamily: FONTS.title, color: '#FFF' },
  heroSubtitle: { fontSize: 13, textAlign: 'center', fontFamily: FONTS.body, color: 'rgba(255,255,255,0.7)' },
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
  segmented: {
    flexDirection: 'row',
    backgroundColor: 'rgba(15,23,42,0.6)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.2)',
    padding: 4,
    gap: 6,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  segmentItemActive: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  segmentText: {
    color: 'rgba(255,255,255,0.6)',
    fontFamily: FONTS.subtitle,
    fontSize: 12,
  },
  segmentTextActive: { color: '#F8FAFC' },
  cardTitle: { fontSize: 18, fontFamily: FONTS.title, color: '#FFF' },
  cardSubtitle: { fontSize: 13, fontFamily: FONTS.body, color: 'rgba(255,255,255,0.7)' },
  sectionLabel: { color: 'rgba(255,255,255,0.6)', fontFamily: FONTS.subtitle, fontSize: 11, letterSpacing: 0.6 },
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
  dividerText: { color: 'rgba(255,255,255,0.6)', fontFamily: FONTS.body, fontSize: 11 },
  debugText: { fontSize: 10, color: 'rgba(255,255,255,0.6)', textAlign: 'center' },
  button: {
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: { color: '#FFF', fontFamily: FONTS.title, fontSize: 16 },
  switchBtn: { alignItems: 'center', marginTop: 8 },
  switchText: { color: '#FCD34D', fontFamily: FONTS.subtitle, fontSize: 13 },
  recoveryBtn: { alignItems: 'flex-end', marginTop: -6 },
  recoveryText: { color: 'rgba(255,255,255,0.85)', fontFamily: FONTS.body, fontSize: 12 },
  registerHint: { marginTop: 4, textAlign: 'center', color: '#FCD34D', fontSize: 11 },
});
