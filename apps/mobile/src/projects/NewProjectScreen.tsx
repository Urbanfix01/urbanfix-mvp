import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { useProjectOwner } from './ProjectSession';
import { loadProjectClients, ProjectClient, projectRepository } from './projectServices';
import { Country, createProjectDraft, EMPTY_PROJECT_FORM, metadata, NewProjectForm, normalizePoint, PROJECT_STEPS, validateProjectForm } from './projectWorkspace';
import { Action, Field, IconButton, Notice, ProjectHeader, TEAL, ui } from './ProjectUI';
import ProjectPlanPreview from './ProjectPlanPreview';

export default function NewProjectScreen({ navigation, route }: any) {
  const owner = useProjectOwner(), countryCode: Country = route.params?.countryCode === 'UY' ? 'UY' : 'AR';
  const scope = { owner, countryCode };
  const [form, setForm] = useState<NewProjectForm>({ ...EMPTY_PROJECT_FORM }), [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({}), [message, setMessage] = useState(''), [busy, setBusy] = useState(false);
  const [clients, setClients] = useState<ProjectClient[]>([]), [clientsBusy, setClientsBusy] = useState(true), [clientError, setClientError] = useState('');
  const [picker, setPicker] = useState(false), [search, setSearch] = useState(''), [gpsBusy, setGpsBusy] = useState(false);
  const [manual, setManual] = useState(false), [lat, setLat] = useState(''), [lng, setLng] = useState('');
  const active = useRef(true), locationRequest = useRef(0), scroll = useRef<ScrollView>(null), saving = useRef(false);
  useEffect(() => {
    let current = true;
    void loadProjectClients({ owner, countryCode }).then((rows) => { if (current) setClients(rows); })
      .catch((error) => { if (current) setClientError(error.message); }).finally(() => { if (current) setClientsBusy(false); });
    return () => { current = false; };
  }, [owner, countryCode]);
  useEffect(() => { active.current = true; return () => { active.current = false; locationRequest.current++; }; }, []);
  const update = (key: keyof NewProjectForm, value: any) => {
    if (key === 'location') { locationRequest.current++; setGpsBusy(false); }
    setForm((previous) => ({ ...previous, [key]: value, ...(key === 'clientName' ? { clientReference: null } : {}), ...(key === 'location' ? { siteLocation: null } : {}) }));
    setErrors((previous) => ({ ...previous, [key]: '' })); setMessage('');
  };
  const go = (next: number) => { locationRequest.current++; setGpsBusy(false); setStep(next); setMessage(''); setErrors({}); scroll.current?.scrollTo({ y: 0, animated: false }); };
  const next = () => {
    const fields: readonly string[] = PROJECT_STEPS[step].fields;
    const issues = validateProjectForm(form, scope).filter((error) => fields.includes(error.field));
    if (issues.length) { setErrors(Object.fromEntries(issues.map((error) => [error.field, error.message]))); return; }
    go(step + 1);
  };
  const locate = async () => {
    const request = ++locationRequest.current; setGpsBusy(true); setMessage('');
    const isCurrent = () => active.current && request === locationRequest.current;
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!isCurrent()) return;
      if (permission.status !== 'granted') throw new Error('No se habilitó la ubicación. Podés escribir la dirección o cargar coordenadas manuales.');
      const position = await Promise.race([Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }), new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('El GPS está tardando. Reintentá o cargá las coordenadas manualmente.')), 20000); })]);
      if (!isCurrent()) return;
      const point = normalizePoint({ lat: position.coords.latitude, lng: position.coords.longitude, accuracy: position.coords.accuracy, source: 'gps' });
      setForm((previous) => ({ ...previous, siteLocation: point })); setManual(false);
    } catch (error) { if (isCurrent()) setMessage((error as Error).message); }
    finally { if (timer) clearTimeout(timer); if (isCurrent()) setGpsBusy(false); }
  };
  const applyCoordinates = () => {
    try {
      if (!lat.trim() || !lng.trim()) throw new Error('Completá latitud y longitud.');
      const point = normalizePoint({ lat: Number(lat.replace(',', '.')), lng: Number(lng.replace(',', '.')), source: 'manual', accuracy: null });
      locationRequest.current++; setGpsBusy(false); setForm((previous) => ({ ...previous, siteLocation: point })); setManual(false); setMessage('');
    } catch (error) { setMessage((error as Error).message); }
  };
  const create = async () => {
    if (saving.current) return;
    const issues = validateProjectForm(form, scope);
    if (issues.length) { setErrors(Object.fromEntries(issues.map((error) => [error.field, error.message]))); setMessage(issues[0].message); return; }
    saving.current = true; setBusy(true); setMessage('');
    try {
      const saved = await projectRepository.create(scope, form);
      // Creation is local-first. A failed cloud request must not undo the saved project.
      let syncMessage = '';
      try { await projectRepository.sync(scope); } catch (error) { syncMessage = (error as Error).message; }
      if (!active.current) return;
      const row = await projectRepository.get(scope, saved.id).catch(() => saved);
      navigation.replace('ProjectDetail', { row: metadata(row), initialMessage: syncMessage });
    } catch (error) { if (active.current) setMessage((error as Error).message); }
    finally { saving.current = false; if (active.current) setBusy(false); }
  };
  const reviewDraft = step === 3 && !validateProjectForm(form, scope).length ? createProjectDraft(form, scope, '00000000-0000-4000-8000-000000000001', '2026-01-01T00:00:00.000Z') : null;
  const filteredClients = clients.filter((client) => `${client.name} ${client.email} ${client.phone}`.toLocaleLowerCase('es').includes(search.toLocaleLowerCase('es')));
  return <SafeAreaView style={ui.root} edges={['bottom']}>
    <ProjectHeader title="Nuevo proyecto" subtitle={`${countryCode} · ${countryCode === 'AR' ? 'ARS' : 'UYU'}`} back={() => { if (!busy) step ? go(step - 1) : navigation.goBack(); }} />
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ padding: 16, paddingBottom: 0 }}><Text style={ui.muted}>PASO {step + 1} DE 4</Text><Text accessibilityRole="header" style={ui.heading}>{PROJECT_STEPS[step].title}</Text><View style={[ui.row, { gap: 5 }]}>{PROJECT_STEPS.map((item, index) => <View key={item.title} style={{ flex: 1, height: 3, backgroundColor: index <= step ? TEAL : '#d5dfdf' }} />)}</View></View>
      <ScrollView ref={scroll} contentContainerStyle={ui.content} keyboardShouldPersistTaps="handled">
        <Notice text={message} />
        {step === 0 ? <>
          <Field label="Nombre del proyecto" placeholder="Ej. Vivienda Belén" value={form.name} maxLength={100} onChangeText={(text) => update('name', text)} error={errors.name} />
          <Field label="Cliente (opcional)" value={form.clientName} maxLength={100} onChangeText={(text) => update('clientName', text)} error={errors.clientName} />
          <Action title={clientsBusy ? 'Consultando clientes' : 'Elegir de mis clientes'} icon="people-outline" disabled={clientsBusy} onPress={() => setPicker(true)} />
          <Notice text={clientError} />{form.clientReference ? <Text style={[ui.muted, { marginTop: 12 }]}>Vinculado al historial de clientes.</Text> : null}
        </> : null}
        {step === 1 ? <>
          <Field label="Dirección de la obra (opcional)" placeholder="Calle, localidad y provincia" value={form.location} multiline maxLength={200} onChangeText={(text) => update('location', text)} error={errors.location} />
          <Action title="Usar ubicación actual" icon="locate-outline" busy={gpsBusy} onPress={() => void locate()} />
          {form.siteLocation ? <View style={ui.band}><Text style={ui.text}>{form.siteLocation.lat}, {form.siteLocation.lng}</Text><Text style={ui.muted}>{form.siteLocation.source === 'gps' ? `GPS · precisión aproximada ${Math.round(form.siteLocation.accuracy || 0)} m` : 'Coordenadas manuales'}</Text><Action title="Quitar coordenadas" icon="close" onPress={() => setForm((previous) => ({ ...previous, siteLocation: null }))} /></View> : null}
          <View style={{ marginTop: 12 }}><Action title={manual ? 'Cerrar coordenadas manuales' : 'Cargar coordenadas manuales'} icon="pin-outline" onPress={() => { locationRequest.current++; setGpsBusy(false); setManual(!manual); }} /></View>
          {manual ? <View style={ui.band}><Field label="Latitud" placeholder="-34.60" value={lat} onChangeText={setLat} keyboardType="numbers-and-punctuation" /><Field label="Longitud" placeholder="-58.38" value={lng} onChangeText={setLng} keyboardType="numbers-and-punctuation" /><Action title="Aplicar coordenadas" onPress={applyCoordinates} /></View> : null}
          <Text style={[ui.muted, { marginTop: 16 }]}>La posición no determina linderos ni reemplaza una mensura. Confirmá que corresponda a la obra.</Text>
        </> : null}
        {step === 2 ? <>
          <Field label="Frente del terreno (m)" value={form.width} keyboardType="decimal-pad" onChangeText={(text) => update('width', text.replace(',', '.'))} error={errors.width} />
          <Field label="Fondo del terreno (m)" value={form.depth} keyboardType="decimal-pad" onChangeText={(text) => update('depth', text.replace(',', '.'))} error={errors.depth} />
          <Field label="Altura de dibujo (m)" value={form.height} keyboardType="decimal-pad" onChangeText={(text) => update('height', text.replace(',', '.'))} error={errors.height} />
          <Text style={ui.muted}>Terreno rectangular de referencia. Retiros, edificabilidad y normativa quedan pendientes de verificación.</Text>
        </> : null}
        {step === 3 ? <>
          <Text style={ui.heading}>{form.name}</Text><Text style={ui.text}>{form.clientName || 'Cliente sin definir'}</Text><Text style={ui.muted}>{form.location || 'Dirección sin definir'}</Text>
          {form.siteLocation ? <Text style={ui.muted}>{form.siteLocation.lat}, {form.siteLocation.lng}</Text> : null}
          {reviewDraft ? <ProjectPlanPreview draft={reviewDraft} /> : null}
          <Text style={ui.text}>{form.width} × {form.depth} m · {Number(form.width) * Number(form.depth)} m²</Text><Text style={ui.muted}>Altura de dibujo: {form.height} m</Text>
          <View style={ui.band}><Text style={ui.muted}>Plano libre nuevo, sin muros ni costos asignados. El proyecto actual de la web no será reemplazado al crearlo.</Text></View>
          <Text style={ui.muted}>Anteproyecto. No constituye documentación aprobada para construir.</Text>
        </> : null}
      </ScrollView>
      <View style={ui.footer}>{step ? <IconButton name="arrow-back" label="Paso anterior" disabled={busy} onPress={() => go(step - 1)} /> : null}<View style={{ flex: 1 }}><Action title={step === 3 ? 'Crear proyecto' : 'Continuar'} icon={step === 3 ? 'checkmark' : 'arrow-forward'} primary busy={busy} onPress={step === 3 ? () => void create() : next} /></View></View>
    </KeyboardAvoidingView>
    <Modal visible={picker} transparent animationType="slide" onRequestClose={() => setPicker(false)}><View style={ui.sheetBackdrop}><SafeAreaView edges={['bottom']} style={ui.sheet}><View style={[ui.row, { justifyContent: 'space-between' }]}><Text accessibilityRole="header" style={ui.heading}>Mis clientes</Text><IconButton name="close" label="Cerrar clientes" onPress={() => setPicker(false)} /></View><Field label="Buscar cliente" value={search} onChangeText={setSearch} /><ScrollView keyboardShouldPersistTaps="handled">{clientsBusy ? <ActivityIndicator color={TEAL} /> : !filteredClients.length ? <Text style={ui.muted}>No hay clientes disponibles para esta búsqueda.</Text> : filteredClients.map((client) => <Pressable accessibilityRole="button" key={client.id} onPress={() => { setForm((previous) => ({ ...previous, clientName: client.name, clientReference: { contactId: client.id, owner } })); setPicker(false); }} style={ui.band}><Text style={ui.text}>{client.name}</Text><Text style={ui.muted}>{client.email || client.phone}</Text></Pressable>)}</ScrollView></SafeAreaView></View></Modal>
  </SafeAreaView>;
}
