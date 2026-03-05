import type { ExpoConfig } from 'expo/config';

const appJson = require('./app.json');

const baseConfig: ExpoConfig = appJson.expo;

const resolveAndroidMapsKey = () =>
  String(process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY || process.env.GOOGLE_MAPS_ANDROID_API_KEY || '').trim();

export default (): ExpoConfig => {
  const androidMapsKey = resolveAndroidMapsKey();
  const baseAndroid = baseConfig.android || {};
  const baseAndroidConfig = (baseAndroid as any).config || {};

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
    extra: {
      ...(baseConfig.extra || {}),
      hasGoogleMapsAndroidKey: Boolean(androidMapsKey),
    },
  };
};
