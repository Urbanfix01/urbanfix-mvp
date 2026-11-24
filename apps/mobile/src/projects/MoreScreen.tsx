import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as WebBrowser from 'expo-web-browser';
import { Action, IconName, Notice, ProjectHeader, ui } from './ProjectUI';
import { PUBLIC_WEB_URL } from '../utils/config';

const webTools: [string, string, IconName][] = [
  ['Caja', '/tecnico-panel?tab=caja', 'wallet-outline'],
  ['Finanzas', '/tecnico-panel?tab=finanzas', 'bar-chart-outline'],
  ['Clientes y contactos', '/tecnico-panel?tab=clientes', 'people-outline'],
  ['Ficha de obra y entregas', '/diseno-y-obra/proyectos', 'folder-open-outline'],
  ['Normativas', '/diseno-y-obra/normas', 'book-outline'],
  ['Comunidad', '/comunidad', 'chatbubbles-outline'],
  ['Preferencias y facturación', '/preferencias', 'settings-outline'],
  ['Soporte', '/soporte', 'help-circle-outline'],
];

export default function MoreScreen() {
  const navigation = useNavigation<any>(), [error, setError] = useState(''), [opening, setOpening] = useState('');
  const mounted = useRef(true), openingRef = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const open = async (path: string) => {
    if (openingRef.current) return;
    openingRef.current = true; setError(''); setOpening(path);
    try { await WebBrowser.openBrowserAsync(`${PUBLIC_WEB_URL}${path}`); }
    catch { if (mounted.current) setError('No se pudo abrir UrbanFix Web. Volvé a intentar.'); }
    finally { openingRef.current = false; if (mounted.current) setOpening(''); }
  };
  return <SafeAreaView edges={[]} style={ui.root}><ProjectHeader title="Más" subtitle="UrbanFix" /><ScrollView contentContainerStyle={ui.content}>
    <Notice text={error} />
    {([['Catalogo', 'Catálogo de precios', 'book-outline'], ['Mapa', 'Mapa de trabajos', 'map-outline'], ['Notificaciones', 'Notificaciones', 'notifications-outline'], ['Perfil', 'Mi perfil', 'person-circle-outline']] as [string, string, IconName][]).map(([route, label, icon]) => <View key={route} style={ui.band}><Action title={label} icon={icon} onPress={() => navigation.navigate(route)} /></View>)}
    <View style={ui.band}><Text accessibilityRole="header" style={ui.heading}>Recursos</Text><View style={{ gap: 12 }}><Action title="Materiales y renders" icon="cube-outline" onPress={() => navigation.navigate('Catalogo', { initialTab: 'material' })} /><Action title="Valores de mano de obra" icon="receipt-outline" onPress={() => navigation.navigate('Catalogo', { initialTab: 'labor' })} /><Action title="Escuelita · web" icon="school-outline" disabled={!!opening} busy={opening === '/diseno-y-obra/escuelita'} onPress={() => void open('/diseno-y-obra/escuelita')} /></View></View>
    <View style={ui.band}><Text accessibilityRole="header" style={ui.heading}>Herramientas en UrbanFix Web</Text><Text style={ui.muted}>Se abren en el navegador con su propia sesión. Verificá que allí estés usando la misma cuenta. Al cerrarlo volvés a esta pantalla.</Text><View style={{ gap: 12 }}>{webTools.map(([label, path, icon]) => <Action key={path} title={`${label} · web`} icon={icon} disabled={!!opening} busy={opening === path} onPress={() => void open(path)} />)}</View></View>
    <View style={ui.band}><Text accessibilityRole="header" style={ui.heading}>Información de tu cuenta</Text><View style={{ gap: 12 }}><Action title="Privacidad · web" icon="shield-checkmark-outline" disabled={!!opening} onPress={() => void open('/privacidad')} /><Action title="Términos · web" icon="document-text-outline" disabled={!!opening} onPress={() => void open('/terminos')} /></View></View>
  </ScrollView></SafeAreaView>;
}
