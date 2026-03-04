import React, { useCallback, useMemo, useState } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import MapCanvas from '../../components/molecules/MapCanvas';
import { fetchClientNearbyTechnicians, ClientNearbyTechnician, ClientNearbyTechniciansPayload } from '../../api/client';
import { supabase } from '../../lib/supabase';
import { setStoredAudience } from '../../utils/audience';
import { ScreenHeader } from '../../components/molecules/ScreenHeader';
import { MapPoint } from '../../types/maps';
import { COLORS, FONTS } from '../../utils/theme';
import { deleteCurrentAccount } from '../../services/accountDeletion';

const BA_DEFAULT_REGION = {
  latitude: -34.6037,
  longitude: -58.3816,
  latitudeDelta: 0.3,
  longitudeDelta: 0.3,
};

const toErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message.trim()) return error.message;
  return fallback;
};

export default function ClientProfileScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [message, setMessage] = useState('');
  const [nearbyError, setNearbyError] = useState('');
  const [nearbyPayload, setNearbyPayload] = useState<ClientNearbyTechniciansPayload | null>(null);
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string | null>(null);

  const loadNearbyTechnicians = useCallback(async () => {
    setNearbyLoading(true);
    setNearbyError('');

    try {
      const payload = await fetchClientNearbyTechnicians(20);
      setNearbyPayload(payload);
      const topTechnicianId = payload.technicians[0]?.id || null;
      setSelectedTechnicianId((current) =>
        current && payload.technicians.some((technician) => technician.id === current) ? current : topTechnicianId
      );
    } catch (error) {
      setNearbyPayload(null);
      setSelectedTechnicianId(null);
      setNearbyError(toErrorMessage(error, 'No pudimos cargar tecnicos cercanos.'));
    } finally {
      setNearbyLoading(false);
    }
  }, []);

  const loadProfile = useCallback(
    async (isRefresh = false) => {
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

        if (error) throw error;

        setFullName(String(data?.full_name || user.user_metadata?.full_name || ''));
        setPhone(String(data?.phone || ''));
        setCity(String(data?.city || ''));

        await loadNearbyTechnicians();
      } catch (error: any) {
        setMessage(error?.message || 'No pudimos cargar el perfil.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [loadNearbyTechnicians]
  );

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
      if (!user) throw new Error('Sesion no valida.');
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

      if (error) throw error;
      setMessage('Perfil actualizado.');
      await loadNearbyTechnicians();
    } catch (error: any) {
      setMessage(error?.message || 'No pudimos guardar el perfil.');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Cerrar sesion', 'Seguro que deseas salir?', [
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

  const confirmDeleteAccount = async () => {
    try {
      setDeletingAccount(true);
      await setStoredAudience('cliente');
      await deleteCurrentAccount();
      setMessage('Cuenta eliminada correctamente.');
    } catch (error: any) {
      setMessage(error?.message || 'No pudimos eliminar tu cuenta.');
    } finally {
      setDeletingAccount(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Eliminar cuenta',
      'Esta accion elimina tu cuenta de forma permanente y no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => void confirmDeleteAccount(),
        },
      ]
    );
  };

  const isErrorMessage = /error|no pudimos|invalida|expirada|missing|unauthorized/i.test(message);
  const nearbyTechnicians = nearbyPayload?.technicians || [];

  const mapPoints = useMemo<MapPoint[]>(() => {
    return nearbyTechnicians
      .map((technician: ClientNearbyTechnician) => {
        const lat = Number(technician.lat);
        const lng = Number(technician.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

        return {
          id: technician.id,
          title: technician.name,
          amount: Number(technician.distance_km || 0),
          address: [technician.address, technician.city].filter(Boolean).join(', '),
          createdAt: new Date().toISOString(),
          lat,
          lng,
          status: technician.available_now
            ? { key: 'available', label: 'Disponible ahora', color: '#10B981' }
            : { key: 'offline', label: 'Fuera de horario', color: '#F59E0B' },
        };
      })
      .filter(Boolean) as MapPoint[];
  }, [nearbyTechnicians]);

  const mapRegion = useMemo(() => {
    if (mapPoints.length) {
      const lats = mapPoints.map((point) => point.lat);
      const lngs = mapPoints.map((point) => point.lng);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);
      return {
        latitude: (minLat + maxLat) / 2,
        longitude: (minLng + maxLng) / 2,
        latitudeDelta: Math.max(0.05, (maxLat - minLat) * 1.5),
        longitudeDelta: Math.max(0.05, (maxLng - minLng) * 1.5),
      };
    }

    const centerLat = Number(nearbyPayload?.center?.lat);
    const centerLng = Number(nearbyPayload?.center?.lng);
    if (Number.isFinite(centerLat) && Number.isFinite(centerLng)) {
      return {
        latitude: centerLat,
        longitude: centerLng,
        latitudeDelta: 0.24,
        longitudeDelta: 0.24,
      };
    }

    return BA_DEFAULT_REGION;
  }, [mapPoints, nearbyPayload?.center?.lat, nearbyPayload?.center?.lng]);

  const mapKey = `${mapPoints.length}-${mapRegion.latitude}-${mapRegion.longitude}`;

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
          <View style={styles.heroCard}>
            <Text style={styles.heroEyebrow}>PERFIL CLIENTE</Text>
            <Text style={styles.heroTitle}>Tus datos para coordinar trabajos rapido</Text>
            <Text style={styles.heroText}>
              Manten tu telefono y ciudad actualizados para recibir mejor atencion de tecnicos.
            </Text>
          </View>

          <View style={styles.card}>
            <View style={styles.mapHeaderRow}>
              <Text style={styles.cardTitle}>Tecnicos cercanos</Text>
              <TouchableOpacity style={styles.inlineRefreshBtn} onPress={loadNearbyTechnicians} disabled={nearbyLoading}>
                <Ionicons name={nearbyLoading ? 'hourglass-outline' : 'refresh'} size={14} color="#334155" />
                <Text style={styles.inlineRefreshText}>{nearbyLoading ? 'Actualizando' : 'Actualizar'}</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.mapBaseText}>
              Zona de referencia: {nearbyPayload?.center?.label || city || 'Sin referencia'}
            </Text>

            {!!nearbyPayload?.warning && <Text style={styles.warningText}>{nearbyPayload.warning}</Text>}
            {!!nearbyError && <Text style={styles.errorInline}>{nearbyError}</Text>}

            {nearbyLoading && !mapPoints.length ? (
              <View style={styles.nearbyLoadingWrap}>
                <ActivityIndicator color={COLORS.primary} />
                <Text style={styles.nearbyLoadingText}>Buscando tecnicos con geolocalizacion...</Text>
              </View>
            ) : mapPoints.length ? (
              <>
                <MapCanvas
                  key={mapKey}
                  points={mapPoints}
                  region={mapRegion}
                  onSelect={(point) => setSelectedTechnicianId(point.id)}
                  formatMoney={(value) => `${value.toFixed(1)} km`}
                  valuePrefix=""
                  height={220}
                />
                <View style={styles.nearbyListWrap}>
                  {nearbyTechnicians.slice(0, 5).map((technician) => {
                    const selected = selectedTechnicianId === technician.id;
                    return (
                      <View key={technician.id} style={[styles.nearbyRow, selected && styles.nearbyRowSelected]}>
                        <View style={styles.nearbyRowMain}>
                          <Text style={styles.nearbyName}>{technician.name}</Text>
                          <Text style={styles.nearbyMeta} numberOfLines={1}>
                            {technician.specialty || 'Servicios generales'}
                          </Text>
                        </View>
                        <View style={styles.nearbyRowRight}>
                          <Text style={styles.nearbyDistance}>{technician.distance_km.toFixed(1)} km</Text>
                          <Text style={[styles.nearbyState, technician.available_now ? styles.stateOn : styles.stateOff]}>
                            {technician.available_now ? 'Disponible' : 'Fuera de horario'}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </>
            ) : (
              <View style={styles.emptyMapBox}>
                <Ionicons name="location-outline" size={20} color="#94A3B8" />
                <Text style={styles.emptyMapText}>Aun no hay tecnicos geolocalizados cerca para mostrar en el mapa.</Text>
              </View>
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Datos personales</Text>

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

            {!!message && (
              <Text style={[styles.messageText, isErrorMessage ? styles.messageError : styles.messageSuccess]}>
                {message}
              </Text>
            )}

            <TouchableOpacity style={styles.primaryBtn} disabled={saving} onPress={handleSaveProfile}>
              {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryBtnText}>Guardar perfil</Text>}
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Cuenta</Text>
            <TouchableOpacity style={styles.dangerBtn} onPress={handleDeleteAccount} disabled={deletingAccount}>
              {deletingAccount ? <ActivityIndicator color="#B91C1C" /> : <Text style={styles.dangerBtnText}>Eliminar cuenta</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
              <Text style={styles.signOutBtnText}>Cerrar sesion</Text>
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
  heroCard: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 14,
    gap: 6,
  },
  heroEyebrow: { fontFamily: FONTS.subtitle, color: '#FCD34D', fontSize: 10, letterSpacing: 1.2 },
  heroTitle: { fontFamily: FONTS.title, color: '#FFFFFF', fontSize: 18, lineHeight: 24 },
  heroText: { fontFamily: FONTS.body, color: '#CBD5E1', fontSize: 12, lineHeight: 18 },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    gap: 10,
  },
  cardTitle: { fontFamily: FONTS.subtitle, fontSize: 15, color: COLORS.text },
  mapHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  inlineRefreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#F8FAFC',
  },
  inlineRefreshText: { fontFamily: FONTS.subtitle, fontSize: 11, color: '#334155' },
  mapBaseText: { fontFamily: FONTS.body, color: '#64748B', fontSize: 12 },
  warningText: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: '#92400E',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  errorInline: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: '#991B1B',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  nearbyLoadingWrap: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  nearbyLoadingText: { fontFamily: FONTS.body, color: '#64748B', fontSize: 12 },
  nearbyListWrap: { gap: 8, marginTop: 2 },
  nearbyRow: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  nearbyRowSelected: {
    borderColor: '#F59E0B',
    backgroundColor: '#FFFBEB',
  },
  nearbyRowMain: { flex: 1, gap: 2 },
  nearbyName: { fontFamily: FONTS.subtitle, fontSize: 13, color: '#0F172A' },
  nearbyMeta: { fontFamily: FONTS.body, fontSize: 12, color: '#64748B' },
  nearbyRowRight: { alignItems: 'flex-end', gap: 1 },
  nearbyDistance: { fontFamily: FONTS.subtitle, fontSize: 12, color: '#0F172A' },
  nearbyState: { fontFamily: FONTS.body, fontSize: 11 },
  stateOn: { color: '#047857' },
  stateOff: { color: '#B45309' },
  emptyMapBox: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
  },
  emptyMapText: { fontFamily: FONTS.body, color: '#64748B', fontSize: 12, textAlign: 'center' },
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
  messageText: {
    fontFamily: FONTS.body,
    fontSize: 12,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  messageError: { borderColor: '#FECACA', backgroundColor: '#FEF2F2', color: '#991B1B' },
  messageSuccess: { borderColor: '#BBF7D0', backgroundColor: '#F0FDF4', color: '#166534' },
  primaryBtn: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  primaryBtnText: { color: '#FFF', fontFamily: FONTS.title, fontSize: 14 },
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
  signOutBtn: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  signOutBtnText: { color: '#334155', fontFamily: FONTS.subtitle, fontSize: 13 },
});
