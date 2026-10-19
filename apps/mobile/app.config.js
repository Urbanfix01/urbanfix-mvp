module.exports = ({ config }) => {
  const preview = process.env.APP_VARIANT === 'preview';
  return {
    ...config,
    name: preview ? 'UrbanFix Prueba' : config.name,
    scheme: preview ? 'urbanfix-preview' : config.scheme,
    ios: { ...config.ios, bundleIdentifier: preview ? 'com.urbanfix.urbanfix.preview' : config.ios.bundleIdentifier },
    android: {
      ...config.android,
      package: preview ? 'com.urbanfix.app.preview' : config.android.package,
      intentFilters: preview ? config.android.intentFilters.map((filter) => ({ ...filter, data: [{ scheme: 'urbanfix-preview' }] })) : config.android.intentFilters,
    },
    plugins: [...config.plugins, ['expo-location', {
      locationWhenInUsePermission: 'UrbanFix usa tu ubicación únicamente cuando elegís ubicar la obra.',
      isIosBackgroundLocationEnabled: false,
      isAndroidBackgroundLocationEnabled: false,
      isAndroidForegroundServiceEnabled: false,
    }]],
  };
};
