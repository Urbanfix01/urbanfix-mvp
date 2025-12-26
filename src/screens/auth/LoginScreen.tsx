import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import Constants from 'expo-constants';
import { supabase } from '../../lib/supabase';
import { COLORS, FONTS, SPACING } from '../../utils/theme';

WebBrowser.maybeCompleteAuthSession();

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
    const isExpoGo = Platform.OS !== 'web' && Constants.appOwnership === 'expo';
    if (isExpoGo) {
      return 'https://auth.expo.io/@urbanfix/UrbanFix';
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
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>UrbanFix</Text>
        <Text style={styles.subtitle}>
          {isLogin ? 'Ingresa a tu cuenta' : 'Crea tu perfil profesional'}
        </Text>

        {/* FORMULARIO */}
        <View style={styles.form}>
          <TouchableOpacity 
            style={styles.googleButton} 
            onPress={handleGoogleAuth}
            disabled={loading}
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
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
              />
              <TextInput
                style={styles.input}
                placeholder="Nombre de tu Negocio (ej: ElectroFix)"
                value={businessName}
                onChangeText={setBusinessName}
                autoCapitalize="words"
              />
            </>
          )}

          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TextInput
            style={styles.input}
            placeholder="Contraseña"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity 
            style={styles.button} 
            onPress={handleAuth}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.buttonText}>
                {isLogin ? 'INGRESAR' : 'REGISTRARSE'}
              </Text>
            )}
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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: SPACING.lg },
  title: { fontSize: 32, fontFamily: FONTS.title, color: COLORS.primary, textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 16, fontFamily: FONTS.body, color: COLORS.textLight, textAlign: 'center', marginBottom: 32 },
  form: { gap: 16 },
  input: { backgroundColor: '#FFF', padding: 16, borderRadius: 12, fontSize: 16, fontFamily: FONTS.body, borderWidth: 1, borderColor: '#E0E0E0' },
  googleButton: { backgroundColor: '#111827', padding: 16, borderRadius: 12, alignItems: 'center' },
  googleButtonText: { color: '#FFF', fontFamily: FONTS.title, fontSize: 14, letterSpacing: 0.5 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  dividerText: { color: COLORS.textLight, fontFamily: FONTS.body },
  debugText: { fontSize: 10, color: COLORS.textLight, textAlign: 'center' },
  button: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#FFF', fontFamily: FONTS.title, fontSize: 16 },
  switchBtn: { alignItems: 'center', marginTop: 16 },
  switchText: { color: COLORS.primary, fontFamily: FONTS.subtitle }
});
