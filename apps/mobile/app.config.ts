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
  const androidMapsKey = resolveAndroidMapsKey();
  const iosMapsKey = resolveIosMapsKey();
  const placesKey = resolvePlacesKey();
  const baseAndroid = baseConfig.android || {};
  const baseAndroidConfig = (baseAndroid as any).config || {};
  const baseIos = baseConfig.ios || {};
  const baseIosConfig = (baseIos as any).config || {};

  return {
    ...baseConfig,
    android: {
      ...baseAndroid,
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
      config: iosMapsKey
        ? {
            ...baseIosConfig,
            googleMapsApiKey: iosMapsKey,
          }
        : baseIosConfig,
    },
    extra: {
      ...(baseConfig.extra || {}),
      hasGoogleMapsAndroidKey: Boolean(androidMapsKey),
      hasGoogleMapsIosKey: Boolean(iosMapsKey),
      hasGooglePlacesKey: Boolean(placesKey),
    },
  };
};
