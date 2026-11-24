import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TabRouter, StackRouter, CommonActions } from '@react-navigation/routers';
import { loadMobile } from './helpers/loadMobile.mjs';

const { observeSession, withStartupDeadline, resolveAccountShell } = await loadMobile('src/navigation/accountBoot.ts');
const { parseMobileLink, createMobileLinkQueue } = await loadMobile('src/navigation/mobileLinks.ts');
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
const tick = () => new Promise(resolve => setImmediate(resolve));
const account = (id, audience = 'tecnico') => ({ user: { id, user_metadata: { app_audience: audience } }, access_token: 'synthetic-unit-session' });
const authFixture = () => {
  const initial = deferred(); let callback, removed = 0;
  return { initial, event: (...args) => callback(...args), get removed() { return removed; }, auth: {
    getSession: () => initial.promise, onAuthStateChange: listener => { callback = listener; return { data: { subscription: { unsubscribe() { removed++; } } } }; },
  } };
};

test('new sign-in and sign-out events win over a late cached session', async () => {
  const f = authFixture(), states = [], claims = [];
  const dispose = observeSession(f.auth, s => states.push(s), owner => claims.push(owner));
  f.event('SIGNED_IN', account('new-owner'));
  f.event('SIGNED_OUT', null);
  f.initial.resolve({ data: { session: account('old-owner') }, error: null }); await tick();
  assert.equal(states.at(-1).session, null); assert.equal(states.at(-1).status, 'ready');
  assert.deepEqual(claims, ['new-owner']);
  const count = states.length; dispose(); f.event('SIGNED_IN', account('late-owner')); await tick();
  assert.equal(states.length, count); assert.equal(f.removed, 1);
});

test('synchronous initial auth notification cannot be overwritten by getSession', async () => {
  const states = [];
  const dispose = observeSession({ onAuthStateChange(callback) { callback('INITIAL_SESSION', account('current')); return { data: { subscription: { unsubscribe() {} } } }; },
    getSession: async () => ({ data: { session: account('stale') }, error: null }) }, s => states.push(s), () => {});
  await tick(); assert.equal(states.at(-1).session.user.id, 'current'); dispose();
});

test('a rejected or stalled session produces recovery instead of endless loading', async () => {
  for (const stalled of [false, true]) {
    const f = authFixture(), states = [];
    const dispose = observeSession(f.auth, s => states.push(s), () => {}, 10);
    if (!stalled) f.initial.reject(Error('storage unavailable'));
    await new Promise(resolve => setTimeout(resolve, 25));
    assert.equal(states.at(-1).status, 'error');
    f.event('SIGNED_IN', account('recovered')); assert.equal(states.at(-1).status, 'ready'); dispose();
  }
});

test('startup deadlines cancel requests and ignore work after account disposal', async () => {
  let signal;
  await assert.rejects(withStartupDeadline(s => { signal = s; return new Promise(() => {}); }, { timeout: 10 }), /conexión/);
  assert.equal(signal.aborted, true);
  const controller = new AbortController(), pending = deferred();
  const result = withStartupDeadline(() => pending.promise, { signal: controller.signal });
  await tick();
  controller.abort(); await assert.rejects(result, { name: 'AbortError' });
  pending.reject(Error('late old account rejection')); await tick();
  const alreadyGone = new AbortController(); alreadyGone.abort(); let invoked = false;
  await assert.rejects(withStartupDeadline(async () => { invoked = true; }, { signal: alreadyGone.signal }), { name: 'AbortError' });
  assert.equal(invoked, false);
  await assert.rejects(withStartupDeadline(() => Promise.reject(null)), error => error === null);
});

test('workspace selection and required profile fields stay within the current account', () => {
  const completeTech = { phone: '123', business_name: 'Taller' }, completeClient = { phone: '456', city: 'Salta' };
  assert.deepEqual(resolveAccountShell(account('client', 'cliente'), null, completeClient), { owner: 'client', audience: 'cliente', needsProfileCompletion: false });
  assert.equal(resolveAccountShell(account('tech'), null, completeTech).needsProfileCompletion, false);
  assert.equal(resolveAccountShell(account('tech'), null, { phone: '123' }).needsProfileCompletion, true);
  assert.equal(resolveAccountShell(account('client', 'cliente'), null, { phone: '123', business_name: 'Old business' }).needsProfileCompletion, true);
  assert.equal(resolveAccountShell(account('dual'), 'cliente', completeClient).audience, 'cliente');
  assert.equal(resolveAccountShell(account('client', ' Cliente '), null, completeClient).audience, 'cliente');
});

