import React, { useEffect, useRef, useState } from 'react';
import { View, ActivityIndicator, Platform, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';

import { supabase } from '../lib/supabase';
import { COLORS, FONTS } from '../utils/theme';
import { getStoredAudience, MobileAudience, setStoredAudience } from '../utils/audience';
import SwipeableTabScreen from './SwipeableTabScreen';
import { registerForPushNotificationsAsync, showLocalNotification } from '../utils/notifications';

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

const normalizeAudience = (value: unknown): MobileAudience | null => {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'cliente' || normalized === 'tecnico') {
    return normalized as MobileAudience;
  }
  return null;
};

const inferAudienceFromProfile = (profile: { access_granted?: boolean | null; business_name?: unknown } | null) => {
  if (profile?.access_granted) return 'tecnico' as MobileAudience;
  if (String(profile?.business_name || '').trim()) return 'tecnico' as MobileAudience;
  return 'cliente' as MobileAudience;
};

const resolveAudiencePreference = ({
  storedAudience,
  metadataAudience,
  profile,
}: {
  storedAudience: MobileAudience | null;
  metadataAudience: MobileAudience | null;
  profile: { access_granted?: boolean | null; business_name?: unknown } | null;
}): MobileAudience => {
  if (storedAudience) return storedAudience;
  if (metadataAudience) return metadataAudience;
  if (profile) return inferAudienceFromProfile(profile);
  return 'tecnico';
};

type ProfileGatePayload = {
  full_name?: unknown;
  phone?: unknown;
  city?: unknown;
  business_name?: unknown;
};

const hasRequiredValue = (value: unknown) => String(value || '').trim().length > 0;

const resolveProfileField = (profileValue: unknown, metadataValue: unknown) =>
  hasRequiredValue(profileValue) ? profileValue : metadataValue;

const isClientProfileComplete = (profile: ProfileGatePayload | null, metadata: Record<string, unknown>) =>
  hasRequiredValue(resolveProfileField(profile?.phone, metadata.phone)) &&
  hasRequiredValue(resolveProfileField(profile?.city, metadata.city));

const isTechProfileComplete = (profile: ProfileGatePayload | null, metadata: Record<string, unknown>) =>
  hasRequiredValue(resolveProfileField(profile?.phone, metadata.phone)) &&
  hasRequiredValue(resolveProfileField(profile?.business_name, metadata.business_name));

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
const OperationalScreenWithSwipe = withTabSwipe(OperationalScreen);
const NotificationsScreenWithSwipe = withTabSwipe(NotificationsScreen);
const ProfileScreenWithSwipe = withTabSwipe(ProfileScreen);

const ClientRequestsScreenWithSwipe = withTabSwipe(ClientRequestsScreen);
const ClientPublishScreenWithSwipe = withTabSwipe(ClientPublishScreen);
const ClientMapScreenWithSwipe = withTabSwipe(ClientMapScreen);
const ClientProfileScreenWithSwipe = withTabSwipe(ClientProfileScreen);

const getTabIconName = (routeName: string, focused: boolean) => {
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

  return ({ route }: any) => {
    const isTechVariant = variant === 'tech';
    const isPrimaryTab = route.name === 'Operativo';

    if (!isTechVariant) {
      return {
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: '#95A5A6',
        tabBarBackground: () => <View style={styles.tabBarBackground} />,
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopColor: '#EEEEEE',
          height: 60 + insets.bottom,
          paddingBottom: Math.max(8, insets.bottom),
          paddingTop: 8,
        },
        tabBarLabelStyle: styles.clientTabLabel,
        tabBarIcon: ({ focused, color, size }: any) => (
          <Ionicons name={getTabIconName(route.name, focused) as any} size={size} color={color} />
        ),
      };
    }

    return {
      headerShown: false,
      tabBarShowLabel: false,
      tabBarHideOnKeyboard: true,
      tabBarActiveTintColor: '#FFFFFF',
      tabBarInactiveTintColor: '#7F8A99',
      tabBarStyle: {
        height: 72 + insets.bottom,
        paddingBottom: Math.max(10, insets.bottom),
        paddingTop: 10,
        paddingHorizontal: 12,
        backgroundColor: '#09111B',
        borderTopWidth: 0,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
      },
      tabBarBackground: () => (
        <View style={styles.techTabBarBackground}>
          <View style={styles.techTabBarSheen} />
          <View style={styles.techTabBarGlowCenter} />
        </View>
      ),
      tabBarItemStyle: isPrimaryTab ? styles.primaryTabItem : styles.techTabItem,
      tabBarIcon: ({ focused }: any) =>
        isPrimaryTab ? (
          <View style={[styles.primaryTabButton, focused ? styles.primaryTabButtonFocused : styles.primaryTabButtonIdle]}>
            <View style={styles.primaryTabInnerRing}>
              <Ionicons name={getTabIconName(route.name, focused) as any} size={26} color="#FFFFFF" />
            </View>
          </View>
        ) : (
          <View style={styles.techTabIconSlot}>
            <View style={[styles.techTabIconWrap, focused && styles.techTabIconWrapFocused]}>
              <Ionicons
                name={getTabIconName(route.name, focused) as any}
                size={21}
                color={focused ? '#FFFFFF' : '#9AA4B2'}
              />
            </View>
            <View style={[styles.techTabDot, focused && styles.techTabDotFocused]} />
          </View>
        ),
    };
  };
};

