import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import {
  KnownTechnician,
  createClientRequest,
  fetchClientWorkspace,
} from '../../api/client';
import { useMasterItems } from '../../hooks/useCatalog';
import { supabase } from '../../lib/supabase';
import { LocationAutocomplete, type LocationData } from '../../components/molecules/LocationAutocomplete';
import { ScreenHeader } from '../../components/molecules/ScreenHeader';
import { COLORS, FONTS } from '../../utils/theme';
import { buildMasterRubroOptions } from '../../utils/rubros';

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
  weekdayEnabled: boolean;
  weekdayFrom: string;
  weekdayTo: string;
  saturdayEnabled: boolean;
  saturdayFrom: string;
  saturdayTo: string;
  sundayEnabled: boolean;
  sundayFrom: string;
  sundayTo: string;
};

type WorkPhotoDraft = {
  id: string;
  name: string;
  url?: string;
  localUri?: string;
  isUploading?: boolean;
};

const DEFAULT_PREFERRED_WINDOW: PreferredWindowConfig = {
  weekdayEnabled: true,
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
const WORK_PHOTO_MIN = 3;
const WORK_PHOTO_MAX = 8;

const hasValidCoordinates = (lat: number, lng: number) =>
  Number.isFinite(lat) &&
  Number.isFinite(lng) &&
  !(Math.abs(lat) <= ZERO_COORDINATE_EPSILON && Math.abs(lng) <= ZERO_COORDINATE_EPSILON);

const formatCoordinateValue = (value: number) => Number(value).toFixed(6);

const normalizeSearchValue = (value: string) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

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
  if (!config.weekdayEnabled && !config.saturdayEnabled && !config.sundayEnabled) {
    return 'Activa al menos un bloque horario disponible para la visita.';
  }
  if (config.weekdayEnabled) {
    const weekdayFrom = timeToMinutes(config.weekdayFrom);
    const weekdayTo = timeToMinutes(config.weekdayTo);
    if (weekdayFrom < 0 || weekdayTo < 0 || weekdayFrom >= weekdayTo) {
      return 'Revisa horario de Lunes a Viernes: Desde debe ser menor que Hasta.';
    }
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
  const chunks: string[] = [];
  if (config.weekdayEnabled) chunks.push(`Lun a Vie ${config.weekdayFrom} - ${config.weekdayTo}`);
  if (config.saturdayEnabled) chunks.push(`Sab ${config.saturdayFrom} - ${config.saturdayTo}`);
  if (config.sundayEnabled) chunks.push(`Dom ${config.sundayFrom} - ${config.sundayTo}`);
  return chunks.length ? chunks.join(' | ') : 'Sin disponibilidad definida';
};

export default function ClientPublishScreen() {
  const { width } = useWindowDimensions();
  const {
    data: masterItems,
    isLoading: categoryCatalogLoading,
    error: categoryCatalogErrorRaw,
  } = useMasterItems();
  const [knownTechnicians, setKnownTechnicians] = useState<KnownTechnician[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [address, setAddress] = useState('');
  const [workLocation, setWorkLocation] = useState({ lat: 0, lng: 0 });
  const [city, setCity] = useState('');
  const [province, setProvince] = useState('');
  const [description, setDescription] = useState('');
  const [workPhotos, setWorkPhotos] = useState<WorkPhotoDraft[]>([]);
  const [preferredWindow, setPreferredWindow] = useState<PreferredWindowConfig>({ ...DEFAULT_PREFERRED_WINDOW });
  const [urgency, setUrgency] = useState<'baja' | 'media' | 'alta'>('media');
  const [mode, setMode] = useState<'marketplace' | 'direct'>('marketplace');
  const [selectedTechId, setSelectedTechId] = useState('');

  const [warning, setWarning] = useState('');
  const [errorText, setErrorText] = useState('');
  const [categoryFocused, setCategoryFocused] = useState(false);
  const [locationResolving, setLocationResolving] = useState(false);
  const [lastConfirmedAddress, setLastConfirmedAddress] = useState('');
  const isCompactScreen = width < 390;

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
  const detectedCityFromAddress = useMemo(() => extractCityFromAddress(address), [address]);
  const mapReadiness = useMemo(() => {
    if (locationResolving) return 'Validando';
    if (hasPreciseWorkLocation) return 'Exacta';
    if (address.trim()) return 'Revisar';
    return 'Pendiente';
  }, [address, hasPreciseWorkLocation, locationResolving]);
  const heroSubtitle = mode === 'direct'
    ? 'Prepara una solicitud directa con horario, direccion y tecnico objetivo.'
    : 'Completa los datos clave y deja que UrbanFix encuentre tecnicos para tu trabajo.';
  const publishHighlights = useMemo(
    () => [
      {
        key: 'mode',
        label: 'Modo',
        value: mode === 'direct' ? 'Directa' : 'Marketplace',
      },
      {
        key: 'urgency',
        label: 'Urgencia',
        value: urgency.charAt(0).toUpperCase() + urgency.slice(1),
      },
      {
        key: 'location',
        label: 'Ubicacion',
        value: mapReadiness,
      },
    ],
    [mapReadiness, mode, urgency]
  );
  const categoryOptions = useMemo(() => buildMasterRubroOptions(masterItems || []), [masterItems]);
  const normalizedCategorySearch = normalizeSearchValue(category);
  const filteredCategoryOptions = useMemo(() => {
    if (!categoryOptions.length) return [];
    if (!normalizedCategorySearch) return categoryOptions.slice(0, 8);
    return categoryOptions
      .filter((option) => normalizeSearchValue(option).includes(normalizedCategorySearch))
      .slice(0, 8);
  }, [categoryOptions, normalizedCategorySearch]);
  const hasExactCategoryMatch = useMemo(
    () => categoryOptions.some((option) => normalizeSearchValue(option) === normalizedCategorySearch),
    [categoryOptions, normalizedCategorySearch]
  );
  const categoryCatalogError = categoryOptions.length ? null : categoryCatalogErrorRaw;
  const showCategorySuggestions = categoryFocused && filteredCategoryOptions.length > 0;
  const showCategoryNoResults =
    categoryFocused && !!category.trim() && !filteredCategoryOptions.length && !categoryCatalogLoading && categoryOptions.length > 0;
  const uploadedWorkPhotoUrls = useMemo(
    () =>
      workPhotos
        .map((item) => String(item.url || '').trim())
        .filter(Boolean),
    [workPhotos]
  );

  const handleWorkLocationQueryChange = (value: string) => {
    const safeValue = String(value || '');
    setAddress(safeValue);

    if (!safeValue.trim()) {
      setWorkLocation({ lat: 0, lng: 0 });
      setLastConfirmedAddress('');
      return;
    }

    if (normalizeSearchValue(safeValue) !== normalizeSearchValue(lastConfirmedAddress)) {
      setWorkLocation({ lat: 0, lng: 0 });
    }
  };

  const handleWorkLocationSelect = ({ address: selectedAddress, lat, lng, city: selectedCity, province: selectedProvince }: LocationData) => {
    const safeAddress = String(selectedAddress || '').trim();
    const safeCity = String(selectedCity || '').trim();
    const safeProvince = String(selectedProvince || '').trim();
    const fallbackCity = extractCityFromAddress(safeAddress);
    setAddress(safeAddress);
    setLastConfirmedAddress(safeAddress);
    setWorkLocation({
      lat: Number.isFinite(lat) ? lat : 0,
      lng: Number.isFinite(lng) ? lng : 0,
    });
    setCity(safeCity || fallbackCity);
    setProvince(safeProvince);
  };

  const handleCityChange = (value: string) => {
    setCity(value);
  };

  const handleSelectCategory = (option: string) => {
    setCategory(option);
    setCategoryFocused(false);
  };

  const updateWorkPhoto = (id: string, patch: Partial<WorkPhotoDraft>) => {
    setWorkPhotos((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const removeWorkPhoto = (id: string) => {
    setWorkPhotos((prev) => prev.filter((item) => item.id !== id));
  };

  const buildWorkPhotoPath = (userId: string, fileName: string) => {
    const cleanName = String(fileName || 'obra.jpg').replace(/\s+/g, '_');
    return `${userId}/client-requests/${Date.now()}_${cleanName}`;
  };

  const uploadPendingWorkPhotos = async () => {
    if (workPhotos.length < WORK_PHOTO_MIN) {
      throw new Error(`Sube al menos ${WORK_PHOTO_MIN} fotos del trabajo antes de publicar.`);
    }

    const pendingPhotos = workPhotos.filter((item) => item.localUri && !item.url);
    if (!pendingPhotos.length) {
      return uploadedWorkPhotoUrls;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Sesion expirada. Inicia sesion nuevamente.');
    }

    const uploadedUrls: string[] = [...uploadedWorkPhotoUrls];

    for (const photo of pendingPhotos) {
      if (!photo.localUri) continue;
      updateWorkPhoto(photo.id, { isUploading: true });
      try {
        const response = await fetch(photo.localUri);
        const blob = await response.blob();
        const contentType = blob.type || 'image/jpeg';
        const filePath = buildWorkPhotoPath(user.id, photo.name || `obra_${Date.now()}.jpg`);

        const { error: uploadError } = await supabase.storage.from('urbanfix-assets').upload(filePath, blob, {
          contentType,
          upsert: true,
        });
        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from('urbanfix-assets').getPublicUrl(filePath);
        const publicUrl = String(data.publicUrl || '').trim();
        if (!publicUrl) {
          throw new Error('No pudimos obtener la URL publica de una foto.');
        }

        updateWorkPhoto(photo.id, { url: publicUrl, isUploading: false });
        uploadedUrls.push(publicUrl);
      } catch (error) {
        updateWorkPhoto(photo.id, { isUploading: false });
        throw error;
      }
    }

    return uploadedUrls;
  };

  const handlePickWorkPhotos = async () => {
    const remainingSlots = WORK_PHOTO_MAX - workPhotos.length;
    if (remainingSlots <= 0) {
      Alert.alert('Limite alcanzado', `Puedes subir hasta ${WORK_PHOTO_MAX} fotos por solicitud.`);
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso denegado', 'Necesitamos acceso a la galeria para adjuntar fotos de la obra.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.7,
      selectionLimit: remainingSlots,
    });

    if (result.canceled) return;
    const assets = (result.assets || []).slice(0, remainingSlots);
    if (!assets.length) return;

    const stamp = Date.now();
    const drafts = assets.map((asset, index) => ({
      id: `work-photo-${stamp}-${index}`,
      name: asset.fileName || `obra_${stamp}_${index}.jpg`,
      localUri: asset.uri,
      isUploading: false,
    }));

    setWorkPhotos((prev) => [...prev, ...drafts]);
  };

  const resetForm = () => {
    setTitle('');
    setCategory('');
    setCategoryFocused(false);
    setAddress('');
    setWorkLocation({ lat: 0, lng: 0 });
    setCity('');
    setProvince('');
    setDescription('');
    setWorkPhotos([]);
    setPreferredWindow({ ...DEFAULT_PREFERRED_WINDOW });
    setUrgency('media');
    setMode('marketplace');
    setSelectedTechId('');
    setLocationResolving(false);
    setLastConfirmedAddress('');
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
      if (!title.trim() || !category.trim() || !address.trim() || !city.trim() || !description.trim()) {
        throw new Error('Completa titulo, rubro, direccion exacta, ciudad y descripcion.');
      }
      if (workPhotos.length < WORK_PHOTO_MIN) {
        throw new Error(`Sube al menos ${WORK_PHOTO_MIN} fotos del trabajo antes de publicar.`);
      }
      if (locationResolving) {
        throw new Error('Estamos validando la direccion de la obra. Espera un instante antes de publicar.');
      }
      if (!categoryOptions.length) {
        throw new Error(
          categoryCatalogLoading
            ? 'Esperando rubros disponibles. Intenta nuevamente en unos segundos.'
            : 'No pudimos cargar los rubros disponibles. Actualiza e intenta otra vez.'
        );
      }
      if (!hasExactCategoryMatch) {
        throw new Error('Selecciona un rubro valido de la lista.');
      }
      if (!hasPreciseWorkLocation && address.trim().length < 8) {
        throw new Error('Completa una direccion mas precisa para ubicar la obra en el mapa operativo.');
      }

      if (mode === 'direct' && !selectedTechnician) {
        throw new Error('Selecciona un tecnico para solicitud directa.');
      }

      const preferredWindowError = validatePreferredWindow(preferredWindow);
      if (preferredWindowError) {
        throw new Error(preferredWindowError);
      }

      const photoUrls = await uploadPendingWorkPhotos();
      if (photoUrls.length < WORK_PHOTO_MIN) {
        throw new Error(`Sube al menos ${WORK_PHOTO_MIN} fotos validas del trabajo antes de publicar.`);
      }

      const payload = await createClientRequest({
        title: title.trim(),
        category: category.trim(),
        address: address.trim(),
        city: city.trim(),
        province: province.trim(),
        description: description.trim(),
        urgency,
        preferredWindow: formatPreferredWindow(preferredWindow),
        mode,
        photoUrls,
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
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.heroCard}>
            <View style={styles.heroGlowPrimary} />
            <View style={styles.heroGlowSecondary} />

            <View style={styles.heroCopy}>
              <Text style={styles.heroEyebrow}>Nueva solicitud</Text>
              <Text style={styles.heroTitle}>Publica tu trabajo con mas contexto</Text>
              <Text style={styles.heroText}>{heroSubtitle}</Text>
            </View>

            <View style={[styles.heroHighlights, isCompactScreen && styles.heroHighlightsCompact]}>
              {publishHighlights.map((item) => (
                <View key={item.key} style={styles.heroHighlightCard}>
                  <Text style={styles.heroHighlightLabel}>{item.label}</Text>
                  <Text style={styles.heroHighlightValue}>{item.value}</Text>
                </View>
              ))}
            </View>
          </View>

          {!!warning && (
            <View style={styles.noticeCard}>
              <Ionicons name="alert-circle-outline" size={16} color="#92400E" />
              <Text style={styles.warningText}>{warning}</Text>
            </View>
          )}
          {!!errorText && (
            <View style={[styles.noticeCard, styles.noticeCardError]}>
              <Ionicons name="warning-outline" size={16} color="#991B1B" />
              <Text style={styles.errorText}>{errorText}</Text>
            </View>
          )}

          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionCopy}>
                <Text style={styles.sectionEyebrow}>Paso 1</Text>
                <Text style={styles.cardTitle}>Datos del trabajo</Text>
              </View>
              <View style={styles.sectionPill}>
                <Text style={styles.sectionPillText}>Base</Text>
              </View>
            </View>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Titulo (ej: Perdida en bano)"
              placeholderTextColor="#94A3B8"
            />
            <View style={styles.categoryFieldWrap}>
              <TextInput
                style={styles.input}
                value={category}
                onChangeText={setCategory}
                onFocus={() => setCategoryFocused(true)}
                onBlur={() => setTimeout(() => setCategoryFocused(false), 120)}
                placeholder="Rubro"
                placeholderTextColor="#94A3B8"
              />
              <View style={styles.categoryHintRow}>
                <Ionicons
                  name={categoryCatalogError ? 'warning-outline' : 'search-outline'}
                  size={14}
                  color={categoryCatalogError ? '#991B1B' : '#64748B'}
                />
                <Text style={[styles.categoryHintText, categoryCatalogError && styles.categoryHintTextError]}>
                  {categoryCatalogError
                    ? 'No pudimos cargar rubros disponibles. Actualiza para reintentar.'
                    : categoryCatalogLoading
                      ? 'Cargando rubros disponibles...'
                      : 'Escribe para buscar y selecciona un rubro existente.'}
                </Text>
              </View>
              {showCategorySuggestions && (
                <View style={styles.categorySuggestionsCard}>
                  <ScrollView nestedScrollEnabled style={styles.categorySuggestionsScroll}>
                    {filteredCategoryOptions.map((option) => {
                      const selected = normalizeSearchValue(option) === normalizedCategorySearch;
                      return (
                        <TouchableOpacity
                          key={option}
                          activeOpacity={0.9}
                          onPress={() => handleSelectCategory(option)}
                          style={[styles.categoryOptionRow, selected && styles.categoryOptionRowActive]}
                        >
                          <Text style={[styles.categoryOptionText, selected && styles.categoryOptionTextActive]}>{option}</Text>
                          <Ionicons
                            name={selected ? 'checkmark-circle' : 'chevron-forward'}
                            size={16}
                            color={selected ? '#EA580C' : '#94A3B8'}
                          />
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}
              {showCategoryNoResults && (
                <View style={styles.categoryEmptyState}>
                  <Ionicons name="information-circle-outline" size={14} color="#92400E" />
                  <Text style={styles.categoryEmptyText}>No encontramos ese rubro. Elige una opcion existente.</Text>
                </View>
              )}
            </View>
            <View style={styles.locationFieldWrap}>
              <Text style={styles.fieldLabel}>Direccion exacta de la obra</Text>
              <LocationAutocomplete
                initialValue={address}
                onLocationSelect={handleWorkLocationSelect}
                onQueryChange={handleWorkLocationQueryChange}
                onLoadingChange={setLocationResolving}
                placeholder="Calle y altura donde se hara el trabajo"
              />
            </View>
            <View
              style={[
                styles.locationHintCard,
                hasPreciseWorkLocation && styles.locationHintCardOk,
                locationResolving && styles.locationHintCardPending,
              ]}
            >
              <Ionicons
                name={
                  locationResolving
                    ? 'sync-outline'
                    : hasPreciseWorkLocation
                      ? 'checkmark-circle-outline'
                      : 'information-circle-outline'
                }
                size={15}
                color={locationResolving ? '#1D4ED8' : hasPreciseWorkLocation ? '#166534' : '#64748B'}
              />
              <Text style={[styles.locationHint, hasPreciseWorkLocation && styles.locationHintOk]}>
                {locationResolving
                  ? 'Validando coordenadas de la direccion para el mapa operativo.'
                  : hasPreciseWorkLocation
                    ? 'Ubicacion exacta confirmada y lista para matching en mapa tecnico.'
                    : 'Todavia no hay coordenadas precisas. Usa una direccion exacta y confirma ciudad para ubicar la obra.'}
              </Text>
            </View>
            <View style={styles.mapAuditCard}>
              <View style={styles.mapAuditHeader}>
                <View style={styles.mapAuditTitleRow}>
                  <Ionicons name="map-outline" size={16} color="#0F172A" />
                  <Text style={styles.mapAuditTitle}>Mapa operativo</Text>
                </View>
                <View
                  style={[
                    styles.mapAuditBadge,
                    hasPreciseWorkLocation && styles.mapAuditBadgeOk,
                    locationResolving && styles.mapAuditBadgePending,
                  ]}
                >
                  <Text
                    style={[
                      styles.mapAuditBadgeText,
                      hasPreciseWorkLocation && styles.mapAuditBadgeTextOk,
                      locationResolving && styles.mapAuditBadgeTextPending,
                    ]}
                  >
                    {mapReadiness}
                  </Text>
                </View>
              </View>
              <View style={styles.mapAuditGrid}>
                <View style={styles.mapAuditItem}>
                  <Text style={styles.mapAuditLabel}>Direccion</Text>
                  <Text style={styles.mapAuditValue}>{address.trim() || 'Pendiente de confirmar'}</Text>
                </View>
                <View style={styles.mapAuditItem}>
                  <Text style={styles.mapAuditLabel}>Ciudad operativa</Text>
                  <Text style={styles.mapAuditValue}>{city.trim() || detectedCityFromAddress || 'Pendiente de definir'}</Text>
                </View>
                <View style={styles.mapAuditItem}>
                  <Text style={styles.mapAuditLabel}>Coordenadas</Text>
                  <Text style={styles.mapAuditValue}>
                    {hasPreciseWorkLocation
                      ? `${formatCoordinateValue(workLocation.lat)}, ${formatCoordinateValue(workLocation.lng)}`
                      : 'Se resolveran con la direccion'}
                  </Text>
                </View>
              </View>
              <Text style={styles.mapAuditHint}>
                Los tecnicos veran esta ubicacion en su mapa operativo. Cuanto mas exacta sea la direccion, mejor sera el matching.
              </Text>
            </View>
            <Text style={styles.fieldLabel}>Ciudad de la obra</Text>
            <TextInput
              style={styles.input}
              value={city}
              onChangeText={handleCityChange}
              placeholder="Ciudad de la obra"
              placeholderTextColor="#94A3B8"
            />
            <Text style={styles.fieldHelper}>
              {province
                ? `Ciudad detectada junto a ${province}. Corrigela solo si el buscador la resolvio mal.`
                : 'La ciudad acompana la direccion para geolocalizar mejor la obra y mejorar el matching.'}
            </Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Describe el trabajo a resolver"
              placeholderTextColor="#94A3B8"
              multiline
            />
            <View style={styles.photoCard}>
              <View style={styles.photoHeader}>
                <View style={styles.photoTitleWrap}>
                  <Text style={styles.photoTitle}>Fotos del trabajo</Text>
                  <Text style={styles.photoHint}>
                    Minimo {WORK_PHOTO_MIN}. Estas imagenes las veran los tecnicos antes de postularse o cotizar.
                  </Text>
                </View>
                <View style={styles.photoCounterPill}>
                  <Text style={styles.photoCounterText}>
                    {workPhotos.length}/{WORK_PHOTO_MAX}
                  </Text>
                </View>
              </View>

              <View style={styles.photoGrid}>
                <TouchableOpacity style={styles.addPhotoCard} onPress={handlePickWorkPhotos} activeOpacity={0.9}>
                  <Ionicons name="images-outline" size={22} color="#EA580C" />
                  <Text style={styles.addPhotoTitle}>Agregar fotos</Text>
                  <Text style={styles.addPhotoText}>Sube imagenes claras de la obra</Text>
                </TouchableOpacity>

                {workPhotos.map((photo) => (
                  <View key={photo.id} style={styles.photoPreviewCard}>
                    <Image source={{ uri: photo.url || photo.localUri }} style={styles.photoPreviewImage} />
                    <TouchableOpacity
                      style={styles.photoRemoveBtn}
                      onPress={() => removeWorkPhoto(photo.id)}
                      hitSlop={8}
                    >
                      <Ionicons name="close" size={14} color="#FFFFFF" />
                    </TouchableOpacity>
                    {!!photo.isUploading && (
                      <View style={styles.photoUploadingMask}>
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      </View>
                    )}
                  </View>
                ))}
              </View>

              <Text style={styles.photoFooter}>
                {workPhotos.length >= WORK_PHOTO_MIN
                  ? 'Cobertura visual suficiente para publicar la solicitud.'
                  : `Faltan ${WORK_PHOTO_MIN - workPhotos.length} foto(s) para habilitar la publicacion.`}
              </Text>
            </View>
            <View style={styles.scheduleCard}>
              <View style={styles.scheduleHeader}>
                <Text style={styles.scheduleTitle}>Horario preferido</Text>
                <Text style={styles.scheduleSummaryTag}>Flexible</Text>
              </View>
              <View style={styles.weekendCard}>
                <View style={styles.weekendHeader}>
                  <Text style={styles.weekendTitle}>Lun a Vie</Text>
                  <Switch
                    value={preferredWindow.weekdayEnabled}
                    onValueChange={(value) => setPreferredWindow((prev) => ({ ...prev, weekdayEnabled: value }))}
                    trackColor={{ false: '#CBD5E1', true: '#FDBA74' }}
                    thumbColor={preferredWindow.weekdayEnabled ? '#EA580C' : '#F8FAFC'}
                  />
                </View>
                {preferredWindow.weekdayEnabled && (
                  <View style={styles.scheduleRow}>
                    <View style={styles.scheduleField}>
                      <Text style={styles.scheduleFieldLabel}>Desde</Text>
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
                      <Text style={styles.scheduleFieldLabel}>Hasta</Text>
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
                )}
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
            <View style={styles.sectionHeader}>
              <View style={styles.sectionCopy}>
                <Text style={styles.sectionEyebrow}>Paso 2</Text>
                <Text style={styles.cardTitle}>Urgencia</Text>
              </View>
            </View>
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
            <View style={styles.sectionHeader}>
              <View style={styles.sectionCopy}>
                <Text style={styles.sectionEyebrow}>Paso 3</Text>
                <Text style={styles.cardTitle}>Modo de asignacion</Text>
              </View>
            </View>
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

            <Text style={styles.modeHint}>
              {mode === 'marketplace'
                ? 'UrbanFix buscara tecnicos cercanos para tu solicitud usando la ubicacion de la obra.'
                : 'La solicitud ira primero al tecnico seleccionado.'}
            </Text>

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
  content: { padding: 16, gap: 14, paddingBottom: 30 },
  heroCard: {
    backgroundColor: '#0F172A',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 18,
    gap: 14,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
  },
  heroGlowPrimary: {
    position: 'absolute',
    top: -42,
    right: -24,
    width: 164,
    height: 164,
    borderRadius: 82,
    backgroundColor: 'rgba(249, 115, 22, 0.18)',
  },
  heroGlowSecondary: {
    position: 'absolute',
    bottom: -56,
    left: -28,
    width: 144,
    height: 144,
    borderRadius: 72,
    backgroundColor: 'rgba(250, 204, 21, 0.12)',
  },
  heroCopy: { gap: 8 },
  heroEyebrow: { fontFamily: FONTS.subtitle, color: '#FCD34D', fontSize: 10, letterSpacing: 1.3 },
  heroTitle: { fontFamily: FONTS.title, color: '#FFFFFF', fontSize: 22, lineHeight: 28 },
  heroText: { fontFamily: FONTS.body, color: '#CBD5E1', fontSize: 13, lineHeight: 20, maxWidth: '92%' },
  heroHighlights: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  heroHighlightsCompact: {
    flexDirection: 'column',
  },
  heroHighlightCard: {
    flexGrow: 1,
    minWidth: 96,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.18)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 11,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    gap: 4,
  },
  heroHighlightLabel: {
    fontFamily: FONTS.body,
    color: '#94A3B8',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  heroHighlightValue: {
    fontFamily: FONTS.subtitle,
    color: '#F8FAFC',
    fontSize: 13,
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
    color: '#92400E',
    fontFamily: FONTS.body,
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
  },
  errorText: {
    color: '#991B1B',
    fontFamily: FONTS.body,
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
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
  cardTitle: { fontFamily: FONTS.subtitle, color: COLORS.text, fontSize: 18, marginBottom: 2 },
  fieldLabel: {
    fontFamily: FONTS.subtitle,
    fontSize: 12,
    color: '#334155',
    marginBottom: 2,
  },
  fieldHelper: {
    marginTop: -4,
    fontFamily: FONTS.body,
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
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
  categoryFieldWrap: {
    zIndex: 80,
    gap: 8,
    overflow: 'visible',
  },
  categoryHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: -2,
    paddingHorizontal: 2,
  },
  categoryHintText: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: '#64748B',
    flex: 1,
    lineHeight: 18,
  },
  categoryHintTextError: {
    color: '#991B1B',
  },
  categorySuggestionsCard: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
    maxHeight: 220,
  },
  categorySuggestionsScroll: {
    maxHeight: 220,
  },
  categoryOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  categoryOptionRowActive: {
    backgroundColor: '#FFF7ED',
  },
  categoryOptionText: {
    fontFamily: FONTS.body,
    fontSize: 13,
    color: COLORS.text,
    flex: 1,
  },
  categoryOptionTextActive: {
    color: '#9A3412',
    fontFamily: FONTS.subtitle,
  },
  categoryEmptyState: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 14,
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  categoryEmptyText: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: '#92400E',
    lineHeight: 18,
    flex: 1,
  },
  locationFieldWrap: {
    zIndex: 50,
    overflow: 'visible',
  },
  locationHintCard: {
    marginTop: -4,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationHintCardOk: {
    borderColor: '#BBF7D0',
    backgroundColor: '#F0FDF4',
  },
  locationHintCardPending: {
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
  },
  locationHint: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: '#64748B',
    flex: 1,
    lineHeight: 18,
  },
  locationHintOk: { color: '#166534' },
  mapAuditCard: {
    borderWidth: 1,
    borderColor: '#DCE7F5',
    borderRadius: 16,
    backgroundColor: '#F8FBFF',
    padding: 14,
    gap: 12,
  },
  mapAuditHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  mapAuditTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  mapAuditTitle: {
    fontFamily: FONTS.subtitle,
    fontSize: 14,
    color: '#0F172A',
  },
  mapAuditBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  mapAuditBadgeOk: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  mapAuditBadgePending: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  mapAuditBadgeText: {
    fontFamily: FONTS.subtitle,
    fontSize: 11,
    color: '#C2410C',
  },
  mapAuditBadgeTextOk: {
    color: '#166534',
  },
  mapAuditBadgeTextPending: {
    color: '#1D4ED8',
  },
  mapAuditGrid: {
    gap: 10,
  },
  mapAuditItem: {
    gap: 4,
  },
  mapAuditLabel: {
    fontFamily: FONTS.subtitle,
    fontSize: 11,
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  mapAuditValue: {
    fontFamily: FONTS.body,
    fontSize: 13,
    color: '#0F172A',
    lineHeight: 19,
  },
  mapAuditHint: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
  },
  photoCard: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    backgroundColor: '#FFFDF8',
    padding: 12,
    gap: 10,
  },
  photoHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  photoTitleWrap: {
    flex: 1,
    gap: 4,
  },
  photoTitle: {
    fontFamily: FONTS.subtitle,
    fontSize: 14,
    color: '#0F172A',
  },
  photoHint: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
  },
  photoCounterPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  photoCounterText: {
    fontFamily: FONTS.subtitle,
    fontSize: 11,
    color: '#C2410C',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  addPhotoCard: {
    width: 104,
    height: 104,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FED7AA',
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    gap: 6,
  },
  addPhotoTitle: {
    fontFamily: FONTS.subtitle,
    fontSize: 12,
    color: '#9A3412',
    textAlign: 'center',
  },
  addPhotoText: {
    fontFamily: FONTS.body,
    fontSize: 11,
    color: '#C2410C',
    textAlign: 'center',
    lineHeight: 15,
  },
  photoPreviewCard: {
    width: 104,
    height: 104,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#E2E8F0',
    position: 'relative',
  },
  photoPreviewImage: {
    width: '100%',
    height: '100%',
  },
  photoRemoveBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.82)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoUploadingMask: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.42)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoFooter: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
  },
  scheduleCard: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    padding: 12,
    gap: 10,
  },
  scheduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  scheduleTitle: {
    fontFamily: FONTS.subtitle,
    fontSize: 14,
    color: COLORS.text,
  },
  scheduleSummaryTag: {
    fontFamily: FONTS.subtitle,
    fontSize: 11,
    color: '#475569',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#FFFFFF',
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
  modeHint: {
    marginTop: -2,
    fontFamily: FONTS.body,
    fontSize: 12,
    lineHeight: 18,
    color: '#64748B',
  },
  techList: { gap: 8, marginTop: 4 },
  techTitle: { fontFamily: FONTS.subtitle, color: COLORS.text, fontSize: 13 },
  techEmpty: { fontFamily: FONTS.body, color: COLORS.textSecondary, fontSize: 12, lineHeight: 18 },
  techItem: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
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
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOpacity: 0.14,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  publishBtnText: { color: '#FFF', fontFamily: FONTS.title, fontSize: 14 },
});
