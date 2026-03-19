import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';

import { NearbyRequest, submitRequestApplication } from '../../api/marketplace';
import { ScreenHeader } from '../../components/molecules/ScreenHeader';
import { COLORS, FONTS } from '../../utils/theme';

type RouteParams = {
  request: NearbyRequest;
};

export default function RequestApplicationScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const queryClient = useQueryClient();
  const { request } = (route.params || {}) as RouteParams;

  const [message, setMessage] = useState(String(request?.my_response_message || '').trim());
  const [visitEtaHours, setVisitEtaHours] = useState(
    request?.my_response_type === 'application' && request?.my_visit_eta_hours
      ? String(Math.round(request.my_visit_eta_hours))
      : '24'
  );
  const [saving, setSaving] = useState(false);

  const photos = useMemo(
    () => (Array.isArray(request?.photo_urls) ? request.photo_urls.filter(Boolean) : []),
    [request?.photo_urls]
  );

  const handleSubmit = async () => {
    const safeMessage = message.trim();
    const etaValue = Math.max(1, Math.round(Number(visitEtaHours || 0)));

    if (!request?.id) {
      Alert.alert('Error', 'Solicitud invalida.');
      return;
    }
    if (safeMessage.length < 12) {
      Alert.alert('Falta contexto', 'Escribe una breve presentacion para el cliente.');
      return;
    }
    if (!Number.isFinite(etaValue) || etaValue <= 0) {
      Alert.alert('Falta tiempo', 'Indica en cuantas horas puedes coordinar la visita.');
      return;
    }

    setSaving(true);
    try {
      const payload = await submitRequestApplication(request.id, safeMessage, etaValue);
      await queryClient.invalidateQueries({ queryKey: ['operativo-nearby-requests'] });
      Alert.alert('Postulacion enviada', payload?.message || 'Tu postulacion ya quedo enviada al cliente.', [
        {
          text: 'Volver a Operativo',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'No pudimos enviar la postulacion.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Postularme" subtitle="Respuesta sin presupuesto" centerTitle />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <Text style={styles.heroEyebrow}>Solicitud activa</Text>
          <Text style={styles.heroTitle}>{request?.title || 'Trabajo sin titulo'}</Text>
          <Text style={styles.heroMeta}>
            {[request?.category, request?.city].filter(Boolean).join(' | ') || 'Solicitud UrbanFix'}
          </Text>
          <Text style={styles.heroAddress}>{[request?.address, request?.city].filter(Boolean).join(', ')}</Text>
          <Text style={styles.heroDescription}>{request?.description || 'Sin descripcion adicional.'}</Text>
        </View>

        {!!photos.length && (
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Fotos del trabajo</Text>
              <Text style={styles.sectionTag}>{photos.length} adjuntas</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoRow}>
              {photos.map((photoUrl, index) => (
                <Image key={`${request?.id || 'request'}-photo-${index}`} source={{ uri: photoUrl }} style={styles.photoThumb} />
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Tu postulacion</Text>
            <View style={styles.infoPill}>
              <Ionicons name="walk-outline" size={13} color="#0369A1" />
              <Text style={styles.infoPillText}>Sin precio</Text>
            </View>
          </View>

          <Text style={styles.label}>Mensaje para el cliente</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={message}
            onChangeText={setMessage}
            placeholder="Presentate, explica que necesitas ver en la visita y por que eres una buena opcion."
            placeholderTextColor="#94A3B8"
            multiline
          />

          <Text style={styles.label}>En cuantas horas puedes coordinar visita</Text>
          <TextInput
            style={styles.input}
            value={visitEtaHours}
            onChangeText={setVisitEtaHours}
            placeholder="24"
            placeholderTextColor="#94A3B8"
            keyboardType="numeric"
          />
          <Text style={styles.helperText}>
            El cliente vera esta postulacion dentro de su trabajo publicado y podra entrar a tu perfil antes de elegir.
          </Text>
        </View>

        <TouchableOpacity style={styles.submitBtn} disabled={saving} onPress={handleSubmit}>
          {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitBtnText}>Enviar postulacion</Text>}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 30, gap: 14 },
  heroCard: {
    backgroundColor: '#0F172A',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 18,
    gap: 8,
  },
  heroEyebrow: {
    fontFamily: FONTS.subtitle,
    color: '#FCD34D',
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  heroTitle: {
    fontFamily: FONTS.title,
    color: '#FFFFFF',
    fontSize: 21,
  },
  heroMeta: {
    fontFamily: FONTS.subtitle,
    color: '#CBD5E1',
    fontSize: 12,
  },
  heroAddress: {
    fontFamily: FONTS.body,
    color: '#E2E8F0',
    fontSize: 12,
  },
  heroDescription: {
    fontFamily: FONTS.body,
    color: '#CBD5E1',
    fontSize: 13,
    lineHeight: 19,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  sectionTitle: {
    fontFamily: FONTS.subtitle,
    color: '#0F172A',
    fontSize: 16,
  },
  sectionTag: {
    fontFamily: FONTS.body,
    color: '#64748B',
    fontSize: 12,
  },
  infoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  infoPillText: {
    fontFamily: FONTS.subtitle,
    fontSize: 11,
    color: '#0369A1',
  },
  photoRow: { gap: 10 },
  photoThumb: {
    width: 118,
    height: 118,
    borderRadius: 16,
    backgroundColor: '#E2E8F0',
    marginRight: 10,
  },
  label: {
    fontFamily: FONTS.subtitle,
    fontSize: 12,
    color: '#334155',
  },
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
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  helperText: {
    fontFamily: FONTS.body,
    color: '#64748B',
    fontSize: 12,
    lineHeight: 18,
  },
  submitBtn: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontFamily: FONTS.title,
    fontSize: 14,
  },
});
