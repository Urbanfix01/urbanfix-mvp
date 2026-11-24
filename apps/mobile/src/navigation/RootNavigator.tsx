import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { DefaultTheme, NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';

import { supabase } from '../lib/supabase';
import { COLORS, FONTS } from '../utils/theme';
import { claimAudienceSignIn, getStoredAudience, setStoredAudience } from '../utils/audience';
import { hasRequiredValue, observeSession, resolveAccountShell, withStartupDeadline } from './accountBoot';
import type { AccountShell, SessionBoot } from './accountBoot';
import AppRecoveryScreen from './AppRecoveryScreen';
import useMobileLinks from './useMobileLinks';
import SwipeableTabScreen from './SwipeableTabScreen';
import { registerForPushNotificationsAsync, showLocalNotification } from '../utils/notifications';
import ProjectsScreen from '../projects/ProjectsScreen';
import NewProjectScreen from '../projects/NewProjectScreen';
import ProjectDetailScreen from '../projects/ProjectDetailScreen';
import ProjectLinkScreen from '../projects/ProjectLinkScreen';
import DesignWorkspaceScreen from '../design/DesignWorkspaceScreen';
import MoreScreen from '../projects/MoreScreen';
import { ProjectOwnerContext } from '../projects/ProjectSession';

// Auth
import LoginScreen from '../screens/auth/LoginScreen';

// Technician tabs
import JobsScreen from '../screens/tabs/JobsScreen';
import AgendaScreen from '../screens/tabs/AgendaScreen';
import MapScreen from '../screens/tabs/MapScreen';
import OperationalScreen from '../screens/tabs/OperationalScreen';
import CatalogScreen from '../screens/tabs/CatalogScreen';
import ProfileScreen from '../screens/tabs/ProfileScreen';
import NotificationsScreen from '../screens/tabs/NotificationsScreen';

// Technician flow
import JobConfigScreen from '../screens/flow/JobConfigScreen';
import RequestApplicationScreen from '../screens/flow/RequestApplicationScreen';
import JobDetailScreen from '../screens/flow/JobDetailScreen';
import HistoryScreen from '../screens/flow/HistoryScreen';
import MarcaScreen from '../screens/flow/MarcaScreen';
import TechnicianPublicProfileScreen from '../screens/flow/TechnicianPublicProfileScreen';

// Settings
import ItemDetailScreen from '../screens/tabs/ItemDetailScreen';
import EditProfileScreen from '../screens/settings/EditProfileScreen';
import SupportScreen from '../screens/settings/SupportScreen';

// Client tabs
import ClientRequestsScreen from '../screens/client/ClientRequestsScreen';
import ClientPublishScreen from '../screens/client/ClientPublishScreen';
import ClientMapScreen from '../screens/client/ClientMapScreen';
import ClientTechnicianProfileScreen from '../screens/client/ClientTechnicianProfileScreen';
import ClientProfileScreen from '../screens/client/ClientProfileScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const logo = require('../../assets/icon.png');
const navigationTheme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, primary: COLORS.brand, background: COLORS.background, card: COLORS.white, text: COLORS.text, border: COLORS.border } };

const withTabSwipe = (Component: React.ComponentType<any>) => {
  const Wrapped = (props: any) => (
    <SwipeableTabScreen>
      <Component {...props} />
    </SwipeableTabScreen>
  );
  return Wrapped;
};

const JobsScreenWithSwipe = withTabSwipe(JobsScreen);
const AgendaScreenWithSwipe = withTabSwipe(AgendaScreen);

const ClientRequestsScreenWithSwipe = withTabSwipe(ClientRequestsScreen);
const ClientPublishScreenWithSwipe = withTabSwipe(ClientPublishScreen);
const ClientProfileScreenWithSwipe = withTabSwipe(ClientProfileScreen);

