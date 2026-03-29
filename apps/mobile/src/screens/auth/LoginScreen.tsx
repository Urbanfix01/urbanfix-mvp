import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  useWindowDimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as ImagePicker from 'expo-image-picker';
import Constants from 'expo-constants';

import { supabase } from '../../lib/supabase';
import { uploadImageToSupabase } from '../../services/StorageService';
import { getWebApiUrl } from '../../utils/config';
import { setStoredAudience } from '../../utils/audience';
import { COLORS, FONTS, SPACING } from '../../utils/theme';
import { getArgentinaCitiesByProvince, getArgentinaProvinces, type GeoOption } from '../../utils/argentinaGeo';
import { OptionSelectModal } from '../../components/molecules/OptionSelectModal';

WebBrowser.maybeCompleteAuthSession();

const logo = require('../../../assets/icon.png');

type Audience = 'tecnico' | 'cliente';
type FieldName = 'fullName' | 'businessName' | 'clientPhone' | 'email' | 'password';
type PickerMode = 'province' | 'city' | null;
type RegistrationMediaKind = 'avatar' | 'logo' | 'banner';
type RegistrationMediaState = Record<RegistrationMediaKind, string | null>;

const PENDING_TECHNICIAN_MEDIA_KEY = 'urbanfix.mobile.pendingTechnicianMedia';
const EMPTY_REGISTRATION_MEDIA: RegistrationMediaState = {
  avatar: null,
  logo: null,
  banner: null,
};

const cloneRegistrationMedia = (): RegistrationMediaState => ({ ...EMPTY_REGISTRATION_MEDIA });

const getRegistrationMediaAspect = (kind: RegistrationMediaKind): [number, number] => {
  if (kind === 'avatar') return [1, 1];
  if (kind === 'logo') return [4, 3];
  return [16, 9];
};

const getRegistrationMediaColumn = (kind: RegistrationMediaKind) => {
  if (kind === 'avatar') return 'avatar_url';
  if (kind === 'logo') return 'company_logo_url';
  return 'banner_url';
};

const normalizeRegistrationMediaState = (value: unknown): RegistrationMediaState => {
  const source = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  return {
    avatar: typeof source.avatar === 'string' && source.avatar.trim() ? source.avatar.trim() : null,
    logo: typeof source.logo === 'string' && source.logo.trim() ? source.logo.trim() : null,
    banner: typeof source.banner === 'string' && source.banner.trim() ? source.banner.trim() : null,
  };
};

const hasRegistrationMedia = (media: RegistrationMediaState) =>
  Boolean(media.avatar || media.logo || media.banner);

const getRegistrationMediaTitle = (kind: RegistrationMediaKind) => {
  if (kind === 'avatar') return 'Foto de perfil';
  if (kind === 'logo') return 'Imagen de empresa';
  return 'Banner del perfil';
};

