import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { mobileSourceHash } from '../../../scripts/lib/mobile-source-hash.mjs';

test('source identity survives Windows/cloud line endings and still detects content changes', () => {
  assert.equal(mobileSourceHash(Buffer.from('hello\r\nworld\r\n'), 'file.ts'), mobileSourceHash(Buffer.from('hello\nworld\n'), 'file.ts'));
  assert.notEqual(mobileSourceHash(Buffer.from('hello'), 'file.ts'), mobileSourceHash(Buffer.from('changed'), 'file.ts'));
  assert.notEqual(mobileSourceHash(Buffer.from([13, 10]), 'font.ttf'), mobileSourceHash(Buffer.from([10]), 'font.ttf'));
});

const owner = '11111111-1111-4111-8111-111111111111';
const fixture = globalThis.__mobileReady = { owner, calls: [], request: { id: 'request-1', status: 'pending' } };
const load = async (file, mocks = {}) => {
  const result = await build({ entryPoints: [fileURLToPath(new URL(file, import.meta.url))], bundle: true, platform: 'node', format: 'esm', write: false,
    plugins: [{ name: 'isolated-mobile', setup(b) {
      b.onResolve({ filter: /.*/ }, ({ path }) => Object.hasOwn(mocks, path) ? { path, namespace: 'fixture' } : null);
      b.onLoad({ filter: /.*/, namespace: 'fixture' }, ({ path }) => ({ contents: mocks[path] }));
    } }],
  });
  return import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
};
const auth = `export const supabase={auth:{getSession:async()=>({data:{session:globalThis.__mobileReady.owner?{user:{id:globalThis.__mobileReady.owner},access_token:'fixture-token'}:null}})},from:()=>{throw Error('Raw catalog access forbidden')}};`;

test('auth refresh follows foreground/background and removes its listener on unmount', async () => {
  const { attachAuthRefresh } = await load('../src/lib/authLifecycle.ts');
  const calls = []; let change;
  const dispose = attachAuthRefresh({ startAutoRefresh: () => calls.push('start'), stopAutoRefresh: () => calls.push('stop') }, {
    currentState: 'active', addEventListener: (event, callback) => { assert.equal(event, 'change'); change = callback; return { remove: () => calls.push('remove') }; },
  });
  change('background'); change('inactive'); change('active'); dispose();
  assert.deepEqual(calls, ['start', 'stop', 'stop', 'start', 'remove', 'stop']);
});

test('deletion uses the owner workflow, confirms a request and never claims immediate deletion', async () => {
  const { deleteCurrentAccount, DELETION_WARNING, DELETION_SUCCESS } = await load('../src/services/accountDeletion.ts', {
    '../lib/supabase': auth,
    '../api/workflows': `export async function workflowRequest(...args){globalThis.__mobileReady.calls.push(args);return {ok:true,request:globalThis.__mobileReady.request};}`,
  });
  fixture.calls = []; fixture.owner = owner;
  assert.equal((await deleteCurrentAccount()).status, 'pending');
  assert.deepEqual(fixture.calls[0], [{ owner }, 'account-workflow', { action: 'request_deletion', data: { scope: 'full_account', details: 'Solicitud desde la app móvil.' } }]);
  assert.match(DELETION_WARNING, /no es inmediata/); assert.match(DELETION_SUCCESS, /Solicitud/);
  for (const request of [null, {}, { id: 'x', status: 'completed' }]) {
    fixture.request = request; await assert.rejects(deleteCurrentAccount(), /no confirmó/);
  }
  fixture.owner = null; await assert.rejects(deleteCurrentAccount(), /Iniciá sesión/);
  fixture.owner = owner;
});

test('catalog reads every authorized page and propagates refusal without raw table fallback', async () => {
  const { fetchMasterItems } = await load('../src/api/items.ts', {
    '../lib/supabase': auth,
    '../api/workflows': `export async function workflowRequest(scope,name,body){const f=globalThis.__mobileReady;f.calls.push({scope,name,body});if(f.denied)throw Error('Sin acceso');if(f.changeOwner)f.owner='another';return {ok:true,items:[{id:body.data.type+body.data.page,name:body.data.type+body.data.page,type:body.data.type}],pagination:{pages:2}};}`,
  });
  fixture.calls = []; fixture.owner = owner; fixture.denied = false;
  const items = await fetchMasterItems();
  assert.equal(items.length, 4); assert.equal(new Set(items.map(i => i.id)).size, 4);
  assert.ok(fixture.calls.every(c => c.scope.owner === owner && c.body.data.country_code === 'AR' && c.name === 'pricing-workflow-v2'));
  fixture.denied = true; await assert.rejects(fetchMasterItems(), /Sin acceso/); fixture.denied = false;
  fixture.changeOwner = true; await assert.rejects(fetchMasterItems(), /sesión cambió/);
  fixture.changeOwner = false; fixture.owner = owner;
});

test('workflow rejects HTML, refusal, redirects and responses after an account switch', async () => {
  globalThis.__DEV__ = false;
  const { workflowRequest } = await load('../src/api/workflows.ts', {
    'react-native': "export const Platform={OS:'android'};",
    '../lib/supabase': auth,
    '../utils/config': "export const getWebApiUrl=path=>'https://www.urbanfix.com.ar'+path;",
  });
  const originalFetch = globalThis.fetch;
  try {
    for (const payload of [null, { ok: false }, { items: [] }]) {
      globalThis.fetch = async (_, init) => { assert.equal(init.redirect, 'error'); return { ok: true, json: async () => payload }; };
      await assert.rejects(workflowRequest({ owner }, 'account-workflow', {}), /compatible/);
    }
    globalThis.fetch = async () => ({ ok: false, json: async () => ({ ok: false, error: 'Sin permiso' }) });
    await assert.rejects(workflowRequest({ owner }, 'account-workflow', {}), /Sin permiso/);
    globalThis.fetch = async () => { fixture.owner = 'another'; return { ok: true, json: async () => ({ ok: true }) }; };
    await assert.rejects(workflowRequest({ owner }, 'account-workflow', {}), /sesion cambio/);
    fixture.owner = owner;
  } finally { globalThis.fetch = originalFetch; }
});

test('legacy client and professional reads reject a successful HTML page', async () => {
  const mocks = {
    '../lib/supabase': auth,
    '../utils/config': "export const getWebApiUrl=path=>'https://www.urbanfix.com.ar'+path;",
    './workflows': 'export async function workflowRequest(){throw Error("Unexpected workflow");}',
  };
  const client = await load('../src/api/client.ts', mocks);
  const professional = await load('../src/api/marketplace.ts', mocks);
  const originalFetch = globalThis.fetch;
  try {
    fixture.owner = owner;
    globalThis.fetch = async () => ({ ok: true, json: async () => { throw Error('HTML'); } });
    await assert.rejects(client.fetchClientWorkspace(), /procesar/);
    await assert.rejects(professional.fetchTechnicianDashboardBilling(), /procesar/);
  } finally { globalThis.fetch = originalFetch; }
});