function AccountLoadingScreen() {
  const progress = useRef(new Animated.Value(0.18)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(progress, {
          toValue: 1,
          duration: 1350,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.timing(progress, {
          toValue: 0.18,
          duration: 420,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
      ])
    );

    animation.start();
    return () => animation.stop();
  }, [progress]);

  const progressWidth = progress.interpolate({
    inputRange: [0.18, 1],
    outputRange: ['18%', '100%'],
  });

  return (
    <LinearGradient colors={['#33003F', '#24002F', '#09000F']} style={styles.loadingRoot}>
      <View style={styles.loadingCard}>
        <View style={styles.loadingLogoWrap}>
          <Image source={logo} style={styles.loadingLogo} />
        </View>
        <Text style={styles.loadingBrand}>
          URBAN<Text style={styles.loadingBrandAccent}>FIX</Text>
        </Text>
        <Text style={styles.loadingAppTitle}>APP</Text>
        <Text style={styles.loadingLabel}>Preparando tu cuenta</Text>
        <View style={styles.loadingProgressTrack}>
          <Animated.View style={[styles.loadingProgressFill, { width: progressWidth }]} />
        </View>
      </View>
    </LinearGradient>
  );
}

const getTabIconName = (routeName: string, focused: boolean) => {
  if (routeName === 'Proyectos') return focused ? 'folder-open' : 'folder-open-outline';
  if (routeName === 'Más') return 'ellipsis-horizontal';
  if (routeName === 'Panel') return focused ? 'grid' : 'grid-outline';
  if (routeName === 'Agenda') return focused ? 'today' : 'today-outline';
  if (routeName === 'Operativo') return focused ? 'map' : 'map-outline';
  if (routeName === 'Mapa') return focused ? 'map' : 'map-outline';
  if (routeName === 'Catalogo') return focused ? 'book' : 'book-outline';
  if (routeName === 'Notificaciones') return focused ? 'notifications' : 'notifications-outline';
  if (routeName === 'Perfil') return focused ? 'person-circle' : 'person-circle-outline';

  if (routeName === 'Solicitudes') return focused ? 'briefcase' : 'briefcase-outline';
  if (routeName === 'Publicar') return focused ? 'add-circle' : 'add-circle-outline';
  if (routeName === 'MiPerfil') return focused ? 'person-circle' : 'person-circle-outline';

  return focused ? 'ellipse' : 'ellipse-outline';
};

const useTabScreenOptions = (variant: 'tech' | 'client' = 'tech') => {
  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  const barHeight = Math.ceil(70 + Math.max(0, fontScale - 1) * 32) + insets.bottom;

  return ({ route }: any) => {
    const isTechVariant = variant === 'tech';

    if (!isTechVariant) {
      return {
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarAllowFontScaling: true,
        tabBarLabelPosition: 'below-icon' as const,
        tabBarActiveTintColor: COLORS.brand,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarBackground: () => <View style={styles.tabBarBackground} />,
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopColor: COLORS.border,
          height: barHeight,
          paddingBottom: Math.max(8, insets.bottom),
          paddingTop: 8,
        },
        tabBarLabel: ({ color, children }: any) => <Text style={[styles.clientTabLabel, { color, textAlign: 'center', flexShrink: 1 }]}>{children}</Text>,
        tabBarIcon: ({ focused, color, size }: any) => (
          <Ionicons name={getTabIconName(route.name, focused) as any} size={size} color={color} />
        ),
      };
    }

    return {
      headerShown: false,
      tabBarShowLabel: true,
      tabBarHideOnKeyboard: true,
      tabBarAllowFontScaling: true,
      tabBarLabelPosition: 'below-icon' as const,
      tabBarActiveTintColor: COLORS.brand,
      tabBarInactiveTintColor: COLORS.textSecondary,
      tabBarStyle: {
        height: barHeight,
        paddingBottom: Math.max(8, insets.bottom),
        paddingTop: 8,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
      },
      tabBarLabel: ({ color, children }: any) => <Text style={{ color, fontFamily: FONTS.body, fontSize: 10, textAlign: 'center', flexShrink: 1 }}>{children}</Text>,
      tabBarIcon: ({ focused, color }: any) => <Ionicons name={getTabIconName(route.name, focused) as any} size={22} color={color} />,
    };
  };
};