test('a previous account or cancelled login cannot choose another account workspace', async () => {
  const data = globalThis.__audienceStorage = new Map([['urbanfix.mobile.audience', 'tecnico']]);
  const mod = await loadMobile('src/utils/audience.ts', { '@react-native-async-storage/async-storage': `export default {getItem:async k=>globalThis.__audienceStorage.get(k)||null,setItem:async(k,v)=>{globalThis.__audienceStorage.set(k,v)}};` });
  assert.equal(await mod.getStoredAudience('new-client'), null, 'Legacy global UI preference is not an owner preference.');
  await mod.beginAudienceSignIn('cliente'); mod.claimAudienceSignIn('client-A');
  assert.equal(await mod.getStoredAudience('client-A'), 'cliente');
  await mod.beginAudienceSignIn('tecnico'); mod.cancelAudienceSignIn(); mod.claimAudienceSignIn('other-owner');
  assert.equal(await mod.getStoredAudience('other-owner'), null);
  await mod.setStoredAudience('tecnico', 'tech-B');
  assert.equal(await mod.getStoredAudience('client-A'), 'cliente'); assert.equal(await mod.getStoredAudience('tech-B'), 'tecnico');
  assert.ok([...data.keys()].some(key => key.endsWith(':client-A')));
  delete globalThis.__audienceStorage;
});

test('deep links wait for login and profile completion and are consumed once', () => {
  const queue = createMobileLinkQueue();
  assert.equal(queue.receive('urbanfix://proyectos/nuevo?pais=UY', null), true);
  assert.equal(queue.take({ owner: null, audience: 'tecnico', ready: false }), null);
  assert.equal(queue.take({ owner: 'owner-A', audience: 'tecnico', ready: false }), null);
  assert.deepEqual(queue.take({ owner: 'owner-A', audience: 'tecnico', ready: true }).destination, { name: 'NewProject', params: { countryCode: 'UY' } });
  assert.equal(queue.take({ owner: 'owner-A', audience: 'tecnico', ready: true }), null);
});

test('pending links are discarded on account change and never switch audiences', () => {
  const queue = createMobileLinkQueue();
  queue.receive('urbanfix://agenda', null); queue.take({ owner: 'A', audience: 'tecnico', ready: false });
  assert.equal(queue.take({ owner: 'B', audience: 'tecnico', ready: true }), null);
  queue.receive('urbanfix://panel', 'B'); const response = queue.take({ owner: 'B', audience: 'cliente', ready: true });
  assert.ok(response.message); assert.equal(response.destination, undefined);
  queue.receive('urbanfix://perfil', 'B'); assert.deepEqual(queue.take({ owner: 'B', audience: 'cliente', ready: true }).destination, { name: 'ClientMain', params: { screen: 'MiPerfil' } });
});

test('untrusted links cannot inject routes, account identities, auth or payment data', () => {
  for (const link of ['https://urbanfix.com.ar/proyectos', 'urbanfix://admin', 'urbanfix://auth/callback?code=private', 'urbanfix://panel#access_token=private', 'urbanfix://panel?owner=other', 'urbanfix://user@agenda', 'urbanfix://proyectos/../perfil', 'urbanfix://proyectos/%2fprivate', 'urbanfix://catalogo?tipo=unknown', 'urbanfix://proyectos/nuevo?pais=BR', 'urbanfix://pago?payment_id=1', 'urbanfix-preview://agenda']) assert.equal(parseMobileLink(link), null, link);
  assert.deepEqual(parseMobileLink('urbanfix-preview://catalogo?tipo=material', 'urbanfix-preview').destination, { name: 'Catalogo', params: { initialTab: 'material' } });
  assert.equal(parseMobileLink('urbanfix://proyectos/11111111-1111-4111-8111-111111111111').destination.name, 'ProjectLink');
});

test('real navigation routers preserve tab history and a return path from internal screens', () => {
  for (const routeNames of [['Proyectos', 'Panel', 'Agenda', 'Operativo', 'Más'], ['Solicitudes', 'Publicar', 'Mapa', 'MiPerfil']]) {
    const router = TabRouter({ initialRouteName: routeNames[0], backBehavior: 'history' }), options = { routeNames, routeParamList: {}, routeGetIdList: {} };
    let state = router.getInitialState(options);
    for (const name of routeNames.slice(1)) state = router.getStateForAction(state, CommonActions.navigate(name), options);
    state = router.getStateForAction(state, CommonActions.goBack(), options);
    assert.equal(state.routes[state.index].name, routeNames.at(-2));
  }
  const router = StackRouter({ initialRouteName: 'Main' }), options = { routeNames: ['Main', 'NewProject', 'ProjectLink'], routeParamList: {}, routeGetIdList: {} };
  let state = router.getInitialState(options);
  state = router.getStateForAction(state, CommonActions.navigate('NewProject'), options);
  state = router.getStateForAction(state, CommonActions.navigate('ProjectLink', { projectId: 'synthetic' }), options);
  state = router.getStateForAction(state, CommonActions.goBack(), options);
  assert.equal(state.routes[state.index].name, 'NewProject', 'An incoming internal link must not reset an open form.');
});
