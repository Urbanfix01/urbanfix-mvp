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

import {
  ClientWorkspacePayload,
  KnownTechnician,
  createClientRequest,
  fetchClientWorkspace,
} from '../../api/client';
import { ScreenHeader } from '../../components/molecules/ScreenHeader';
import { COLORS, FONTS } from '../../utils/theme';

const urgencyOptions = [
  { key: 'baja', label: 'Baja' },
  { key: 'media', label: 'Media' },
  { key: 'alta', label: 'Alta' },
] as const;

const modeOptions = [
  { key: 'marketplace', label: 'Marketplace' },
  { key: 'direct', label: 'Directa' },
] as const;

export default function ClientPublishScreen() {
  const [knownTechnicians, setKnownTechnicians] = useState<KnownTechnician[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [description, setDescription] = useState('');
  const [preferredWindow, setPreferredWindow] = useState('');
  const [urgency, setUrgency] = useState<'baja' | 'media' | 'alta'>('media');
  const [mode, setMode] = useState<'marketplace' | 'direct'>('marketplace');
  const [radiusKm, setRadiusKm] = useState('20');
  const [selectedTechId, setSelectedTechId] = useState('');

  const [warning, setWarning] = useState('');
  const [errorText, setErrorText] = useState('');

  const loadSupportData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    setErrorText('');
    try {
      const payload = await fetchClientWorkspace();
      setKnownTechnicians(Array.isArray(payload.knownTechnicians) ? payload.knownTechnicians : []);
      setWarning(String(payload.warning || ''));
    } catch (error: any) {
      setErrorText(error?.message || 'No pudimos cargar datos de soporte.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSupportData();
    }, [loadSupportData])
  );

  const selectedTechnician =
    knownTechnicians.find((tech) => String(tech.id) === String(selectedTechId)) || null;

  const resetForm = () => {
    setTitle('');
    setCategory('');
    setAddress('');
    setDescription('');
    setPreferredWindow('');
    setUrgency('media');
    setMode('marketplace');
    setRadiusKm('20');
    setSelectedTechId('');
  };

  const handleSubmit = async () => {
    setSaving(true);
    setErrorText('');
    try {
      if (!title.trim() || !category.trim() || !address.trim() || !description.trim()) {
        throw new Error('Completa titulo, rubro, direccion y descripcion.');
      }

      if (mode === 'direct' && !selectedTechnician) {
        throw new Error('Selecciona un tecnico para solicitud directa.');
      }

      const parsedRadius = Math.max(1, Math.min(100, Math.round(Number(radiusKm || 20))));

      const payload = await createClientRequest({
        title: title.trim(),
        category: category.trim(),
        address: address.trim(),
        city: city.trim(),
        description: description.trim(),
        urgency,
        preferredWindow: preferredWindow.trim(),
        mode,
        radiusKm: Number.isFinite(parsedRadius) ? parsedRadius : 20,
        targetTechnicianId: selectedTechnician?.id,
        targetTechnicianName: selectedTechnician?.name,
        targetTechnicianPhone: selectedTechnician?.phone,
      });

      setKnownTechnicians(Array.isArray(payload.knownTechnicians) ? payload.knownTechnicians : knownTechnicians);
      setWarning(String(payload.warning || ''));
      resetForm();
      Alert.alert('Solicitud publicada', 'Tu solicitud fue publicada correctamente.');
    } catch (error: any) {
      setErrorText(error?.message || 'No pudimos publicar la solicitud.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Publicar solicitud" subtitle="Flujo cliente" centerTitle />

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={COLORS.primary} />
          <Text style={styles.loadingText}>Cargando formulario...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadSupportData(true)} />}
          showsVerticalScrollIndicator={false}
        >
          {!!warning && <Text style={styles.warningText}>{warning}</Text>}
          {!!errorText && <Text style={styles.errorText}>{errorText}</Text>}

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Datos del trabajo</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Titulo (ej: Perdida en baÃ±o)"
              placeholderTextColor="#94A3B8"
            />
            <TextInput
              style={styles.input}
              value={category}
              onChangeText={setCategory}
              placeholder="Rubro (ej: Plomeria)"
              placeholderTextColor="#94A3B8"
            />
            <TextInput
              style={styles.input}
              value={address}
              onChangeText={setAddress}
              placeholder="Direccion de referencia"
              placeholderTextColor="#94A3B8"
            />
            <TextInput
              style={styles.input}
              value={city}
              onChangeText={setCity}
              placeholder="Ciudad"
              placeholderTextColor="#94A3B8"
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Describe el trabajo a resolver"
              placeholderTextColor="#94A3B8"
              multiline
            />
            <TextInput
              style={styles.input}
              value={preferredWindow}
              onChangeText={setPreferredWindow}
              placeholder="Horario preferido (opcional)"
              placeholderTextColor="#94A3B8"
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Urgencia</Text>
            <View style={styles.chipRow}>
              {urgencyOptions.map((option) => {
                const selected = urgency === option.key;
                return (
                  <TouchableOpacity
                    key={option.key}
                    onPress={() => setUrgency(option.key)}
                    style={[styles.chip, selected && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextActive]}>{option.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Modo de asignacion</Text>
            <View style={styles.chipRow}>
              {modeOptions.map((option) => {
                const selected = mode === option.key;
                return (
                  <TouchableOpacity
                    key={option.key}
                    onPress={() => setMode(option.key)}
                    style={[styles.chip, selected && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextActive]}>{option.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TextInput
              style={[styles.input, { marginTop: 10 }]}
              value={radiusKm}
              onChangeText={setRadiusKm}
              placeholder="Radio en km (ej: 20)"
              keyboardType="numeric"
              placeholderTextColor="#94A3B8"
              editable={mode === 'marketplace'}
            />

            {mode === 'direct' && (
              <View style={styles.techList}>
                <Text style={styles.techTitle}>Tecnicos conocidos</Text>
                {knownTechnicians.length === 0 && (
                  <Text style={styles.techEmpty}>
                    Aun no hay tecnicos conocidos. Publica en marketplace primero para generar historial.
                  </Text>
                )}
                {knownTechnicians.map((tech) => {
                  const selected = selectedTechId === tech.id;
                  return (
                    <TouchableOpacity
                      key={tech.id}
                      onPress={() => setSelectedTechId(tech.id)}
                      style={[styles.techItem, selected && styles.techItemActive]}
                    >
                      <Text style={[styles.techName, selected && styles.techNameActive]}>{tech.name}</Text>
                      <Text style={[styles.techInfo, selected && styles.techInfoActive]}>
                        {tech.phone}
                        {tech.specialty ? ` â€¢ ${tech.specialty}` : ''}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>

          <TouchableOpacity style={styles.publishBtn} disabled={saving} onPress={handleSubmit}>
            {saving ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.publishBtnText}>Publicar solicitud</Text>
            )}
          </TouchableOpacity>
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
  warningText: {
    borderWidth: 1,
    borderColor: '#FDE68A',
    backgroundColor: '#FFFBEB',
    color: '#92400E',
    fontFamily: FONTS.body,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 12,
  },
  errorText: {
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
    color: '#991B1B',
    fontFamily: FONTS.body,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 12,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    gap: 10,
  },
  cardTitle: { fontFamily: FONTS.subtitle, color: COLORS.text, fontSize: 16, marginBottom: 2 },
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
  textArea: { minHeight: 90, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F8FAFC',
  },
  chipActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#FFF7ED',
  },
  chipText: { fontFamily: FONTS.subtitle, fontSize: 12, color: '#475569' },
  chipTextActive: { color: '#9A3412' },
  techList: { gap: 8, marginTop: 4 },
  techTitle: { fontFamily: FONTS.subtitle, color: COLORS.text, fontSize: 13 },
  techEmpty: { fontFamily: FONTS.body, color: COLORS.textSecondary, fontSize: 12, lineHeight: 18 },
  techItem: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F8FAFC',
  },
  techItemActive: {
    borderColor: '#1D4ED8',
    backgroundColor: '#EFF6FF',
  },
  techName: { fontFamily: FONTS.subtitle, color: COLORS.text, fontSize: 13 },
  techNameActive: { color: '#1D4ED8' },
  techInfo: { fontFamily: FONTS.body, color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  techInfoActive: { color: '#1E3A8A' },
  publishBtn: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  publishBtnText: { color: '#FFF', fontFamily: FONTS.title, fontSize: 14 },
});

