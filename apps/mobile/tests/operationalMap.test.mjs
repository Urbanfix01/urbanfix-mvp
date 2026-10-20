import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
const owner = '11111111-1111-4111-8111-111111111111';
const peer = '22222222-2222-4222-8222-222222222222';
const row = (id, overrides = {}) => ({ id, title: id, category: 'Electricidad', status: 'published', mode: 'marketplace', public_lat: -34.6, public_lng: -58.38, created_at: '2026-10-20T00:00:00Z', ...overrides });
const payload = (requests, matches = []) => ({ ok: true, supabase_user_id: owner, requests, matches });
const load = async (file, plugins = []) => {
  const result = await build({ entryPoints: [fileURLToPath(new URL(file, import.meta.url))], bundle: true, platform: 'node', format: 'esm', write: false, plugins });
  return import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
};
const { mapCoordinate, mapRegionForPoints } = await load('../src/utils/mapGeometry.ts');
const { operationalRequests } = await load('../src/api/operationalRequests.ts');
const state = globalThis.__operationalFixture = { owner, calls: [], result: payload([row('active')]) };
const { fetchNearbyRequests } = await load('../src/api/marketplace.ts', [{ name: 'isolated-api', setup(builder) {
  builder.onResolve({ filter: /^(\.\.\/lib\/supabase|\.\/workflows)$/ }, ({ path }) => ({ path, namespace: 'fixture' }));
  builder.onLoad({ filter: /.*/, namespace: 'fixture' }, ({ path }) => ({ contents: path.endsWith('workflows')
    ? 'export async function workflowRequest(...args) { const s=globalThis.__operationalFixture; s.calls.push(args); if(s.changeOwner) s.owner=s.changeOwner; return s.result; }'
    : 'export const supabase={auth:{getSession:async()=>({data:{session:{user:{id:globalThis.__operationalFixture.owner}}}})},from:()=>({select:()=>({eq:()=>({abortSignal:()=>({maybeSingle:async()=>({data:{service_lat:-34.7,service_lng:-58.4,service_radius_km:20},error:null})})})})})};' }));
} }]);
const { workflowRequest } = await load('../src/api/workflows.ts', [{ name: 'isolated-auth', setup(builder) {
  builder.onResolve({ filter: /^(react-native|\.\.\/lib\/supabase)$/ }, ({ path }) => ({ path, namespace: 'auth-fixture' }));
  builder.onLoad({ filter: /.*/, namespace: 'auth-fixture' }, ({ path }) => ({ contents: path === 'react-native' ? "export const Platform={OS:'ios'};" : "export const supabase={auth:{getSession:async()=>({data:{session:{user:{id:globalThis.__operationalFixture.owner},access_token:'fixture-token'}}})}};" }));
} }]);

