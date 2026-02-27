import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Platform, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { supabase } from '../lib/supabase';
import { COLORS } from '../utils/theme';
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
import JobDetailScreen from '../screens/flow/JobDetailScreen';
import HistoryScreen from '../screens/flow/HistoryScreen';
import MarcaScreen from '../screens/flow/MarcaScreen';

// Settings
import ItemDetailScreen from '../screens/tabs/ItemDetailScreen';
import EditProfileScreen from '../screens/settings/EditProfileScreen';
import SupportScreen from '../screens/settings/SupportScreen';

// Client tabs
import ClientRequestsScreen from '../screens/client/ClientRequestsScreen';
import ClientPublishScreen from '../screens/client/ClientPublishScreen';
import ClientProfileScreen from '../screens/client/ClientProfileScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

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
const MapScreenWithSwipe = withTabSwipe(MapScreen);
const CatalogScreenWithSwipe = withTabSwipe(CatalogScreen);
const NotificationsScreenWithSwipe = withTabSwipe(NotificationsScreen);
const ProfileScreenWithSwipe = withTabSwipe(ProfileScreen);

const ClientRequestsScreenWithSwipe = withTabSwipe(ClientRequestsScreen);
const ClientPublishScreenWithSwipe = withTabSwipe(ClientPublishScreen);
const ClientProfileScreenWithSwipe = withTabSwipe(ClientProfileScreen);

const getTabIconName = (routeName: string, focused: boolean) => {
  if (routeName === 'Panel') return focused ? 'home' : 'home-outline';
  if (routeName === 'Agenda') return focused ? 'calendar' : 'calendar-outline';
  if (routeName === 'Operativo') return focused ? 'navigate' : 'navigate-outline';
  if (routeName === 'Mapa') return focused ? 'map' : 'map-outline';
  if (routeName === 'Catalogo') return focused ? 'book' : 'book-outline';
  if (routeName === 'Notificaciones') return focused ? 'notifications' : 'notifications-outline';
  if (routeName === 'Perfil') return focused ? 'person' : 'person-outline';

  if (routeName === 'Solicitudes') return focused ? 'briefcase' : 'briefcase-outline';
  if (routeName === 'Publicar') return focused ? 'add-circle' : 'add-circle-outline';
  if (routeName === 'MiPerfil') return focused ? 'person-circle' : 'person-circle-outline';

  return focused ? 'ellipse' : 'ellipse-outline';
};

const useTabScreenOptions = () => {
  const insets = useSafeAreaInsets();

  return ({ route }: any) => ({
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
    tabBarIcon: ({ focused, color, size }: any) => (
      <Ionicons name={getTabIconName(route.name, focused) as any} size={size} color={color} />
    ),
  });
};

function TechTabs() {
  const screenOptions = useTabScreenOptions();

  return (
    <Tab.Navigator screenOptions={screenOptions}>
      <Tab.Screen name="Panel" component={JobsScreenWithSwipe} />
      <Tab.Screen name="Agenda" component={AgendaScreenWithSwipe} />
      <Tab.Screen name="Operativo" component={OperationalScreenWithSwipe} />
      <Tab.Screen name="Mapa" component={MapScreenWithSwipe} />
      <Tab.Screen name="Catalogo" component={CatalogScreenWithSwipe} />
      <Tab.Screen name="Notificaciones" component={NotificationsScreenWithSwipe} />
      <Tab.Screen name="Perfil" component={ProfileScreenWithSwipe} />
    </Tab.Navigator>
  );
}

function ClientTabs() {
  const screenOptions = useTabScreenOptions();

  return (
    <Tab.Navigator screenOptions={screenOptions}>
      <Tab.Screen name="Solicitudes" component={ClientRequestsScreenWithSwipe} />
      <Tab.Screen name="Publicar" component={ClientPublishScreenWithSwipe} />
      <Tab.Screen name="MiPerfil" component={ClientProfileScreenWithSwipe} options={{ title: 'Perfil' }} />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [audience, setAudience] = useState<MobileAudience>('tecnico');
  const [audienceLoading, setAudienceLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: nextSession } }) => {
      setSession(nextSession || null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession || null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

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
        if (stored) {
          setAudience(stored);
          setAudienceLoading(false);
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('access_granted')
          .eq('id', session.user.id)
          .maybeSingle();

        const inferred: MobileAudience = profile?.access_granted ? 'tecnico' : 'cliente';
        setAudience(inferred);
        await setStoredAudience(inferred);
      } catch {
        setAudience('tecnico');
      } finally {
        setAudienceLoading(false);
      }
    };

    resolveAudience();
  }, [session?.user?.id]);

  useEffect(() => {
    if (!session?.user) return;

    supabase
      .from('profiles')
      .upsert({
        id: session.user.id,
        email: session.user.email || null,
        full_name: session.user.user_metadata?.full_name || null,
      })
      .then();
  }, [session?.user?.id]);

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

  if (loading || audienceLoading) {
    return (
      <View style={styles.loadingRoot}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!session ? (
          <Stack.Screen name="Auth" component={LoginScreen} options={{ animation: 'fade' }} />
        ) : audience === 'cliente' ? (
          <Stack.Screen name="ClientMain" component={ClientTabs} />
        ) : (
          <>
            <Stack.Screen name="Main" component={TechTabs} />

            <Stack.Screen name="JobConfig" component={JobConfigScreen} options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="JobDetail" component={JobDetailScreen} options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="History" component={HistoryScreen} options={{ animation: 'slide_from_right' }} />

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
        )}
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
});