export default function AuthScreen() {
  const [audience, setAudience] = useState<Audience>('tecnico');
  const [isLogin, setIsLogin] = useState(true);
  const [hasSelectedAudience, setHasSelectedAudience] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [province, setProvince] = useState('');
  const [clientCity, setClientCity] = useState('');
  const [provinceOptions, setProvinceOptions] = useState<GeoOption[]>([]);
  const [cityOptions, setCityOptions] = useState<GeoOption[]>([]);
  const [pickerMode, setPickerMode] = useState<PickerMode>(null);
  const [provinceLoading, setProvinceLoading] = useState(false);
  const [cityLoading, setCityLoading] = useState(false);
  const [registerMedia, setRegisterMedia] = useState<RegistrationMediaState>(cloneRegistrationMedia());
  const [pickingMedia, setPickingMedia] = useState<RegistrationMediaKind | null>(null);

  const [loading, setLoading] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const [debugInfo, setDebugInfo] = useState('');
  const [showRegisterHint, setShowRegisterHint] = useState(false);
  const [activeField, setActiveField] = useState<FieldName | null>(null);

  const fullNameRef = useRef<TextInput>(null);
  const businessNameRef = useRef<TextInput>(null);
  const clientPhoneRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isRegister = !isLogin;
  const isClientAudience = audience === 'cliente';
  const showAppleButton = Platform.OS === 'ios';
  const isCompactScreen = height < 860;
  const isNarrowScreen = width < 390;
  const isCompressedLogin = isLogin && isCompactScreen;
  const useCompactRegister = isRegister && isCompactScreen;
  const useCompactAuthLayout = isCompactScreen;

  const clearRegisterFields = () => {
    setFullName('');
    setBusinessName('');
    setClientPhone('');
    setProvince('');
    setClientCity('');
    setCityOptions([]);
    setPickerMode(null);
    setRegisterMedia(cloneRegistrationMedia());
    setPickingMedia(null);
  };

  const ensureProvinceOptions = async () => {
    if (provinceOptions.length || provinceLoading) return;

    try {
      setProvinceLoading(true);
      const provinces = await getArgentinaProvinces();
      setProvinceOptions(provinces);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'No pudimos cargar las provincias.');
    } finally {
      setProvinceLoading(false);
    }
  };

  const loadCitiesForProvince = async (provinceName: string) => {
    try {
      setCityLoading(true);
      const cities = await getArgentinaCitiesByProvince(provinceName);
      setCityOptions(cities);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'No pudimos cargar las ciudades de la provincia.');
    } finally {
      setCityLoading(false);
    }
  };

  useEffect(() => {
    if (!hasSelectedAudience || !isRegister) return;
    ensureProvinceOptions();
  }, [hasSelectedAudience, isRegister]);

  const clearPendingTechnicianMedia = async () => {
    try {
      await AsyncStorage.removeItem(PENDING_TECHNICIAN_MEDIA_KEY);
    } catch {
      // Non-blocking cleanup.
    }
  };

  const persistPendingTechnicianMedia = async (safeEmail: string, nextMedia: RegistrationMediaState) => {
    if (!safeEmail || !hasRegistrationMedia(nextMedia)) return;

    try {
      await AsyncStorage.setItem(
        PENDING_TECHNICIAN_MEDIA_KEY,
        JSON.stringify({
          email: safeEmail.toLowerCase(),
          media: nextMedia,
          savedAt: new Date().toISOString(),
        })
      );
    } catch {
      // Non-blocking storage helper.
    }
  };

  const getPendingTechnicianMedia = async (safeEmail?: string) => {
    try {
      const raw = await AsyncStorage.getItem(PENDING_TECHNICIAN_MEDIA_KEY);
      if (!raw) return cloneRegistrationMedia();

      const parsed = JSON.parse(raw) as { email?: string; media?: unknown };
      const storedEmail = String(parsed?.email || '').trim().toLowerCase();
      const requestedEmail = String(safeEmail || '').trim().toLowerCase();

      if (storedEmail && requestedEmail && storedEmail !== requestedEmail) {
        return cloneRegistrationMedia();
      }

      return normalizeRegistrationMediaState(parsed?.media);
    } catch {
      return cloneRegistrationMedia();
    }
  };

  const handleRegisterMediaPick = async (kind: RegistrationMediaKind) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: getRegistrationMediaAspect(kind),
        quality: 0.72,
      });

      if (result.canceled) return;

      setPickingMedia(kind);
      const localUri = result.assets[0]?.uri || null;
      if (!localUri) throw new Error('No pudimos leer la imagen seleccionada.');

      const nextMedia = {
        ...registerMedia,
        [kind]: localUri,
      } satisfies RegistrationMediaState;

      setRegisterMedia(nextMedia);

      const safeEmail = email.trim().toLowerCase();
      if (safeEmail) {
        await persistPendingTechnicianMedia(safeEmail, nextMedia);
      }
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'No pudimos abrir tu galeria.');
    } finally {
      setPickingMedia(null);
    }
  };

  const uploadPendingTechnicianMedia = async (safeEmail?: string) => {
    try {
      const mergedMedia = {
        ...(await getPendingTechnicianMedia(safeEmail)),
        ...normalizeRegistrationMediaState(registerMedia),
      } satisfies RegistrationMediaState;

      if (!hasRegistrationMedia(mergedMedia)) return;

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.id) return;

      const updates: Record<string, unknown> = {
        id: user.id,
        updated_at: new Date().toISOString(),
      };

      for (const kind of ['avatar', 'logo', 'banner'] as RegistrationMediaKind[]) {
        const localUri = mergedMedia[kind];
        if (!localUri) continue;
        const publicUrl = await uploadImageToSupabase(localUri, user.id, `${kind}.png`);
        if (publicUrl) {
          updates[getRegistrationMediaColumn(kind)] = publicUrl;
        }
      }

      if (Object.keys(updates).length > 2) {
        const { error } = await supabase.from('profiles').upsert(updates);
        if (error) throw error;
      }

      await clearPendingTechnicianMedia();
      setRegisterMedia(cloneRegistrationMedia());
    } catch (error: any) {
      Alert.alert(
        'Imagenes pendientes',
        error?.message || 'No pudimos subir tus imagenes ahora. Puedes cargarlas luego desde Mi Perfil.'
      );
    }
  };

  const handleAudienceChoice = (nextAudience: Audience) => {
    setAudience(nextAudience);
    setIsLogin(true);
    setShowRegisterHint(false);
    clearRegisterFields();
    setHasSelectedAudience(true);
    void clearPendingTechnicianMedia();
  };

  const handleBackToAudienceChoice = () => {
    setHasSelectedAudience(false);
    setIsLogin(true);
    setShowRegisterHint(false);
    clearRegisterFields();
    void clearPendingTechnicianMedia();
  };

  const handleOpenProvincePicker = async () => {
    await ensureProvinceOptions();
    setPickerMode('province');
  };

  const handleOpenCityPicker = async () => {
    if (!province) {
      Alert.alert('Selecciona provincia', 'Primero elige una provincia para ver sus ciudades.');
      return;
    }

    if (!cityOptions.length && !cityLoading) {
      await loadCitiesForProvince(province);
    }

    setPickerMode('city');
  };

  const handleProvinceSelect = async (option: GeoOption) => {
    setPickerMode(null);
    setProvince(option.label);
    setClientCity('');
    await loadCitiesForProvince(option.label);
  };

  const handleCitySelect = (option: GeoOption) => {
    setPickerMode(null);
    setClientCity(option.label);
  };

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
        if (!(key in params)) {
          params[key] = value;
        }
      });
    }

    return params;
  };

  const normalizeOptionalText = (value: unknown) => {
    const safeValue = String(value || '').trim();
    return safeValue || null;
  };

  const buildAppleDisplayName = (credential: AppleAuthentication.AppleAuthenticationCredential) => {
    const parts = [
      normalizeOptionalText(credential.fullName?.givenName),
      normalizeOptionalText(credential.fullName?.middleName),
      normalizeOptionalText(credential.fullName?.familyName),
    ].filter((part): part is string => Boolean(part));

    return parts.length ? parts.join(' ') : null;
  };

  const hydrateSocialProfile = async ({
    nextAudience,
    emailValue,
    fullNameValue,
  }: {
    nextAudience: Audience;
    emailValue?: string | null;
    fullNameValue?: string | null;
  }) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user?.id) return;

    const metadata = ((user as any)?.user_metadata || {}) as Record<string, unknown>;
    const resolvedFullName =
      normalizeOptionalText(fullNameValue) ||
      normalizeOptionalText(metadata.full_name) ||
      normalizeOptionalText(metadata.name);
    const resolvedEmail = normalizeOptionalText(emailValue) || normalizeOptionalText(user.email);

    const profilePayload: Record<string, unknown> = { id: user.id };
    if (resolvedEmail) profilePayload.email = resolvedEmail;
    if (resolvedFullName) profilePayload.full_name = resolvedFullName;
    if (nextAudience === 'tecnico') {
      profilePayload.access_granted = true;
      profilePayload.profile_published = true;
      profilePayload.profile_published_at = new Date().toISOString();
    }

    const metadataPayload: Record<string, unknown> = { app_audience: nextAudience };
    if (resolvedFullName) metadataPayload.full_name = resolvedFullName;

    const operations: Promise<any>[] = [supabase.auth.updateUser({ data: metadataPayload })];
    if (Object.keys(profilePayload).length > 1) {
      operations.push((async () => supabase.from('profiles').upsert(profilePayload))());
    }

    await Promise.allSettled(operations);
  };

  const handleGoogleAuth = async () => {
    try {
      await setStoredAudience(audience);

      if (Platform.OS === 'web') {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: getRedirectUrl() },
        });
        if (error) {
          throw error;
        }
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

      if (error) {
        throw error;
      }

      const authUrl = data?.url;
      if (!authUrl) {
        throw new Error('No se pudo iniciar Google Sign-In (url vacia).');
      }

      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectTo);

      if (result.type === 'success') {
        const urlResult = result.url;
        if (!urlResult) {
          throw new Error('Respuesta de Google incompleta.');
        }

        const params = parseAuthParams(urlResult);
        const errorMessage = params.error_description || params.error;

        if (errorMessage) {
          throw new Error(String(errorMessage));
        }

        if (params.code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(String(params.code));
          if (exchangeError) {
            throw exchangeError;
          }
          await hydrateSocialProfile({ nextAudience: audience });
          if (audience === 'tecnico') {
            await uploadPendingTechnicianMedia();
          }
          return;
        }

        if (params.access_token && params.refresh_token) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: params.access_token,
            refresh_token: params.refresh_token,
          });
          if (sessionError) {
            throw sessionError;
          }
          await hydrateSocialProfile({ nextAudience: audience });
          if (audience === 'tecnico') {
            await uploadPendingTechnicianMedia();
          }
          return;
        }

        throw new Error('Respuesta de Google incompleta.');
      }

      if (result.type === 'cancel' || result.type === 'dismiss') {
        throw new Error('Inicio con Google cancelado.');
      }

      await WebBrowser.openBrowserAsync(data.url);
      Alert.alert('Continuar en Google', 'Si completaste el login, la app deberia abrirse automaticamente.');
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'No se pudo iniciar con Google.');
    }
  };

  const handleAppleAuth = async () => {
    if (!showAppleButton) return;
    if (loading) return;

    try {
      const isAvailable = await AppleAuthentication.isAvailableAsync();
      if (!isAvailable) {
        throw new Error('Apple Sign-In no disponible en este dispositivo.');
      }

      await setStoredAudience(audience);

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        throw new Error('Apple no devolvio un token valido.');
      }

      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });

      if (error) {
        throw error;
      }

      await hydrateSocialProfile({
        nextAudience: audience,
        emailValue: credential.email || null,
        fullNameValue: buildAppleDisplayName(credential),
      });

      if (audience === 'tecnico') {
        await uploadPendingTechnicianMedia(credential.email || undefined);
      }
    } catch (error: any) {
      if (error?.code === 'ERR_REQUEST_CANCELED') {
        return;
      }
      Alert.alert('Error', error?.message || 'No se pudo iniciar con Apple.');
    }
  };

  const upsertProfileIfPossible = async (safeEmail: string) => {
    const { data } = await supabase.auth.getSession();
    const userId = data?.session?.user?.id;
    if (!userId) return;

    const basePayload: Record<string, unknown> = {
      id: userId,
      email: safeEmail || null,
      full_name: fullName.trim(),
      phone: clientPhone.trim() || null,
      city: clientCity.trim() || null,
      business_name: isClientAudience ? null : businessName.trim() || null,
    };

    if (!isClientAudience) {
      basePayload.access_granted = true;
      basePayload.profile_published = true;
      basePayload.profile_published_at = new Date().toISOString();
    }

    await supabase.from('profiles').upsert(basePayload);
  };

  const handleAuth = async () => {
    setLoading(true);

    try {
      await setStoredAudience(audience);

      const safeEmail = email.trim();
      if (!safeEmail || !password) {
        Alert.alert('Datos incompletos', 'Ingresa tu email y contrasena.');
        setLoading(false);
        return;
      }

      if (isClientAudience) {
        if (isLogin) {
          const { error } = await supabase.auth.signInWithPassword({
            email: safeEmail,
            password,
          });
          if (error) {
            throw error;
          }
          return;
        }

        if (!fullName.trim() || !clientPhone.trim() || !province.trim() || !clientCity.trim()) {
          Alert.alert('Falta informacion', 'Completa nombre, telefono, provincia y ciudad.');
          setLoading(false);
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email: safeEmail,
          password,
          options: {
            data: {
              full_name: fullName.trim(),
              phone: clientPhone.trim(),
              province: province.trim(),
              city: clientCity.trim(),
              app_audience: 'cliente',
            },
          },
        });

        if (error) {
          throw error;
        }

        if (data.session) {
          await upsertProfileIfPossible(safeEmail);
          Alert.alert('Registro exitoso', 'Tu cuenta de cliente fue creada.');
        } else {
          Alert.alert('Revisa tu correo', 'Te enviamos un email para confirmar tu cuenta de cliente.');
        }

        return;
      }

      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: safeEmail,
          password,
        });
        if (error) {
          throw error;
        }
        await uploadPendingTechnicianMedia(safeEmail);
      } else {
        if (!fullName.trim() || !clientPhone.trim() || !province.trim() || !clientCity.trim() || !businessName.trim()) {
          Alert.alert('Faltan datos', 'Completa nombre, telefono, provincia, ciudad y nombre del negocio.');
          setLoading(false);
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email: safeEmail,
          password,
          options: {
            data: {
              full_name: fullName.trim(),
              phone: clientPhone.trim(),
              province: province.trim(),
              city: clientCity.trim(),
              business_name: businessName.trim(),
              app_audience: 'tecnico',
            },
          },
        });

        if (error) {
          throw error;
        }

        if (data.session) {
          await upsertProfileIfPossible(safeEmail);
          await uploadPendingTechnicianMedia(safeEmail);
          Alert.alert('Registro exitoso', 'Tu perfil tecnico fue creado.');
        } else {
          if (hasRegistrationMedia(registerMedia)) {
            await persistPendingTechnicianMedia(safeEmail, registerMedia);
          }
          Alert.alert(
            'Revisa tu correo',
            hasRegistrationMedia(registerMedia)
              ? 'Te enviamos un email para confirmar tu perfil tecnico. Tus imagenes quedaron preparadas y se subiran cuando ingreses por primera vez.'
              : 'Te enviamos un email para confirmar tu perfil tecnico.'
          );
        }
      }
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'No se pudo completar la autenticacion.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordRecovery = async () => {
    const safeEmail = email.trim();
    if (!safeEmail) {
      Alert.alert('Falta email', 'Ingresa tu email para recuperar la contrasena.');
      return;
    }

    setRecovering(true);
    try {
      const recoveryPath = isClientAudience ? '/cliente?recovery=1' : '/tecnicos?recovery=1';
      const { error } = await supabase.auth.resetPasswordForEmail(safeEmail, {
        redirectTo: getWebApiUrl(recoveryPath),
      });
      if (error) {
        throw error;
      }

      Alert.alert('Revisa tu correo', 'Te enviamos un email para recuperar tu contrasena.');
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'No se pudo iniciar la recuperacion.');
    } finally {
      setRecovering(false);
    }
  };

  const subtitle = isClientAudience
    ? 'Solicitudes, mensajes y respuestas en un solo acceso.'
    : 'Pedidos, cotizaciones y agenda desde un solo acceso.';

  const registerHint = isClientAudience
    ? 'Completa tus datos para publicar solicitudes.'
    : 'Completa tu perfil profesional y activa tu presencia en la app.';
  const chooserOptions = [
    {
      key: 'tecnico' as const,
      icon: 'construct-outline' as const,
      title: 'Tecnico',
      description: 'Gestiona cotizaciones, agenda y perfil profesional.',
      chips: ['Cotizaciones', 'Agenda'],
    },
    {
      key: 'cliente' as const,
      icon: 'home-outline' as const,
      title: 'Cliente',
      description: 'Publica solicitudes, sigue respuestas y organiza mensajes.',
      chips: ['Solicitudes', 'Mensajes'],
    },
  ];
  const formTitle = isLogin
    ? isClientAudience
      ? 'Accede a tu espacio'
      : 'Accede a tu panel'
    : isClientAudience
      ? 'Crea tu cuenta de cliente'
      : 'Crea tu perfil profesional';
  const googleActionText = isLogin
    ? isClientAudience
      ? 'Entrar con Google'
      : 'Acceder con Google'
    : isClientAudience
      ? 'Crear cuenta con Google'
      : 'Crear perfil con Google';
  const appleButtonType = isLogin
    ? AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
    : AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP;
  const primaryCta = isLogin
    ? isClientAudience
      ? 'Ingresar como cliente'
      : 'Ingresar como tecnico'
    : isClientAudience
      ? 'Crear cuenta de cliente'
      : 'Crear perfil profesional';
  const secondaryCta = isLogin
    ? isClientAudience
      ? 'Aun no tienes cuenta? Registrate y publica en minutos'
      : 'Aun no tienes cuenta? Crea tu perfil profesional'
    : isClientAudience
      ? 'Ya tienes cuenta? Ingresa a tu espacio'
      : 'Ya tienes cuenta? Ingresa a tu panel';
  const credentialsHint = isLogin
    ? 'Usa tu email y contrasena para continuar.'
    : 'Este email quedara asociado a tu cuenta principal.';
  const trustHint = isClientAudience
    ? 'Acceso seguro para seguir solicitudes, mensajes y disponibilidad.'
    : 'Acceso seguro para gestionar presupuestos, agenda y oportunidades.';
  const footerHint = isLogin
    ? 'Recuperacion de cuenta y acceso por email en una experiencia simple.'
    : 'Registro guiado con activacion por email y acceso seguro.';

  return (
    <LinearGradient colors={['#020202', '#070707', '#0B0B0C']} style={styles.container}>
      <LinearGradient
        colors={['rgba(243,156,18,0.14)', 'rgba(243,156,18,0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.bgVeilTop}
      />
      <LinearGradient
        colors={['rgba(255,255,255,0.06)', 'rgba(255,255,255,0)']}
        start={{ x: 1, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.bgVeilBottom}
      />
      <View style={styles.bgLineTop} />
      <View style={styles.bgLineBottom} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            isCompactScreen && styles.scrollContentCompact,
            useCompactAuthLayout && styles.scrollContentTight,
            {
              paddingTop: (useCompactAuthLayout ? SPACING.sm : isCompactScreen ? SPACING.md : SPACING.lg) + insets.top,
              paddingBottom: (useCompactAuthLayout ? SPACING.sm : isCompactScreen ? SPACING.md : SPACING.lg) + Math.max(0, insets.bottom),
            },
          ]}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.layout, isCompactScreen && styles.layoutCompact, useCompactAuthLayout && styles.layoutTight]}>
            {!hasSelectedAudience ? (
              <View style={[styles.chooserCard, isCompactScreen && styles.chooserCardCompact]}>
                <LinearGradient colors={['#050505', '#0A0A0B', '#111214']} style={styles.chooserPanel}>
                  <View style={styles.chooserBrandLockup}>
                    <View style={styles.chooserLogoWrap}>
                      <Image source={logo} style={styles.chooserLogo} />
                    </View>
                    <Text style={styles.chooserWordmark}>UrbanFix</Text>
                  </View>
                  <Text style={styles.chooserTitle}>Como quieres ingresar?</Text>
                </LinearGradient>

                <View style={styles.chooserStack}>
                  {chooserOptions.map((option) => (
                    <TouchableOpacity
                      key={option.key}
                      style={styles.chooserOption}
                      activeOpacity={0.9}
                      onPress={() => handleAudienceChoice(option.key)}
                    >
                      <View style={styles.chooserOptionAccent} />
                      <View style={styles.chooserOptionIcon}>
                        <Ionicons name={option.icon} size={20} color="#F8FAFC" />
                      </View>
                      <View style={styles.chooserOptionCopy}>
                        <Text style={styles.chooserOptionTitle}>{option.title}</Text>
                        <Text style={styles.chooserOptionText}>{option.description}</Text>
                        <View style={styles.chooserOptionChips}>
                          {option.chips.map((chip) => (
                            <View key={chip} style={styles.chooserChip}>
                              <Text style={styles.chooserChipText}>{chip}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                      <View style={styles.chooserOptionArrow}>
                        <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.chooserHint}>Podras cambiar este perfil antes de iniciar sesion.</Text>
              </View>
            ) : (
              <View
                style={[
                  styles.card,
                  isCompactScreen && styles.cardCompact,
                  useCompactAuthLayout && styles.cardTight,
                  styles.cardMinimal,
                ]}
              >
              <LinearGradient colors={['#050505', '#0A0A0B', '#111214']} style={[styles.authHeaderPanel, useCompactAuthLayout && styles.authHeaderPanelCompact]}>
                <View style={styles.authHeaderTopRow}>
                  <View style={styles.authHeaderMeta}>
                    <View style={styles.authHeaderLockup}>
                      <Image source={logo} style={styles.authHeaderLogo} />
                      <Text style={styles.authHeaderBrand}>UrbanFix</Text>
                    </View>
                    <View style={styles.authHeaderBadge}>
                      <View style={styles.badgeDot} />
                      <Text style={styles.authHeaderBadgeText}>{isClientAudience ? 'Cliente' : 'Tecnico'}</Text>
                    </View>
                  </View>
                  <TouchableOpacity style={styles.changeAudienceBtn} onPress={handleBackToAudienceChoice} activeOpacity={0.85}>
                    <Ionicons name="swap-horizontal-outline" size={14} color="#F8FAFC" />
                    <Text style={styles.changeAudienceTextLight}>Cambiar</Text>
                  </TouchableOpacity>
                </View>

                <Text
                  style={[
                    styles.authHeaderTitle,
                    isNarrowScreen && styles.cardTitleCompact,
                    useCompactAuthLayout && styles.cardTitleTight,
                  ]}
                >
                  {formTitle}
                </Text>
                <Text style={[styles.authHeaderSubtitle, useCompactAuthLayout && styles.cardSubtitleCompact]}>
                  {subtitle}
                </Text>
              </LinearGradient>

              <View style={[styles.controlStack, useCompactAuthLayout && styles.controlStackCompact]}>
                <View style={[styles.segmented, useCompactAuthLayout && styles.toggleCompact]}>
                  <TouchableOpacity
                    style={[styles.segmentItem, useCompactAuthLayout && styles.toggleItemCompact, isLogin && styles.segmentItemActive]}
                    onPress={() => {
                      setIsLogin(true);
                      setShowRegisterHint(false);
                    }}
                  >
                    <Text style={[styles.segmentText, useCompactAuthLayout && styles.toggleTextCompact, isLogin && styles.segmentTextActive]}>
                      Ingresar
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.segmentItem, useCompactAuthLayout && styles.toggleItemCompact, isRegister && styles.segmentItemActive]}
                    onPress={() => {
                      setIsLogin(false);
                      setShowRegisterHint(true);
                    }}
                  >
                    <Text style={[styles.segmentText, useCompactAuthLayout && styles.toggleTextCompact, isRegister && styles.segmentTextActive]}>
                      Crear cuenta
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {showRegisterHint && isRegister && !isCompactScreen && (
                <View style={styles.notice}>
                  <Text style={styles.noticeText}>{registerHint}</Text>
                </View>
              )}

              {isLogin && (
                <>
                  <View style={[styles.socialStack, useCompactAuthLayout && styles.socialStackCompact]}>
                    {showAppleButton && (
                      <View style={[styles.appleButtonWrap, useCompactAuthLayout && styles.appleButtonWrapCompact]}>
                        <AppleAuthentication.AppleAuthenticationButton
                          buttonType={appleButtonType}
                          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                          cornerRadius={16}
                          style={[styles.appleButton, useCompactAuthLayout && styles.appleButtonCompact]}
                          onPress={handleAppleAuth}
                        />
                      </View>
                    )}

                    <TouchableOpacity
                      style={[styles.googleButton, useCompactAuthLayout && styles.googleButtonCompact]}
                      onPress={handleGoogleAuth}
                      disabled={loading}
                      activeOpacity={0.85}
                    >
                      <View style={[styles.socialButtonMark, useCompactAuthLayout && styles.socialButtonMarkCompact]}>
                        <Ionicons
                          name="logo-google"
                          size={useCompactAuthLayout ? 16 : 18}
                          color={COLORS.primary}
                        />
                      </View>
                      <View style={styles.socialButtonCopy}>
                        <Text style={[styles.googleButtonText, useCompactAuthLayout && styles.googleButtonTextCompact]}>{googleActionText}</Text>
                      </View>
                    </TouchableOpacity>
                  </View>

                  {!useCompactAuthLayout && (
                    <View style={[styles.dividerRow, useCompactAuthLayout && styles.dividerRowCompact]}>
                      <View style={styles.dividerLine} />
                      <Text style={styles.dividerText}>o con tu correo</Text>
                      <View style={styles.dividerLine} />
                    </View>
                  )}
                </>
              )}

              {!!debugInfo && __DEV__ && <Text style={styles.debugText}>{debugInfo}</Text>}

              {isRegister && (
                <View style={[styles.sectionCard, useCompactRegister && styles.sectionCardCompact]}>
                  <Text style={styles.sectionLabel}>Tus datos</Text>

                  <TextInput
                    ref={fullNameRef}
                    style={[styles.input, useCompactRegister && styles.inputCompact, activeField === 'fullName' && styles.inputFocused]}
                    placeholder="Nombre completo"
                    placeholderTextColor="#94A3B8"
                    value={fullName}
                    onChangeText={setFullName}
                    autoCapitalize="words"
                    returnKeyType="next"
                    onFocus={() => setActiveField('fullName')}
                    onBlur={() => setActiveField(null)}
                    onSubmitEditing={() => clientPhoneRef.current?.focus()}
                  />

                  <TextInput
                    ref={clientPhoneRef}
                    style={[styles.input, useCompactRegister && styles.inputCompact, activeField === 'clientPhone' && styles.inputFocused]}
                    placeholder="Telefono / WhatsApp"
                    placeholderTextColor="#94A3B8"
                    value={clientPhone}
                    onChangeText={setClientPhone}
                    keyboardType="phone-pad"
                    returnKeyType="next"
                    onFocus={() => setActiveField('clientPhone')}
                    onBlur={() => setActiveField(null)}
                    onSubmitEditing={handleOpenProvincePicker}
                  />

                  <TouchableOpacity
                    style={[styles.selectorField, useCompactRegister && styles.selectorFieldCompact]}
                    activeOpacity={0.85}
                    onPress={handleOpenProvincePicker}
                  >
                    <Text style={[styles.selectorText, !province && styles.selectorPlaceholder]}>
                      {province || (provinceLoading ? 'Cargando provincias...' : 'Selecciona una provincia')}
                    </Text>
                    <Ionicons name="chevron-down" size={18} color="#94A3B8" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.selectorField,
                      useCompactRegister && styles.selectorFieldCompact,
                      (!province || cityLoading) && styles.selectorFieldDisabled,
                    ]}
                    activeOpacity={0.85}
                    onPress={handleOpenCityPicker}
                    disabled={!province || cityLoading}
                  >
                    <Text style={[styles.selectorText, !clientCity && styles.selectorPlaceholder]}>
                      {clientCity ||
                        (cityLoading
                          ? 'Cargando ciudades...'
                          : province
                            ? 'Selecciona una ciudad'
                            : 'Selecciona primero una provincia')}
                    </Text>
                    <Ionicons name="chevron-down" size={18} color="#94A3B8" />
                  </TouchableOpacity>

                  {!isClientAudience && (
                    <TextInput
                      ref={businessNameRef}
                      style={[styles.input, useCompactRegister && styles.inputCompact, activeField === 'businessName' && styles.inputFocused]}
                      placeholder="Nombre de tu negocio"
                      placeholderTextColor="#94A3B8"
                      value={businessName}
                      onChangeText={setBusinessName}
                      autoCapitalize="words"
                      returnKeyType="next"
                      onFocus={() => setActiveField('businessName')}
                      onBlur={() => setActiveField(null)}
                      onSubmitEditing={() => emailRef.current?.focus()}
                    />
                  )}
                </View>
              )}

              {isRegister && !isClientAudience && (
                <View style={[styles.sectionCard, useCompactRegister && styles.sectionCardCompact]}>
                  <Text style={styles.sectionLabel}>Imagenes del perfil</Text>
                  <Text style={styles.sectionHint}>
                    Opcional por ahora. Puedes cargar tu foto, una imagen de la empresa y el banner que se mostrara en tu perfil publico.
                  </Text>

                  <TouchableOpacity
                    style={[styles.registerBannerPicker, useCompactRegister && styles.registerBannerPickerCompact]}
                    activeOpacity={0.9}
                    onPress={() => handleRegisterMediaPick('banner')}
                    disabled={pickingMedia !== null}
                  >
                    {pickingMedia === 'banner' ? (
                      <ActivityIndicator color={COLORS.primary} />
                    ) : registerMedia.banner ? (
                      <Image source={{ uri: registerMedia.banner }} style={styles.registerBannerImage} resizeMode="cover" />
                    ) : (
                      <View style={styles.registerBannerPlaceholder}>
                        <Ionicons name="image-outline" size={30} color="rgba(248,250,252,0.52)" />
                        <Text style={styles.registerBannerTitle}>Subir banner</Text>
                        <Text style={styles.registerBannerText}>Se vera en la cabecera de tu perfil.</Text>
                      </View>
                    )}
                    {pickingMedia !== 'banner' && (
                      <View style={styles.registerMediaEditBadge}>
                        <Ionicons name="camera-outline" size={13} color="#FFF" />
                      </View>
                    )}
                  </TouchableOpacity>

                  <View style={styles.registerMediaRow}>
                    {(['avatar', 'logo'] as RegistrationMediaKind[]).map((kind) => {
                      const imageUri = registerMedia[kind];
                      const isUploading = pickingMedia === kind;

                      return (
                        <TouchableOpacity
                          key={kind}
                          style={styles.registerMediaCard}
                          activeOpacity={0.9}
                          onPress={() => handleRegisterMediaPick(kind)}
                          disabled={pickingMedia !== null}
                        >
                          <View style={styles.registerMediaPreview}>
                            {isUploading ? (
                              <ActivityIndicator color={COLORS.primary} />
                            ) : imageUri ? (
                              <Image
                                source={{ uri: imageUri }}
                                style={styles.registerMediaPreviewImage}
                                resizeMode={kind === 'logo' ? 'cover' : 'cover'}
                              />
                            ) : (
                              <View style={styles.registerMediaPlaceholder}>
                                <Ionicons
                                  name={kind === 'avatar' ? 'person-circle-outline' : 'business-outline'}
                                  size={28}
                                  color="rgba(248,250,252,0.52)"
                                />
                              </View>
                            )}
                          </View>

                          <View style={styles.registerMediaCardCopy}>
                            <Text style={styles.registerMediaCardTitle}>{getRegistrationMediaTitle(kind)}</Text>
                            <Text style={styles.registerMediaCardText}>
                              {kind === 'avatar' ? 'Tu foto o imagen principal.' : 'Logo o foto de tu empresa.'}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              <View style={[styles.sectionCard, (isCompressedLogin || useCompactRegister) && styles.sectionCardCompact]}>
                <Text style={styles.sectionLabel}>Credenciales</Text>
                {!isLogin && !isCompactScreen && <Text style={styles.sectionHint}>{credentialsHint}</Text>}
                <TextInput
                  ref={emailRef}
                  style={[styles.input, (isCompressedLogin || useCompactRegister) && styles.inputCompact, activeField === 'email' && styles.inputFocused]}
                  placeholder="Email"
                  placeholderTextColor="#94A3B8"
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setActiveField('email')}
                  onBlur={() => {
                    setActiveField(null);
                    setEmail((prev) => prev.trim());
                  }}
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
                  style={[styles.input, (isCompressedLogin || useCompactRegister) && styles.inputCompact, activeField === 'password' && styles.inputFocused]}
                  placeholder="Contrasena"
                  placeholderTextColor="#94A3B8"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  onFocus={() => setActiveField('password')}
                  onBlur={() => setActiveField(null)}
                  autoCorrect={false}
                  textContentType="password"
                  autoComplete="password"
                  returnKeyType="done"
                  onSubmitEditing={handleAuth}
                />

                {isLogin && (
                  <TouchableOpacity
                    style={[styles.recoveryBtn, isCompressedLogin && styles.recoveryBtnCompact]}
                    onPress={handlePasswordRecovery}
                    disabled={recovering}
                  >
                    <Text style={styles.recoveryText}>{recovering ? 'Enviando...' : 'Olvidaste tu contrasena?'}</Text>
                  </TouchableOpacity>
                )}
              </View>

              {!isLogin && !isCompressedLogin && (
                <View style={styles.trustRow}>
                  <View style={styles.trustDot} />
                  <Text style={styles.trustText}>{trustHint}</Text>
                </View>
              )}

              <TouchableOpacity onPress={handleAuth} disabled={loading} activeOpacity={0.9}>
                <LinearGradient
                  colors={[COLORS.secondary, '#1F3144']}
                  style={[styles.button, isCompactScreen && styles.buttonCompact, isCompressedLogin && styles.buttonTight]}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={[styles.buttonText, isCompressedLogin && styles.buttonTextCompact]}>{primaryCta}</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.switchBtn, isCompressedLogin && styles.switchBtnCompact]}
                onPress={() => {
                  const nextIsLogin = !isLogin;
                  setIsLogin(nextIsLogin);
                  setShowRegisterHint(!nextIsLogin);
                }}
              >
                <Text style={[styles.switchText, isCompactScreen && styles.switchTextCompact]}>
                  {secondaryCta}
                </Text>
              </TouchableOpacity>

              {!isLogin && !isCompressedLogin && <Text style={styles.footerHint}>{footerHint}</Text>}
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <OptionSelectModal
        visible={pickerMode === 'province'}
        title="Selecciona una provincia"
        options={provinceOptions}
        loading={provinceLoading}
        searchPlaceholder="Buscar provincia..."
        emptyText="No encontramos provincias para mostrar."
        onClose={() => setPickerMode(null)}
        onSelect={handleProvinceSelect}
      />

      <OptionSelectModal
        visible={pickerMode === 'city'}
        title={province ? `Ciudades de ${province}` : 'Selecciona una ciudad'}
        options={cityOptions}
        loading={cityLoading}
        searchPlaceholder="Buscar ciudad..."
        emptyText={province ? 'No encontramos ciudades para esa provincia.' : 'Selecciona una provincia primero.'}
        onClose={() => setPickerMode(null)}
        onSelect={handleCitySelect}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bgVeilTop: {
    position: 'absolute',
    top: -40,
    right: -20,
    width: 240,
    height: 280,
    borderBottomLeftRadius: 180,
    opacity: 0.9,
  },
  bgVeilBottom: {
    position: 'absolute',
    bottom: -80,
    left: -30,
    width: 260,
    height: 320,
    borderTopRightRadius: 200,
    opacity: 0.65,
  },
  bgLineTop: {
    position: 'absolute',
    top: 132,
    left: 24,
    right: 24,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  bgLineBottom: {
    position: 'absolute',
    bottom: 128,
    left: 40,
    right: 40,
    height: 1,
    backgroundColor: 'rgba(243,156,18,0.12)',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
  },
  scrollContentCompact: {
    paddingHorizontal: SPACING.md,
  },
  scrollContentTight: {
    paddingHorizontal: 14,
  },
  layout: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    gap: 18,
  },
  layoutCompact: {
    gap: 14,
  },
  layoutTight: {
    gap: 10,
  },
  chooserCard: {
    gap: 18,
    backgroundColor: '#0F1012',
    borderRadius: 28,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.32,
    shadowRadius: 22,
    elevation: 6,
  },
  chooserCardCompact: {
    gap: 14,
    padding: 16,
    borderRadius: 22,
  },
  chooserPanel: {
    borderRadius: 24,
    padding: 18,
    gap: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.32,
    shadowRadius: 18,
    elevation: 5,
  },
  chooserBrandLockup: {
    alignItems: 'center',
    gap: 10,
  },
  chooserLogoWrap: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111214',
    borderWidth: 1,
    borderColor: 'rgba(243,156,18,0.26)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.24,
    shadowRadius: 16,
    elevation: 4,
  },
  chooserLogo: {
    width: 44,
    height: 44,
    resizeMode: 'contain',
  },
  chooserWordmark: {
    fontSize: 30,
    lineHeight: 34,
    letterSpacing: 0.3,
    color: COLORS.primary,
    fontFamily: FONTS.title,
  },
  chooserTitle: {
    fontSize: 28,
    lineHeight: 34,
    color: '#F8FAFC',
    fontFamily: FONTS.title,
    textAlign: 'center',
  },
  chooserSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.78)',
    fontFamily: FONTS.body,
    textAlign: 'center',
  },
  chooserStack: {
    gap: 12,
  },
  chooserOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 16,
    backgroundColor: '#121316',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 3,
  },
  chooserOptionAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: COLORS.primary,
  },
  chooserOptionIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#17181C',
    borderWidth: 1,
    borderColor: 'rgba(243,156,18,0.28)',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
  },
  chooserOptionCopy: {
    flex: 1,
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chooserOptionTitle: {
    fontSize: 20,
    lineHeight: 24,
    color: '#F8FAFC',
    fontFamily: FONTS.title,
    textAlign: 'center',
  },
  chooserOptionText: {
    fontSize: 13,
    lineHeight: 19,
    color: '#B2BAC4',
    fontFamily: FONTS.body,
    textAlign: 'center',
    maxWidth: '92%',
  },
  chooserOptionChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
    width: '100%',
  },
  chooserChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#1A1B1E',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  chooserChipText: {
    fontSize: 10,
    letterSpacing: 0.2,
    color: '#F8FAFC',
    fontFamily: FONTS.subtitle,
  },
  chooserOptionArrow: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A1B1E',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  chooserHint: {
    fontSize: 12,
    lineHeight: 18,
    color: '#7F8792',
    fontFamily: FONTS.body,
    textAlign: 'center',
  },
  hero: {
    gap: 18,
    backgroundColor: COLORS.secondary,
    borderRadius: 28,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 8,
  },
  heroCompact: {
    gap: 14,
    padding: 18,
    borderRadius: 24,
  },
  heroTight: {
    gap: 10,
    padding: 16,
    borderRadius: 22,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  heroHeaderCompact: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 12,
  },
  logoWrap: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 5,
  },
  logo: { width: 44, height: 44, resizeMode: 'contain' },
  logoWrapCompact: {
    width: 56,
    height: 56,
    borderRadius: 18,
  },
  logoCompact: { width: 34, height: 34 },
  miniBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  miniLogoWrap: {
    backgroundColor: COLORS.secondary,
  },
  miniBrandCopy: {
    flex: 1,
    gap: 2,
  },
  miniBrandTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  inlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D7DEE6',
    backgroundColor: '#F8FAFC',
  },
  inlineBadgeText: {
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: COLORS.secondary,
    fontFamily: FONTS.subtitle,
  },
  changeAudienceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  changeAudienceText: {
    color: COLORS.secondary,
    fontFamily: FONTS.subtitle,
    fontSize: 12,
  },
  changeAudienceTextLight: {
    color: '#F8FAFC',
    fontFamily: FONTS.subtitle,
    fontSize: 12,
  },
  authHeaderPanel: {
    borderRadius: 24,
    padding: 18,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.32,
    shadowRadius: 18,
    elevation: 5,
  },
  authHeaderPanelCompact: {
    padding: 15,
    gap: 8,
    borderRadius: 20,
  },
  authHeaderTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  authHeaderMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  authHeaderLockup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  authHeaderLogo: {
    width: 28,
    height: 28,
    resizeMode: 'contain',
  },
  authHeaderBrand: {
    fontSize: 17,
    lineHeight: 19,
    letterSpacing: 0.2,
    color: COLORS.primary,
    fontFamily: FONTS.title,
  },
  authHeaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  authHeaderBadgeText: {
    fontSize: 11,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: '#F8FAFC',
    fontFamily: FONTS.subtitle,
  },
  authHeaderTitle: {
    color: '#FFFFFF',
    fontFamily: FONTS.title,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.3,
  },
  authHeaderSubtitle: {
    color: '#B8C0CB',
    fontFamily: FONTS.body,
    fontSize: 14,
    lineHeight: 20,
  },
  heroCopy: {
    flex: 1,
    gap: 4,
  },
  brandLabel: {
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.65)',
    fontFamily: FONTS.subtitle,
  },
  badgeRow: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  badgeRowCompact: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: COLORS.primary,
  },
  badgeText: {
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: '#F8FAFC',
    fontFamily: FONTS.subtitle,
  },
  heroTitle: {
    fontSize: 29,
    lineHeight: 35,
    fontFamily: FONTS.title,
    color: '#FFF',
  },
  heroTitleCompact: {
    fontSize: 25,
    lineHeight: 31,
  },
  heroTitleTight: {
    fontSize: 21,
    lineHeight: 26,
  },
  heroSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FONTS.body,
    color: 'rgba(255,255,255,0.75)',
  },
  heroSubtitleCompact: {
    fontSize: 13,
    lineHeight: 18,
  },
  heroSubtitleTight: {
    fontSize: 12,
    lineHeight: 17,
  },
  heroFootnote: {
    fontSize: 13,
    lineHeight: 19,
    color: 'rgba(255,255,255,0.82)',
    fontFamily: FONTS.body,
  },
  heroFootnoteCompact: {
    fontSize: 12,
    lineHeight: 17,
  },
  highlightRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  highlightRowCompact: {
    gap: 8,
  },
  highlightChip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  highlightChipCompact: {
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  highlightText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontFamily: FONTS.subtitle,
  },
  highlightTextCompact: {
    fontSize: 11,
  },
  card: {
    gap: 18,
    backgroundColor: '#0F1012',
    borderRadius: 28,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.32,
    shadowRadius: 22,
    elevation: 6,
  },
  cardMinimal: {
    gap: 10,
  },
  cardCompact: {
    gap: 12,
    padding: 15,
    borderRadius: 22,
  },
  cardTight: {
    gap: 10,
    padding: 13,
    borderRadius: 20,
  },
  cardHeader: {
    gap: 6,
  },
  cardHeaderCompact: {
    gap: 6,
  },
  cardSubtitleSimple: {
    marginTop: -2,
  },
  cardEyebrow: {
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: '#7F8792',
    fontFamily: FONTS.subtitle,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  cardTitleRowCompact: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  cardTitle: {
    flex: 1,
    fontSize: 24,
    lineHeight: 30,
    fontFamily: FONTS.title,
    color: '#F8FAFC',
  },
  cardTitleCompact: {
    fontSize: 22,
    lineHeight: 27,
  },
  cardTitleTight: {
    fontSize: 20,
    lineHeight: 24,
  },
  miniBrandTitle: {
    flex: 0,
  },
  miniBrandSubtitle: {
    maxWidth: '95%',
  },
  authMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  cardModeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(243,156,18,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(243,156,18,0.2)',
  },
  cardModeText: {
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: '#FFD08A',
    fontFamily: FONTS.subtitle,
  },
  cardSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: FONTS.body,
    color: '#A0A8B3',
  },
  cardSubtitleCompact: {
    fontSize: 12,
    lineHeight: 17,
  },
  controlStack: {
    gap: 6,
  },
  controlStackCompact: {
    gap: 4,
  },
  controlLabel: {
    fontSize: 11,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: '#7F8792',
    fontFamily: FONTS.subtitle,
  },
  roleSelector: {
    flexDirection: 'row',
    gap: 8,
    padding: 4,
    borderRadius: 16,
    backgroundColor: '#151618',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  toggleCompact: {
    padding: 2,
    borderRadius: 12,
  },
  roleItem: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  toggleItemCompact: {
    paddingVertical: 8,
    borderRadius: 9,
  },
  roleItemActive: {
    backgroundColor: '#222326',
  },
  roleText: {
    color: '#7F8792',
    fontFamily: FONTS.subtitle,
    fontSize: 13,
  },
  toggleTextCompact: {
    fontSize: 12,
  },
  roleTextActive: {
    color: '#FFFFFF',
  },
  segmented: {
    flexDirection: 'row',
    gap: 8,
    padding: 4,
    borderRadius: 16,
    backgroundColor: '#151618',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  segmentItemActive: {
    backgroundColor: 'rgba(243,156,18,0.16)',
    borderColor: 'rgba(243,156,18,0.26)',
  },
  segmentText: {
    color: '#7F8792',
    fontFamily: FONTS.subtitle,
    fontSize: 14,
  },
  segmentTextActive: {
    color: '#F8FAFC',
  },
  notice: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(243,156,18,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(243,156,18,0.2)',
  },
  noticeText: {
    color: '#FFD08A',
    fontFamily: FONTS.subtitle,
    fontSize: 12,
    lineHeight: 18,
  },
  socialStack: {
    gap: 8,
  },
  socialStackCompact: {
    gap: 8,
  },
  sectionCard: {
    gap: 12,
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#151618',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  sectionCardCompact: {
    gap: 8,
    padding: 10,
    borderRadius: 14,
  },
  sectionLabel: {
    color: '#7F8792',
    fontFamily: FONTS.subtitle,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  sectionHint: {
    marginTop: -4,
    color: '#7F8792',
    fontFamily: FONTS.body,
    fontSize: 12,
    lineHeight: 18,
  },
  registerBannerPicker: {
    minHeight: 152,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: '#0D0E10',
    justifyContent: 'center',
  },
  registerBannerPickerCompact: {
    minHeight: 126,
    borderRadius: 14,
  },
  registerBannerImage: {
    width: '100%',
    height: '100%',
  },
  registerBannerPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 24,
  },
  registerBannerTitle: {
    color: '#F8FAFC',
    fontFamily: FONTS.subtitle,
    fontSize: 14,
  },
  registerBannerText: {
    color: '#94A3B8',
    fontFamily: FONTS.body,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  registerMediaEditBadge: {
    position: 'absolute',
    right: 12,
    top: 12,
    width: 28,
    height: 28,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15,23,42,0.88)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  registerMediaRow: {
    flexDirection: 'row',
    gap: 10,
  },
  registerMediaCard: {
    flex: 1,
    gap: 10,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: '#0D0E10',
  },
  registerMediaPreview: {
    height: 108,
    borderRadius: 14,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16181C',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  registerMediaPreviewImage: {
    width: '100%',
    height: '100%',
  },
  registerMediaPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  registerMediaCardCopy: {
    gap: 4,
  },
  registerMediaCardTitle: {
    color: '#F8FAFC',
    fontFamily: FONTS.subtitle,
    fontSize: 13,
  },
  registerMediaCardText: {
    color: '#94A3B8',
    fontFamily: FONTS.body,
    fontSize: 11,
    lineHeight: 16,
  },
  input: {
    backgroundColor: '#0D0E10',
    padding: 15,
    borderRadius: 14,
    fontSize: 14,
    fontFamily: FONTS.body,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    color: '#F8FAFC',
  },
  selectorField: {
    minHeight: 54,
    paddingHorizontal: 15,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: '#0D0E10',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  selectorFieldCompact: {
    minHeight: 46,
    paddingHorizontal: 12,
    borderRadius: 11,
  },
  selectorFieldDisabled: {
    opacity: 0.6,
  },
  selectorText: {
    flex: 1,
    color: '#F8FAFC',
    fontFamily: FONTS.body,
    fontSize: 14,
  },
  selectorPlaceholder: {
    color: '#94A3B8',
  },
  inputCompact: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 11,
    fontSize: 13,
  },
  inputFocused: {
    borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 2,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: '#151618',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    gap: 12,
  },
  googleButtonCompact: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 8,
  },
  socialButtonMark: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0D0E10',
    borderWidth: 1,
    borderColor: 'rgba(243,156,18,0.24)',
  },
  socialButtonMarkCompact: {
    width: 30,
    height: 30,
    borderRadius: 9,
  },
  socialButtonMarkText: {
    color: COLORS.secondary,
    fontFamily: FONTS.title,
    fontSize: 18,
  },
  socialButtonMarkTextCompact: {
    fontSize: 16,
  },
  socialButtonCopy: {
    flex: 1,
    gap: 2,
  },
  socialButtonCaption: {
    fontSize: 10,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: '#7F8792',
    fontFamily: FONTS.subtitle,
  },
  socialButtonCaptionCompact: {
    fontSize: 9,
  },
  googleButtonText: {
    color: '#F8FAFC',
    fontFamily: FONTS.subtitle,
    fontSize: 14,
  },
  googleButtonTextCompact: {
    fontSize: 13,
  },
  appleButtonWrap: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: '#000000',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.24,
    shadowRadius: 18,
    elevation: 5,
  },
  appleButtonWrapCompact: {
    borderRadius: 12,
  },
  appleButton: {
    width: '100%',
    height: 52,
  },
  appleButtonCompact: {
    height: 40,
  },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dividerRowCompact: { gap: 8 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.08)' },
  dividerText: { color: '#7F8792', fontFamily: FONTS.body, fontSize: 11 },
  debugText: { fontSize: 10, color: '#7F8792', textAlign: 'center' },
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: '#151618',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  trustDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: COLORS.primary,
  },
  trustText: {
    flex: 1,
    color: '#F8FAFC',
    fontFamily: FONTS.body,
    fontSize: 12,
    lineHeight: 18,
  },
  button: {
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 6,
  },
  buttonCompact: {
    paddingVertical: 12,
  },
  buttonTight: {
    paddingVertical: 11,
    borderRadius: 12,
  },
  buttonText: { color: '#FFF', fontFamily: FONTS.subtitle, fontSize: 17, letterSpacing: 0.2 },
  buttonTextCompact: { fontSize: 15 },
  switchBtn: { alignItems: 'center', paddingTop: 4 },
  switchBtnCompact: { paddingTop: 0 },
  switchText: { color: '#D5D9DE', fontFamily: FONTS.body, fontSize: 13, lineHeight: 18, textAlign: 'center' },
  switchTextCompact: { fontSize: 12, lineHeight: 18 },
  recoveryBtn: { alignSelf: 'flex-end', marginTop: -2 },
  recoveryBtnCompact: { marginTop: 0 },
  recoveryText: { color: COLORS.primary, fontFamily: FONTS.body, fontSize: 12 },
  footerHint: {
    textAlign: 'center',
    color: '#7F8792',
    fontFamily: FONTS.body,
    fontSize: 11,
    lineHeight: 17,
  },
});