function TechTabs() {
  const screenOptions = useTabScreenOptions('tech');

  return (
    <Tab.Navigator screenOptions={screenOptions}>
      <Tab.Screen name="Panel" component={JobsScreenWithSwipe} options={{ title: 'Dashboard' }} />
      <Tab.Screen name="Agenda" component={AgendaScreenWithSwipe} options={{ title: 'Orden del dia' }} />
      <Tab.Screen name="Operativo" component={OperationalScreenWithSwipe} options={{ title: 'Mapa operativo' }} />
      <Tab.Screen name="Notificaciones" component={NotificationsScreenWithSwipe} />
      <Tab.Screen name="Perfil" component={ProfileScreenWithSwipe} />
    </Tab.Navigator>
  );
}

function ClientTabs() {
  const screenOptions = useTabScreenOptions('client');

  return (
    <Tab.Navigator initialRouteName="MiPerfil" screenOptions={screenOptions}>
      <Tab.Screen name="Solicitudes" component={ClientRequestsScreenWithSwipe} />
      <Tab.Screen name="Publicar" component={ClientPublishScreenWithSwipe} />
      <Tab.Screen name="Mapa" component={ClientMapScreenWithSwipe} />
      <Tab.Screen name="MiPerfil" component={ClientProfileScreenWithSwipe} options={{ title: 'Perfil' }} />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [audience, setAudience] = useState<MobileAudience>('tecnico');
  const [audienceLoading, setAudienceLoading] = useState(true);
  const [profileGateLoading, setProfileGateLoading] = useState(true);
  const [needsProfileCompletion, setNeedsProfileCompletion] = useState(false);
  const [profileGateVersion, setProfileGateVersion] = useState(0);
  const previousSessionUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: nextSession } }) => {
      previousSessionUserIdRef.current = nextSession?.user?.id ?? null;
      setSession(nextSession || null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      const nextUserId = nextSession?.user?.id ?? null;
      const previousUserId = previousSessionUserIdRef.current;
      if (previousUserId && previousUserId !== nextUserId) {
        queryClient.clear();
      }
      previousSessionUserIdRef.current = nextUserId;
      setSession(nextSession || null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [queryClient]);

  useEffect(() => {
    const resolveAudience = async () => {
      if (!session?.user?.id) {
        setAudience('tecnico');
        setAudienceLoading(false);
        return;
      }

      setAudienceLoading(true);
      try {
        const stored = await getStoredAudience();
        const metadataAudience = normalizeAudience((session.user as any)?.user_metadata?.app_audience);

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('access_granted, business_name')
          .eq('id', session.user.id)
          .maybeSingle();

        const resolvedAudience = resolveAudiencePreference({
          storedAudience: stored,
          metadataAudience,
          profile: !profileError
            ? ((profile || null) as { access_granted?: boolean | null; business_name?: unknown } | null)
            : null,
        });

        setAudience(resolvedAudience);
        await setStoredAudience(resolvedAudience);
      } catch {
        const stored = await getStoredAudience();
        setAudience(stored || 'tecnico');
      } finally {
        setAudienceLoading(false);
      }
    };

    resolveAudience();
  }, [session?.user?.id]);

  useEffect(() => {
    if (!session?.user) return;

    const metadata = ((session.user as any)?.user_metadata || {}) as Record<string, unknown>;
    const profileSeed: Record<string, unknown> = {
      id: session.user.id,
      email: session.user.email || null,
    };

    if (hasRequiredValue(metadata.full_name)) {
      profileSeed.full_name = String(metadata.full_name).trim();
    }
    if (hasRequiredValue(metadata.phone)) {
      profileSeed.phone = String(metadata.phone).trim();
    }
    if (hasRequiredValue(metadata.city)) {
      profileSeed.city = String(metadata.city).trim();
    }
    if (hasRequiredValue(metadata.business_name)) {
      profileSeed.business_name = String(metadata.business_name).trim();
    }

    supabase.from('profiles').upsert(profileSeed).then();
  }, [session?.user?.id]);

  useEffect(() => {
    const resolveProfileGate = async () => {
      if (!session?.user?.id) {
        setNeedsProfileCompletion(false);
        setProfileGateLoading(false);
        return;
      }

      if (audienceLoading) return;

      setProfileGateLoading(true);
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('full_name, phone, city, business_name')
          .eq('id', session.user.id)
          .maybeSingle();

        if (error) throw error;

        const metadata = ((session.user as any)?.user_metadata || {}) as Record<string, unknown>;
        const isComplete =
          audience === 'cliente'
            ? isClientProfileComplete((profile || null) as ProfileGatePayload | null, metadata)
            : isTechProfileComplete((profile || null) as ProfileGatePayload | null, metadata);

        setNeedsProfileCompletion(!isComplete);
      } catch (error) {
        console.warn('Profile gate error', error);
        setNeedsProfileCompletion(false);
      } finally {
        setProfileGateLoading(false);
      }
    };

    resolveProfileGate();
  }, [session?.user?.id, audience, audienceLoading, profileGateVersion]);

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

  if (loading || audienceLoading || profileGateLoading) {
    return (
      <View style={styles.loadingRoot}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
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
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {rootContent}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingRoot: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.secondary,
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
