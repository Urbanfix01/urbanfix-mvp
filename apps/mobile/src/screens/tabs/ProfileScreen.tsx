import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, ScrollView, 
  ActivityIndicator, Alert, Image, Platform, RefreshControl, TextInput, KeyboardAvoidingView, Switch
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native'; 
import * as ImagePicker from 'expo-image-picker';
import Constants from 'expo-constants';

// --- IMPORTS DEL PROYECTO ---
import { supabase } from '../../lib/supabase';
import { COLORS, FONTS } from '../../utils/theme';
import { ScreenHeader } from '../../components/molecules/ScreenHeader';
import { uploadImageToSupabase } from '../../services/StorageService';
import { deleteCurrentAccount } from '../../services/accountDeletion';
import { setStoredAudience } from '../../utils/audience';

// --- COMPONENTES DE MAPAS ---
import TechnicianLocationPicker, {
  type TechnicianLocationPickerResult,
} from '../../components/molecules/TechnicianLocationPicker';

const fallbackExpoVersion = String(require('../../../app.json')?.expo?.version || '').trim();

// --- DEFINICIÓN DE TIPOS CORREGIDA ---
// Ahora permitimos '| null' en los campos opcionales para evitar el error de TypeScript
interface Profile {
  id: string;
  access_granted?: boolean | null;
  full_name: string | null;
  business_name: string | null;
  company_logo_url: string | null;
  avatar_url: string | null;
  banner_url?: string | null;
  profile_published?: boolean | null;
  profile_published_at?: string | null;
  email?: string | null;
  phone?: string | null;
  company_address?: string | null;
  working_hours?: string | null;
  default_discount?: number | null;
  location_lat?: number | null;
  location_lng?: number | null;
  service_lat?: number | null;
  service_lng?: number | null;
  service_location_name?: string | null;
  service_location_precision?: 'exact' | 'approx' | null;
  city?: string | null;
  service_city?: string | null;
  service_province?: string | null;
  instagram_profile_url?: string | null;
  facebook_profile_url?: string | null;
  instagram_post_url?: string | null;
  facebook_post_url?: string | null;
  work_photo_urls?: string[] | null;
}

type WorkingHoursConfig = {
  weekdayFrom: string;
  weekdayTo: string;
  saturdayEnabled: boolean;
  saturdayFrom: string;
  saturdayTo: string;
  sundayEnabled: boolean;
  sundayFrom: string;
  sundayTo: string;
};

const DEFAULT_WORKING_HOURS_CONFIG: WorkingHoursConfig = {
  weekdayFrom: '09:00',
  weekdayTo: '18:00',
  saturdayEnabled: false,
  saturdayFrom: '09:00',
  saturdayTo: '13:00',
  sundayEnabled: false,
  sundayFrom: '09:00',
  sundayTo: '13:00',
};

const MAX_WORK_PHOTOS = 6;
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

const normalizeTextForHours = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const extractTimeRange = (value: string, pattern: RegExp): [string, string] | null => {
  const match = value.match(pattern);
  if (!match) return null;
  return [match[1], match[2]];
};

const parseWorkingHoursConfig = (rawValue: string | null | undefined): WorkingHoursConfig => {
  const safe = String(rawValue || '').trim();
  const base: WorkingHoursConfig = { ...DEFAULT_WORKING_HOURS_CONFIG };
  if (!safe) return base;

  try {
    const parsed = JSON.parse(safe);
    if (parsed && typeof parsed === 'object') {
      const weekday = (parsed as any).weekday || {};
      const saturday = (parsed as any).saturday || {};
      const sunday = (parsed as any).sunday || {};
      return {
        weekdayFrom: normalizeTimeValue(weekday.from, base.weekdayFrom),
        weekdayTo: normalizeTimeValue(weekday.to, base.weekdayTo),
        saturdayEnabled: Boolean(saturday.enabled),
        saturdayFrom: normalizeTimeValue(saturday.from, base.saturdayFrom),
        saturdayTo: normalizeTimeValue(saturday.to, base.saturdayTo),
        sundayEnabled: Boolean(sunday.enabled),
        sundayFrom: normalizeTimeValue(sunday.from, base.sundayFrom),
        sundayTo: normalizeTimeValue(sunday.to, base.sundayTo),
      };
    }
  } catch {
    // Legacy text payload.
  }

  const normalized = normalizeTextForHours(safe);
  const weekdayRange =
    extractTimeRange(
      normalized,
      /lun(?:es)?\s*(?:a|-|al)\s*vie(?:rnes)?[^0-9]*(\d{1,2}:\d{2})\s*(?:-|a|hasta)\s*(\d{1,2}:\d{2})/
    ) || extractTimeRange(normalized, /(\d{1,2}:\d{2})\s*(?:-|a|hasta)\s*(\d{1,2}:\d{2})/);
  const saturdayRange = extractTimeRange(
    normalized,
    /sab(?:ado)?[^0-9]*(\d{1,2}:\d{2})\s*(?:-|a|hasta)\s*(\d{1,2}:\d{2})/
  );
  const sundayRange = extractTimeRange(
    normalized,
    /dom(?:ingo)?[^0-9]*(\d{1,2}:\d{2})\s*(?:-|a|hasta)\s*(\d{1,2}:\d{2})/
  );

  if (weekdayRange) {
    base.weekdayFrom = normalizeTimeValue(weekdayRange[0], base.weekdayFrom);
    base.weekdayTo = normalizeTimeValue(weekdayRange[1], base.weekdayTo);
  }
  if (saturdayRange) {
    base.saturdayEnabled = true;
    base.saturdayFrom = normalizeTimeValue(saturdayRange[0], base.saturdayFrom);
    base.saturdayTo = normalizeTimeValue(saturdayRange[1], base.saturdayTo);
  }
  if (sundayRange) {
    base.sundayEnabled = true;
    base.sundayFrom = normalizeTimeValue(sundayRange[0], base.sundayFrom);
    base.sundayTo = normalizeTimeValue(sundayRange[1], base.sundayTo);
  }

  return base;
};

const timeToMinutes = (time: string) => {
  const [hoursRaw, minutesRaw] = String(time || '').split(':');
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return -1;
  return hours * 60 + minutes;
};

const validateWorkingHoursConfig = (config: WorkingHoursConfig) => {
  const weekdayFrom = timeToMinutes(config.weekdayFrom);
  const weekdayTo = timeToMinutes(config.weekdayTo);
  if (weekdayFrom < 0 || weekdayTo < 0 || weekdayFrom >= weekdayTo) {
    return 'Revisa Lunes a Viernes: Desde debe ser menor que Hasta.';
  }
  if (config.saturdayEnabled) {
    const saturdayFrom = timeToMinutes(config.saturdayFrom);
    const saturdayTo = timeToMinutes(config.saturdayTo);
    if (saturdayFrom < 0 || saturdayTo < 0 || saturdayFrom >= saturdayTo) {
      return 'Revisa Sabado: Desde debe ser menor que Hasta.';
    }
  }
  if (config.sundayEnabled) {
    const sundayFrom = timeToMinutes(config.sundayFrom);
    const sundayTo = timeToMinutes(config.sundayTo);
    if (sundayFrom < 0 || sundayTo < 0 || sundayFrom >= sundayTo) {
      return 'Revisa Domingo: Desde debe ser menor que Hasta.';
    }
  }
  return '';
};

