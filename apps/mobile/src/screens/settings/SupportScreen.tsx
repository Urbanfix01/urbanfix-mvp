import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../lib/supabase';
import { ScreenHeader } from '../../components/molecules/ScreenHeader';
import { COLORS, FONTS } from '../../utils/theme';

type SupportMessage = {
  id: string;
  user_id: string;
  sender_id: string | null;
  body: string;
  image_urls?: string[] | null;
  created_at: string;
};

type PendingImage = {
  id: string;
  uri: string;
};

const SUPPORT_BUCKET = 'beta-support';
const SUPPORT_MAX_IMAGES = 4;

export default function SupportScreen() {
  const listRef = useRef<FlatList<SupportMessage>>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState('');
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);

  const scrollToBottom = useCallback((animated = true) => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated });
    });
  }, []);

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (!user) throw new Error('Sesion expirada');
      setUserId(user.id);

      const { data, error } = await supabase
        .from('beta_support_messages')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages((data as SupportMessage[]) || []);
      scrollToBottom(false);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'No pudimos cargar el soporte.');
    } finally {
      setLoading(false);
    }
  }, [scrollToBottom]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`beta-support-${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'beta_support_messages', filter: `user_id=eq.${userId}` },
        (payload) => {
          const msg = payload.new as SupportMessage;
          setMessages((prev) => (prev.some((item) => item.id === msg.id) ? prev : [...prev, msg]));
          scrollToBottom(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, scrollToBottom]);

  const pickImages = async () => {
    if (pendingImages.length >= SUPPORT_MAX_IMAGES) {
      Alert.alert('Limite', `Puedes adjuntar hasta ${SUPPORT_MAX_IMAGES} imagenes.`);
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso denegado', 'Necesitamos acceso a la galeria.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.7,
    });

    if (result.canceled) return;

    const assets = result.assets || [];
    if (!assets.length) return;

    const stamp = Date.now();
    const next: PendingImage[] = assets.map((asset, index) => ({
      id: `img-${stamp}-${index}`,
      uri: asset.uri,
    }));

    setPendingImages((prev) => [...prev, ...next].slice(0, SUPPORT_MAX_IMAGES));
  };

  const uploadSupportImage = async (uri: string, ownerId: string, index: number) => {
    const response = await fetch(uri);
    const blob = await response.blob();
    const contentType = blob.type || 'image/jpeg';
    const ext = contentType.includes('png') ? 'png' : 'jpg';
    const filePath = `${ownerId}/${Date.now()}-${index}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error: uploadError } = await supabase.storage.from(SUPPORT_BUCKET).upload(filePath, blob, {
      contentType,
      upsert: false,
    });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from(SUPPORT_BUCKET).getPublicUrl(filePath);
    return data.publicUrl;
  };

  const sendMessage = async () => {
    if (sending) return;
    const body = draft.trim();
    if (!body && pendingImages.length === 0) {
      Alert.alert('Falta mensaje', 'Escribe un mensaje o adjunta una imagen.');
      return;
    }

    setSending(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (!user) throw new Error('Sesion expirada');

      const imageUrls: string[] = [];
      for (let i = 0; i < pendingImages.length; i++) {
        const url = await uploadSupportImage(pendingImages[i].uri, user.id, i);
        imageUrls.push(url);
      }

      const finalBody = body || (imageUrls.length ? 'Adjuntos' : '');

      const { error } = await supabase.from('beta_support_messages').insert({
        user_id: user.id,
        sender_id: user.id,
        body: finalBody,
        image_urls: imageUrls.length ? imageUrls : null,
      });

      if (error) throw error;

      setDraft('');
      setPendingImages([]);
      scrollToBottom(true);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'No se pudo enviar el mensaje.');
    } finally {
      setSending(false);
    }
  };

  const headerAction = (
    <TouchableOpacity onPress={fetchMessages} style={styles.refreshBtn}>
      <Ionicons name="refresh" size={20} color="#FFF" />
    </TouchableOpacity>
  );

  const renderMessage = ({ item }: { item: SupportMessage }) => {
    const isOwn = item.sender_id && userId ? item.sender_id === userId : false;
    const images = Array.isArray(item.image_urls) ? item.image_urls : [];

    return (
      <View style={[styles.msgRow, isOwn ? styles.msgRowRight : styles.msgRowLeft]}>
        <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
          {!!item.body && <Text style={[styles.bubbleText, isOwn ? styles.bubbleTextOwn : styles.bubbleTextOther]}>{item.body}</Text>}
          {images.length > 0 && (
            <View style={styles.imageGrid}>
              {images.map((url, idx) => (
                <Image key={`${item.id}-${idx}`} source={{ uri: url }} style={styles.msgImage} />
              ))}
            </View>
          )}
          <Text style={[styles.timestamp, isOwn ? styles.timestampOwn : styles.timestampOther]}>
            {new Date(item.created_at).toLocaleString('es-AR', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  const emptyState = useMemo(() => {
    if (loading) return null;
    return (
      <View style={styles.empty}>
        <Ionicons name="chatbubble-ellipses-outline" size={42} color="#CBD5E1" />
        <Text style={styles.emptyTitle}>Soporte beta</Text>
        <Text style={styles.emptySubtitle}>Escribe tu primer mensaje para abrir el chat.</Text>
      </View>
    );
  }, [loading]);

  return (
    <View style={styles.container}>
      <ScreenHeader title="Soporte" subtitle="Chat interno beta" showBack rightAction={headerAction} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.content}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={COLORS.primary} />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={messages.length ? styles.listContent : styles.listContentEmpty}
            ListEmptyComponent={emptyState}
            onContentSizeChange={() => scrollToBottom(false)}
          />
        )}

        {!!pendingImages.length && (
          <View style={styles.pendingRow}>
            {pendingImages.map((img) => (
              <View key={img.id} style={styles.pendingThumbWrap}>
                <Image source={{ uri: img.uri }} style={styles.pendingThumb} />
                <TouchableOpacity
                  onPress={() => setPendingImages((prev) => prev.filter((x) => x.id !== img.id))}
                  style={styles.removeThumb}
                >
                  <Ionicons name="close" size={14} color="#FFF" />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity onPress={pickImages} style={styles.addThumb} disabled={pendingImages.length >= SUPPORT_MAX_IMAGES}>
              <Ionicons name="add" size={18} color="#475569" />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.composer}>
          <TouchableOpacity onPress={pickImages} style={styles.attachBtn} disabled={sending}>
            <Ionicons name="image-outline" size={20} color={COLORS.textLight} />
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            placeholder="Escribe un mensaje..."
            placeholderTextColor="#94A3B8"
            multiline
          />
          <TouchableOpacity onPress={sendMessage} style={[styles.sendBtn, sending && { opacity: 0.7 }]} disabled={sending}>
            {sending ? <ActivityIndicator color="#FFF" /> : <Ionicons name="send" size={18} color="#FFF" />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  refreshBtn: { padding: 8 },

  listContent: { padding: 16, paddingBottom: 12 },
  listContentEmpty: { flexGrow: 1, padding: 16 },

  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  emptyTitle: { fontFamily: FONTS.title, fontSize: 16, color: '#0F172A' },
  emptySubtitle: { fontFamily: FONTS.body, fontSize: 12, color: '#64748B', textAlign: 'center', maxWidth: 260 },

  msgRow: { marginBottom: 12, flexDirection: 'row' },
  msgRowLeft: { justifyContent: 'flex-start' },
  msgRowRight: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '82%', borderRadius: 16, padding: 12 },
  bubbleOwn: { backgroundColor: '#0F172A' },
  bubbleOther: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0' },
  bubbleText: { fontSize: 14, lineHeight: 18 },
  bubbleTextOwn: { color: '#FFFFFF', fontFamily: FONTS.body },
  bubbleTextOther: { color: '#0F172A', fontFamily: FONTS.body },
  timestamp: { marginTop: 6, fontSize: 10, opacity: 0.75 },
  timestampOwn: { color: '#E2E8F0', textAlign: 'right' },
  timestampOther: { color: '#64748B', textAlign: 'right' },

  imageGrid: { marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  msgImage: { width: 120, height: 90, borderRadius: 12, backgroundColor: '#E2E8F0' },

  pendingRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingBottom: 10 },
  pendingThumbWrap: { position: 'relative' },
  pendingThumb: { width: 64, height: 64, borderRadius: 12, backgroundColor: '#E2E8F0' },
  removeThumb: { position: 'absolute', top: -6, right: -6, backgroundColor: '#0F172A', borderRadius: 999, padding: 4 },
  addThumb: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },

  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  attachBtn: { padding: 10, borderRadius: 12, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 110,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    fontFamily: FONTS.body,
    fontSize: 14,
    color: '#0F172A',
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

