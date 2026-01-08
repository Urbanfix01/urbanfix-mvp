import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase'; 
import { COLORS } from '../utils/theme';
import { Ionicons } from '@expo/vector-icons';

// --- PANTALLAS ---
// 1. Auth
import LoginScreen from '../screens/auth/LoginScreen';

// 2. Tabs Principales
import JobsScreen from '../screens/tabs/JobsScreen';
import AgendaScreen from '../screens/tabs/AgendaScreen';
import CatalogScreen from '../screens/tabs/CatalogScreen';
import ProfileScreen from '../screens/tabs/ProfileScreen';

// 3. Flujo de Trabajos (Ciclo de Vida)
import JobConfigScreen from '../screens/flow/JobConfigScreen';
import JobDetailScreen from '../screens/flow/JobDetailScreen';
import HistoryScreen from '../screens/flow/HistoryScreen';
import MarcaScreen from '../screens/flow/MarcaScreen'; // <--- ✅ IMPORTACIÓN CRÍTICA

// 4. Detalles y Configuración
import ItemDetailScreen from '../screens/tabs/ItemDetailScreen';
import EditProfileScreen from '../screens/settings/EditProfileScreen'; 
import NotificationsScreen from '../screens/tabs/NotificationsScreen';
import { registerForPushNotificationsAsync, showLocalNotification } from '../utils/notifications';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// --- BOTTOM TABS (Menú Inferior) ---
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: '#95A5A6',
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopColor: '#EEEEEE',
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: any;
          
          if (route.name === 'Trabajos') {
            iconName = focused ? 'briefcase' : 'briefcase-outline';
          } else if (route.name === 'Agenda') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'Catálogo') {
            iconName = focused ? 'book' : 'book-outline';
          } else if (route.name === 'Notificaciones') {
            iconName = focused ? 'notifications' : 'notifications-outline';
          } else if (route.name === 'Perfil') {
            iconName = focused ? 'person' : 'person-outline';
          }
          
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Trabajos" component={JobsScreen} />
      <Tab.Screen name="Agenda" component={AgendaScreen} /> 
      <Tab.Screen name="Catálogo" component={CatalogScreen} />
      <Tab.Screen name="Notificaciones" component={NotificationsScreen} />
      <Tab.Screen name="Perfil" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// --- ROOT STACK (Navegación Global) ---
export default function RootNavigator() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

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

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.secondary }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {session ? (
          <>
            {/* 1. TABS PRINCIPALES (Base) */}
            <Stack.Screen name="Main" component={MainTabs} />
            
            {/* 2. FLUJO DE TRABAJOS */}
            <Stack.Screen 
              name="JobConfig" 
              component={JobConfigScreen} 
              options={{ animation: 'slide_from_right' }} 
            />
            <Stack.Screen 
              name="JobDetail" 
              component={JobDetailScreen} 
              options={{ animation: 'slide_from_right' }} 
            />
            <Stack.Screen 
              name="History" 
              component={HistoryScreen} 
              options={{ animation: 'slide_from_right' }} 
            />

            {/* 3. DETALLES DE CATÁLOGO */}
            <Stack.Screen 
              name="ItemDetail" 
              component={ItemDetailScreen} 
              options={{ animation: 'slide_from_right' }} 
            />

            {/* 4. CONFIGURACIÓN DE PERFIL */}
            <Stack.Screen 
              name="EditProfile" 
              component={EditProfileScreen} 
              options={{ animation: 'slide_from_bottom' }} 
            />

            {/* 👇👇 ESTO ES LO QUE ARREGLA EL ERROR Y EL DISEÑO 👇👇 */}
            <Stack.Screen 
              name="MarcaScreen" 
              component={MarcaScreen} 
              options={{ 
                headerShown: false, // CRÍTICO: Oculta la barra blanca para que se vea tu diseño azul
                animation: 'slide_from_right'
              }} 
            />

          </>
        ) : (
          <Stack.Screen 
            name="Auth" 
            component={LoginScreen} 
            options={{ animation: 'fade' }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
