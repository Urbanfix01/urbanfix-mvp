import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import {
  KnownTechnician,
  createClientRequest,
  fetchClientWorkspace,
} from '../../api/client';
import { LocationAutocomplete } from '../../components/molecules/LocationAutocomplete';
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

type PreferredWindowConfig = {
  weekdayFrom: string;
  weekdayTo: string;
  saturdayEnabled: boolean;
  saturdayFrom: string;
  saturdayTo: string;
  sundayEnabled: boolean;
  sundayFrom: string;
  sundayTo: string;
};

const DEFAULT_PREFERRED_WINDOW: PreferredWindowConfig = {
  weekdayFrom: '09:00',
  weekdayTo: '18:00',
  saturdayEnabled: false,
  saturdayFrom: '09:00',
  saturdayTo: '13:00',
  sundayEnabled: false,
  sundayFrom: '09:00',
  sundayTo: '13:00',
};

const ZERO_COORDINATE_EPSILON = 0.000001;

const hasValidCoordinates = (lat: number, lng: number) =>
  Number.isFinite(lat) &&
  Number.isFinite(lng) &&
  !(Math.abs(lat) <= ZERO_COORDINATE_EPSILON && Math.abs(lng) <= ZERO_COORDINATE_EPSILON);

const extractCityFromAddress = (value: string) => {
  const parts = String(value || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length < 2) return '';
  const lastPart = parts[parts.length - 1];
  const candidate = lastPart.toLowerCase() === 'argentina' ? parts[parts.length - 2] : lastPart;
  if (!candidate || /\d/.test(candidate)) {
    return '';
  }
  return candidate;
};

