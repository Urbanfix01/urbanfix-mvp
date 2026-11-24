import React, { PropsWithChildren, useEffect, useState } from 'react';
import { View } from 'react-native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { Montserrat_700Bold } from '@expo-google-fonts/montserrat';
import { Raleway_400Regular, Raleway_600SemiBold } from '@expo-google-fonts/raleway';
import AppRecoveryScreen from './AppRecoveryScreen';
import { STARTUP_TIMEOUT_MS } from './accountBoot';

export default function AppFontGate({ children, onRetry }: PropsWithChildren<{ onRetry: () => void }>) {
  const [loaded, error] = useFonts({ Montserrat_700Bold, Raleway_600SemiBold, Raleway_400Regular });
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    if (loaded || error) return;
    const timer = setTimeout(() => setTimedOut(true), STARTUP_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [loaded, error]);
  return <View style={{ flex: 1 }} onLayout={() => { void SplashScreen.hideAsync().catch(() => {}); }}>
    {loaded ? children : error || timedOut
      ? <AppRecoveryScreen title="No pudimos preparar el inicio" message="Volvé a intentar. Tus datos guardados se conservan." onRetry={onRetry} />
      : <AppRecoveryScreen title="Preparando UrbanFix" message="Estamos abriendo tus herramientas." loading />}
  </View>;
}
