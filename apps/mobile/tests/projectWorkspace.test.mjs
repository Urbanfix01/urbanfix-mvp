import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url), ts = require('typescript');
const source = await readFile(new URL('../src/projects/projectWorkspace.ts', import.meta.url), 'utf8');
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } }).outputText;
const core = await import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`);
const owner = '11111111-1111-4111-8111-111111111111', other = '22222222-2222-4222-8222-222222222222';
const scope = { owner, countryCode: 'AR' }, form = { ...core.EMPTY_PROJECT_FORM, name: 'Casa de prueba', width: '22', depth: '33' };
const digest = async (value) => createHash('sha256').update(value).digest('hex');
function fixture() {
  const storage = new Map(), remote = new Map(); let session = owner, offline = false, inserts = 0, failIndex = false;
  const ports = {
    storage: { getItem: async (key) => storage.get(key) ?? null, getAllKeys: async () => [...storage.keys()], setItem: async (key, value) => { if (failIndex && key.includes(':meta:')) throw new Error('Disk full'); storage.set(key, value); } },
    cloud: { currentOwner: async () => session, list: async () => [...remote.values()].map(core.metadata), versions: async () => [...remote.values()].map(core.metadata), get: async (_, id) => structuredClone(remote.get(id)), insert: async (_, row) => { inserts++; if (offline) throw new Error('offline'); remote.set(row.id, { ...structuredClone(row), synced: true }); } },
    randomUUID, digest, now: () => new Date().toISOString(),
  };
  return { ports, repo: core.createProjectRepository(ports), storage, remote, setSession: (value) => { session = value; }, setOffline: (value) => { offline = value; }, setIndexFailure: (value) => { failIndex = value; }, inserts: () => inserts };
}
test('creates a web-compatible empty plan in meters, without invented prices', async () => {
  const f = fixture(), row = await f.repo.create(scope, form), draft = row.document.draft;
  assert.equal(draft.kind, 'house-drawing'); assert.equal(draft.version, 1); assert.equal(draft.unit, 'm');
  assert.deepEqual(draft.walls, []); assert.deepEqual(draft.prices, {}); assert.equal(draft.settings.lotDepth, 33);
  assert.equal(draft.projectInfo.countryCode, 'AR'); assert.equal(row.projectKey, draft.id);
  assert.equal(row.digest, await digest(JSON.stringify(row.document))); assert.equal((await f.repo.local(scope)).length, 1);
});
test('invalid dimensions and another account client are rejected', async () => {
  const f = fixture();
  await assert.rejects(f.repo.create(scope, { ...form, width: '0' }));
  await assert.rejects(f.repo.create(scope, { ...form, clientReference: { contactId: randomUUID(), owner: other } }));
  assert.equal(f.storage.size, 0);
});
test('GPS and manual coordinates retain their source and precision, without inferring cadastral data', () => {
  assert.deepEqual(core.normalizePoint({ lat: -34.12345678, lng: -58.3, source: 'gps', accuracy: 12 }), { lat: -34.123457, lng: -58.3, source: 'gps', accuracy: 12 });
  assert.throws(() => core.normalizePoint({ lat: '0', lng: 0, source: 'gps', accuracy: 0 }));
  assert.throws(() => core.normalizePoint({ lat: 91, lng: 0, source: 'manual', accuracy: null }));
});
test('offline sync retains the immutable local document and can retry', async () => {
  const f = fixture(), row = await f.repo.create(scope, form), key = [...f.storage.keys()].find((key) => key.includes(':document:')), raw = f.storage.get(key);
  f.setOffline(true); await assert.rejects(f.repo.sync(scope)); assert.equal((await f.repo.get(scope, row.id)).synced, false);
  f.setOffline(false); await f.repo.sync(scope); assert.equal((await f.repo.get(scope, row.id)).synced, true);
  assert.equal(f.storage.get(key), raw); assert.equal(f.remote.size, 1);
});
test('concurrent sync requests coalesce and do not insert twice', async () => {
  const f = fixture(); await f.repo.create(scope, form);
  await Promise.all([f.repo.sync(scope), f.repo.sync(scope), f.repo.sync(scope)]); assert.equal(f.inserts(), 1);
});
test('interrupted metadata writes recover from the durable document', async () => {
  const f = fixture(); f.setIndexFailure(true); const saved = await f.repo.create(scope, form);
  f.setIndexFailure(false); assert.equal((await f.repo.local(scope))[0].id, saved.id); await f.repo.sync(scope);
  assert.equal((await f.repo.get(scope, saved.id)).synced, true);
});
test('account and country namespaces never share local documents', async () => {
  const f = fixture(); await f.repo.create(scope, form);
  assert.deepEqual(await f.repo.local({ owner: other, countryCode: 'AR' }), []);
  assert.deepEqual(await f.repo.local({ owner, countryCode: 'UY' }), []);
});
test('a changed session cannot upload or mark another account version synced', async () => {
  const f = fixture(); const saved = await f.repo.create(scope, form); f.setSession(other);
  await assert.rejects(f.repo.sync(scope)); assert.equal(f.remote.size, 0); assert.equal((await f.repo.get(scope, saved.id)).synced, false);
});
test('tampered document is preserved but not synchronized', async () => {
  const f = fixture(); await f.repo.create(scope, form); const key = [...f.storage.keys()].find((key) => key.includes(':document:'));
  const row = JSON.parse(f.storage.get(key)); row.document.draft.name = 'Alterado'; const raw = JSON.stringify(row); f.storage.set(key, raw);
  await assert.rejects(f.repo.sync(scope)); assert.equal(f.storage.get(key), raw); assert.equal(f.remote.size, 0);
});
test('opened cloud versions are verified and cached for offline access', async () => {
  const f = fixture(), row = await f.repo.create(scope, form); await f.repo.sync(scope); f.storage.clear();
  assert.equal((await f.repo.get(scope, row.id)).synced, true); f.remote.clear();
  assert.equal((await f.repo.get(scope, row.id)).id, row.id);
});
test('corrupt cloud document cannot be cached', async () => {
  const f = fixture(), row = await f.repo.create(scope, form); await f.repo.sync(scope); f.storage.clear(); f.remote.get(row.id).document.draft.name = 'Alterado';
  await assert.rejects(f.repo.get(scope, row.id)); assert.equal(f.storage.size, 0);
});
test('the web destination is project-filtered, HTTPS, allowlisted and contains no session token', async () => {
  const f = fixture(), row = await f.repo.create(scope, form), url = new URL(core.projectWebUrl(row));
  assert.equal(url.searchParams.get('proyecto'), row.projectKey); assert.equal(url.searchParams.get('editor'), 'plano');
  assert.equal(url.searchParams.get('pais'), 'AR'); assert.equal(url.searchParams.has('access_token'), false);
  assert.throws(() => core.projectWebUrl(row, 'https://evil.example'));
  assert.throws(() => core.projectWebUrl(row, 'http://www.urbanfix.com.ar'));
});
test('grouping retains latest snapshots and cloud sync confirmation', async () => {
  const f = fixture(), row = core.metadata(await f.repo.create(scope, form));
  assert.equal(core.mergeProjects([row], [{ ...row, synced: true }])[0].synced, true);
  assert.equal(core.mergeProjects([{ ...row, id: randomUUID(), capturedAt: '2027-01-01T00:00:00.000Z' }], [row]).length, 1);
});
