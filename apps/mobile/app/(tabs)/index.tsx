import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function DashboardScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      {/* Tarjeta de Bienvenida */}
      <View style={styles.welcomeCard}>
        <Text style={styles.greeting}>Hola, Técnico 👋</Text>
        <Text style={styles.subtext}>¿Qué vamos a instalar hoy?</Text>
      </View>

      {/* Botón Gigante de Acción */}
      <TouchableOpacity 
        style={styles.actionButton} 
        onPress={() => router.push('/cotizador')}
      >
        <View style={styles.iconCircle}>
          <Ionicons name="add" size={32} color="#FFF" />
        </View>
        <View>
          <Text style={styles.buttonTitle}>Crear Presupuesto</Text>
          <Text style={styles.buttonSubtitle}>Usar precios actualizados</Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color="#666" style={{marginLeft: 'auto'}} />
      </TouchableOpacity>

      {/* Resumen Rápido (Placeholder) */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>0</Text>
          <Text style={styles.statLabel}>Pendientes</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>$0</Text>
          <Text style={styles.statLabel}>Ganancias Mes</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7', padding: 20 },
  welcomeCard: { marginBottom: 30, marginTop: 10 },
  greeting: { fontSize: 28, fontWeight: 'bold', color: '#000' },
  subtext: { fontSize: 16, color: '#666', marginTop: 5 },
  
  actionButton: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 20,
  },
  iconCircle: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: '#000',
    justifyContent: 'center', alignItems: 'center',
    marginRight: 15,
  },
  buttonTitle: { fontSize: 18, fontWeight: 'bold', color: '#000' },
  buttonSubtitle: { fontSize: 14, color: '#666' },

  statsRow: { flexDirection: 'row', gap: 15 },
  statCard: {
    flex: 1, backgroundColor: '#FFF', padding: 15, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center'
  },
  statNumber: { fontSize: 24, fontWeight: 'bold', color: '#000' },
  statLabel: { fontSize: 12, color: '#666', marginTop: 4 },
});