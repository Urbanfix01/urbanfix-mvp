import React, { useCallback, useEffect } from 'react';
import { AppState, LogBox, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'; // <--- 1. IMPORTANTE

// Fuentes
import { Montserrat_700Bold } from '@expo-google-fonts/montserrat';
import { Raleway_400Regular, Raleway_600SemiBold } from '@expo-google-fonts/raleway';

// Navegación (CORREGIDO: Apuntamos al archivo explícito)
import RootNavigator from './src/navigation/RootNavigator'; 
import { supabase } from './src/lib/supabase';
import { attachAuthRefresh } from './src/lib/authLifecycle';

// 2. CREAMOS EL CLIENTE (El cerebro de React Query)
const queryClient = new QueryClient();

SplashScreen.preventAutoHideAsync();

// Silenciar warnings de RN Web sobre shadow* y pointerEvents deprecados
if (Platform.OS === 'web') {
  LogBox.ignoreLogs([
    '"shadow*" style props are deprecated. Use "boxShadow".',
    'props.pointerEvents is deprecated. Use style.pointerEvents',
  ]);
}

export default function App() {
  useEffect(() => {
    if (Platform.OS !== 'web') return attachAuthRefresh(supabase.auth, AppState);
  }, []);
  const [fontsLoaded] = useFonts({
    Montserrat_700Bold,
    Raleway_600SemiBold,
    Raleway_400Regular,
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null; 
  }

  return (
    // 3. ENVOLVEMOS TODA LA APP (Sin esto, useQuery no funciona)
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider onLayout={onLayoutRootView}>
        <StatusBar style="light" />
        <RootNavigator /> 
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
