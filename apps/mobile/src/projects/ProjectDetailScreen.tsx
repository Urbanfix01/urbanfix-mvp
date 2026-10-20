import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useProjectOwner } from './ProjectSession';
import { projectRepository } from './projectServices';
import { PROJECT_TOOLS, ProjectMeta, ProjectRecord, validateMeta } from './projectWorkspace';
import { Action, IconButton, Notice, ProjectHeader, TEAL, ui } from './ProjectUI';
import ProjectPlanPreview from './ProjectPlanPreview';

export default function ProjectDetailScreen({ navigation, route }: any) {
  const owner = useProjectOwner();
  const [selected, setSelected] = useState<ProjectMeta>(route.params.row), [record, setRecord] = useState<ProjectRecord | null>(null);
  const [loading, setLoading] = useState(true), [message, setMessage] = useState(route.params.initialMessage || ''), [busy, setBusy] = useState(false);
  const [versionsOpen, setVersionsOpen] = useState(false), [versions, setVersions] = useState<ProjectMeta[]>([]), [versionsBusy, setVersionsBusy] = useState(false);
  const [versionMessage, setVersionMessage] = useState(''), [page, setPage] = useState(0), [more, setMore] = useState(false);
  const generation = useRef(0), mounted = useRef(true), scope = { owner, countryCode: selected.countryCode };
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; generation.current++; }; }, []);
  const load = async () => {
    const request = ++generation.current; setLoading(true); setRecord(null);
    try { validateMeta(selected, scope); const saved = await projectRepository.get(scope, selected.id); if (mounted.current && generation.current === request) setRecord(saved); }
    catch (error) { if (mounted.current && generation.current === request) setMessage((error as Error).message); }
    finally { if (mounted.current && generation.current === request) setLoading(false); }
  };
  useEffect(() => { void load(); }, [selected.id, owner]);
  useEffect(() => { if (route.params.row.id !== selected.id) setSelected(route.params.row); }, [route.params.row.id]);
  const loadVersions = async (nextPage = 0) => {
    setVersionsBusy(true); setVersionMessage('');
    try {
      const result = await projectRepository.versions(scope, selected, nextPage);
      if (!mounted.current) return;
      const all = nextPage ? [...versions, ...result.remote, ...result.local] : [...result.remote, ...result.local];
      const byId = new Map<string, ProjectMeta>();
      for (const row of all) byId.set(row.id, { ...row, synced: row.synced || Boolean(byId.get(row.id)?.synced) });
      setVersions([...byId.values()].sort((a, b) => b.capturedAt.localeCompare(a.capturedAt)));
      setPage(nextPage); setMore(result.hasMore);
    } catch (error) {
      if (!mounted.current) return;
      const local = await projectRepository.local(scope).catch(() => []);
      if (mounted.current) { setVersions(local.filter((row) => row.tool === selected.tool && row.projectKey === selected.projectKey)); setVersionMessage((error as Error).message); setMore(false); }
    } finally { if (mounted.current) setVersionsBusy(false); }
  };
  const openVersions = () => { setVersionsOpen(true); void loadVersions(); };
  useEffect(() => { if (route.params.showVersions) openVersions(); }, []);
  const exportCopy = async () => {
    if (!record) return;
    setBusy(true); setMessage(''); let uri: string | null = null;
    try {
      const json = JSON.stringify({ ...record, format: 'urbanfix-project-history' }, null, 2), name = `urbanfix-proyecto-${record.id}.json`;
      if (Platform.OS === 'web') {
        const url = URL.createObjectURL(new Blob([json], { type: 'application/json' })), anchor = document.createElement('a');
        anchor.href = url; anchor.download = name; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else {
        if (!await Sharing.isAvailableAsync() || !FileSystem.cacheDirectory) throw new Error('No se puede compartir archivos en este dispositivo. El proyecto sigue guardado.');
        uri = `${FileSystem.cacheDirectory}${name}`;
        await FileSystem.writeAsStringAsync(uri, json, { encoding: FileSystem.EncodingType.UTF8 });
        await Sharing.shareAsync(uri, { mimeType: 'application/json', UTI: 'public.json', dialogTitle: 'Copia privada del proyecto' });
      }
    } catch (error) { if (mounted.current) setMessage((error as Error).message); }
    finally { if (uri) await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {}); if (mounted.current) setBusy(false); }
  };
  const draft = record?.document.draft, info = draft?.projectInfo;
  return <SafeAreaView style={ui.root} edges={['bottom']}>
    <ProjectHeader title={selected.name} subtitle={`${PROJECT_TOOLS[selected.tool]} · ${selected.countryCode}`} back={() => navigation.goBack()} action={<IconButton inverse name="time-outline" label="Ver versiones" onPress={openVersions} />} />
    <ScrollView contentContainerStyle={ui.content}>
      <Notice text={message} />
      {loading ? <ActivityIndicator color={TEAL} style={{ margin: 30 }} /> : !record ? <Action title="Reintentar carga" icon="refresh" onPress={() => void load()} /> : <>
        <View style={ui.band}><Text style={[ui.heading, { color: record.synced ? TEAL : '#8b4f16' }]}>{record.synced ? 'Respaldado en tu cuenta' : 'Guardado en este dispositivo'}</Text><Text style={ui.muted}>{new Date(record.capturedAt).toLocaleString('es-AR')} · {record.label}</Text>{!record.synced ? <Text style={ui.muted}>Respaldo pendiente. La copia local no se borra al reintentar.</Text> : null}</View>
        {draft ? <ProjectPlanPreview draft={draft} /> : null}
        <View style={ui.band}><Text style={ui.heading}>Datos del proyecto</Text><Text style={ui.text}>{typeof info?.clientName === 'string' && info.clientName || 'Cliente sin definir'}</Text><Text style={ui.muted}>{typeof info?.location === 'string' && info.location || 'Dirección sin definir'}</Text>{info?.siteLocation && typeof info.siteLocation.lat === 'number' && typeof info.siteLocation.lng === 'number' ? <Text style={ui.muted}>{info.siteLocation.lat}, {info.siteLocation.lng}</Text> : null}</View>
        {draft?.kind === 'house-drawing' ? <View style={ui.band}><Text style={ui.heading}>Plano libre</Text><Text style={ui.text}>Terreno: {String(draft.settings?.lotWidth ?? '—')} × {String(draft.settings?.lotDepth ?? '—')} m</Text><Text style={ui.muted}>{Array.isArray(draft.walls) ? draft.walls.length : 0} muros · {Array.isArray(draft.elements) ? draft.elements.length : 0} elementos constructivos</Text></View> : null}
        {draft?.kind === 'house-drawing' ? <View style={ui.band}><Action title="Diseñar y cotizar" icon="construct-outline" primary disabled={busy} onPress={() => navigation.navigate('DesignWorkspace', { row: selected })} /></View> : <View style={ui.band}><Text style={ui.muted}>Este tipo de proyecto se conserva en el historial. Su edición integrada todavía no está disponible.</Text></View>}
        <View style={ui.band}><Action title="Exportar copia editable" icon="download-outline" disabled={busy} onPress={() => void exportCopy()} /><Text style={[ui.muted, { marginTop: 10 }]}>Archivo privado JSON. Incluye datos del cliente y ubicación si fueron cargados; no es la entrega PDF para el cliente.</Text></View>
        <Text style={[ui.muted, { marginTop: 16 }]}>Anteproyecto. Las versiones respaldadas están disponibles en esta cuenta tanto en la app como en la web. Requiere revisión profesional antes de construir.</Text>
      </>}
    </ScrollView>
    <Modal visible={versionsOpen} transparent animationType="slide" onRequestClose={() => setVersionsOpen(false)}><View style={ui.sheetBackdrop}><SafeAreaView edges={['bottom']} style={ui.sheet}><View style={[ui.row, { justifyContent: 'space-between' }]}><Text accessibilityRole="header" style={ui.heading}>Versiones del proyecto</Text><IconButton name="close" label="Cerrar versiones" onPress={() => setVersionsOpen(false)} /></View><Notice text={versionMessage} /><ScrollView>{versions.map((row) => <Pressable accessibilityRole="button" key={row.id} accessibilityLabel={`Ver versión ${row.label}, ${new Date(row.capturedAt).toLocaleString('es-AR')}`} onPress={() => { setSelected(row); setMessage(''); setVersionsOpen(false); }} style={ui.band}><Text style={ui.text}>{row.label}</Text><Text style={ui.muted}>{new Date(row.capturedAt).toLocaleString('es-AR')} · {row.synced ? 'Cuenta' : 'Dispositivo'}</Text></Pressable>)}{versionsBusy ? <ActivityIndicator color={TEAL} /> : !versions.length ? <Text style={ui.muted}>No hay versiones disponibles.</Text> : null}{more ? <Action title="Cargar versiones anteriores" disabled={versionsBusy} onPress={() => void loadVersions(page + 1)} /> : null}{versionMessage ? <Action title="Reintentar historial" onPress={() => void loadVersions()} /> : null}</ScrollView></SafeAreaView></View></Modal>
  </SafeAreaView>;
}
