import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { supabase } from '../../lib/supabase';
import { setStoredAudience } from '../../utils/audience';
import { ScreenHeader } from '../../components/molecules/ScreenHeader';
import { COLORS, FONTS } from '../../utils/theme';

export default function ClientProfileScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [message, setMessage] = useState('');

  const loadProfile = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    setMessage('');
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error('Sesion no valida.');
      }

      setEmail(String(user.email || ''));

      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, phone, city')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      setFullName(String(data?.full_name || user.user_metadata?.full_name || ''));
      setPhone(String(data?.phone || ''));
      setCity(String(data?.city || ''));
    } catch (error: any) {
      setMessage(error?.message || 'No pudimos cargar el perfil.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  const handleSaveProfile = async () => {
    setSaving(true);
    setMessage('');

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Sesion no valida.');
      }
      if (!fullName.trim() || !phone.trim() || !city.trim()) {
        throw new Error('Completa nombre, telefono y ciudad.');
      }

      const { error } = await supabase.from('profiles').upsert({
        id: user.id,
        email: user.email || null,
        full_name: fullName.trim(),
        phone: phone.trim(),
        city: city.trim(),
      });

      if (error) {
        throw error;
      }

      setMessage('Perfil actualizado.');
    } catch (error: any) {
      setMessage(error?.message || 'No pudimos guardar el perfil.');
    } finally {
      setSaving(false);
    }
  };

  const handleSwitchToTech = () => {
    Alert.alert('Cambiar a modo tecnico', 'Se cerrara sesion para volver a ingresar como tecnico.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Continuar',
        style: 'destructive',
        onPress: async () => {
          await setStoredAudience('tecnico');
          await supabase.auth.signOut();
        },
      },
    ]);
  };

  const handleSignOut = () => {
    Alert.alert('Cerrar sesion', 'Â¿Seguro que deseas salir?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Salir',
        style: 'destructive',
        onPress: async () => {
          await setStoredAudience('cliente');
          await supabase.auth.signOut();
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Mi perfil" subtitle="Cliente" centerTitle />

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={COLORS.primary} />
          <Text style={styles.loadingText}>Cargando perfil...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadProfile(true)} />}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.emailPill}>
              <Text style={styles.emailText}>{email || 'Sin email'}</Text>
            </View>

            <Text style={styles.label}>Nombre y apellido</Text>
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Nombre completo"
              placeholderTextColor="#94A3B8"
            />

            <Text style={styles.label}>Telefono / WhatsApp</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="Tu telefono"
              placeholderTextColor="#94A3B8"
              keyboardType="phone-pad"
            />

            <Text style={styles.label}>Ciudad</Text>
            <TextInput
              style={styles.input}
              value={city}
              onChangeText={setCity}
              placeholder="Tu ciudad"
              placeholderTextColor="#94A3B8"
            />

            {!!message && <Text style={styles.messageText}>{message}</Text>}

            <TouchableOpacity style={styles.primaryBtn} disabled={saving} onPress={handleSaveProfile}>
              {saving ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.primaryBtnText}>Guardar perfil</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Cuenta</Text>
            <TouchableOpacity style={styles.secondaryBtn} onPress={handleSwitchToTech}>
              <Text style={styles.secondaryBtnText}>Ingresar como tecnico</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dangerBtn} onPress={handleSignOut}>
              <Text style={styles.dangerBtnText}>Cerrar sesion</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
  loadingText: { fontFamily: FONTS.body, color: COLORS.textSecondary },
  content: { padding: 16, gap: 12, paddingBottom: 30 },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    gap: 10,
  },
  cardTitle: { fontFamily: FONTS.subtitle, fontSize: 15, color: COLORS.text },
  label: { fontFamily: FONTS.subtitle, color: COLORS.text, fontSize: 13, marginTop: 2 },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: FONTS.body,
    color: COLORS.text,
    fontSize: 14,
    backgroundColor: '#FFFFFF',
  },
  emailPill: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  emailText: { fontFamily: FONTS.body, color: COLORS.textSecondary, fontSize: 13 },
  messageText: { fontFamily: FONTS.body, color: COLORS.textSecondary, fontSize: 12 },
  primaryBtn: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  primaryBtnText: { color: '#FFF', fontFamily: FONTS.title, fontSize: 14 },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  secondaryBtnText: { color: COLORS.text, fontFamily: FONTS.subtitle, fontSize: 13 },
  dangerBtn: {
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
  },
  dangerBtnText: { color: '#B91C1C', fontFamily: FONTS.subtitle, fontSize: 13 },
});