test('invalid and missing coordinates cannot become a marker at the origin', () => {
  for (const value of [null, undefined, '', ' ', false, [], {}, NaN, Infinity]) assert.equal(mapCoordinate(value, -58.3), null);
  assert.equal(mapCoordinate(0, 0), null);
  assert.equal(mapCoordinate(91, -58), null);
  assert.equal(mapCoordinate(-34, 181), null);
  assert.deepEqual(mapCoordinate(' -34.6 ', '-58.3'), { lat: -34.6, lng: -58.3 });
  assert.deepEqual(mapCoordinate(0, 20), { lat: 0, lng: 20 });
});
test('private API coordinates stay approximate unless exact coordinates were authorized', () => {
  const result = operationalRequests(payload([row('public'), row('assigned', { status: 'selected', location_lat: -34.61, location_lng: -58.39, assigned_technician_id: owner }), row('missing', { public_lat: null, public_lng: '' })]), owner);
  assert.equal(result.requests[0].location_precision, 'approx');
  assert.equal(result.requests[0].address, '');
  assert.equal(result.requests[1].location_precision, 'exact');
  assert.equal(result.requests[1].location_lat, -34.61);
  assert.equal(result.requests[2].location_precision, 'missing');
  assert.equal(result.requests[2].location_lat, null);
  assert.equal(result.requests[2].location_lng, null);
});
test('completed requests, duplicates and other professionals direct requests are excluded', () => {
  const result = operationalRequests(payload([row('active'), row('active'), row('done', { status: 'completed' }), row('cancelled', { status: 'cancelled' }), row('other', { mode: 'direct', target_technician_id: peer }), row('mine', { mode: 'direct', status: 'direct_sent', target_technician_id: owner })]), owner);
  assert.deepEqual(result.requests.map((r) => r.id), ['active', 'mine']);
});
test('only the owner latest response is shown, without making pending amounts zero', () => {
  const result = operationalRequests(payload([row('active'), row('pending')], [
    { request_id: 'active', technician_id: owner, price_ars: 100, updated_at: '2026-10-18' },
    { request_id: 'active', technician_id: owner, price_ars: 250, updated_at: '2026-10-20' },
    { request_id: 'active', technician_id: peer, price_ars: 999, updated_at: '2026-10-21' },
  ]), owner);
  assert.equal(result.requests[0].my_price_ars, 250);
  assert.equal(result.requests[1].my_price_ars, null);
  assert.equal(result.technician.within_working_hours, null);
});
test('a different owner or invalid response is an error, not an empty map', () => {
  for (const data of [null, {}, '<html>UrbanFix</html>', { ...payload([]), supabase_user_id: peer }]) assert.throws(() => operationalRequests(data, owner));
});
test('map bounds include the actual points and fall back to the profile without fake GPS', () => {
  assert.equal(mapRegionForPoints([], { lat: -32.9, lng: -60.6 }).latitude, -32.9);
  const region = mapRegionForPoints([{ lat: -34, lng: -58 }, { lat: -35, lng: -59 }]);
  assert.equal(region.latitude, -34.5);
  assert.ok(region.latitudeDelta >= 1);
});
test('operational loading calls the current authenticated read-only workflow', async () => {
  state.calls = []; state.owner = owner; state.result = payload([row('active')]);
  const result = await fetchNearbyRequests();
  assert.equal(state.calls.length, 1);
  assert.deepEqual(state.calls[0].slice(0, 3), [{ owner }, 'supabase-technician-data', { op: 'dashboard' }]);
  assert.equal(result.requests.length, 1);
  assert.equal(result.technician.service_lat, -34.7);
});
test('an account switch during loading never returns the earlier account requests', async () => {
  state.owner = owner; state.changeOwner = peer;
  await assert.rejects(fetchNearbyRequests(), /sesion cambio/);
  delete state.changeOwner; state.owner = owner;
});
test('workflow transport accepts only compatible JSON and refuses obsolete HTML success pages', async () => {
  const fetch = globalThis.fetch;
  try {
    globalThis.fetch = async (url, options) => {
      assert.equal(url, 'https://www.urbanfix.com.ar/api/functions/supabase-technician-data');
      assert.equal(options.method, 'POST'); assert.equal(options.redirect, 'error');
      return new Response('<html>Old web route</html>', { status: 200 });
    };
    await assert.rejects(workflowRequest({ owner }, 'supabase-technician-data', { op: 'dashboard' }), /respuesta compatible/);
    globalThis.fetch = async () => new Response(JSON.stringify(payload([])), { status: 200 });
    assert.equal((await workflowRequest({ owner }, 'supabase-technician-data', { op: 'dashboard' })).ok, true);
    await assert.rejects(workflowRequest({ owner }, 'unknown-route', {}), /no disponible/);
    await assert.rejects(workflowRequest({ owner: peer }, 'supabase-technician-data', {}), /sesion cambio/);
  } finally { globalThis.fetch = fetch; }
});
test('workflow transport discards a response when the signed-in account changes', async () => {
  const fetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => { state.owner = peer; return new Response(JSON.stringify(payload([])), { status: 200 }); };
    await assert.rejects(workflowRequest({ owner }, 'supabase-technician-data', { op: 'dashboard' }), /sesion cambio durante/);
  } finally { globalThis.fetch = fetch; state.owner = owner; }
});
