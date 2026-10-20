import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as WebBrowser from 'expo-web-browser';
import { Action, IconName, Notice, ProjectHeader, ui } from './ProjectUI';

export default function MoreScreen() {
  const navigation = useNavigation<any>(), [error, setError] = useState('');
  const open = async (path: string) => { try { setError(''); await WebBrowser.openBrowserAsync(`https://www.urbanfix.com.ar${path}`); } catch { setError('No se pudo abrir UrbanFix Web.'); } };
  return <SafeAreaView edges={[]} style={ui.root}><ProjectHeader title="Más" subtitle="UrbanFix" /><ScrollView contentContainerStyle={ui.content}>
    <Notice text={error} />
    {([['Catalogo', 'Catálogo de precios', 'book-outline'], ['Mapa', 'Mapa de trabajos', 'map-outline'], ['Notificaciones', 'Notificaciones', 'notifications-outline'], ['Perfil', 'Mi perfil', 'person-circle-outline']] as [string, string, IconName][]).map(([route, label, icon]) => <View key={route} style={ui.band}><Action title={label} icon={icon} onPress={() => navigation.navigate(route)} /></View>)}
    <View style={ui.band}><Text accessibilityRole="header" style={ui.heading}>Recursos</Text><View style={{ gap: 12 }}><Action title="Materiales y renders" icon="cube-outline" onPress={() => navigation.navigate('Catalogo', { initialTab: 'material' })} /><Action title="Valores de mano de obra" icon="receipt-outline" onPress={() => navigation.navigate('Catalogo', { initialTab: 'labor' })} /><Action title="Escuelita · web" icon="school-outline" onPress={() => void open('/diseno-y-obra/escuelita')} /></View></View>
  </ScrollView></SafeAreaView>;
}
