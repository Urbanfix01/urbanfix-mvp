import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { COLORS, FONTS } from '../../utils/theme';

type NotificationItem = {
  id: string;
  title: string;
  body: string;
  type: string;
  created_at: string;
  read_at: string | null;
};

const fetchNotifications = async (): Promise<NotificationItem[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

export default function NotificationsScreen() {
  const queryClient = useQueryClient();
  const { data: notifications = [], isLoading, error } = useQuery({
    queryKey: ['notifications'],
    queryFn: fetchNotifications,
    staleTime: 30000,
  });

  useEffect(() => {
    let channel: any;
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      channel = supabase
        .channel('notifications-realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
          () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
          }
        )
        .subscribe();
    };
    load();
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const markAsRead = async (id: string) => {
    try {
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', id);
      if (updateError) throw updateError;
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    } catch (_err) {
      Alert.alert('Error', 'No pudimos marcar la notificación.');
    }
  };

  const markAllRead = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .is('read_at', null);
      if (updateError) throw updateError;
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    } catch (_err) {
      Alert.alert('Error', 'No pudimos marcar todas las notificaciones.');
    }
  };

  const renderItem = ({ item }: { item: NotificationItem }) => {
    const isUnread = !item.read_at;
    return (
      <TouchableOpacity
        style={[styles.card, isUnread && styles.cardUnread]}
        onPress={() => markAsRead(item.id)}
        activeOpacity={0.85}
      >
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, isUnread && styles.cardTitleUnread]}>{item.title}</Text>
          {isUnread && <View style={styles.unreadDot} />}
        </View>
        <Text style={styles.cardBody}>{item.body}</Text>
        <Text style={styles.cardDate}>
          {new Date(item.created_at).toLocaleString('es-AR')}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Notificaciones</Text>
          <TouchableOpacity style={styles.headerButton} onPress={markAllRead}>
            <Text style={styles.headerButtonText}>Marcar todo</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={42} color={COLORS.danger} />
          <Text style={styles.emptyText}>No pudimos cargar las notificaciones.</Text>
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="notifications-off-outline" size={48} color="#CBD5E1" />
          <Text style={styles.emptyText}>Aun no tienes notificaciones.</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    paddingTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: { fontSize: 20, fontFamily: FONTS.title, color: COLORS.text },
  headerButton: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: COLORS.primary, borderRadius: 8 },
  headerButtonText: { color: '#FFF', fontFamily: FONTS.subtitle, fontSize: 12 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  emptyText: { marginTop: 12, color: COLORS.textLight, fontFamily: FONTS.body, textAlign: 'center' },
  listContent: { paddingHorizontal: 20, paddingBottom: 20 },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardUnread: { borderColor: COLORS.primary, backgroundColor: '#FFF7ED' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 15, fontFamily: FONTS.title, color: COLORS.text },
  cardTitleUnread: { color: COLORS.primary },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary },
  cardBody: { marginTop: 6, color: COLORS.textLight, fontFamily: FONTS.body },
  cardDate: { marginTop: 8, fontSize: 11, color: '#94A3B8' },
});
