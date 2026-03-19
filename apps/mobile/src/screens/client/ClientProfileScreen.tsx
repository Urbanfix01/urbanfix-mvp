import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { fetchClientWorkspace, ClientWorkspacePayload } from '../../api/client';
import { supabase } from '../../lib/supabase';
import { setStoredAudience } from '../../utils/audience';
import { ScreenHeader } from '../../components/molecules/ScreenHeader';
import { COLORS, FONTS } from '../../utils/theme';
import { deleteCurrentAccount } from '../../services/accountDeletion';

const toErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message.trim()) return error.message;
  return fallback;
};

const getInitials = (value: string) => {
  const safeValue = value.trim();
  if (!safeValue) return 'CL';
  const parts = safeValue.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
};

const getFirstName = (value: string) => {
  const parts = String(value || '').trim().split(/\s+/).filter(Boolean);
  return parts[0] || '';
};

type ClientProfileScreenProps = {
  requiredCompletion?: boolean;
  onProfileUpdated?: () => void;
};

export default function ClientProfileScreen({
  requiredCompletion = false,
  onProfileUpdated,
}: ClientProfileScreenProps) {
  const { width } = useWindowDimensions();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [message, setMessage] = useState('');
  const [workspaceError, setWorkspaceError] = useState('');
  const [workspace, setWorkspace] = useState<ClientWorkspacePayload | null>(null);

  const loadWorkspaceContext = useCallback(async () => {
    setWorkspaceError('');
    try {
      const payload = await fetchClientWorkspace();
      setWorkspace(payload);
    } catch (error) {
      setWorkspace(null);
      setWorkspaceError(toErrorMessage(error, 'No pudimos cargar tu actividad cliente.'));
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

        if (!requiredCompletion) {
          await loadWorkspaceContext();
        } else {
          setWorkspace(null);
          setWorkspaceError('');
        }
      } catch (error: any) {
        setMessage(error?.message || 'No pudimos cargar el perfil.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [loadWorkspaceContext, requiredCompletion]
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
      if (!phone.trim() || !city.trim()) {
        throw new Error('Completa telefono y ciudad.');
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
      if (!requiredCompletion) {
        await loadWorkspaceContext();
      }
      onProfileUpdated?.();
    } catch (error: any) {
      setMessage(error?.message || 'No pudimos guardar el perfil.');
    } finally {
      setSaving(false);
    }
  };

  const performSignOut = async () => {
    try {
      setSigningOut(true);
      setMessage('');
      await setStoredAudience('cliente');

      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (error) throw error;
    } catch (error) {
      setMessage(toErrorMessage(error, 'No pudimos cerrar la sesion.'));
    } finally {
      setSigningOut(false);
    }
  };

  const handleSignOut = () => {
    if (signingOut) return;

    if (Platform.OS === 'web') {
      const confirmed = typeof window === 'undefined' ? true : window.confirm('Seguro que deseas salir?');
      if (confirmed) {
        void performSignOut();
      }
      return;
    }

    Alert.alert('Cerrar sesion', 'Seguro que deseas salir?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Salir',
        style: 'destructive',
        onPress: () => void performSignOut(),
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
  const isCompactScreen = width < 390;
  const firstName = getFirstName(fullName);
  const requestList = workspace?.requests || [];
  const activitySummary = useMemo(
    () => ({
      total: requestList.length,
      completed: requestList.filter((request) => request.status === 'completed').length,
      cancelled: requestList.filter((request) => request.status === 'cancelled').length,
    }),
    [requestList]
  );
  const profileHighlights = useMemo(
    () => [
      {
        key: 'zone',
        label: 'Zona base',
        value: city || 'Pendiente',
      },
      {
        key: 'requests',
        label: 'Solicitudes',
        value: requiredCompletion ? '--' : String(activitySummary.total),
      },
      {
        key: 'history',
        label: 'Historial',
        value: requiredCompletion ? '--' : String(activitySummary.completed),
      },
    ],
    [activitySummary.completed, activitySummary.total, city, requiredCompletion]
  );
  const profileSecondaryText = city || email || 'Completa tus datos para coordinar mejor.';
  const profileBadgeLabel = requiredCompletion ? 'Completa tu acceso' : 'Cliente UrbanFix';

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={requiredCompletion ? 'Completa tu perfil' : 'Mi perfil'}
        subtitle={requiredCompletion ? 'Requisito de acceso' : 'Cliente'}
        centerTitle
      />

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
          {requiredCompletion ? (
            <View style={styles.requiredCard}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#C2410C" />
              <Text style={styles.requiredTitle}>Para entrar a la plataforma necesitamos tus datos operativos.</Text>
              <Text style={styles.requiredText}>
                Completa telefono y ciudad antes de continuar. Tu nombre puede ajustarse despues.
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.brandCard}>
                <View style={styles.brandBanner}>
                  <View style={styles.brandGlowPrimary} />
                  <View style={styles.brandGlowSecondary} />
                  <View style={styles.brandBannerContent}>
                    <Text style={styles.brandEyebrow}>Perfil cliente</Text>
                    <Text style={styles.brandBannerTitle}>
                      {firstName ? `Hola, ${firstName}` : 'Tu espacio cliente'}
                    </Text>
                    <Text style={styles.brandBannerText}>
                      Gestiona tu identidad, tu actividad y tus accesos rapidos desde un solo lugar.
                    </Text>
                  </View>
                </View>

                <View style={styles.brandContent}>
                  <View style={styles.avatarContainer}>
                    <View style={[styles.avatarImage, styles.avatarPlaceholder]}>
                      <Text style={styles.avatarText}>{getInitials(fullName)}</Text>
                    </View>
                  </View>

                  <View style={styles.brandInfo}>
                    <Text style={styles.businessName}>{fullName || 'Tu perfil cliente'}</Text>
                    <Text style={styles.personName}>{profileSecondaryText}</Text>
                    <View style={styles.verifiedBadge}>
                      <Ionicons name="checkmark-circle" size={14} color="#FFFFFF" />
                      <Text style={styles.verifiedText}>{profileBadgeLabel}</Text>
                    </View>
                  </View>

                  <View style={[styles.profileHighlights, isCompactScreen && styles.profileHighlightsCompact]}>
                    {profileHighlights.map((item) => (
                      <View key={item.key} style={styles.profileHighlightCard}>
                        <Text style={styles.profileHighlightLabel}>{item.label}</Text>
                        <Text style={styles.profileHighlightValue}>{item.value}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>

              {!!workspace?.warning && (
                <View style={styles.noticeCard}>
                  <Ionicons name="alert-circle-outline" size={16} color="#92400E" />
                  <Text style={styles.warningText}>{workspace.warning}</Text>
                </View>
              )}
              {!!workspaceError && (
                <View style={[styles.noticeCard, styles.noticeCardError]}>
                  <Ionicons name="warning-outline" size={16} color="#991B1B" />
                  <Text style={styles.errorInline}>{workspaceError}</Text>
                </View>
              )}

            </>
          )}

          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionCopy}>
                <Text style={styles.sectionEyebrow}>Tus datos</Text>
                <Text style={styles.cardTitle}>Informacion de contacto</Text>
              </View>
              <View style={styles.sectionPill}>
                <Text style={styles.sectionPillText}>Editable</Text>
              </View>
            </View>
            <Text style={styles.sectionDescription}>
              Estos datos se usan para coordinar visitas, validar tu zona y mejorar el matching con tecnicos.
            </Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.emailPill}>
                <Ionicons name="mail-outline" size={15} color="#64748B" />
                <Text style={styles.emailText}>{email || 'Sin email'}</Text>
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Nombre y apellido</Text>
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Nombre completo"
                placeholderTextColor="#94A3B8"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Telefono / WhatsApp</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="Tu telefono"
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Ciudad</Text>
              <TextInput
                style={styles.input}
                value={city}
                onChangeText={setCity}
                placeholder="Tu ciudad"
                placeholderTextColor="#94A3B8"
              />
            </View>

            {!!message && (
              <View style={[styles.feedbackCard, isErrorMessage ? styles.feedbackCardError : styles.feedbackCardSuccess]}>
                <Ionicons
                  name={isErrorMessage ? 'warning-outline' : 'checkmark-circle-outline'}
                  size={16}
                  color={isErrorMessage ? '#991B1B' : '#166534'}
                />
                <Text style={[styles.messageText, isErrorMessage ? styles.messageError : styles.messageSuccess]}>
                  {message}
                </Text>
              </View>
            )}

            <TouchableOpacity style={styles.primaryBtn} disabled={saving} onPress={handleSaveProfile}>
              {saving ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <View style={styles.buttonRow}>
                  <Ionicons name="save-outline" size={16} color="#FFF" />
                  <Text style={styles.primaryBtnText}>Guardar perfil</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionCopy}>
                <Text style={styles.sectionEyebrow}>Cuenta</Text>
                <Text style={styles.cardTitle}>Acceso y seguridad</Text>
              </View>
              <View style={styles.sectionPill}>
                <Text style={styles.sectionPillText}>Seguro</Text>
              </View>
            </View>
            <Text style={styles.sectionDescription}>
              Cerrar sesion mantiene tu cuenta intacta. Eliminarla borra tu acceso de forma permanente.
            </Text>
            <TouchableOpacity style={styles.dangerBtn} onPress={handleDeleteAccount} disabled={deletingAccount}>
              {deletingAccount ? (
                <ActivityIndicator color="#B91C1C" />
              ) : (
                <View style={styles.buttonRow}>
                  <Ionicons name="trash-outline" size={16} color="#B91C1C" />
                  <Text style={styles.dangerBtnText}>Eliminar cuenta</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} disabled={signingOut}>
              {signingOut ? (
                <ActivityIndicator color="#334155" />
              ) : (
                <View style={styles.buttonRow}>
                  <Ionicons name="log-out-outline" size={16} color="#334155" />
                  <Text style={styles.signOutBtnText}>Cerrar sesion</Text>
                </View>
              )}
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
  content: { padding: 16, gap: 14, paddingBottom: 30 },
  requiredCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#FBD38D',
    backgroundColor: '#FFF7ED',
  },
  requiredTitle: {
    flex: 1,
    color: '#9A3412',
    fontFamily: FONTS.subtitle,
    fontSize: 14,
    lineHeight: 20,
  },
  requiredText: {
    flex: 1,
    color: '#9A3412',
    fontFamily: FONTS.body,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  brandCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#EDE6DB',
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  brandBanner: {
    minHeight: 126,
    paddingHorizontal: 20,
    paddingVertical: 18,
    justifyContent: 'flex-end',
    backgroundColor: '#F5F1E8',
    borderBottomWidth: 1,
    borderBottomColor: '#EFE6D8',
    overflow: 'hidden',
  },
  brandGlowPrimary: {
    position: 'absolute',
    top: -42,
    right: -22,
    width: 168,
    height: 168,
    borderRadius: 84,
    backgroundColor: 'rgba(249, 115, 22, 0.14)',
  },
  brandGlowSecondary: {
    position: 'absolute',
    bottom: -58,
    left: -24,
    width: 148,
    height: 148,
    borderRadius: 74,
    backgroundColor: 'rgba(250, 204, 21, 0.14)',
  },
  brandBannerContent: { gap: 6, maxWidth: '86%' },
  brandEyebrow: {
    fontFamily: FONTS.subtitle,
    color: '#9A8F7B',
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  brandBannerTitle: {
    fontFamily: FONTS.title,
    color: '#0F172A',
    fontSize: 23,
    lineHeight: 28,
  },
  brandBannerText: {
    fontFamily: FONTS.body,
    color: '#475569',
    fontSize: 13,
    lineHeight: 19,
  },
  brandContent: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 22,
    marginTop: -42,
    gap: 12,
  },
  avatarContainer: {
    padding: 4,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#1F2937',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  avatarImage: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    backgroundColor: '#FFFFFF',
  },
  avatarPlaceholder: {
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 30,
    fontFamily: FONTS.title,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  brandInfo: { alignItems: 'center', gap: 4 },
  businessName: {
    fontFamily: FONTS.title,
    fontSize: 20,
    color: COLORS.text,
    textAlign: 'center',
    letterSpacing: 0.4,
  },
  personName: {
    fontFamily: FONTS.body,
    fontSize: 13,
    color: COLORS.textLight,
    textAlign: 'center',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#0F172A',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    marginTop: 4,
  },
  verifiedText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontFamily: FONTS.subtitle,
    letterSpacing: 0.4,
  },
  profileHighlights: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    width: '100%',
  },
  profileHighlightsCompact: {
    flexDirection: 'column',
  },
  profileHighlightCard: {
    flexGrow: 1,
    minWidth: 96,
    borderWidth: 1,
    borderColor: '#EFE6D8',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 11,
    backgroundColor: '#FBFBF9',
    gap: 4,
  },
  profileHighlightLabel: {
    fontFamily: FONTS.body,
    color: '#9A8F7B',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  profileHighlightValue: {
    fontFamily: FONTS.subtitle,
    color: '#0F172A',
    fontSize: 13,
  },
  sectionTitle: {
    fontFamily: FONTS.subtitle,
    fontSize: 11,
    color: '#9A8F7B',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    gap: 12,
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  sectionCopy: { flex: 1, gap: 3 },
  sectionEyebrow: {
    fontFamily: FONTS.subtitle,
    color: '#EA580C',
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  sectionPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  sectionPillText: {
    fontFamily: FONTS.subtitle,
    color: '#C2410C',
    fontSize: 11,
  },
  sectionDescription: {
    fontFamily: FONTS.body,
    color: '#64748B',
    fontSize: 12,
    lineHeight: 18,
  },
  cardTitle: { fontFamily: FONTS.subtitle, fontSize: 18, color: COLORS.text },
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
    paddingHorizontal: 11,
    paddingVertical: 6,
    backgroundColor: '#F8FAFC',
  },
  inlineRefreshText: { fontFamily: FONTS.subtitle, fontSize: 11, color: '#334155' },
  mapBaseText: { fontFamily: FONTS.body, color: '#64748B', fontSize: 12, flex: 1, lineHeight: 18 },
  contextCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#FED7AA',
    backgroundColor: '#FFF7ED',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  contextText: {
    fontFamily: FONTS.body,
    color: '#9A3412',
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
  },
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
    backgroundColor: '#FFFBEB',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  noticeCardError: {
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
  },
  warningText: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: '#92400E',
    lineHeight: 18,
    flex: 1,
  },
  errorInline: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: '#991B1B',
    lineHeight: 18,
    flex: 1,
  },
  nearbyLoadingWrap: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingVertical: 22,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
  },
  nearbyLoadingText: { fontFamily: FONTS.body, color: '#64748B', fontSize: 12 },
  nearbyListWrap: { gap: 10, marginTop: 2 },
  nearbyRow: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
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
  nearbyRowMain: { flex: 1, gap: 4 },
  nearbyRowTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  nearbyName: { fontFamily: FONTS.subtitle, fontSize: 13, color: '#0F172A' },
  nearbyMeta: { fontFamily: FONTS.body, fontSize: 12, color: '#64748B' },
  nearbyAddress: { fontFamily: FONTS.body, fontSize: 12, color: '#94A3B8' },
  nearbyRowRight: { alignItems: 'flex-end', gap: 3 },
  nearbyDistance: { fontFamily: FONTS.subtitle, fontSize: 12, color: '#0F172A' },
  nearbyHint: { fontFamily: FONTS.body, fontSize: 11, color: '#64748B' },
  availabilityBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
  },
  availabilityBadgeOn: {
    borderColor: '#BBF7D0',
    backgroundColor: '#F0FDF4',
  },
  availabilityBadgeOff: {
    borderColor: '#FDE68A',
    backgroundColor: '#FFFBEB',
  },
  availabilityBadgeText: {
    fontFamily: FONTS.subtitle,
    fontSize: 10,
  },
  availabilityBadgeTextOn: { color: '#166534' },
  availabilityBadgeTextOff: { color: '#B45309' },
  emptyMapBox: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
  },
  emptyMapText: { fontFamily: FONTS.body, color: '#64748B', fontSize: 12, textAlign: 'center' },
  menuContainer: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#EFE6D8',
    shadowColor: '#1F2937',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 3,
  },
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3EDE2',
    backgroundColor: '#FFF',
  },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: '#FFF3D6',
    borderWidth: 1,
    borderColor: '#F3D59A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuText: { fontSize: 14, fontFamily: FONTS.subtitle, color: COLORS.text },
  badge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    marginLeft: 6,
  },
  badgeText: { fontSize: 8, fontFamily: FONTS.title, color: '#FFF', letterSpacing: 0.6 },
  chevronCircle: {
    width: 28,
    height: 28,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  fieldGroup: { gap: 6 },
  label: { fontFamily: FONTS.subtitle, color: COLORS.text, fontSize: 13, marginTop: 2 },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    paddingHorizontal: 13,
    paddingVertical: 12,
    fontFamily: FONTS.body,
    color: COLORS.text,
    fontSize: 14,
    backgroundColor: '#FFFFFF',
  },
  emailPill: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emailText: { fontFamily: FONTS.body, color: COLORS.textSecondary, fontSize: 13 },
  feedbackCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  feedbackCardError: { borderColor: '#FECACA', backgroundColor: '#FEF2F2' },
  feedbackCardSuccess: { borderColor: '#BBF7D0', backgroundColor: '#F0FDF4' },
  messageText: {
    fontFamily: FONTS.body,
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
  },
  messageError: { color: '#991B1B' },
  messageSuccess: { color: '#166534' },
  primaryBtn: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    shadowColor: '#0F172A',
    shadowOpacity: 0.14,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  primaryBtnText: { color: '#FFF', fontFamily: FONTS.title, fontSize: 14 },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  dangerBtn: {
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
  },
  dangerBtnText: { color: '#B91C1C', fontFamily: FONTS.subtitle, fontSize: 13 },
  signOutBtn: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  signOutBtnText: { color: '#334155', fontFamily: FONTS.subtitle, fontSize: 13 },
});
