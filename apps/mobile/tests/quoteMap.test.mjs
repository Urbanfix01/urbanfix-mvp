import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { act, create } from 'react-test-renderer';
import { loadMobile } from './helpers/loadMobile.mjs';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const fixture = globalThis.__quoteMapQA = { jobs: [] };
const job = (id, values = {}) => ({ id, created_at: new Date().toISOString(), status: 'approved', total_amount: 1500, location_lat: -34.6, location_lng: -58.4, ...values });
const native = `export const View='View',Text='Text',TouchableOpacity='TouchableOpacity',Modal='Modal',Pressable='Pressable';export const Platform={OS:'ios'},StyleSheet={create:x=>x};`;
const { default: MapScreen } = await loadMobile('src/screens/tabs/MapScreen.tsx', {
  'react-native': native,
  '@expo/vector-icons': `export const Ionicons='Icon';`,
  '@react-navigation/native': `export const useNavigation=()=>({navigate(){}});`,
  '@tanstack/react-query': `export const useQuery=options=>({data:options.enabled?globalThis.__quoteMapQA.jobs:[],isLoading:false,error:null,refetch(){}});`,
  '../../lib/supabase': `export const supabase={auth:{getSession:async()=>({data:{session:{user:{id:'synthetic-owner'}}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}};`,
  '../../components/molecules/ScreenHeader': `export const ScreenHeader='ScreenHeader';`,
  '../../components/molecules/MapCanvas': `export default 'MapCanvas';`,
  '../../components/molecules/SkeletonBlock': `export const SkeletonBlock='SkeletonBlock';`,
});
const { default: NativeMap } = await loadMobile('src/components/molecules/MapCanvas.native.tsx', {
  'react-native': native,
  '@expo/vector-icons': `export const Ionicons='Icon';`,
  'react-native-maps': `export default 'MapView';export const Marker='Marker';`,
  'expo-constants': `export default {expoConfig:{}};`,
});
const { quoteMapData, quoteWorkMapLinks } = await loadMobile('src/utils/quoteMap.ts');
const render = async Component => { let tree; await act(async () => { tree = create(React.createElement(Component)); }); await act(async () => { await new Promise(resolve => setImmediate(resolve)); }); return tree; };
const dispose = async tree => { await act(async () => tree.unmount()); };

test('work map uses real coordinates and missing locations cannot distort its bounds', async () => {
  fixture.jobs = [job('missing', { location_lat: null, location_lng: null }), job('located')];
  const tree = await render(MapScreen);
  try {
    const map = tree.root.findByType('MapCanvas');
    assert.deepEqual(map.props.points.map(point => point.id), ['located']);
    assert.equal(map.props.region.latitude, -34.6);
    assert.equal(map.props.region.longitude, -58.4);
  } finally { await dispose(tree); }
});

test('all missing locations show an honest empty state and a usable fallback region', async () => {
  fixture.jobs = [job('missing', { location_lat: null, location_lng: null })];
  const tree = await render(MapScreen);
  try {
    const map = tree.root.findByType('MapCanvas');
    assert.equal(map.props.points.length, 0);
    assert.notDeepEqual([map.props.region.latitude, map.props.region.longitude], [0, 0]);
    assert.match(JSON.stringify(tree.toJSON()), /sin ubicaci[oó]n de obra/i);
  } finally { await dispose(tree); }
});

test('native map also rejects an origin viewport when the caller has no location', async () => {
  const tree = await render(() => React.createElement(NativeMap, { points: [], region: { latitude: 0, longitude: 0, latitudeDelta: .25, longitudeDelta: .25 }, onSelect() {}, formatMoney: String }));
  try {
    const region = tree.root.findByType('MapView').props.initialRegion;
    assert.notDeepEqual([region.latitude, region.longitude], [0, 0]);
  } finally { await dispose(tree); }
});

test('blank, nonnumeric and out-of-range coordinates cannot produce work markers', () => {
  const values = [null, undefined, '', ' ', false, [], {}, NaN, Infinity];
  const rows = values.map((location_lat, i) => job(String(i), { location_lat }));
  rows.push(job('origin', { location_lat: 0, location_lng: 0 }), job('range', { location_lat: 91 }), job('longitude', { location_lng: 181 }));
  const map = quoteMapData(rows);
  assert.equal(map.points.length, 0);
  assert.equal(map.missingLocationCount, rows.length);
  assert.deepEqual([map.region.latitude, map.region.longitude], [-34.6037, -58.3816]);
});

test('real markers retain their identity, work address, status and amount', () => {
  const rows = [job('one', { location_lat: ' -34.6 ', location_lng: '-58.4', status: 'aprobado', location_address: 'Obra QA', client_address: 'Contacto privado' }),
    job('two', { location_lat: 0, location_lng: 20, status: 'paid' }), job('three', { status: 'sent' })];
  const map = quoteMapData(rows);
  assert.deepEqual(map.points.map(p => [p.id, p.status.key]), [['one', 'approved'], ['two', 'closed'], ['three', 'pending']]);
  assert.equal(map.points[0].address, 'Obra QA');
  assert.equal(map.points[0].lat, -34.6);
  assert.equal(map.points[0].amount, 1500);
  assert.equal(map.missingLocationCount, 0);
  for (const point of map.points) {
    assert.ok(Math.abs(point.lat - map.region.latitude) <= map.region.latitudeDelta / 2);
    assert.ok(Math.abs(point.lng - map.region.longitude) <= map.region.longitudeDelta / 2);
  }
});

test('recent map excludes archived, trashed, cancelled and old records without editing them', () => {
  const now = new Date('2026-11-24T12:00:00Z');
  const rows = Object.freeze([
    job('current', { created_at: now.toISOString() }), job('old', { created_at: '2026-06-01' }),
    job('archived', { archived_at: now.toISOString() }), job('trashed', { deleted_at: now.toISOString() }),
    job('cancelled', { status: 'cancelled' }), job('bad-date', { created_at: 'invalid' }),
  ].map(Object.freeze));
  assert.deepEqual(quoteMapData(rows, now).points.map(p => p.id), ['current']);
  assert.equal(quoteMapData(rows, now).missingLocationCount, 0);
});

test('quote maps never turn an empty work location into the origin or the contact home', () => {
  assert.equal(quoteWorkMapLinks({ location_lat: null, location_lng: null, client_address: 'Contacto QA', client_address_lat: -34, client_address_lng: -58 }), null);
  const byAddress = quoteWorkMapLinks({ location_lat: 0, location_lng: 0, location_address: 'Obra QA & acceso', client_address: 'Contacto QA' });
  assert.match(byAddress.externalUrl, /Obra%20QA%20%26%20acceso/);
  assert.doesNotMatch(byAddress.externalUrl, /0,0|Contacto/);
  assert.match(quoteWorkMapLinks({ location_lat: -34.6, location_lng: -58.4 }).externalUrl, /-34.6,-58.4$/);
});

test('native markers include only valid work points and select the correct job', async () => {
  const points = quoteMapData([job('real')]).points;
  let selected;
  const tree = await render(() => React.createElement(NativeMap, { points: [...points, { ...points[0], id: 'ghost', lat: 0, lng: 0 }], region: quoteMapData([job('real')]).region, onSelect: p => { selected = p.id; }, formatMoney: String }));
  try {
    const markers = tree.root.findAllByType('Marker');
    assert.equal(markers.length, 1);
    assert.deepEqual(markers[0].props.coordinate, { latitude: -34.6, longitude: -58.4 });
    await act(async () => markers[0].props.onPress());
    assert.equal(selected, 'real');
  } finally { await dispose(tree); }
});
