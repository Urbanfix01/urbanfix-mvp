import React from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, LAYOUT } from '../utils/theme';

export default function AppRecoveryScreen({ title, message, onRetry, loading = false }: { title: string; message: string; onRetry?: () => void; loading?: boolean }) {
  return <LinearGradient colors={['#33003F', '#24002F', '#09000F']} style={styles.root}>
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Image source={require('../../assets/icon.png')} style={styles.logo} accessibilityIgnoresInvertColors />
          <Text style={styles.brand}>URBAN<Text style={styles.accent}>FIX</Text></Text>
          <Text accessibilityRole="header" style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          {loading ? <ActivityIndicator accessibilityLabel="Cargando UrbanFix" color={COLORS.primary} style={styles.spinner} /> : null}
          {onRetry ? <Pressable accessibilityRole="button" onPress={onRetry} style={styles.retry}><Text style={styles.retryText}>Volver a intentar</Text></Pressable> : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  </LinearGradient>;
}

const styles = StyleSheet.create({
  root: { flex: 1 }, content: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 380, alignItems: 'center' }, logo: { width: 64, height: 64, borderRadius: 16, marginBottom: 16 },
  brand: { color: COLORS.white, fontSize: 28, fontWeight: '800' }, accent: { color: COLORS.primary },
  title: { color: COLORS.white, fontSize: 21, lineHeight: 30, textAlign: 'center', fontWeight: '700', marginTop: 24 },
  message: { color: '#EEE6F0', fontSize: 15, lineHeight: 23, textAlign: 'center', marginTop: 12 }, spinner: { marginTop: 24 },
  retry: { alignSelf: 'stretch', minHeight: LAYOUT.controlHeight, backgroundColor: COLORS.primary, borderRadius: LAYOUT.controlRadius, padding: 14, marginTop: 24, alignItems: 'center', justifyContent: 'center' },
  retryText: { color: COLORS.text, fontSize: 16, fontWeight: '700', textAlign: 'center', flexShrink: 1 },
});