function TechTabs() {
  const screenOptions = useTabScreenOptions('tech');

  return (
    <Tab.Navigator initialRouteName="Proyectos" backBehavior="history" screenOptions={screenOptions}>
      <Tab.Screen name="Proyectos" component={ProjectsScreen} />
      <Tab.Screen name="Panel" component={JobsScreenWithSwipe} options={{ title: 'Dashboard' }} />
      <Tab.Screen name="Agenda" component={AgendaScreenWithSwipe} options={{ title: 'Orden del día' }} />
      <Tab.Screen name="Operativo" component={OperationalScreen} options={{ title: 'Mapa operativo' }} />
      <Tab.Screen name="Más" component={MoreScreen} />
    </Tab.Navigator>
  );
}

function ClientTabs() {
  const screenOptions = useTabScreenOptions('client');

  return (
    <Tab.Navigator initialRouteName="MiPerfil" backBehavior="history" screenOptions={screenOptions}>
      <Tab.Screen name="Solicitudes" component={ClientRequestsScreenWithSwipe} />
      <Tab.Screen name="Publicar" component={ClientPublishScreenWithSwipe} />
      <Tab.Screen name="Mapa" component={ClientMapScreen} />
      <Tab.Screen name="MiPerfil" component={ClientProfileScreenWithSwipe} options={{ title: 'Perfil' }} />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const queryClient = useQueryClient();
  const [auth, setAuth] = useState<SessionBoot>({ status: 'loading', session: null });
  const [shell, setShell] = useState<{ status: 'loading' | 'ready' | 'error'; value: AccountShell | null }>({ status: 'loading', value: null });
  const [bootAttempt, setBootAttempt] = useState(0);
  const [profileGateVersion, setProfileGateVersion] = useState(0);
  const previousSessionUserIdRef = useRef<string | null>(null);
  const session = auth.session;
  const shellMatches = Boolean(session?.user.id && shell.value?.owner === session.user.id);
  const audience = shellMatches ? shell.value!.audience : 'tecnico';
  const needsProfileCompletion = shellMatches && shell.value!.needsProfileCompletion;
  const navigationRef = useNavigationContainerRef<any>();
  const [navigationReady, setNavigationReady] = useState(false);
  const accountReady = auth.status === 'ready' && shell.status === 'ready' && shellMatches && !needsProfileCompletion;
  const navigateLink = useCallback((name: string, params?: Record<string, unknown>) => { if (navigationRef.isReady()) navigationRef.navigate(name, params); }, [navigationRef]);
  const link = useMobileLinks({ owner: session?.user.id || null, audience, ready: Boolean(accountReady && navigationReady), navigate: navigateLink });
  useEffect(() => { if (auth.status !== 'ready' || shell.status !== 'ready') setNavigationReady(false); }, [auth.status, shell.status]);

  useEffect(() => {
    return observeSession(supabase.auth, (state) => {
      const nextUserId = state.session?.user.id ?? null;
      const previousUserId = previousSessionUserIdRef.current;
      if (state.status === 'ready' && previousUserId && previousUserId !== nextUserId) {
        queryClient.clear();
      }
      if (state.status === 'ready') previousSessionUserIdRef.current = nextUserId;
      if (state.event === 'USER_UPDATED') setProfileGateVersion(value => value + 1);
      setAuth(state);
    }, claimAudienceSignIn);
  }, [queryClient, bootAttempt]);

  useEffect(() => {
    if (auth.status !== 'ready' || !session?.user.id) {
      setShell({ status: 'ready', value: null });
      return;
    }
    const controller = new AbortController();
    let active = true;
    const owner = session.user.id;
    setShell({ status: 'loading', value: null });
    void withStartupDeadline(async signal => {
      const [stored, response] = await Promise.all([
        getStoredAudience(owner),
        supabase.from('profiles').select('phone, city, business_name, access_granted').eq('id', owner).abortSignal(signal).maybeSingle(),
      ]);
      if (response.error) throw response.error;
      return resolveAccountShell(session, stored, response.data);
    }, { signal: controller.signal }).then(value => {
      if (!active) return;
      setShell({ status: 'ready', value });
      void setStoredAudience(value.audience, owner);
    }).catch(() => { if (active) setShell({ status: 'error', value: null }); });
    return () => { active = false; controller.abort(); };
  }, [auth.status, session?.user.id, profileGateVersion]);

  useEffect(() => {
    if (!session?.user) return;

    const metadata = ((session.user as any)?.user_metadata || {}) as Record<string, unknown>;

    const seedProfileFromMetadata = async () => {
      const { data: existing, error: readError } = await supabase
        .from('profiles')
        .select('email, full_name, phone, city, business_name')
        .eq('id', session.user.id)
        .maybeSingle();
      if (readError) throw readError;
      if (!existing) return;

      const profileSeed: Record<string, unknown> = {};
      if (!hasRequiredValue(existing.email) && session.user.email) {
        profileSeed.email = session.user.email;
      }
      for (const field of ['full_name', 'phone', 'city', 'business_name'] as const) {
        if (!hasRequiredValue(existing[field]) && hasRequiredValue(metadata[field])) {
          profileSeed[field] = String(metadata[field]).trim();
        }
      }
      if (Object.keys(profileSeed).length === 0) return;

      const { error } = await supabase.from('profiles').update(profileSeed).eq('id', session.user.id);
      if (error) throw error;
    };

    seedProfileFromMetadata().catch(() => {
      console.warn('No se pudieron completar los datos del perfil al iniciar.');
    });
  }, [session?.user?.id]);

  const refreshProfileGate = () => {
    setProfileGateVersion((current) => current + 1);
  };

  useEffect(() => {
    if (!session?.user || Platform.OS === 'web') return;

    const upsertToken = async () => {
      try {
        const token = await registerForPushNotificationsAsync();
        if (!token) return;

        await supabase.from('device_tokens').upsert(
          {
            user_id: session.user.id,
            expo_push_token: token,
            platform: Platform.OS,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'expo_push_token' }
        );
      } catch (err) {
        console.warn('Push token error', err);
      }
    };

    upsertToken();
  }, [session?.user?.id]);

  useEffect(() => {
    if (!session?.user) return;

    const channel = supabase
      .channel('notifications-local')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${session.user.id}` },
        (payload) => {
          const record = payload.new as { title?: string; body?: string };
          if (record?.title && record?.body) {
            showLocalNotification(record.title, record.body);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id]);

  if (auth.status === 'error' || shell.status === 'error') {
    return <AppRecoveryScreen title="No pudimos cargar tu cuenta" message="Revisá la conexión y volvé a intentar. Tus proyectos guardados se conservan." onRetry={() => setBootAttempt(value => value + 1)} />;
  }
  if (auth.status === 'loading' || session && (shell.status === 'loading' || !shellMatches)) {
    return <AccountLoadingScreen />;
  }

  let rootContent: React.ReactNode;

  if (!session) {
    rootContent = <Stack.Screen name="Auth" component={LoginScreen} options={{ animation: 'fade' }} />;
  } else if (needsProfileCompletion) {
    rootContent =
      audience === 'cliente' ? (
        <Stack.Screen name="ClientProfileRequired" options={{ animation: 'fade' }}>
          {(props) => (
            <ClientProfileScreen
              {...props}
              requiredCompletion
              onProfileUpdated={refreshProfileGate}
            />
          )}
        </Stack.Screen>
      ) : (
        <Stack.Screen name="TechProfileRequired" options={{ animation: 'fade' }}>
          {(props) => (
            <ProfileScreen
              {...props}
              requiredCompletion
              onProfileUpdated={refreshProfileGate}
            />
          )}
        </Stack.Screen>
      );
  } else if (audience === 'cliente') {
    rootContent = (
      <>
        <Stack.Screen name="ClientMain" component={ClientTabs} />
        <Stack.Screen
          name="ClientTechnicianProfile"
          component={ClientTechnicianProfileScreen}
          options={{ animation: 'slide_from_right' }}
        />
      </>
    );
  } else {
    rootContent = (
      <>
        <Stack.Screen name="Main" component={TechTabs} />
        <Stack.Screen name="NewProject" component={NewProjectScreen} />
        <Stack.Screen name="ProjectDetail" component={ProjectDetailScreen} />
        <Stack.Screen name="ProjectLink" component={ProjectLinkScreen} />
        <Stack.Screen name="DesignWorkspace" component={DesignWorkspaceScreen} />
        <Stack.Screen name="Notificaciones" component={NotificationsScreen} />
        <Stack.Screen name="Perfil" component={ProfileScreen} />

        <Stack.Screen name="JobConfig" component={JobConfigScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen
          name="RequestApplication"
          component={RequestApplicationScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen name="JobDetail" component={JobDetailScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="History" component={HistoryScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="Mapa" component={MapScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="Catalogo" component={CatalogScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen
          name="TechnicianPublicProfile"
          component={TechnicianPublicProfileScreen}
          options={{ animation: 'slide_from_right' }}
        />

        <Stack.Screen name="ItemDetail" component={ItemDetailScreen} options={{ animation: 'slide_from_right' }} />

        <Stack.Screen
          name="EditProfile"
          component={EditProfileScreen}
          options={{ animation: 'slide_from_bottom' }}
        />

        <Stack.Screen
          name="MarcaScreen"
          component={MarcaScreen}
          options={{ headerShown: false, animation: 'slide_from_right' }}
        />

        <Stack.Screen name="Support" component={SupportScreen} options={{ animation: 'slide_from_right' }} />
      </>
    );
  }

  return (
    <SafeAreaView edges={['left', 'right']} style={{ flex: 1, backgroundColor: COLORS.background }}>
    <ProjectOwnerContext.Provider value={session?.user?.id || null}>
    {link.message ? <View style={{ padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.accentSoft }}><Text accessibilityRole="alert" style={{ flex: 1, color: COLORS.text }}>{link.message}</Text><Pressable accessibilityRole="button" accessibilityLabel="Cerrar aviso del enlace" onPress={link.dismiss} style={{ minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center' }}><Ionicons name="close" size={22} color={COLORS.brand} /></Pressable></View> : null}
    <NavigationContainer ref={navigationRef} theme={navigationTheme} onReady={() => setNavigationReady(true)}>
      <Stack.Navigator key={`${session?.user?.id || 'signed-out'}:${audience}`} screenOptions={{ headerShown: false }}>
        {rootContent}
      </Stack.Navigator>
    </NavigationContainer>
    </ProjectOwnerContext.Provider>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingRoot: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
    overflow: 'hidden',
  },
  loadingCard: {
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 26,
  },
  loadingLogoWrap: {
    width: 76,
    height: 76,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 0,
    marginBottom: 18,
  },
  loadingLogo: {
    width: 58,
    height: 58,
    borderRadius: 16,
  },
  loadingBrand: {
    color: COLORS.white,
    fontFamily: FONTS.title,
    fontSize: 30,
    lineHeight: 34,
    letterSpacing: 0,
  },
  loadingBrandAccent: {
    color: COLORS.primary,
  },
  loadingAppTitle: {
    color: COLORS.white,
    fontFamily: FONTS.title,
    fontSize: 25,
    lineHeight: 28,
    letterSpacing: 0,
    marginTop: -2,
  },
  loadingLabel: {
    marginTop: 10,
    color: 'rgba(255,255,255,0.78)',
    fontFamily: FONTS.subtitle,
    fontSize: 13,
  },
  loadingProgressTrack: {
    width: '100%',
    height: 9,
    borderRadius: 999,
    marginTop: 24,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  loadingProgressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.8,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  tabBarBackground: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  techTabBarBackground: {
    flex: 1,
    backgroundColor: '#09111B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  techTabBarSheen: {
    position: 'absolute',
    top: 0,
    left: 18,
    right: 18,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  techTabBarGlowCenter: {
    position: 'absolute',
    top: -18,
    alignSelf: 'center',
    width: 138,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(243, 156, 18, 0.12)',
  },
  clientTabLabel: {
    fontFamily: FONTS.body,
    fontSize: 11,
    marginBottom: 2,
  },
  techTabItem: {
    paddingTop: 6,
  },
  primaryTabItem: {
    marginTop: -20,
  },
  primaryTabButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#09111B',
    shadowColor: '#020617',
    shadowOpacity: 0.34,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  primaryTabInnerRing: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  primaryTabButtonFocused: {
    backgroundColor: COLORS.primary,
  },
  primaryTabButtonIdle: {
    backgroundColor: '#F0A01E',
  },
  techTabIconSlot: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  techTabIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  techTabIconWrapFocused: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  techTabDot: {
    width: 5,
    height: 5,
    borderRadius: 999,
    backgroundColor: 'transparent',
  },
  techTabDotFocused: {
    backgroundColor: COLORS.primary,
  },
});
