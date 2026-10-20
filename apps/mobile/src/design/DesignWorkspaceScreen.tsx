import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Crypto from 'expo-crypto';
import { supabase } from '../lib/supabase';
import { useProjectOwner } from '../projects/ProjectSession';
import { projectRepository } from '../projects/projectServices';
import { metadata, ProjectRecord, ProjectScope } from '../projects/projectWorkspace';
import { Action, IconButton, Notice, ProjectHeader, TEAL, ui } from '../projects/ProjectUI';
import DesignSurface, { DesignSurfaceRef } from './DesignSurface';
import html from './designBundle';
import { designRequest, loadDesignPrices, loadMaterialRenders } from './designServices';
import { ScreenHeader } from '../components/molecules/ScreenHeader';

export default function DesignWorkspaceScreen({ navigation, route }: any) {
  const owner = useProjectOwner(), materialMode = route.params?.mode === 'materials', workMode = route.params?.mode === 'work';
  const readOnly = materialMode || workMode;
  const scope: ProjectScope = { owner, countryCode: route.params?.row?.countryCode || 'AR' };
  const [record, setRecord] = useState<ProjectRecord | null>(null), [loading, setLoading] = useState(!readOnly), [error, setError] = useState(''), [syncStatus, setSyncStatus] = useState('');
  const current = useRef<ProjectRecord | null>(null), surface = useRef<DesignSurfaceRef>(null), alive = useRef(true), dirty = useRef(false);
  const nonce = useRef(Crypto.randomUUID()), seen = useRef(new Set<string>()), inFlight = useRef(0), saveQueue = useRef(Promise.resolve());
  const syncGeneration = useRef(0);
  useEffect(() => {
    alive.current = true;
    if (!readOnly) projectRepository.get(scope, route.params.row.id).then((row) => {
      if (!alive.current) return;
      if (row.tool !== 'plano' || row.document.draft.kind !== 'house-drawing') throw new Error('Este editor integrado admite planos libres. La versión original se conserva.');
      current.current = row; setRecord(row);
    }).catch((e) => { if (alive.current) setError(e.message); }).finally(() => { if (alive.current) setLoading(false); });
    return () => { alive.current = false; };
  }, [owner]);
  useEffect(() => navigation.addListener('beforeRemove', (event: any) => {
    if (!dirty.current) return;
    event.preventDefault();
    const discard = () => { dirty.current = false; navigation.dispatch(event.data.action); };
    if (Platform.OS === 'web') { if (window.confirm('Hay cambios sin confirmar en el historial. ¿Salir sin guardar esos cambios?')) discard(); }
    else Alert.alert('Cambios pendientes', 'Esperá el guardado o volvé al editor para guardar la versión.', [{ text: 'Seguir editando', style: 'cancel' }, { text: 'Salir sin esos cambios', style: 'destructive', onPress: discard }]);
  }), [navigation]);
  const sync = () => {
    const generation = ++syncGeneration.current;
    setSyncStatus('Sincronizando historial...');
    void (async () => {
      await projectRepository.sync(scope);
      let latest = current.current ? await projectRepository.get(scope, current.current.id) : null;
      // A version can be created while an earlier sync is already in flight.
      if (latest && !latest.synced) { await projectRepository.sync(scope); latest = await projectRepository.get(scope, latest.id); }
      if (alive.current && generation === syncGeneration.current) setSyncStatus(latest?.synced ? 'Historial respaldado en tu cuenta' : 'Copia local guardada · respaldo pendiente');
    })().catch(() => { if (alive.current && generation === syncGeneration.current) setSyncStatus('Copia local guardada · respaldo pendiente'); });
  };
  const receive = async (raw: string) => {
    if (!alive.current || raw.length > 4_500_000) return;
    let message: any; try { message = JSON.parse(raw); } catch { return; }
    if (message?.version !== 1) return;
    if (message.type === 'ready') {
      surface.current?.send({ version: 1, type: 'init', nonce: nonce.current, owner, countryCode: scope.countryCode,
        mode: workMode ? 'work' : materialMode ? 'materials' : 'project', createdAt: current.current?.capturedAt,
        workId: String(route.params?.workId || '').slice(0, 80), workName: String(route.params?.workName || '').slice(0, 160),
        query: String(route.params?.query || '').slice(0, 160), materialId: String(route.params?.materialId || '').slice(0, 160), document: current.current?.document || null }); return;
    }
    if (message.nonce !== nonce.current) return;
    if (message.type === 'dirty') { dirty.current = message.value === true; return; }
    if (typeof message.id !== 'string' || !/^\d{1,8}$/.test(message.id) || seen.current.has(message.id) || inFlight.current > 8) return;
    seen.current.add(message.id); inFlight.current++;
    const reply = (body: unknown) => { if (alive.current) surface.current?.send({ version: 1, nonce: nonce.current, id: message.id, ...body as object }); };
    try {
      if ((await supabase.auth.getSession()).data.session?.user.id !== owner) throw new Error('La sesión cambió.');
      let result: unknown;
      if (message.method === 'catalog') result = await loadDesignPrices(scope, message.params?.type);
      else if (message.method === 'references') result = scope.countryCode === 'AR' ? await designRequest(scope, 'pricing-review', { action: 'quotation_references', country_code: scope.countryCode }) : { references: [] };
      else if (message.method === 'renders') result = await loadMaterialRenders(scope, message.params?.materialId);
      else if (message.method === 'save') {
        if (readOnly || !current.current) throw new Error('No hay un proyecto abierto.');
        let saved: ProjectRecord | null = null;
        const task = saveQueue.current.then(async () => { saved = await projectRepository.revise(scope, current.current!, message.params?.document); current.current = saved; if (alive.current) setRecord(saved); });
        saveQueue.current = task.catch(() => {}); await task;
        result = { id: (saved as ProjectRecord | null)?.id, synced: false }; sync();
      } else if (message.method === 'quote') {
        if (!current.current || readOnly) throw new Error('No hay un proyecto abierto.');
        if (scope.countryCode !== 'AR') throw new Error('El guardado de presupuestos compartidos está disponible en ARS. El cómputo de Uruguay se conserva en el proyecto, sin convertir monedas.');
        const payload = message.params?.payload, info = current.current.document.draft.projectInfo;
        if (!payload?.items?.length || payload.items.length > 80 || !info?.clientName?.trim()) throw new Error('El presupuesto requiere cliente y entre 1 y 80 renglones.');
        if (payload.items.some((row: any) => typeof row.unit_price !== 'number' || !Number.isFinite(row.unit_price) || row.unit_price <= 0 || typeof row.quantity !== 'number' || !Number.isFinite(row.quantity) || row.quantity <= 0)) throw new Error('Hay importes o cantidades pendientes. No se guardan como cero.');
        const response = await designRequest(scope, 'quote-workflow', { action: 'save_quote', data: {
          ...payload.form, client_name: info.clientName, client_address: info.location,
          ...(info.clientReference?.owner === owner ? { client_contact_id: info.clientReference.contactId } : {}),
          items: payload.items, attachments: [], attachment_updates: [],
          ...(message.params?.quoteId ? { quote_id: message.params.quoteId } : {}),
        } });
        if (!response.quote?.id) throw new Error('El servidor no confirmó el presupuesto. Revisá tu historial antes de reintentar.');
        result = { id: response.quote.id, number: response.quote.quote_number || response.quote.id };
      } else throw new Error('Operación no disponible.');
      reply({ result });
    } catch (e) { reply({ error: e instanceof Error ? e.message : 'No se pudo completar la operación.' }); }
    finally { inFlight.current--; }
  };
  const back = () => { if (!readOnly && current.current && !dirty.current) navigation.popTo('ProjectDetail', { row: metadata(current.current) }); else navigation.goBack(); };
  return <SafeAreaView edges={['bottom']} style={ui.root}>
    {readOnly ? <ScreenHeader title="RENDER 3D" subtitle={workMode ? 'Mano de obra' : 'Catálogo maestro'} showBack /> : <ProjectHeader title={record?.name || 'Diseño del proyecto'} subtitle={syncStatus || 'Espacio de trabajo integrado'} back={back} action={<IconButton inverse name="sync-outline" label="Sincronizar historial" onPress={sync} />} />}
    <Notice text={error} />
    {loading ? <ActivityIndicator color={TEAL} style={{ margin: 30 }} /> : readOnly || record ? <View style={{ flex: 1, minHeight: 0 }}><DesignSurface ref={surface} html={html} onMessage={(value) => void receive(value)} onError={setError} /></View> : <View style={ui.content}><Text style={ui.muted}>La versión original sigue en el historial.</Text><Action title="Volver al proyecto" onPress={() => navigation.goBack()} /></View>}
  </SafeAreaView>;
}
