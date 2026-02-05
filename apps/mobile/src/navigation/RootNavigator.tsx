import React, { useCallback, useEffect, useState } from 'react';
import { View, ActivityIndicator, Platform, Text, TextInput, TouchableOpacity, Alert, StyleSheet, ScrollView } from 'react-native';
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
import SupportScreen from '../screens/settings/SupportScreen';
import SubscriptionScreen from '../screens/settings/SubscriptionScreen';
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

type AccessGateProps = {
  onRefresh: () => Promise<void>;
  onOpenSubscription: () => void;
};

function AccessGate({ onRefresh, onOpenSubscription }: AccessGateProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [trialLoading, setTrialLoading] = useState(false);

  const handleRedeem = async () => {
    const trimmed = code.trim();
    if (!trimmed) {
      Alert.alert('Falta codigo', 'Ingresa el codigo de acceso.');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.rpc('redeem_access_code', { p_code: trimmed });
      if (error) throw error;
      await onRefresh();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'No pudimos validar el codigo.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartTrial = async () => {
    setTrialLoading(true);
    try {
      const { error } = await supabase.rpc('start_free_trial');
      if (error) throw error;
      Alert.alert('Prueba activada', 'Tenes 7 dias gratis para usar UrbanFix.');
      await onRefresh();
    } catch (err: any) {
      Alert.alert('No se pudo iniciar', err?.message || 'No pudimos activar la prueba.');
    } finally {
      setTrialLoading(false);
    }
  };

  return (
    <View style={stylesGate.container}>
      <ScrollView contentContainerStyle={stylesGate.scroll} showsVerticalScrollIndicator={false}>
        <View style={stylesGate.card}>
          <Text style={stylesGate.title}>Elegi como ingresar</Text>
          <Text style={stylesGate.subtitle}>
            Activá tu cuenta con un codigo, una prueba gratis o suscripcion.
          </Text>

          <View style={stylesGate.section}>
            <Text style={stylesGate.sectionTitle}>Entrar con codigo</Text>
            <Text style={stylesGate.sectionText}>
              Si recibiste un codigo de acceso, ingresalo aca.
            </Text>
            <TextInput
              style={stylesGate.input}
              placeholder="Codigo de acceso"
              placeholderTextColor="#94A3B8"
              value={code}
              onChangeText={setCode}
              autoCapitalize="characters"
            />
            <TouchableOpacity onPress={handleRedeem} disabled={loading} style={stylesGate.button}>
              {loading ? <ActivityIndicator color="#FFF" /> : <Text style={stylesGate.buttonText}>Validar codigo</Text>}
            </TouchableOpacity>
          </View>

          <View style={stylesGate.section}>
            <Text style={stylesGate.sectionTitle}>Prueba gratis</Text>
            <Text style={stylesGate.sectionText}>Tenes 7 dias de acceso completo.</Text>
            <TouchableOpacity
              onPress={handleStartTrial}
              disabled={trialLoading}
              style={stylesGate.secondaryButton}
            >
              {trialLoading ? (
                <ActivityIndicator color="#0F172A" />
              ) : (
                <Text style={stylesGate.secondaryButtonText}>Iniciar prueba</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={stylesGate.section}>
            <Text style={stylesGate.sectionTitle}>Pagar suscripcion</Text>
            <Text style={stylesGate.sectionText}>Elegi un plan y paga en MercadoPago.</Text>
            <TouchableOpacity onPress={onOpenSubscription} style={stylesGate.secondaryButton}>
              <Text style={stylesGate.secondaryButtonText}>Ver planes</Text>
            </TouchableOpacity>
          </View>

          <View style={stylesGate.footerRow}>
            <TouchableOpacity onPress={onRefresh} style={stylesGate.refreshBtn}>
              <Text style={stylesGate.refreshText}>Actualizar estado</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={async () => {
                await supabase.auth.signOut();
              }}
            >
              <Text style={stylesGate.logout}>Cerrar sesion</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// --- ROOT STACK (Navegación Global) ---
export default function RootNavigator() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [accessGranted, setAccessGranted] = useState<boolean | null>(null);

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

  const refreshAccess = useCallback(async () => {
    if (!session?.user) {
      setAccessGranted(null);
      return;
    }
    setAccessGranted(null);
    const userId = session.user.id;
    const userEmail = session.user.email || null;
    const now = Date.now();
    let profileAccess = false;
    let trialEndsAt: string | null = null;
    let subscriptionStatus = '';
    let subscriptionEnd: string | null = null;
    let subscriptionTrialEnd: string | null = null;

    try {
      const [{ data: profile, error: profileError }, { data: subscription, error: subError }] = await Promise.all([
        supabase
          .from('profiles')
          .select('access_granted, trial_ends_at')
          .eq('id', userId)
          .maybeSingle(),
        supabase
          .from('subscriptions')
          .select('status, current_period_end, trial_end')
          .eq('user_id', userId)
          .maybeSingle(),
      ]);

      if (profileError || !profile) {
        await supabase.from('profiles').upsert({
          id: userId,
          email: userEmail,
        });
      } else {
        profileAccess = Boolean(profile.access_granted);
        trialEndsAt = profile.trial_ends_at || null;
      }

      if (!subError && subscription) {
        subscriptionStatus = (subscription.status || '').toString();
        subscriptionEnd = subscription.current_period_end || null;
        subscriptionTrialEnd = subscription.trial_end || null;
      }
    } catch (err) {
      console.warn('Access check error', err);
    }

    const trialDate = trialEndsAt || subscriptionTrialEnd;
    const hasTrial =
      trialDate && !Number.isNaN(new Date(trialDate).getTime()) && new Date(trialDate).getTime() > now;

    const activeStatuses = ['active', 'authorized', 'approved', 'paid', 'trialing'];
    const normalizedStatus = subscriptionStatus.toLowerCase().trim();
    const hasActiveSub =
      activeStatuses.includes(normalizedStatus) &&
      (!subscriptionEnd ||
        (new Date(subscriptionEnd).getTime() > now && !Number.isNaN(new Date(subscriptionEnd).getTime())));

    setAccessGranted(profileAccess || hasTrial || hasActiveSub);
  }, [session?.user?.id, session?.user?.email]);

  useEffect(() => {
    refreshAccess();
  }, [refreshAccess]);

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

  if (session && accessGranted === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.secondary }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!session ? (
          <Stack.Screen 
            name="Auth" 
            component={LoginScreen} 
            options={{ animation: 'fade' }}
          />
        ) : accessGranted === false ? (
          <>
            <Stack.Screen name="AccessGate">
              {(props) => (
                <AccessGate
                  onRefresh={refreshAccess}
                  onOpenSubscription={() => props.navigation.navigate('Subscription')}
                />
              )}
            </Stack.Screen>
            <Stack.Screen
              name="Subscription"
              component={SubscriptionScreen}
              options={{ animation: 'slide_from_right' }}
            />
          </>
        ) : (
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

            <Stack.Screen
              name="Support"
              component={SupportScreen}
              options={{ animation: 'slide_from_right' }}
            />

            <Stack.Screen
              name="Subscription"
              component={SubscriptionScreen}
              options={{ animation: 'slide_from_right' }}
            />

          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const stylesGate = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.secondary,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#0B1221',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  title: { fontSize: 22, color: '#FFF', fontWeight: '700', marginBottom: 6 },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 16 },
  section: {
    backgroundColor: 'rgba(15,23,42,0.7)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.2)',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 15, color: '#FFF', fontWeight: '700' },
  sectionText: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 6, marginBottom: 12 },
  input: {
    backgroundColor: 'rgba(15,23,42,0.7)',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.2)',
    color: '#F8FAFC',
    marginBottom: 12,
  },
  button: {
    backgroundColor: COLORS.primary,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: { color: '#FFF', fontWeight: '700' },
  secondaryButton: {
    backgroundColor: '#F8FAFC',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButtonText: { color: '#0F172A', fontWeight: '700' },
  footerRow: { marginTop: 4, alignItems: 'center', gap: 12 },
  refreshBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  refreshText: { color: 'rgba(255,255,255,0.8)' },
  logout: { color: 'rgba(255,255,255,0.7)' },
});
