import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { ScreenHeader } from '../../components/molecules/ScreenHeader';
import { COLORS, FONTS } from '../../utils/theme';
import { getWebApiUrl, PUBLIC_WEB_URL } from '../../utils/config';

type BillingPlan = {
  id: string;
  name: string;
  period_months: number;
  price_ars: number;
  is_partner: boolean;
  trial_days?: number | null;
  active?: boolean | null;
};

type Subscription = {
  id: string;
  user_id: string;
  plan_id: string | null;
  status: string | null;
  current_period_start?: string | null;
  current_period_end?: string | null;
  trial_end?: string | null;
  plan?: BillingPlan | null;
};

const formatCurrency = (value: number) => `$${Number(value || 0).toLocaleString('es-AR')}`;

const formatPeriod = (months: number) => {
  if (months === 1) return 'Mensual';
  if (months === 3) return 'Trimestral';
  if (months === 6) return 'Semestral';
  if (months === 12) return 'Anual';
  return `${months} meses`;
};

export default function SubscriptionScreen() {
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [couponCode, setCouponCode] = useState('');

  const [loading, setLoading] = useState(true);
  const [creatingCheckout, setCreatingCheckout] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (!user) throw new Error('Sesion expirada');

      const [{ data: plansData, error: plansError }, { data: subData, error: subError }] = await Promise.all([
        supabase
          .from('billing_plans')
          .select('*')
          .eq('active', true)
          .eq('is_partner', false)
          .order('period_months', { ascending: true }),
        supabase
          .from('subscriptions')
          .select('*, plan:billing_plans(*)')
          .eq('user_id', user.id)
          .maybeSingle(),
      ]);

      if (plansError) throw plansError;
      if (subError) throw subError;

      const normalizedPlans = ((plansData as BillingPlan[]) || []).filter((plan) => plan.active !== false);
      setPlans(normalizedPlans);
      setSubscription((subData as Subscription) || null);

      if (!selectedPlanId && normalizedPlans[0]) {
        setSelectedPlanId(normalizedPlans[0].id);
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'No pudimos cargar la suscripcion.');
    } finally {
      setLoading(false);
    }
  }, [selectedPlanId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.id === selectedPlanId) || null,
    [plans, selectedPlanId]
  );

  const startCheckout = async () => {
    if (!selectedPlanId) {
      Alert.alert('Falta plan', 'Selecciona un plan para continuar.');
      return;
    }

    setCreatingCheckout(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) throw new Error('Sesion expirada');

      const payload = {
        planId: selectedPlanId,
        couponCode: couponCode.trim().toUpperCase(),
        successUrl: `${PUBLIC_WEB_URL}/tecnicos?billing=success`,
      };

      const response = await fetch(getWebApiUrl('/api/billing/checkout'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || 'No pudimos iniciar el pago.');
      }

      if (payload.couponCode && !data?.coupon) {
        Alert.alert('Codigo invalido', 'No pudimos validar el codigo. Revisa e intenta de nuevo.');
        return;
      }

      if (!data?.checkout_url) {
        throw new Error('No se obtuvo link de pago.');
      }

      await WebBrowser.openBrowserAsync(data.checkout_url);
      await fetchData();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'No pudimos iniciar el pago.');
    } finally {
      setCreatingCheckout(false);
    }
  };

  const normalizedStatus = (subscription?.status || '').toLowerCase().trim();
  const statusLabel = normalizedStatus ? normalizedStatus : 'sin suscripcion';

  return (
    <View style={styles.container}>
      <ScreenHeader title="Suscripcion" subtitle="Planes y estado" showBack />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Estado actual</Text>
            <View style={styles.rowBetween}>
              <Text style={styles.label}>Plan</Text>
              <Text style={styles.value}>{subscription?.plan?.name || 'Sin plan'}</Text>
            </View>
            <View style={styles.rowBetween}>
              <Text style={styles.label}>Estado</Text>
              <Text style={styles.value}>{statusLabel}</Text>
            </View>
            {!!subscription?.trial_end && (
              <View style={styles.rowBetween}>
                <Text style={styles.label}>Trial hasta</Text>
                <Text style={styles.value}>{new Date(subscription.trial_end).toLocaleDateString('es-AR')}</Text>
              </View>
            )}
            {!!subscription?.current_period_end && (
              <View style={styles.rowBetween}>
                <Text style={styles.label}>Renueva</Text>
                <Text style={styles.value}>
                  {new Date(subscription.current_period_end).toLocaleDateString('es-AR')}
                </Text>
              </View>
            )}
            <TouchableOpacity onPress={fetchData} style={styles.refreshPill}>
              <Ionicons name="refresh" size={16} color="#0F172A" />
              <Text style={styles.refreshText}>Actualizar</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Elegir plan</Text>
            <Text style={styles.cardSubtitle}>Todos los planes incluyen dias de prueba.</Text>

            <View style={{ gap: 10, marginTop: 12 }}>
              {plans.map((plan) => {
                const active = plan.id === selectedPlanId;
                return (
                  <TouchableOpacity
                    key={plan.id}
                    style={[styles.planRow, active && styles.planRowActive]}
                    onPress={() => setSelectedPlanId(plan.id)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.planName, active && styles.planNameActive]}>{formatPeriod(plan.period_months)}</Text>
                      <Text style={[styles.planMeta, active && styles.planMetaActive]}>
                        {plan.trial_days ? `${plan.trial_days} dias gratis` : 'Incluye prueba'}
                      </Text>
                    </View>
                    <Text style={[styles.planPrice, active && styles.planPriceActive]}>{formatCurrency(plan.price_ars)}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={{ marginTop: 14 }}>
              <Text style={styles.label}>Codigo de descuento (opcional)</Text>
              <TextInput
                value={couponCode}
                onChangeText={setCouponCode}
                placeholder="Ej: CIRCULO50"
                placeholderTextColor="#94A3B8"
                autoCapitalize="characters"
                style={styles.input}
              />
            </View>

            <TouchableOpacity
              onPress={startCheckout}
              disabled={creatingCheckout || !selectedPlanId}
              style={[styles.payBtn, (creatingCheckout || !selectedPlanId) && { opacity: 0.7 }]}
            >
              {creatingCheckout ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Ionicons name="card-outline" size={18} color="#FFF" />
                  <Text style={styles.payText}>
                    Continuar al pago {selectedPlan ? `(${formatCurrency(selectedPlan.price_ars)})` : ''}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {Platform.OS !== 'web' && (
              <Text style={styles.hint}>
                El pago se abre en tu navegador (Mercado Pago) y vuelve a la app al finalizar.
              </Text>
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16, paddingBottom: 30, gap: 14 },

  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  cardTitle: { fontFamily: FONTS.title, fontSize: 16, color: '#0F172A' },
  cardSubtitle: { marginTop: 6, fontFamily: FONTS.body, fontSize: 12, color: '#64748B' },

  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  label: { fontFamily: FONTS.body, fontSize: 12, color: '#64748B' },
  value: { fontFamily: FONTS.subtitle, fontSize: 13, color: '#0F172A' },

  refreshPill: {
    marginTop: 12,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: '#F1F5F9',
  },
  refreshText: { fontFamily: FONTS.subtitle, fontSize: 12, color: '#0F172A' },

  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  planRowActive: { backgroundColor: '#0F172A', borderColor: '#0F172A' },
  planName: { fontFamily: FONTS.subtitle, fontSize: 14, color: '#0F172A' },
  planNameActive: { color: '#FFF' },
  planMeta: { marginTop: 4, fontFamily: FONTS.body, fontSize: 11, color: '#64748B' },
  planMetaActive: { color: 'rgba(255,255,255,0.7)' },
  planPrice: { fontFamily: FONTS.title, fontSize: 14, color: '#0F172A' },
  planPriceActive: { color: '#FCD34D' },

  input: {
    marginTop: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: FONTS.body,
    fontSize: 14,
    color: '#0F172A',
  },

  payBtn: {
    marginTop: 16,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  payText: { fontFamily: FONTS.title, fontSize: 13, color: '#FFF' },
  hint: { marginTop: 10, fontFamily: FONTS.body, fontSize: 11, color: '#94A3B8', textAlign: 'center' },
});

