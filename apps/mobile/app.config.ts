import type { ExpoConfig } from 'expo/config';

const appJson = require('./app.json');

const baseConfig: ExpoConfig = appJson.expo;

const resolveGoogleMapsKey = (...candidates: Array<string | undefined>) => {
  for (const candidate of candidates) {
    const trimmed = String(candidate || '').trim();
    if (trimmed) return trimmed;
  }
  return '';
};

const resolveEnvValue = (...candidates: Array<string | undefined>) => {
  for (const candidate of candidates) {
    const trimmed = String(candidate || '').trim();
    if (trimmed) return trimmed.replace(/^"|"$/g, '');
  }
  return '';
};

const resolveAndroidMapsKey = () =>
  resolveGoogleMapsKey(
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY,
    process.env.GOOGLE_MAPS_ANDROID_API_KEY,
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
    process.env.GOOGLE_MAPS_API_KEY
  );

const resolveIosMapsKey = () =>
  resolveGoogleMapsKey(
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_IOS_API_KEY,
    process.env.GOOGLE_MAPS_IOS_API_KEY,
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
    process.env.GOOGLE_MAPS_API_KEY
  );

const resolvePlacesKey = () =>
  resolveGoogleMapsKey(
    process.env.EXPO_PUBLIC_PLACES_API_KEY,
    process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY,
    process.env.GOOGLE_PLACES_API_KEY,
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
  );

export default (): ExpoConfig => {
  const preview = process.env.APP_VARIANT === 'preview';
  const androidMapsKey = resolveAndroidMapsKey();
  const iosMapsKey = resolveIosMapsKey();
  const placesKey = resolvePlacesKey();
  const supabaseUrl = resolveEnvValue(
    process.env.EXPO_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_URL
  );
  const supabaseAnonKey = resolveEnvValue(
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  const baseAndroid = baseConfig.android || {};
  const baseAndroidConfig = (baseAndroid as any).config || {};
  const baseIos = baseConfig.ios || {};
  const baseIosConfig = (baseIos as any).config || {};

  return {
    ...baseConfig,
    name: preview ? 'UrbanFix Prueba' : baseConfig.name,
    scheme: preview ? 'urbanfix-preview' : baseConfig.scheme,
    plugins: [...(baseConfig.plugins || []), ['expo-location', {
      locationWhenInUsePermission: 'UrbanFix usa tu ubicación únicamente cuando elegís ubicar la obra.',
      isIosBackgroundLocationEnabled: false,
      isAndroidBackgroundLocationEnabled: false,
      isAndroidForegroundServiceEnabled: false,
    }]],
    android: {
      ...baseAndroid,
      package: preview ? 'com.urbanfix.app.preview' : baseAndroid.package,
      intentFilters: preview ? baseAndroid.intentFilters?.map((filter) => ({ ...filter, data: [{ scheme: 'urbanfix-preview' }] })) : baseAndroid.intentFilters,
      config: androidMapsKey
        ? {
            ...baseAndroidConfig,
            googleMaps: {
              apiKey: androidMapsKey,
            },
          }
        : baseAndroidConfig,
    },
    ios: {
      ...baseIos,
      bundleIdentifier: preview ? 'com.urbanfix.urbanfix.preview' : baseIos.bundleIdentifier,
      config: iosMapsKey
        ? {
            ...baseIosConfig,
            googleMapsApiKey: iosMapsKey,
          }
        : baseIosConfig,
    },
    extra: {
      ...(baseConfig.extra || {}),
      supabaseUrl,
      supabaseAnonKey,
      hasGoogleMapsAndroidKey: Boolean(androidMapsKey),
      hasGoogleMapsIosKey: Boolean(iosMapsKey),
      hasGooglePlacesKey: Boolean(placesKey),
    },
  };
};
