import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { COLORS, FONTS } from '../../utils/theme';
import { MasterItem } from '../../types/database';

export default function ItemDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { item } = route.params as { item: MasterItem };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.secondary} />
      
      {/* HEADER SIMPLE */}
      <View style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Detalle Técnico</Text>
            <View style={{width: 24}} />
          </View>
        </SafeAreaView>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* TARJETA PRINCIPAL */}
        <View style={styles.mainCard}>
          <View style={styles.iconCircle}>
             <Ionicons 
                name={item.type === 'labor' ? "hand-left" : "cube"} 
                size={40} 
                color={COLORS.primary} 
             />
          </View>
          <Text style={styles.typeBadge}>{item.type.toUpperCase()}</Text>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.price}>${item.suggested_price.toLocaleString('es-AR')}</Text>
        </View>

        {/* DETALLE TÉCNICO */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información</Text>
          
          <View style={styles.row}>
            <Text style={styles.label}>Fuente de Precio:</Text>
            <Text style={styles.value}>{item.source_ref || 'Base de datos oficial'}</Text>
          </View>
          
          <View style={styles.divider} />

          <Text style={styles.label}>Descripción:</Text>
          <Text style={styles.description}>
            Este es un ítem estandarizado del catálogo maestro. 
            El precio sugerido incluye {item.type === 'labor' ? 'mano de obra base' : 'materiales de referencia'}.
            {/* NOTA: En el futuro, agregaremos una columna 'description' a la tabla master_items para traer texto real aquí */}
          </Text>
        </View>

        {/* BOTÓN COPIAR (Opcional, pero útil) */}
        <TouchableOpacity style={styles.copyBtn} onPress={() => {}}>
           <Ionicons name="copy-outline" size={20} color={COLORS.primary} />
           <Text style={styles.copyText}>Copiar Detalle</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { backgroundColor: COLORS.secondary, paddingBottom: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10 },
  headerTitle: { fontSize: 18, fontFamily: FONTS.title, color: '#FFF' },
  backBtn: { padding: 4 },
  
  content: { padding: 20 },
  
  mainCard: { 
    backgroundColor: '#FFF', borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 20,
    shadowColor: "#000", shadowOffset: {width:0, height:2}, shadowOpacity:0.05, elevation: 2
  },
  iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#FFF5E0', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  typeBadge: { fontSize: 12, color: '#999', fontFamily: FONTS.subtitle, letterSpacing: 1, marginBottom: 8 },
  itemName: { fontSize: 20, fontFamily: FONTS.title, color: COLORS.text, textAlign: 'center', marginBottom: 8 },
  price: { fontSize: 32, fontFamily: FONTS.title, color: COLORS.primary },

  section: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontFamily: FONTS.subtitle, color: COLORS.text, marginBottom: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  label: { fontSize: 14, fontFamily: FONTS.subtitle, color: COLORS.textLight },
  value: { fontSize: 14, fontFamily: FONTS.body, color: COLORS.text, flex: 1, textAlign: 'right' },
  divider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 12 },
  description: { fontSize: 14, fontFamily: FONTS.body, color: COLORS.text, lineHeight: 22, marginTop: 4 },

  copyBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 16 },
  copyText: { color: COLORS.primary, fontFamily: FONTS.subtitle, marginLeft: 8 }
});