const stringifyWorkingHoursConfig = (config: WorkingHoursConfig) =>
  JSON.stringify({
    weekday: {
      from: normalizeTimeValue(config.weekdayFrom, DEFAULT_WORKING_HOURS_CONFIG.weekdayFrom),
      to: normalizeTimeValue(config.weekdayTo, DEFAULT_WORKING_HOURS_CONFIG.weekdayTo),
    },
    saturday: {
      enabled: Boolean(config.saturdayEnabled),
      from: normalizeTimeValue(config.saturdayFrom, DEFAULT_WORKING_HOURS_CONFIG.saturdayFrom),
      to: normalizeTimeValue(config.saturdayTo, DEFAULT_WORKING_HOURS_CONFIG.saturdayTo),
    },
    sunday: {
      enabled: Boolean(config.sundayEnabled),
      from: normalizeTimeValue(config.sundayFrom, DEFAULT_WORKING_HOURS_CONFIG.sundayFrom),
      to: normalizeTimeValue(config.sundayTo, DEFAULT_WORKING_HOURS_CONFIG.sundayTo),
    },
  });

const formatWorkingHoursSummary = (config: WorkingHoursConfig) => {
  const chunks = [`Lun a Vie ${config.weekdayFrom} - ${config.weekdayTo}`];
  if (config.saturdayEnabled) chunks.push(`Sab ${config.saturdayFrom} - ${config.saturdayTo}`);
  if (config.sundayEnabled) chunks.push(`Dom ${config.sundayFrom} - ${config.sundayTo}`);
  return chunks.join(' | ');
};

const normalizeExternalUrl = (value: string) => {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
};

const normalizeStringArray = (value: unknown) =>
  Array.isArray(value) ? value.map((item) => String(item || '').trim()).filter(Boolean) : [];

const normalizeSocialUrl = (
  value: string,
  allowedHosts: string[],
  fieldLabel: string
) => {
  const trimmed = String(value || '').trim();
  if (!trimmed) return null;

  const normalized = normalizeExternalUrl(trimmed);

  try {
    const parsed = new URL(normalized);
    const host = parsed.hostname.toLowerCase();
    if (!allowedHosts.some((allowedHost) => host.includes(allowedHost))) {
      throw new Error(`${fieldLabel}: pega un link publico de ${fieldLabel.toLowerCase()}.`);
    }
    return normalized;
  } catch (error) {
    if (error instanceof Error && error.message.trim()) {
      throw error;
    }
    throw new Error(`${fieldLabel}: pega una URL valida.`);
  }
};

type ProfileScreenProps = {
  requiredCompletion?: boolean;
  onProfileUpdated?: () => void;
};

