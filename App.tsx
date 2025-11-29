import React, { useCallback } from 'react';
import { View } from 'react-native';
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

// 2. CREAMOS EL CLIENTE (El cerebro de React Query)
const queryClient = new QueryClient();

SplashScreen.preventAutoHideAsync();

export default function App() {
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
        <StatusBar style="auto" />
        <RootNavigator /> 
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}