import React, { useEffect, useState } from 'react';
import { AppState, LogBox, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AppBoundary from './src/navigation/AppBoundary';
import AppFontGate from './src/navigation/AppFontGate';
import RootNavigator from './src/navigation/RootNavigator'; 
import { supabase } from './src/lib/supabase';
import { attachAuthRefresh } from './src/lib/authLifecycle';

const queryClient = new QueryClient();

void SplashScreen.preventAutoHideAsync().catch(() => {});

// Silenciar warnings de RN Web sobre shadow* y pointerEvents deprecados
if (Platform.OS === 'web') {
  LogBox.ignoreLogs([
    '"shadow*" style props are deprecated. Use "boxShadow".',
    'props.pointerEvents is deprecated. Use style.pointerEvents',
  ]);
}

function AppRuntime() {
  useEffect(() => {
    if (Platform.OS !== 'web') return attachAuthRefresh(supabase.auth, AppState);
  }, []);
  return <RootNavigator />;
}

export default function App() {
  const [fontAttempt, setFontAttempt] = useState(0);
  return <SafeAreaProvider>
    <StatusBar style="light" />
    <AppBoundary onRetry={() => queryClient.clear()}>
      <AppFontGate key={fontAttempt} onRetry={() => setFontAttempt(value => value + 1)}>
        <QueryClientProvider client={queryClient}><AppRuntime /></QueryClientProvider>
      </AppFontGate>
    </AppBoundary>
  </SafeAreaProvider>;
}