const normalizeTimeValue = (value: string | null | undefined, fallback: string) => {
  const match = String(value || '')
    .trim()
    .match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return fallback;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (Number.isNaN(hours) || Number.isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return fallback;
  }
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

const timeToMinutes = (time: string) => {
  const [hoursRaw, minutesRaw] = String(time || '').split(':');
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return -1;
  return hours * 60 + minutes;
};

const validatePreferredWindow = (config: PreferredWindowConfig) => {
  const weekdayFrom = timeToMinutes(config.weekdayFrom);
  const weekdayTo = timeToMinutes(config.weekdayTo);
  if (weekdayFrom < 0 || weekdayTo < 0 || weekdayFrom >= weekdayTo) {
    return 'Revisa horario de Lunes a Viernes: Desde debe ser menor que Hasta.';
  }
  if (config.saturdayEnabled) {
    const saturdayFrom = timeToMinutes(config.saturdayFrom);
    const saturdayTo = timeToMinutes(config.saturdayTo);
    if (saturdayFrom < 0 || saturdayTo < 0 || saturdayFrom >= saturdayTo) {
      return 'Revisa horario de Sabado: Desde debe ser menor que Hasta.';
    }
  }
  if (config.sundayEnabled) {
    const sundayFrom = timeToMinutes(config.sundayFrom);
    const sundayTo = timeToMinutes(config.sundayTo);
    if (sundayFrom < 0 || sundayTo < 0 || sundayFrom >= sundayTo) {
      return 'Revisa horario de Domingo: Desde debe ser menor que Hasta.';
    }
  }
  return '';
};

const formatPreferredWindow = (config: PreferredWindowConfig) => {
  const chunks = [`Lun a Vie ${config.weekdayFrom} - ${config.weekdayTo}`];
  if (config.saturdayEnabled) chunks.push(`Sab ${config.saturdayFrom} - ${config.saturdayTo}`);
  if (config.sundayEnabled) chunks.push(`Dom ${config.sundayFrom} - ${config.sundayTo}`);
  return chunks.join(' | ');
};

export default function ClientPublishScreen() {
  const [knownTechnicians, setKnownTechnicians] = useState<KnownTechnician[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [address, setAddress] = useState('');
  const [workLocation, setWorkLocation] = useState({ lat: 0, lng: 0 });
  const [city, setCity] = useState('');
  const [description, setDescription] = useState('');
  const [preferredWindow, setPreferredWindow] = useState<PreferredWindowConfig>({ ...DEFAULT_PREFERRED_WINDOW });
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
  const hasPreciseWorkLocation = hasValidCoordinates(workLocation.lat, workLocation.lng);

  const handleWorkLocationSelect = ({ address: selectedAddress, lat, lng }: { address: string; lat: number; lng: number }) => {
    const safeAddress = String(selectedAddress || '').trim();
    setAddress(safeAddress);
    setWorkLocation({
      lat: Number.isFinite(lat) ? lat : 0,
      lng: Number.isFinite(lng) ? lng : 0,
    });

    if (!city.trim() && safeAddress) {
      const detectedCity = extractCityFromAddress(safeAddress);
      if (detectedCity) setCity(detectedCity);
    }
  };

  const resetForm = () => {
    setTitle('');
    setCategory('');
    setAddress('');
    setWorkLocation({ lat: 0, lng: 0 });
    setCity('');
    setDescription('');
    setPreferredWindow({ ...DEFAULT_PREFERRED_WINDOW });
    setUrgency('media');
    setMode('marketplace');
    setRadiusKm('20');
    setSelectedTechId('');
  };

  const handlePreferredTimeChange = (
    key: 'weekdayFrom' | 'weekdayTo' | 'saturdayFrom' | 'saturdayTo' | 'sundayFrom' | 'sundayTo',
    rawValue: string
  ) => {
    const sanitized = String(rawValue || '')
      .replace(/[^\d:]/g, '')
      .slice(0, 5);
    setPreferredWindow((prev) => ({ ...prev, [key]: sanitized }));
  };

  const finalizePreferredTime = (
    key: 'weekdayFrom' | 'weekdayTo' | 'saturdayFrom' | 'saturdayTo' | 'sundayFrom' | 'sundayTo'
  ) => {
    setPreferredWindow((prev) => ({
      ...prev,
      [key]: normalizeTimeValue(prev[key], DEFAULT_PREFERRED_WINDOW[key]),
    }));
  };

  const handleSubmit = async () => {
    setSaving(true);
    setErrorText('');
    try {
      if (!title.trim() || !category.trim() || !address.trim() || !description.trim()) {
        throw new Error('Completa titulo, rubro, direccion y descripcion.');
      }

      const hasCityForServerGeocode = city.trim().length > 1;
      if (!hasPreciseWorkLocation && !hasCityForServerGeocode) {
        throw new Error('Selecciona direccion de obra con geolocalizacion o completa ciudad para ubicar la obra.');
      }

      if (mode === 'direct' && !selectedTechnician) {
        throw new Error('Selecciona un tecnico para solicitud directa.');
      }

      const preferredWindowError = validatePreferredWindow(preferredWindow);
      if (preferredWindowError) {
        throw new Error(preferredWindowError);
      }

      const parsedRadius = Math.max(1, Math.min(100, Math.round(Number(radiusKm || 20))));

      const payload = await createClientRequest({
        title: title.trim(),
        category: category.trim(),
        address: address.trim(),
        city: city.trim(),
        description: description.trim(),
        urgency,
        preferredWindow: formatPreferredWindow(preferredWindow),
        mode,
        radiusKm: Number.isFinite(parsedRadius) ? parsedRadius : 20,
        ...(hasPreciseWorkLocation
          ? {
              locationLat: Number(workLocation.lat.toFixed(6)),
              locationLng: Number(workLocation.lng.toFixed(6)),
            }
          : {}),
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
      <ScreenHeader title="Publicar solicitud" subtitle="Cliente UrbanFix" centerTitle />

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
          <View style={styles.heroCard}>
            <Text style={styles.heroEyebrow}>NUEVA SOLICITUD</Text>
            <Text style={styles.heroTitle}>Describe el trabajo y recibe respuestas rapido</Text>
            <Text style={styles.heroText}>
              Completa los datos clave, define urgencia y elige si quieres publicar en marketplace o directo.
            </Text>
          </View>

          {!!warning && <Text style={styles.warningText}>{warning}</Text>}
          {!!errorText && <Text style={styles.errorText}>{errorText}</Text>}

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Datos del trabajo</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Titulo (ej: Perdida en bano)"
              placeholderTextColor="#94A3B8"
            />
            <TextInput
              style={styles.input}
              value={category}
              onChangeText={setCategory}
              placeholder="Rubro (ej: Plomeria)"
              placeholderTextColor="#94A3B8"
            />
            <View style={styles.locationFieldWrap}>
              <LocationAutocomplete initialValue={address} onLocationSelect={handleWorkLocationSelect} />
            </View>
            <Text style={[styles.locationHint, hasPreciseWorkLocation && styles.locationHintOk]}>
              {hasPreciseWorkLocation
                ? 'Ubicacion de obra confirmada y lista para matching.'
                : 'Si no valida coordenadas en el telefono, completa ciudad y ubicamos la obra por direccion.'}
            </Text>
            <TextInput
              style={styles.input}
              value={city}
              onChangeText={setCity}
              placeholder="Ciudad de la obra"
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
            <View style={styles.scheduleCard}>
              <Text style={styles.scheduleTitle}>Horario preferido</Text>
              <View style={styles.scheduleRow}>
                <View style={styles.scheduleField}>
                  <Text style={styles.scheduleFieldLabel}>Lun a Vie desde</Text>
                  <TextInput
                    style={styles.input}
                    value={preferredWindow.weekdayFrom}
                    onChangeText={(value) => handlePreferredTimeChange('weekdayFrom', value)}
                    onBlur={() => finalizePreferredTime('weekdayFrom')}
                    placeholder="09:00"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
                <View style={styles.scheduleField}>
                  <Text style={styles.scheduleFieldLabel}>Lun a Vie hasta</Text>
                  <TextInput
                    style={styles.input}
                    value={preferredWindow.weekdayTo}
                    onChangeText={(value) => handlePreferredTimeChange('weekdayTo', value)}
                    onBlur={() => finalizePreferredTime('weekdayTo')}
                    placeholder="18:00"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
              </View>

              <View style={styles.weekendCard}>
                <View style={styles.weekendHeader}>
                  <Text style={styles.weekendTitle}>Sabado (opcional)</Text>
                  <Switch
                    value={preferredWindow.saturdayEnabled}
                    onValueChange={(value) => setPreferredWindow((prev) => ({ ...prev, saturdayEnabled: value }))}
                    trackColor={{ false: '#CBD5E1', true: '#FDBA74' }}
                    thumbColor={preferredWindow.saturdayEnabled ? '#EA580C' : '#F8FAFC'}
                  />
                </View>
                {preferredWindow.saturdayEnabled && (
                  <View style={styles.scheduleRow}>
                    <View style={styles.scheduleField}>
                      <Text style={styles.scheduleFieldLabel}>Desde</Text>
                      <TextInput
                        style={styles.input}
                        value={preferredWindow.saturdayFrom}
                        onChangeText={(value) => handlePreferredTimeChange('saturdayFrom', value)}
                        onBlur={() => finalizePreferredTime('saturdayFrom')}
                        placeholder="09:00"
                        placeholderTextColor="#94A3B8"
                      />
                    </View>
                    <View style={styles.scheduleField}>
                      <Text style={styles.scheduleFieldLabel}>Hasta</Text>
                      <TextInput
                        style={styles.input}
                        value={preferredWindow.saturdayTo}
                        onChangeText={(value) => handlePreferredTimeChange('saturdayTo', value)}
                        onBlur={() => finalizePreferredTime('saturdayTo')}
                        placeholder="13:00"
                        placeholderTextColor="#94A3B8"
                      />
                    </View>
                  </View>
                )}
              </View>

              <View style={styles.weekendCard}>
                <View style={styles.weekendHeader}>
                  <Text style={styles.weekendTitle}>Domingo (opcional)</Text>
                  <Switch
                    value={preferredWindow.sundayEnabled}
                    onValueChange={(value) => setPreferredWindow((prev) => ({ ...prev, sundayEnabled: value }))}
                    trackColor={{ false: '#CBD5E1', true: '#FDBA74' }}
                    thumbColor={preferredWindow.sundayEnabled ? '#EA580C' : '#F8FAFC'}
                  />
                </View>
                {preferredWindow.sundayEnabled && (
                  <View style={styles.scheduleRow}>
                    <View style={styles.scheduleField}>
                      <Text style={styles.scheduleFieldLabel}>Desde</Text>
                      <TextInput
                        style={styles.input}
                        value={preferredWindow.sundayFrom}
                        onChangeText={(value) => handlePreferredTimeChange('sundayFrom', value)}
                        onBlur={() => finalizePreferredTime('sundayFrom')}
                        placeholder="09:00"
                        placeholderTextColor="#94A3B8"
                      />
                    </View>
                    <View style={styles.scheduleField}>
                      <Text style={styles.scheduleFieldLabel}>Hasta</Text>
                      <TextInput
                        style={styles.input}
                        value={preferredWindow.sundayTo}
                        onChangeText={(value) => handlePreferredTimeChange('sundayTo', value)}
                        onBlur={() => finalizePreferredTime('sundayTo')}
                        placeholder="13:00"
                        placeholderTextColor="#94A3B8"
                      />
                    </View>
                  </View>
                )}
              </View>

              <Text style={styles.scheduleSummary}>Resumen: {formatPreferredWindow(preferredWindow)}</Text>
            </View>
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
                    Todavia no hay tecnicos conocidos. Publica en marketplace primero para generar historial.
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
                        {tech.specialty ? ` - ${tech.specialty}` : ''}
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
  locationFieldWrap: {
    zIndex: 50,
    overflow: 'visible',
  },
  locationHint: {
    marginTop: -8,
    marginBottom: 4,
    fontFamily: FONTS.body,
    fontSize: 12,
    color: '#64748B',
  },
  locationHintOk: { color: '#166534' },
  scheduleCard: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    padding: 10,
    gap: 10,
  },
  scheduleTitle: {
    fontFamily: FONTS.subtitle,
    fontSize: 13,
    color: COLORS.text,
  },
  scheduleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  scheduleField: {
    flex: 1,
    gap: 6,
  },
  scheduleFieldLabel: {
    fontFamily: FONTS.subtitle,
    fontSize: 11,
    color: '#64748B',
  },
  weekendCard: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    padding: 10,
    gap: 8,
  },
  weekendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  weekendTitle: {
    fontFamily: FONTS.subtitle,
    fontSize: 12,
    color: COLORS.text,
  },
  scheduleSummary: {
    fontFamily: FONTS.body,
    fontSize: 11,
    color: '#475569',
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