export default function ProfileScreen({
  requiredCompletion = false,
  onProfileUpdated,
}: ProfileScreenProps) {
  const navigation = useNavigation<any>();
  const isWeb = Platform.OS === 'web';
  const appVersion = String(
    (Constants.expoConfig as any)?.version || (Constants as any)?.manifest2?.extra?.expoClient?.version || fallbackExpoVersion || ''
  ).trim();
  
  // Estados de UI
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [uploadingImage, setUploadingImage] = useState<'logo' | 'avatar' | 'banner' | null>(null);
  const [uploadingWorkPhoto, setUploadingWorkPhoto] = useState(false);
  const [isEditing, setIsEditing] = useState(requiredCompletion);
  const [deletingAccount, setDeletingAccount] = useState(false);
  
  // Estados de Datos (Formulario)
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [instagramProfileUrl, setInstagramProfileUrl] = useState('');
  const [facebookProfileUrl, setFacebookProfileUrl] = useState('');
  const [instagramPostUrl, setInstagramPostUrl] = useState('');
  const [facebookPostUrl, setFacebookPostUrl] = useState('');
  const [showFeaturedPostsEditor, setShowFeaturedPostsEditor] = useState(false);
  const [workPhotoUrls, setWorkPhotoUrls] = useState<string[]>([]);
  const [defaultDiscount, setDefaultDiscount] = useState('');
  const [location, setLocation] = useState({ lat: 0, lng: 0 });
  const [technicianLocationResult, setTechnicianLocationResult] = useState<TechnicianLocationPickerResult | null>(null);
  const [serviceCity, setServiceCity] = useState('');
  const [serviceProvince, setServiceProvince] = useState('');
  const [locationResolving, setLocationResolving] = useState(false);
  const [lastConfirmedAddress, setLastConfirmedAddress] = useState('');
  const [workingHours, setWorkingHours] = useState<WorkingHoursConfig>({ ...DEFAULT_WORKING_HOURS_CONFIG });
  const hasPreciseOperationalBase = useMemo(
    () => Boolean(technicianLocationResult?.isValid && technicianLocationResult.precision === 'exact'),
    [technicianLocationResult]
  );
  const baseReadiness = useMemo(() => {
    if (locationResolving) return 'Validando';
    if (hasPreciseOperationalBase) return 'Exacta';
    if (technicianLocationResult?.isValid) return 'Confirmar';
    if (address.trim()) return 'Revisar';
    return 'Pendiente';
  }, [address, hasPreciseOperationalBase, locationResolving, technicianLocationResult]);

  useEffect(() => {
    if (requiredCompletion) {
      setIsEditing(true);
    }
  }, [requiredCompletion]);

  // --- 1. LÓGICA DE CARGA DE DATOS ---
  const getProfile = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user');

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      const userProfile: Profile = { ...data, email: user.email };
      setProfile(userProfile);

      // Rellenar formulario local
      setFullName(userProfile.full_name || '');
      setBusinessName(userProfile.business_name || '');
      setPhone(userProfile.phone || '');
      const nextAddress = userProfile.company_address || userProfile.service_location_name || '';
      setAddress(nextAddress);
      setLastConfirmedAddress(String(userProfile.service_location_name || nextAddress).trim());
      setInstagramProfileUrl(userProfile.instagram_profile_url || '');
      setFacebookProfileUrl(userProfile.facebook_profile_url || '');
      setInstagramPostUrl(userProfile.instagram_post_url || '');
      setFacebookPostUrl(userProfile.facebook_post_url || '');
      setShowFeaturedPostsEditor(Boolean(userProfile.instagram_post_url || userProfile.facebook_post_url));
      setWorkPhotoUrls(normalizeStringArray(userProfile.work_photo_urls).slice(0, MAX_WORK_PHOTOS));
      setDefaultDiscount(userProfile.default_discount !== null && userProfile.default_discount !== undefined ? String(userProfile.default_discount) : '');
      setWorkingHours(parseWorkingHoursConfig(userProfile.working_hours));
      setServiceCity(userProfile.service_city || userProfile.city || extractCityFromAddress(nextAddress));
      setServiceProvince(userProfile.service_province || '');
      const resolvedLat = Number(userProfile.service_lat ?? userProfile.location_lat ?? 0);
      const resolvedLng = Number(userProfile.service_lng ?? userProfile.location_lng ?? 0);
      if (hasValidCoordinates(resolvedLat, resolvedLng)) {
        setLocation({ lat: resolvedLat, lng: resolvedLng });
        setTechnicianLocationResult({
          lat: resolvedLat,
          lng: resolvedLng,
          displayName: String(userProfile.service_location_name || nextAddress).trim() || nextAddress,
          isValid: true,
          precision: userProfile.service_location_precision === 'approx' ? 'approx' : 'exact',
          city: userProfile.service_city || userProfile.city || extractCityFromAddress(nextAddress),
          province: userProfile.service_province || '',
        });
      } else {
        setLocation({ lat: 0, lng: 0 });
        setTechnicianLocationResult(null);
      }

    } catch (error) {
      console.log('Error perfil:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => { 
        getProfile(!!profile); 
    }, [])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    getProfile(true);
  }, []);

  // --- 2. LÓGICA DE SUBIDA DE IMÁGENES ---
  const handleImagePick = async (type: 'logo' | 'avatar' | 'banner') => {
    try {
      if (!isEditing) return;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: type === 'avatar' ? [1, 1] : type === 'logo' ? [4, 3] : [16, 9],
        quality: 0.7,
      });

      if (result.canceled) return;

      setUploadingImage(type);
      const localUri = result.assets[0].uri;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sesión no válida");

      const fileName = `${type}_${Date.now()}.png`; 
      const publicUrl = await uploadImageToSupabase(localUri, user.id, fileName);

      if (!publicUrl) throw new Error("No se pudo obtener la URL pública");

      const column = type === 'avatar' ? 'avatar_url' : type === 'logo' ? 'company_logo_url' : 'banner_url';
      
      const { error: dbError } = await supabase
        .from('profiles')
        .update({ [column]: publicUrl })
        .eq('id', user.id);

      if (dbError) throw dbError;

      // Optimistic update
      setProfile(prev => prev ? ({ ...prev, [column]: publicUrl }) : null);

    } catch (error) {
      console.error(error);
      Alert.alert("Error", "No se pudo subir la imagen.");
    } finally {
      setUploadingImage(null);
    }
  };

  const handleWorkPhotoPick = async () => {
    try {
      if (!isEditing) return;
      if (workPhotoUrls.length >= MAX_WORK_PHOTOS) {
        throw new Error(`Puedes mostrar hasta ${MAX_WORK_PHOTOS} fotos de trabajos.`);
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.72,
      });

      if (result.canceled) return;

      setUploadingWorkPhoto(true);

      const localUri = result.assets[0].uri;
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error('Sesion no valida');

      const fileName = `work_${Date.now()}.png`;
      const publicUrl = await uploadImageToSupabase(localUri, user.id, fileName);

      if (!publicUrl) throw new Error('No se pudo obtener la URL publica');

      setWorkPhotoUrls((prev) => [...prev, publicUrl].slice(0, MAX_WORK_PHOTOS));
    } catch (error: any) {
      const msg = error?.message || 'No se pudo subir la foto del trabajo.';
      isWeb ? alert(msg) : Alert.alert('Error', msg);
    } finally {
      setUploadingWorkPhoto(false);
    }
  };

  // --- 3. LÓGICA DE GUARDADO DE DATOS Y MAPA ---
  const handleLocationQueryChange = (value: string) => {
    const safeValue = String(value || '');
    setAddress(safeValue);

    if (!safeValue.trim()) {
      setLocation({ lat: 0, lng: 0 });
      setTechnicianLocationResult(null);
      setLastConfirmedAddress('');
      setServiceCity('');
      setServiceProvince('');
      return;
    }

    if (safeValue.trim().toLowerCase() !== lastConfirmedAddress.trim().toLowerCase()) {
      setLocation({ lat: 0, lng: 0 });
      setTechnicianLocationResult(null);
      setServiceCity('');
      setServiceProvince('');
    }
  };

  const handleTechnicianLocationChange = (result: TechnicianLocationPickerResult | null) => {
    if (!result) {
      setTechnicianLocationResult(null);
      setLocation({ lat: 0, lng: 0 });
      return;
    }

    const safeAddress = String(result.displayName || '').trim();
    const safeCity = String(result.city || '').trim();
    const safeProvince = String(result.province || '').trim();

    setAddress(safeAddress);
    setLastConfirmedAddress(safeAddress);
    setTechnicianLocationResult(result);
    setLocation({
      lat: Number.isFinite(result.lat) ? result.lat : 0,
      lng: Number.isFinite(result.lng) ? result.lng : 0,
    });
    setServiceCity(safeCity || extractCityFromAddress(safeAddress));
    setServiceProvince(safeProvince);
  };

  const saveProfileData = async () => {
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user');
      if (requiredCompletion && (!businessName.trim() || !phone.trim())) {
        throw new Error('Completa telefono y nombre comercial para continuar.');
      }
      if (requiredCompletion && !address.trim()) {
        throw new Error('Completa tu base operativa para continuar.');
      }
      if (!technicianLocationResult?.isValid || technicianLocationResult.precision !== 'exact') {
        throw new Error('Elige y confirma en el mapa el punto exacto donde quieres aparecer.');
      }
      const workingHoursError = validateWorkingHoursConfig(workingHours);
      if (workingHoursError) throw new Error(workingHoursError);
      const normalizedInstagramProfileUrl = normalizeSocialUrl(
        instagramProfileUrl,
        ['instagram.com'],
        'Perfil de Instagram'
      );
      const normalizedFacebookProfileUrl = normalizeSocialUrl(
        facebookProfileUrl,
        ['facebook.com'],
        'Perfil de Facebook'
      );
      const normalizedInstagramPostUrl = normalizeSocialUrl(
        instagramPostUrl,
        ['instagram.com'],
        'Publicacion de Instagram'
      );
      const normalizedFacebookPostUrl = normalizeSocialUrl(
        facebookPostUrl,
        ['facebook.com', 'fb.watch'],
        'Publicacion de Facebook'
      );

      const safeAddress = String(technicianLocationResult.displayName || address || '').trim();
      const safeServiceCity =
        String(technicianLocationResult.city || serviceCity || '').trim() || extractCityFromAddress(safeAddress);
      const safeServiceProvince = String(technicianLocationResult.province || serviceProvince || '').trim();
      const preciseLat = Number(technicianLocationResult.lat.toFixed(6));
      const preciseLng = Number(technicianLocationResult.lng.toFixed(6));

      const updates = {
        id: user.id,
        email: user.email || null,
        access_granted: true,
        profile_published: profile?.profile_published === false ? false : true,
        profile_published_at:
          profile?.profile_published === false
            ? profile?.profile_published_at || null
            : profile?.profile_published_at || new Date().toISOString(),
        full_name: fullName,
        business_name: businessName,
        phone: phone,
        city: safeServiceCity || null,
        company_address: safeAddress,
        service_city: safeServiceCity || null,
        service_province: safeServiceProvince || null,
        service_location_name: safeAddress,
        service_location_precision: 'exact' as const,
        instagram_profile_url: normalizedInstagramProfileUrl,
        facebook_profile_url: normalizedFacebookProfileUrl,
        instagram_post_url: normalizedInstagramPostUrl,
        facebook_post_url: normalizedFacebookPostUrl,
        work_photo_urls: workPhotoUrls.filter((url) => isValidUrl(url)).slice(0, MAX_WORK_PHOTOS),
        default_discount: parsePercent(defaultDiscount),
        working_hours: stringifyWorkingHoursConfig(workingHours),
        location_lat: preciseLat,
        location_lng: preciseLng,
        service_lat: preciseLat,
        service_lng: preciseLng,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('profiles').upsert(updates);

      if (error) throw error;

      // Actualizar estado local del perfil
      // TypeScript ahora estará feliz porque Profile acepta null en lat/lng
      setProfile(prev => prev ? ({ ...prev, ...updates }) : null);
      setIsEditing(false);
      onProfileUpdated?.();

      const msg = 'Perfil actualizado con tu punto en el mapa.';
      isWeb ? alert(msg) : Alert.alert("Éxito", msg);

    } catch (error: any) {
      console.error(error);
      const msg = error.message || "Error al actualizar";
      isWeb ? alert(msg) : Alert.alert("Error", msg);
    } finally {
      setSaving(false);
    }
  };

  // --- 4. HELPERS ---
  const handleLogout = async () => {
    const performLogout = async () => {
        try { await supabase.auth.signOut(); } 
        catch (error) { console.error("Error saliendo:", error); }
    };
    if (Platform.OS === 'web') {
        if (window.confirm("¿Cerrar sesión?")) await performLogout();
    } else {
        Alert.alert("Cerrar Sesión", "¿Seguro?", [
            { text: "Cancelar", style: "cancel" },
            { text: "Salir", style: "destructive", onPress: performLogout }
        ]);
    }
  };

  const confirmDeleteAccount = async () => {
    try {
      setDeletingAccount(true);
      await setStoredAudience('tecnico');
      await deleteCurrentAccount();
      const successMessage = 'Tu cuenta fue eliminada correctamente.';
      isWeb ? alert(successMessage) : Alert.alert('Cuenta eliminada', successMessage);
    } catch (error: any) {
      const errorMessage = error?.message || 'No se pudo eliminar la cuenta.';
      isWeb ? alert(errorMessage) : Alert.alert('Error', errorMessage);
    } finally {
      setDeletingAccount(false);
    }
  };

  const handleDeleteAccount = () => {
    const warningMessage = 'Esta accion elimina tu cuenta de forma permanente y no se puede deshacer.';

    if (Platform.OS === 'web') {
      if (window.confirm(`${warningMessage}\n\nDeseas continuar?`)) {
        void confirmDeleteAccount();
      }
      return;
    }

    Alert.alert('Eliminar cuenta', warningMessage, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => void confirmDeleteAccount() },
    ]);
  };

  const getInitials = (name?: string | null) => {
    if (!name) return 'UF';
    return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
  };

  const isValidUrl = (url?: string | null) => !!url && url.startsWith('http');

  const parsePercent = (value: string) => {
    const cleaned = (value || '').replace(',', '.').replace(/[^\d.]/g, '');
    const parsed = Number(cleaned);
    if (!Number.isFinite(parsed)) return 0;
    return Math.min(100, Math.max(0, parsed));
  };

  const handleWorkingTimeChange = (
    key: 'weekdayFrom' | 'weekdayTo' | 'saturdayFrom' | 'saturdayTo' | 'sundayFrom' | 'sundayTo',
    rawValue: string
  ) => {
    const sanitized = String(rawValue || '')
      .replace(/[^\d:]/g, '')
      .slice(0, 5);
    setWorkingHours((prev) => ({ ...prev, [key]: sanitized }));
  };

  const finalizeWorkingTime = (
    key: 'weekdayFrom' | 'weekdayTo' | 'saturdayFrom' | 'saturdayTo' | 'sundayFrom' | 'sundayTo'
  ) => {
    setWorkingHours((prev) => ({
      ...prev,
      [key]: normalizeTimeValue(prev[key], DEFAULT_WORKING_HOURS_CONFIG[key]),
    }));
  };

  const handleRemoveWorkPhoto = (photoUrl: string) => {
    if (!isEditing) return;
    setWorkPhotoUrls((prev) => prev.filter((item) => item !== photoUrl));
  };

  const handleCancelEdit = () => {
    if (profile) {
      setFullName(profile.full_name || '');
      setBusinessName(profile.business_name || '');
      setPhone(profile.phone || '');
      const safeAddress = profile.company_address || '';
      setAddress(safeAddress);
      setLastConfirmedAddress(String(profile.service_location_name || safeAddress).trim());
      setInstagramProfileUrl(profile.instagram_profile_url || '');
      setFacebookProfileUrl(profile.facebook_profile_url || '');
      setInstagramPostUrl(profile.instagram_post_url || '');
      setFacebookPostUrl(profile.facebook_post_url || '');
      setShowFeaturedPostsEditor(Boolean(profile.instagram_post_url || profile.facebook_post_url));
      setWorkPhotoUrls(normalizeStringArray(profile.work_photo_urls).slice(0, MAX_WORK_PHOTOS));
      setDefaultDiscount(
        profile.default_discount !== null && profile.default_discount !== undefined
          ? String(profile.default_discount)
          : ''
      );
      setWorkingHours(parseWorkingHoursConfig(profile.working_hours));
      setServiceCity(profile.service_city || profile.city || extractCityFromAddress(safeAddress));
      setServiceProvince(profile.service_province || '');
      const resolvedLat = Number(profile.service_lat ?? profile.location_lat ?? 0);
      const resolvedLng = Number(profile.service_lng ?? profile.location_lng ?? 0);
      if (hasValidCoordinates(resolvedLat, resolvedLng)) {
        setLocation({ lat: resolvedLat, lng: resolvedLng });
        setTechnicianLocationResult({
          lat: resolvedLat,
          lng: resolvedLng,
          displayName: String(profile.service_location_name || safeAddress).trim() || safeAddress,
          isValid: true,
          precision: profile.service_location_precision === 'approx' ? 'approx' : 'exact',
          city: profile.service_city || profile.city || extractCityFromAddress(safeAddress),
          province: profile.service_province || '',
        });
      } else {
        setLocation({ lat: 0, lng: 0 });
        setTechnicianLocationResult(null);
      }
    }
    setIsEditing(false);
  };

  // --- RENDER ---
  if (loading && !profile) return <View style={[styles.container, styles.center]}><ActivityIndicator color={COLORS.primary} /></View>;

  const MenuOption = ({ icon, label, onPress, isNew }: any) => (
    <TouchableOpacity style={styles.menuOption} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.menuLeft}>
        <View style={styles.iconCircle}>
          <Ionicons name={icon} size={18} color={COLORS.primary} />
        </View>
        <Text style={styles.menuText}>{label}</Text>
        {isNew && <View style={styles.badge}><Text style={styles.badgeText}>NUEVO</Text></View>}
      </View>
      <View style={styles.chevronCircle}>
        <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
      </View>
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScreenHeader
        title={requiredCompletion ? 'Completa tu perfil' : 'Mi Perfil'}
        subtitle={requiredCompletion ? 'Requisito de acceso' : 'Configuracion y cuenta'}
        centerTitle={isWeb}
      />

      <ScrollView 
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        keyboardShouldPersistTaps="always"
      >
        {requiredCompletion && (
          <View style={styles.requiredCard}>
            <Ionicons name="shield-checkmark-outline" size={18} color="#C2410C" />
            <View style={styles.requiredCopy}>
              <Text style={styles.requiredTitle}>Completa tu ficha operativa para habilitar el acceso.</Text>
              <Text style={styles.requiredText}>Necesitamos telefono, nombre comercial y el punto exacto en el mapa para activar matching por zona y mapa operativo.</Text>
            </View>
          </View>
        )}
        
        {/* === SECCIÓN 1: IMÁGENES === */}
        <View style={styles.brandCard}>
          {/* Banner */}
          <TouchableOpacity 
            style={styles.brandBanner} 
            onPress={() => handleImagePick('banner')}
            disabled={!isEditing || uploadingImage !== null}
            activeOpacity={0.9}
          >
            {uploadingImage === 'banner' ? (
               <ActivityIndicator color={COLORS.primary} size="large" />
            ) : isValidUrl(profile?.banner_url) ? (
              <Image source={{ uri: profile?.banner_url! }} style={styles.bannerImage} resizeMode="cover" />
            ) : isValidUrl(profile?.company_logo_url) ? (
              <Image source={{ uri: profile?.company_logo_url! }} style={styles.bannerImage} resizeMode="cover" />
            ) : (
              <View style={styles.bannerPlaceholder}>
                <Ionicons name="image-outline" size={40} color="rgba(0,0,0,0.1)" />
                <Text style={styles.placeholderText}>Toca para subir Banner</Text>
              </View>
            )}
            {isEditing && uploadingImage !== 'banner' && (
                <View style={styles.editIconBanner}><Ionicons name="pencil" size={12} color="#FFF" /></View>
            )}
          </TouchableOpacity>

          <View style={styles.brandContent}>
            {/* Avatar */}
            <TouchableOpacity 
                style={styles.avatarContainer}
                onPress={() => handleImagePick('avatar')}
                disabled={!isEditing || uploadingImage !== null}
                activeOpacity={0.9}
            >
              {uploadingImage === 'avatar' ? (
                <View style={[styles.avatarImage, styles.center]}><ActivityIndicator color={COLORS.primary} /></View>
              ) : isValidUrl(profile?.avatar_url) ? (
                <Image source={{ uri: profile?.avatar_url! }} style={styles.avatarImage} />
              ) : (
                <View style={[styles.avatarImage, styles.avatarPlaceholder]}>
                  <Text style={styles.avatarText}>{getInitials(fullName || profile?.full_name)}</Text>
                </View>
              )}
              {isEditing && uploadingImage !== 'avatar' && (
                  <View style={styles.editIconAvatar}><Ionicons name="camera" size={14} color="#FFF" /></View>
              )}
            </TouchableOpacity>
            
            <View style={styles.brandInfo}>
              <Text style={styles.businessName}>{businessName || 'Tu Empresa Aquí'}</Text>
              <Text style={styles.personName}>{fullName || profile?.full_name || 'Nombre del Técnico'}</Text>
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={14} color="#FFF" />
                <Text style={styles.verifiedText}>Técnico Verificado</Text>
              </View>
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => handleImagePick('logo')}
                disabled={!isEditing || uploadingImage !== null}
                style={{
                  marginTop: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  alignSelf: 'flex-start',
                  paddingRight: 10,
                }}
              >
                <View
                  style={{
                    width: 54,
                    height: 54,
                    borderRadius: 16,
                    overflow: 'hidden',
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.14)',
                    backgroundColor: 'rgba(255,255,255,0.08)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {uploadingImage === 'logo' ? (
                    <ActivityIndicator color={COLORS.primary} />
                  ) : isValidUrl(profile?.company_logo_url) ? (
                    <Image source={{ uri: profile?.company_logo_url! }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                  ) : (
                    <Ionicons name="business-outline" size={22} color="#FFFFFF" />
                  )}
                </View>
                <View style={{ gap: 2 }}>
                  <Text style={{ color: '#FFFFFF', fontFamily: FONTS.subtitle, fontSize: 12 }}>Imagen de empresa</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.68)', fontFamily: FONTS.body, fontSize: 11 }}>
                    Logo o foto de tu negocio
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* === SECCIÓN 2: DATOS EDITABLES === */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Datos de la Empresa</Text>
          {!requiredCompletion &&
            (isEditing ? (
              <TouchableOpacity style={styles.cancelEditBtn} onPress={handleCancelEdit}>
                <Ionicons name="close" size={14} color="#64748B" />
                <Text style={styles.cancelEditText}>Cancelar</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.editProfileBtn} onPress={() => setIsEditing(true)}>
                <Ionicons name="create-outline" size={14} color="#0F172A" />
                <Text style={styles.editProfileText}>Editar perfil</Text>
              </TouchableOpacity>
            ))}
        </View>
        <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>NOMBRE REAL</Text>
                <TextInput 
                    style={[styles.inputField, !isEditing && styles.inputFieldDisabled]} 
                    value={fullName} 
                    onChangeText={setFullName}
                    placeholder="Ej: Juan Perez"
                    editable={isEditing}
                    selectTextOnFocus={isEditing}
                />
            </View>
            
            {/* Input Nombre Empresa */}
            <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>NOMBRE COMERCIAL</Text>
                <TextInput 
                    style={[styles.inputField, !isEditing && styles.inputFieldDisabled]} 
                    value={businessName} 
                    onChangeText={setBusinessName}
                    placeholder="Ej: FixIt Soluciones"
                    editable={isEditing}
                    selectTextOnFocus={isEditing}
                />
            </View>

            {/* Input Teléfono */}
            <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>TELÉFONO / WHATSAPP</Text>
                <TextInput 
                    style={[styles.inputField, !isEditing && styles.inputFieldDisabled]} 
                    value={phone} 
                    onChangeText={setPhone}
                    placeholder="+54 9 11..."
                    keyboardType="phone-pad"
                    editable={isEditing}
                    selectTextOnFocus={isEditing}
                />
            </View>

            {/* Selector de Mapa (Base Operativa) */}
            <View style={[styles.inputGroup, styles.operationalBaseGroup]}>
                <Text style={styles.inputLabel}>BASE OPERATIVA</Text>
                <View style={styles.operationalBaseFieldWrap}>
                    {isEditing ? (
                    <TechnicianLocationPicker
                      value={technicianLocationResult}
                      onChange={handleTechnicianLocationChange}
                      query={address}
                      onQueryChange={handleLocationQueryChange}
                      onLoadingChange={setLocationResolving}
                      placeholder="Calle, altura, localidad y provincia"
                        />
                    ) : (
                        <View style={styles.readonlyField}>
                          <Ionicons name="location-outline" size={16} color="#94A3B8" />
                          <Text style={styles.readonlyText}>{address || 'Sin dirección'}</Text>
                        </View>
                    )}
                </View>
                <View
                  style={[
                    styles.operationalBaseStatusCard,
                    hasPreciseOperationalBase && styles.operationalBaseStatusCardOk,
                    locationResolving && styles.operationalBaseStatusCardPending,
                  ]}
                >
                  <View style={styles.operationalBaseStatusHeader}>
                    <View style={styles.operationalBaseStatusTitleWrap}>
                      <Ionicons
                        name={
                          locationResolving
                            ? 'sync-outline'
                            : hasPreciseOperationalBase
                              ? 'checkmark-circle-outline'
                              : 'information-circle-outline'
                        }
                        size={16}
                        color={locationResolving ? '#1D4ED8' : hasPreciseOperationalBase ? '#166534' : '#64748B'}
                      />
                      <Text style={styles.operationalBaseStatusTitle}>Precision operativa</Text>
                    </View>
                    <View
                      style={[
                        styles.operationalBaseBadge,
                        hasPreciseOperationalBase && styles.operationalBaseBadgeOk,
                        locationResolving && styles.operationalBaseBadgePending,
                      ]}
                    >
                      <Text
                        style={[
                          styles.operationalBaseBadgeText,
                          hasPreciseOperationalBase && styles.operationalBaseBadgeTextOk,
                          locationResolving && styles.operationalBaseBadgeTextPending,
                        ]}
                      >
                        {baseReadiness}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.operationalBaseStatusText, hasPreciseOperationalBase && styles.operationalBaseStatusTextOk]}>
                    {locationResolving
                      ? 'Validando coordenadas para abrir tu punto en el mapa.'
                      : hasPreciseOperationalBase
                        ? 'Punto confirmado y listo para mapa operativo y matching por radio.'
                        : technicianLocationResult?.isValid
                          ? 'Confirma el punto en el mapa para guardar dónde apareces.'
                          : 'Busca la direccion y confirma el punto exacto en el mapa para definir dónde apareces.'}
                  </Text>
                  <View style={styles.operationalBaseMetaGrid}>
                    <View style={styles.operationalBaseMetaItem}>
                      <Text style={styles.operationalBaseMetaLabel}>Ciudad</Text>
                      <Text style={styles.operationalBaseMetaValue}>{serviceCity || 'Pendiente'}</Text>
                    </View>
                    <View style={styles.operationalBaseMetaItem}>
                      <Text style={styles.operationalBaseMetaLabel}>Provincia</Text>
                      <Text style={styles.operationalBaseMetaValue}>{serviceProvince || 'Pendiente'}</Text>
                    </View>
                    <View style={styles.operationalBaseMetaItem}>
                      <Text style={styles.operationalBaseMetaLabel}>Latitud</Text>
                      <Text style={styles.operationalBaseMetaValue}>
                        {technicianLocationResult?.isValid ? location.lat.toFixed(6) : 'Pendiente'}
                      </Text>
                    </View>
                    <View style={styles.operationalBaseMetaItem}>
                      <Text style={styles.operationalBaseMetaLabel}>Longitud</Text>
                      <Text style={styles.operationalBaseMetaValue}>
                        {technicianLocationResult?.isValid ? location.lng.toFixed(6) : 'Pendiente'}
                      </Text>
                    </View>
                  </View>
                </View>
            </View>

            {/* Botón Guardar Cambios de Texto */}
            <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>HORARIOS DE ATENCION</Text>
                <View style={styles.scheduleCard}>
                  <View style={styles.scheduleRow}>
                    <View style={styles.scheduleField}>
                      <Text style={styles.scheduleFieldLabel}>Lun a Vie desde</Text>
                      <TextInput
                        style={[styles.inputField, !isEditing && styles.inputFieldDisabled]}
                        value={workingHours.weekdayFrom}
                        onChangeText={(value) => handleWorkingTimeChange('weekdayFrom', value)}
                        onBlur={() => finalizeWorkingTime('weekdayFrom')}
                        placeholder="09:00"
                        editable={isEditing}
                        selectTextOnFocus={isEditing}
                      />
                    </View>
                    <View style={styles.scheduleField}>
                      <Text style={styles.scheduleFieldLabel}>Lun a Vie hasta</Text>
                      <TextInput
                        style={[styles.inputField, !isEditing && styles.inputFieldDisabled]}
                        value={workingHours.weekdayTo}
                        onChangeText={(value) => handleWorkingTimeChange('weekdayTo', value)}
                        onBlur={() => finalizeWorkingTime('weekdayTo')}
                        placeholder="18:00"
                        editable={isEditing}
                        selectTextOnFocus={isEditing}
                      />
                    </View>
                  </View>

                  <View style={styles.weekendCard}>
                    <View style={styles.weekendHeader}>
                      <Text style={styles.weekendTitle}>Sabado (opcional)</Text>
                      <Switch
                        value={workingHours.saturdayEnabled}
                        disabled={!isEditing}
                        onValueChange={(value) => setWorkingHours((prev) => ({ ...prev, saturdayEnabled: value }))}
                        trackColor={{ false: '#CBD5E1', true: '#FDBA74' }}
                        thumbColor={workingHours.saturdayEnabled ? '#EA580C' : '#F8FAFC'}
                      />
                    </View>
                    {workingHours.saturdayEnabled && (
                      <View style={styles.scheduleRow}>
                        <View style={styles.scheduleField}>
                          <Text style={styles.scheduleFieldLabel}>Desde</Text>
                          <TextInput
                            style={[styles.inputField, !isEditing && styles.inputFieldDisabled]}
                            value={workingHours.saturdayFrom}
                            onChangeText={(value) => handleWorkingTimeChange('saturdayFrom', value)}
                            onBlur={() => finalizeWorkingTime('saturdayFrom')}
                            placeholder="09:00"
                            editable={isEditing}
                            selectTextOnFocus={isEditing}
                          />
                        </View>
                        <View style={styles.scheduleField}>
                          <Text style={styles.scheduleFieldLabel}>Hasta</Text>
                          <TextInput
                            style={[styles.inputField, !isEditing && styles.inputFieldDisabled]}
                            value={workingHours.saturdayTo}
                            onChangeText={(value) => handleWorkingTimeChange('saturdayTo', value)}
                            onBlur={() => finalizeWorkingTime('saturdayTo')}
                            placeholder="13:00"
                            editable={isEditing}
                            selectTextOnFocus={isEditing}
                          />
                        </View>
                      </View>
                    )}
                  </View>

                  <View style={styles.weekendCard}>
                    <View style={styles.weekendHeader}>
                      <Text style={styles.weekendTitle}>Domingo (opcional)</Text>
                      <Switch
                        value={workingHours.sundayEnabled}
                        disabled={!isEditing}
                        onValueChange={(value) => setWorkingHours((prev) => ({ ...prev, sundayEnabled: value }))}
                        trackColor={{ false: '#CBD5E1', true: '#FDBA74' }}
                        thumbColor={workingHours.sundayEnabled ? '#EA580C' : '#F8FAFC'}
                      />
                    </View>
                    {workingHours.sundayEnabled && (
                      <View style={styles.scheduleRow}>
                        <View style={styles.scheduleField}>
                          <Text style={styles.scheduleFieldLabel}>Desde</Text>
                          <TextInput
                            style={[styles.inputField, !isEditing && styles.inputFieldDisabled]}
                            value={workingHours.sundayFrom}
                            onChangeText={(value) => handleWorkingTimeChange('sundayFrom', value)}
                            onBlur={() => finalizeWorkingTime('sundayFrom')}
                            placeholder="09:00"
                            editable={isEditing}
                            selectTextOnFocus={isEditing}
                          />
                        </View>
                        <View style={styles.scheduleField}>
                          <Text style={styles.scheduleFieldLabel}>Hasta</Text>
                          <TextInput
                            style={[styles.inputField, !isEditing && styles.inputFieldDisabled]}
                            value={workingHours.sundayTo}
                            onChangeText={(value) => handleWorkingTimeChange('sundayTo', value)}
                            onBlur={() => finalizeWorkingTime('sundayTo')}
                            placeholder="13:00"
                            editable={isEditing}
                            selectTextOnFocus={isEditing}
                          />
                        </View>
                      </View>
                    )}
                  </View>

                  <Text style={styles.scheduleSummary}>Horario activo: {formatWorkingHoursSummary(workingHours)}</Text>
                </View>
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>PERFIL DE INSTAGRAM</Text>
                <TextInput
                    style={[styles.inputField, !isEditing && styles.inputFieldDisabled]}
                    value={instagramProfileUrl}
                    onChangeText={setInstagramProfileUrl}
                    placeholder="https://www.instagram.com/tu_cuenta/"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={isEditing}
                    selectTextOnFocus={isEditing}
                />
                <Text style={styles.fieldHint}>Este boton aparece en tu perfil publico para abrir tu cuenta de Instagram.</Text>
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>PERFIL DE FACEBOOK</Text>
                <TextInput
                    style={[styles.inputField, !isEditing && styles.inputFieldDisabled]}
                    value={facebookProfileUrl}
                    onChangeText={setFacebookProfileUrl}
                    placeholder="https://www.facebook.com/tu.pagina"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={isEditing}
                    selectTextOnFocus={isEditing}
                />
                <Text style={styles.fieldHint}>Este boton aparece en tu perfil publico para abrir tu pagina o perfil comercial.</Text>
            </View>

            <View style={styles.secondaryBlock}>
              <View style={styles.inlineHeader}>
                <View style={styles.inlineHeaderCopy}>
                  <Text style={styles.secondaryBlockTitle}>PUBLICACIONES DESTACADAS</Text>
                  <Text style={styles.fieldHint}>
                    Opcional. Solo usalo si queres mostrar un post o reel puntual abajo del perfil.
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.inlineActionBtn, !isEditing && styles.inlineActionBtnDisabled]}
                  onPress={() => setShowFeaturedPostsEditor((current) => !current)}
                  disabled={!isEditing}
                >
                  <Ionicons
                    name={showFeaturedPostsEditor ? 'chevron-up-outline' : 'chevron-down-outline'}
                    size={14}
                    color="#FFFFFF"
                  />
                  <Text style={styles.inlineActionText}>{showFeaturedPostsEditor ? 'Ocultar' : 'Editar'}</Text>
                </TouchableOpacity>
              </View>

              {showFeaturedPostsEditor ? (
                <>
                  <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>PUBLICACION DE INSTAGRAM</Text>
                      <TextInput
                          style={[styles.inputField, !isEditing && styles.inputFieldDisabled]}
                          value={instagramPostUrl}
                          onChangeText={setInstagramPostUrl}
                          placeholder="https://www.instagram.com/p/..."
                          autoCapitalize="none"
                          autoCorrect={false}
                          editable={isEditing}
                          selectTextOnFocus={isEditing}
                      />
                      <Text style={styles.fieldHint}>Post o reel publico para mostrar embebido en tu perfil.</Text>
                  </View>

                  <View style={[styles.inputGroup, styles.secondaryBlockLastField]}>
                      <Text style={styles.inputLabel}>PUBLICACION DE FACEBOOK</Text>
                      <TextInput
                          style={[styles.inputField, !isEditing && styles.inputFieldDisabled]}
                          value={facebookPostUrl}
                          onChangeText={setFacebookPostUrl}
                          placeholder="https://www.facebook.com/..."
                          autoCapitalize="none"
                          autoCorrect={false}
                          editable={isEditing}
                          selectTextOnFocus={isEditing}
                      />
                      <Text style={styles.fieldHint}>Publicacion destacada de Facebook para sumar prueba social.</Text>
                  </View>
                </>
              ) : (
                <Text style={styles.secondaryBlockSummary}>
                  {instagramPostUrl || facebookPostUrl
                    ? 'Hay publicaciones destacadas cargadas, pero quedan plegadas para que el formulario no se vea repetido.'
                    : 'No hay publicaciones destacadas cargadas.'}
                </Text>
              )}
            </View>

            <View style={styles.inputGroup}>
                <View style={styles.inlineHeader}>
                  <View style={styles.inlineHeaderCopy}>
                    <Text style={styles.inputLabel}>FOTOS DE TRABAJOS</Text>
                    <Text style={styles.fieldHint}>Estas fotos aparecen en tu perfil publico como galeria comercial.</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.inlineActionBtn, (!isEditing || uploadingWorkPhoto) && styles.inlineActionBtnDisabled]}
                    onPress={handleWorkPhotoPick}
                    disabled={!isEditing || uploadingWorkPhoto}
                  >
                    {uploadingWorkPhoto ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="images-outline" size={14} color="#FFFFFF" />
                        <Text style={styles.inlineActionText}>Agregar</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>

                {workPhotoUrls.length > 0 ? (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.workPhotoStrip}
                  >
                    {workPhotoUrls.map((photoUrl, index) => (
                      <View key={`${photoUrl}-${index}`} style={styles.workPhotoCard}>
                        <Image source={{ uri: photoUrl }} style={styles.workPhotoImage} />
                        {isEditing && (
                          <TouchableOpacity
                            style={styles.workPhotoRemoveBtn}
                            onPress={() => handleRemoveWorkPhoto(photoUrl)}
                          >
                            <Ionicons name="close" size={14} color="#FFFFFF" />
                          </TouchableOpacity>
                        )}
                      </View>
                    ))}
                  </ScrollView>
                ) : (
                  <View style={styles.workPhotoEmptyCard}>
                    <Ionicons name="image-outline" size={22} color="#94A3B8" />
                    <Text style={styles.workPhotoEmptyText}>Todavia no cargaste fotos de obras terminadas.</Text>
                  </View>
                )}
            </View>

            {isEditing && (
              <TouchableOpacity 
                  style={[styles.saveButton, (saving || uploadingWorkPhoto) && { opacity: 0.7 }]} 
                  onPress={saveProfileData}
                  disabled={saving || uploadingWorkPhoto}
              >
                  {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveButtonText}>GUARDAR DATOS</Text>}
              </TouchableOpacity>
            )}
        </View>


        {/* === SECCIÓN 3: HERRAMIENTAS === */}
        {!requiredCompletion && (
          <>
            <Text style={styles.sectionTitle}>Herramientas</Text>
            <View style={styles.menuContainer}>
              <MenuOption
                icon="calculator-outline"
                label="Configurar Precios"
                onPress={() => {
                  navigation.navigate('Catalogo');
                }}
              />
              <MenuOption
                icon="chatbubble-ellipses-outline"
                label="Soporte"
                onPress={() => {
                  navigation.navigate('Support');
                }}
              />
              <MenuOption 
                icon="document-text-outline" 
                label="Historial de trabajos" 
                onPress={() => {
                   navigation.navigate('History');
                }} 
              />
            </View>
          </>
        )}

        <TouchableOpacity
          style={[styles.logoutBtn, styles.deleteAccountBtn]}
          onPress={handleDeleteAccount}
          disabled={deletingAccount}
        >
          {deletingAccount ? (
            <ActivityIndicator color={COLORS.danger} />
          ) : (
            <>
              <Ionicons name="trash-outline" size={20} color={COLORS.danger} />
              <Text style={styles.deleteAccountText}>Eliminar cuenta</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color={COLORS.danger} />
            <Text style={styles.logoutText}>Cerrar Sesión</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>{appVersion ? `UrbanFix App v${appVersion}` : 'UrbanFix App'}</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { justifyContent: 'center', alignItems: 'center' },
  content: Platform.select({
    web: { padding: 24, paddingBottom: 60, maxWidth: 820, width: '100%', alignSelf: 'center' },
    default: { padding: 20, paddingBottom: 50 },
  }),
  requiredCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#FFF7ED',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#FBD38D',
    padding: 16,
    marginBottom: 18,
  },
  requiredCopy: {
    flex: 1,
    gap: 4,
  },
  requiredTitle: {
    color: '#9A3412',
    fontFamily: FONTS.subtitle,
    fontSize: 14,
    lineHeight: 20,
  },
  requiredText: {
    color: '#9A3412',
    fontFamily: FONTS.body,
    fontSize: 13,
    lineHeight: 18,
  },

  // --- BRAND CARD ---
  brandCard: Platform.select({
    web: {
      backgroundColor: '#FFF',
      borderRadius: 20,
      overflow: 'hidden',
      marginBottom: 24,
      borderWidth: 1,
      borderColor: '#EDE6DB',
      boxShadow: '0 20px 40px rgba(15, 23, 42, 0.08)',
    },
    default: {
      backgroundColor: '#FFF',
      borderRadius: 20,
      overflow: 'hidden',
      marginBottom: 24,
      borderWidth: 1,
      borderColor: '#EDE6DB',
      shadowColor: '#1F2937',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 6,
    },
  }),
  brandBanner: {
    height: 120,
    backgroundColor: '#F5F1E8',
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#EFE6D8',
  },
  bannerImage: { width: '78%', height: '78%' },
  bannerPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC', width: '100%' },
  placeholderText: { fontSize: 10, color: '#94A3B8', marginTop: 4, fontFamily: FONTS.subtitle },
  editIconBanner: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(15, 23, 42, 0.75)', padding: 6, borderRadius: 999 },
  brandContent: { alignItems: 'center', paddingHorizontal: 20, paddingBottom: 22, marginTop: -44 },
  avatarContainer: Platform.select({
    web: {
      marginBottom: 12,
      padding: 4,
      borderRadius: 999,
      backgroundColor: '#FFF',
      borderWidth: 1,
      borderColor: '#E2E8F0',
      boxShadow: '0 10px 20px rgba(15, 23, 42, 0.15)',
      position: 'relative',
    },
    default: {
      marginBottom: 12,
      padding: 4,
      borderRadius: 999,
      backgroundColor: '#FFF',
      borderWidth: 1,
      borderColor: '#E2E8F0',
      shadowColor: '#1F2937',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.12,
      shadowRadius: 12,
      elevation: 6,
      position: 'relative',
    },
  }),
  avatarImage: { width: 92, height: 92, borderRadius: 46, borderWidth: 3, borderColor: '#FFF', backgroundColor: '#FFF' },
  avatarPlaceholder: { backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 30, fontFamily: FONTS.title, color: '#FFF' },
  editIconAvatar: { position: 'absolute', bottom: 2, right: 2, backgroundColor: COLORS.primary, padding: 6, borderRadius: 999, borderWidth: 2, borderColor: '#FFF' },
  brandInfo: { alignItems: 'center' },
  businessName: { fontFamily: FONTS.title, fontSize: 20, color: COLORS.text, marginBottom: 4, textAlign: 'center', letterSpacing: 0.5 },
  personName: { fontFamily: FONTS.body, fontSize: 13, color: COLORS.textLight, marginBottom: 8 },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0F172A', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  verifiedText: { fontSize: 10, color: '#FFF', marginLeft: 4, fontFamily: FONTS.subtitle, letterSpacing: 0.4 },

  // --- FORMULARIO ---
  formContainer: Platform.select({
    web: {
      backgroundColor: '#FFF',
      borderRadius: 16,
      padding: 18,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: '#EFE6D8',
      boxShadow: '0 12px 26px rgba(15, 23, 42, 0.06)',
    },
    default: {
      backgroundColor: '#FFF',
      borderRadius: 16,
      padding: 18,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: '#EFE6D8',
      shadowColor: '#1F2937',
      shadowOpacity: 0.06,
      shadowOffset: { width: 0, height: 6 },
      shadowRadius: 12,
      elevation: 3,
    },
  }),
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 10, fontFamily: FONTS.subtitle, color: '#8B93A1', marginBottom: 6, letterSpacing: 1, textTransform: 'uppercase' },
  inputField: { backgroundColor: '#FFF', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#E2E8F0', fontSize: 14, fontFamily: FONTS.body, color: COLORS.text },
  inputFieldDisabled: { backgroundColor: '#F8FAFC', color: '#94A3B8' },
  fieldHint: { marginTop: 6, fontSize: 11, lineHeight: 17, fontFamily: FONTS.body, color: '#64748B' },
  secondaryBlock: {
    marginBottom: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    padding: 14,
  },
  secondaryBlockTitle: {
    fontSize: 10,
    fontFamily: FONTS.subtitle,
    color: '#8B93A1',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  secondaryBlockSummary: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: FONTS.body,
    color: '#64748B',
  },
  secondaryBlockLastField: {
    marginBottom: 0,
  },
  inlineHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 10,
  },
  inlineHeaderCopy: {
    flex: 1,
  },
  inlineActionBtn: {
    minWidth: 94,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: COLORS.primary,
  },
  inlineActionBtnDisabled: {
    opacity: 0.55,
  },
  inlineActionText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontFamily: FONTS.subtitle,
  },
  workPhotoStrip: {
    gap: 12,
    paddingVertical: 2,
    paddingRight: 2,
  },
  workPhotoCard: {
    width: 154,
    height: 118,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    position: 'relative',
  },
  workPhotoImage: {
    width: '100%',
    height: '100%',
  },
  workPhotoRemoveBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.78)',
  },
  workPhotoEmptyCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  workPhotoEmptyText: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    fontFamily: FONTS.body,
    color: '#64748B',
  },
  readonlyField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  readonlyText: { fontSize: 13, fontFamily: FONTS.body, color: '#64748B' },
  operationalBaseGroup: {
    zIndex: 100,
  },
  operationalBaseFieldWrap: {
    marginTop: 5,
    zIndex: 100,
  },
  operationalBaseStatusCard: {
    marginTop: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    padding: 12,
  },
  operationalBaseStatusCardOk: {
    borderColor: '#BBF7D0',
    backgroundColor: '#F0FDF4',
  },
  operationalBaseStatusCardPending: {
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
  },
  operationalBaseStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  operationalBaseStatusTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  operationalBaseStatusTitle: {
    fontSize: 12,
    fontFamily: FONTS.subtitle,
    color: '#0F172A',
  },
  operationalBaseBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#E2E8F0',
  },
  operationalBaseBadgeOk: {
    backgroundColor: '#DCFCE7',
  },
  operationalBaseBadgePending: {
    backgroundColor: '#DBEAFE',
  },
  operationalBaseBadgeText: {
    fontSize: 10,
    fontFamily: FONTS.subtitle,
    color: '#475569',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  operationalBaseBadgeTextOk: {
    color: '#166534',
  },
  operationalBaseBadgeTextPending: {
    color: '#1D4ED8',
  },
  operationalBaseStatusText: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: FONTS.body,
    color: '#64748B',
  },
  operationalBaseStatusTextOk: {
    color: '#166534',
  },
  operationalBaseMetaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  operationalBaseMetaItem: {
    flexGrow: 1,
    minWidth: '45%',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  operationalBaseMetaLabel: {
    fontSize: 10,
    fontFamily: FONTS.subtitle,
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  operationalBaseMetaValue: {
    marginTop: 4,
    fontSize: 12,
    fontFamily: FONTS.body,
    color: '#0F172A',
  },
  scheduleCard: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    padding: 10,
    gap: 10,
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
    fontSize: 11,
    color: '#64748B',
    fontFamily: FONTS.subtitle,
  },
  weekendCard: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 10,
    backgroundColor: '#FFFFFF',
    gap: 8,
  },
  weekendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  weekendTitle: {
    fontSize: 12,
    fontFamily: FONTS.subtitle,
    color: COLORS.text,
  },
  scheduleSummary: {
    fontSize: 11,
    color: '#475569',
    fontFamily: FONTS.body,
  },
  saveButton: Platform.select({
    web: {
      backgroundColor: COLORS.primary,
      padding: 14,
      borderRadius: 12,
      alignItems: 'center',
      marginTop: 8,
      boxShadow: '0 12px 22px rgba(243, 156, 18, 0.3)',
    },
    default: {
      backgroundColor: COLORS.primary,
      padding: 14,
      borderRadius: 12,
      alignItems: 'center',
      marginTop: 8,
      shadowColor: COLORS.primary,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.25,
      shadowRadius: 10,
      elevation: 4,
    },
  }),
  saveButtonText: { color: '#FFF', fontFamily: FONTS.title, fontSize: 14, letterSpacing: 0.6 },

  // --- MENU ---
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    marginLeft: 4,
    marginRight: 4,
  },
  sectionTitle: { fontFamily: FONTS.subtitle, fontSize: 11, color: '#9A8F7B', letterSpacing: 1.6, textTransform: 'uppercase' },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  editProfileText: { fontSize: 11, fontFamily: FONTS.subtitle, color: '#0F172A' },
  cancelEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cancelEditText: { fontSize: 11, fontFamily: FONTS.subtitle, color: '#64748B' },
  menuContainer: Platform.select({
    web: {
      backgroundColor: '#FFF',
      borderRadius: 16,
      overflow: 'hidden',
      marginBottom: 24,
      borderWidth: 1,
      borderColor: '#EFE6D8',
      boxShadow: '0 12px 26px rgba(15, 23, 42, 0.06)',
    },
    default: {
      backgroundColor: '#FFF',
      borderRadius: 16,
      overflow: 'hidden',
      marginBottom: 24,
      borderWidth: 1,
      borderColor: '#EFE6D8',
      shadowColor: '#1F2937',
      shadowOpacity: 0.06,
      shadowOffset: { width: 0, height: 6 },
      shadowRadius: 12,
      elevation: 3,
    },
  }),
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
  badge: { backgroundColor: COLORS.primary, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, marginLeft: 6 },
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

  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF1F2', padding: 16, borderRadius: 14, borderWidth: 1, borderColor: '#FEE2E2' },
  logoutText: { marginLeft: 8, fontSize: 14, fontFamily: FONTS.subtitle, color: COLORS.danger },
  deleteAccountBtn: { marginBottom: 10 },
  deleteAccountText: { marginLeft: 8, fontSize: 14, fontFamily: FONTS.subtitle, color: COLORS.danger },
  versionText: { textAlign: 'center', marginTop: 20, color: '#94A3B8', fontFamily: FONTS.body, fontSize: 10 }
});
