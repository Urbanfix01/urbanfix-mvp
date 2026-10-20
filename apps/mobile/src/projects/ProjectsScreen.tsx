import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useProjectOwner } from './ProjectSession';
import { Country, PROJECT_TOOLS, ProjectMeta, ProjectScope } from './projectWorkspace';
import { useProjects } from './useProjects';
import { Action, Field, IconButton, Notice, ProjectHeader, TEAL, ui } from './ProjectUI';

const searchable = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');
export default function ProjectsScreen() {
  const owner = useProjectOwner(), [country, setCountry] = useState<Country>('AR'), [ready, setReady] = useState(false), [warning, setWarning] = useState('');
  useEffect(() => {
    let active = true; setReady(false);
    void AsyncStorage.getItem(`urbanfix:mobile-project-country:${owner}`).then((value) => { if (active) setCountry(value === 'UY' ? 'UY' : 'AR'); })
      .catch(() => { if (active) setWarning('No se pudo leer el país guardado.'); }).finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, [owner]);
  const changeCountry = (value: Country) => { setCountry(value); void AsyncStorage.setItem(`urbanfix:mobile-project-country:${owner}`, value).catch(() => setWarning('El país cambió, pero no se pudo guardar la preferencia.')); };
  return <SafeAreaView edges={[]} style={ui.root}>{ready ? <ProjectList key={`${owner}:${country}`} scope={{ owner, countryCode: country }} changeCountry={changeCountry} warning={warning} /> : <ActivityIndicator style={{ marginTop: 40 }} color={TEAL} />}</SafeAreaView>;
}
function ProjectList({ scope, changeCountry, warning }: { scope: ProjectScope; changeCountry: (value: Country) => void; warning: string }) {
  const navigation = useNavigation<any>(), projects = useProjects(scope), [search, setSearch] = useState(''), [tool, setTool] = useState(''), [filtersOpen, setFiltersOpen] = useState(false);
  const rows = projects.rows.filter((row) => (!tool || row.tool === tool) && searchable(`${row.name} ${PROJECT_TOOLS[row.tool]}`).includes(searchable(search)));
  const open = (row: ProjectMeta, showVersions = false) => navigation.navigate('ProjectDetail', { row, showVersions });
  return <>
    <ProjectHeader title="Mis proyectos" subtitle="Diseño y obra" action={<IconButton inverse name="refresh" label="Actualizar proyectos" disabled={projects.loading} onPress={() => void projects.refresh()} />} />
    <FlatList data={rows} keyExtractor={(row) => `${row.tool}:${row.projectKey}`} contentContainerStyle={ui.content} refreshing={projects.loading} onRefresh={projects.refresh} keyboardShouldPersistTaps="handled"
      ListHeaderComponent={<>
        <View style={[ui.row, { marginBottom: 16 }]}>{(['AR', 'UY'] as const).map((code) => <Pressable key={code} accessibilityRole="button" accessibilityLabel={code === 'AR' ? 'Argentina, ARS' : 'Uruguay, UYU'} accessibilityState={{ selected: scope.countryCode === code }} onPress={() => changeCountry(code)} style={[ui.action, { flex: 1 }, scope.countryCode === code && { backgroundColor: TEAL, borderColor: TEAL }]}><Text style={[ui.actionText, scope.countryCode === code && { color: '#fff' }]}>{code} · {code === 'AR' ? 'ARS' : 'UYU'}</Text></Pressable>)}</View>
        <Action title="Nuevo proyecto" icon="add-circle-outline" primary onPress={() => navigation.navigate('NewProject', { countryCode: scope.countryCode })} />
        <Notice text={warning || projects.error || projects.message} />
        <View style={{ marginTop: 18 }}><Field label="Buscar proyecto" placeholder="Nombre o tipo de proyecto" value={search} onChangeText={setSearch} /></View>
        <Action title={tool ? PROJECT_TOOLS[tool as keyof typeof PROJECT_TOOLS] : 'Todos los editores'} icon="filter-outline" onPress={() => setFiltersOpen(true)} />
        <Text style={[ui.muted, { marginTop: 16, marginBottom: 6 }]}>{projects.loading ? 'Consultando historial…' : `${rows.length} proyecto(s)`}</Text>
      </>}
      ListEmptyComponent={!projects.loading ? <View style={{ paddingVertical: 30 }}><Text style={ui.text}>{projects.rows.length ? 'Sin proyectos para estos filtros.' : 'Todavía no hay proyectos disponibles.'}</Text>{projects.error ? <Action title="Reintentar" icon="refresh" onPress={() => void projects.refresh()} /> : null}</View> : null}
      renderItem={({ item }) => <View style={ui.band}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Abrir proyecto ${item.name}`} onPress={() => open(item)} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={[ui.heading, { color: TEAL, marginBottom: 4 }]}>{item.name}</Text></Pressable>
        <Text style={ui.muted}>{PROJECT_TOOLS[item.tool]} · {new Date(item.capturedAt).toLocaleString('es-AR')}</Text>
        <View style={[ui.row, { marginVertical: 12 }]}><Ionicons name={item.synced ? 'cloud-done-outline' : 'phone-portrait-outline'} size={18} color={item.synced ? TEAL : '#9b631b'} /><Text style={[ui.muted, { flex: 1, color: item.synced ? TEAL : '#9b631b' }]}>{item.synced ? 'Respaldado en cuenta' : 'En este dispositivo · respaldo pendiente'}</Text></View>
        <View style={ui.row}><Action title="Abrir" icon="folder-open-outline" onPress={() => open(item)} /><IconButton label={`Historial de ${item.name}`} name="time-outline" onPress={() => open(item, true)} /></View>
      </View>} />
    <Modal visible={filtersOpen} transparent animationType="slide" onRequestClose={() => setFiltersOpen(false)}><View style={ui.sheetBackdrop}><SafeAreaView edges={['bottom']} style={ui.sheet}><View style={[ui.row, { justifyContent: 'space-between' }]}><Text accessibilityRole="header" style={ui.heading}>Tipo de proyecto</Text><IconButton name="close" label="Cerrar filtros" onPress={() => setFiltersOpen(false)} /></View><ScrollView>{[['', 'Todos los editores'], ...Object.entries(PROJECT_TOOLS)].map(([id, label]) => <Pressable key={id} accessibilityRole="radio" accessibilityState={{ checked: tool === id }} onPress={() => { setTool(id); setFiltersOpen(false); }} style={[ui.row, ui.band]}><Ionicons name={tool === id ? 'radio-button-on' : 'radio-button-off'} size={20} color={TEAL} /><Text style={ui.text}>{label}</Text></Pressable>)}</ScrollView></SafeAreaView></View></Modal>
  </>;
}
