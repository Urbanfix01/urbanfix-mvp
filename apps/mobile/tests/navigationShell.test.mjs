import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { create, act } from 'react-test-renderer';
import { loadMobile } from './helpers/loadMobile.mjs';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const previousError = console.error;
console.error = (...args) => { if (!String(args[0]).includes('react-test-renderer is deprecated')) previousError(...args); };
after(() => { console.error = previousError; delete globalThis.__shellQA; });
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
const ownerA = '11111111-1111-4111-8111-111111111111', ownerB = '22222222-2222-4222-8222-222222222222';
const session = (owner, audience = 'tecnico') => ({ user: { id: owner, email: 'synthetic@example.invalid', user_metadata: { app_audience: audience } } });
const complete = { email: 'synthetic@example.invalid', phone: '123', city: 'Salta', business_name: 'Taller QA' };

function fixture(current = session(ownerA)) {
  const f = globalThis.__shellQA = { current, cache: new Map([['private-project', ownerA]]), clears: 0, requests: [], links: [], storage: new Map(),
    initialURL: null, fonts: [true, null], splash: 0, listeners: new Set(), urlListeners: new Set(), profile: () => Promise.resolve({ data: complete, error: null }) };
  f.getSession = async () => ({ data: { session: f.current }, error: null });
  f.subscribe = listener => { f.listeners.add(listener); return { data: { subscription: { unsubscribe: () => f.listeners.delete(listener) } } }; };
  f.emit = (event, next) => { f.current = next; for (const listener of f.listeners) listener(event, next); };
  f.url = url => { for (const listener of f.urlListeners) listener({ url }); };
  f.navigation = { current: null, isReady: () => f.ready, navigate: (name, params) => f.links.push({ name, params }) };
  f.queryClient = { clear: () => { f.clears++; f.cache.clear(); } };
  f.from = table => {
    assert.equal(table, 'profiles'); let columns, owner, signal;
    const query = { select: value => { columns = value; return query; }, eq: (_, value) => { owner = value; return query; }, abortSignal: value => { signal = value; return query; },
      update: () => query, maybeSingle: () => { f.requests.push({ owner, columns, signal }); return f.profile(owner, columns); }, then: resolve => Promise.resolve({ error: null }).then(resolve) };
    return query;
  };
  return f;
}

const native = `import React from 'react';const f=()=>globalThis.__shellQA;export const View=({onLayout,...p})=>{React.useEffect(()=>{onLayout?.({nativeEvent:{layout:{}}})},[]);return React.createElement('View',p)};export const Text='Text',Image='Image',Pressable='Pressable',ScrollView='ScrollView',ActivityIndicator='ActivityIndicator',TouchableOpacity='TouchableOpacity',TextInput='TextInput';export const Platform={OS:'android'},StyleSheet={create:x=>x},useWindowDimensions=()=>({width:390,height:844,fontScale:1});export const Linking={getInitialURL:async()=>f().initialURL,addEventListener:(name,listener)=>{f().urlListeners.add(listener);return {remove:()=>f().urlListeners.delete(listener)}}};export const Easing={cubic:x=>x,inOut:x=>x,out:x=>x};export const Animated={Value:class{interpolate(){return '18%'}},loop:()=>({start(){},stop(){}}),sequence:x=>x,timing:()=>({}),View};`;
const navigation = `import React from 'react';const f=()=>globalThis.__shellQA;export const DefaultTheme={colors:{}};export const useNavigationContainerRef=()=>React.useRef(f().navigation).current;export const useNavigation=()=>({navigate:(...args)=>f().links.push(args)});export const NavigationContainer=React.forwardRef(function Container({children,onReady},ref){React.useEffect(()=>{f().ready=true;onReady();return()=>{f().ready=false}},[]);return React.createElement('Navigation',null,children)});export const factory=()=>({Navigator:({children})=>React.createElement('Navigator',null,children),Screen:({name,component:Component})=>React.createElement('Route',{name},name==='Main'||name==='ClientMain'?React.createElement(Component):null)});`;
const mocks = {
  'react-native': native,
  '@react-navigation/native': navigation,
  '@react-navigation/bottom-tabs': `import{factory}from'@react-navigation/native';export const createBottomTabNavigator=factory;`,
  '@react-navigation/native-stack': `import{factory}from'@react-navigation/native';export const createNativeStackNavigator=factory;`,
  'react-native-safe-area-context': `export const SafeAreaView='SafeAreaView';export const useSafeAreaInsets=()=>({top:44,bottom:34,left:0,right:0});`,
  '@expo/vector-icons': `export const Ionicons='Icon';`,
  'expo-linear-gradient': `export const LinearGradient='Gradient';`,
  'expo-constants': `export default {expoConfig:{scheme:'urbanfix'}};`,
  '@tanstack/react-query': `export const useQueryClient=()=>globalThis.__shellQA.queryClient;`,
  '../lib/supabase': `const f=()=>globalThis.__shellQA;const channel={on(){return channel},subscribe(){return channel}};export const supabase={auth:{getSession:()=>f().getSession(),onAuthStateChange:c=>f().subscribe(c)},from:t=>f().from(t),channel:()=>channel,removeChannel:()=>{}};`,
  '../utils/notifications': `export async function registerForPushNotificationsAsync(){return null}export function showLocalNotification(){}`, 
  '@react-native-async-storage/async-storage': `export default {getItem:async k=>globalThis.__shellQA.storage.get(k)||null,setItem:async(k,v)=>{globalThis.__shellQA.storage.set(k,v)}};`,
  './SwipeableTabScreen': `export default function Swipe({children}){return children}`,
};
const screenStub = ({ path }) => /^\.\.\/(screens|projects|design)\/.+Screen$/.test(path)
  ? { path: 'data:text/javascript,export default function Screen(){return null}', external: true } : null;
const { default: Root } = await loadMobile('src/navigation/RootNavigator.tsx', mocks, screenStub);
const settle = async () => { for (let i = 0; i < 3; i++) await act(async () => { await new Promise(resolve => setImmediate(resolve)); }); };
const render = async Component => { let tree; await act(async () => { tree = create(React.createElement(Component)); }); await settle(); return tree; };
const routes = tree => tree.root.findAllByType('Route').map(node => node.props.name);
const unmount = async tree => { await act(async () => tree.unmount()); };

test('real root registers the five professional tabs and four client tabs separately', async () => {
  for (const audience of ['tecnico', 'cliente']) {
    fixture(session(audience === 'tecnico' ? ownerA : ownerB, audience));
    const tree = await render(Root), names = routes(tree);
    if (audience === 'tecnico') {
      for (const name of ['Main', 'Proyectos', 'Panel', 'Agenda', 'Operativo', 'Más', 'ProjectLink']) assert.ok(names.includes(name), name);
      assert.ok(!names.includes('ClientMain'));
    } else {
      for (const name of ['ClientMain', 'Solicitudes', 'Publicar', 'Mapa', 'MiPerfil']) assert.ok(names.includes(name), name);
      assert.ok(!names.includes('Main')); assert.ok(!names.includes('ProjectLink'));
    }
    await unmount(tree); assert.equal(globalThis.__shellQA.listeners.size, 0); assert.equal(globalThis.__shellQA.urlListeners.size, 0);
  }
});

test('an old account profile response cannot unlock or replace the new account shell', async () => {
  const f = fixture(), pending = deferred();
  f.profile = (owner, columns) => owner === ownerA && columns.startsWith('phone,') ? pending.promise : Promise.resolve({ data: complete, error: null });
  const tree = await render(Root); assert.ok(!routes(tree).includes('Main'));
  await act(async () => f.emit('SIGNED_IN', session(ownerB, 'cliente'))); await settle();
  assert.ok(routes(tree).includes('ClientMain')); assert.equal(f.cache.size, 0); assert.equal(f.clears, 1);
  await act(async () => pending.resolve({ data: complete, error: null })); await settle();
  assert.ok(routes(tree).includes('ClientMain')); assert.ok(!routes(tree).includes('Main')); await unmount(tree);
});

test('failed profile lookup offers retry rather than falsely requiring profile edits', async () => {
  const f = fixture(); f.profile = () => Promise.resolve({ data: null, error: Error('private diagnostic must stay hidden') });
  const tree = await render(Root); assert.ok(!routes(tree).includes('TechProfileRequired'));
  assert.ok(JSON.stringify(tree.toJSON()).includes('No pudimos cargar tu cuenta'));
  assert.ok(!JSON.stringify(tree.toJSON()).includes('private diagnostic'));
  f.profile = () => Promise.resolve({ data: complete, error: null });
  const retry = tree.root.findAllByType('Pressable').find(node => node.findAllByType('Text').some(text => text.props.children === 'Volver a intentar'));
  await act(async () => retry.props.onPress()); await settle(); assert.ok(routes(tree).includes('Main')); await unmount(tree);
});

test('cold and warm links use the real root dispatch only after account initialization', async () => {
  const f = fixture(); f.initialURL = 'urbanfix://catalogo?tipo=material';
  const tree = await render(Root);
  assert.deepEqual(f.links, [{ name: 'Catalogo', params: { initialTab: 'material' } }]);
  await act(async () => f.url('urbanfix://agenda')); await settle();
  assert.deepEqual(f.links.at(-1), { name: 'Main', params: { screen: 'Agenda' } });
  await act(async () => f.emit('SIGNED_OUT', null)); await settle();
  assert.deepEqual(routes(tree), ['Auth']); assert.equal(f.cache.size, 0); await unmount(tree);
});

test('font errors render a working retry action and never reveal a blank screen', async () => {
  const f = fixture(); f.fonts = [false, Error('font diagnostic')]; let retries = 0;
  const { default: FontGate } = await loadMobile('src/navigation/AppFontGate.tsx', { ...mocks,
    'expo-font': `export const useFonts=()=>globalThis.__shellQA.fonts;`, 'expo-splash-screen': `export async function hideAsync(){globalThis.__shellQA.splash++}`,
    '@expo-google-fonts/montserrat': `export const Montserrat_700Bold=1;`, '@expo-google-fonts/raleway': `export const Raleway_400Regular=2,Raleway_600SemiBold=3;`,
  });
  const tree = await render(() => React.createElement(FontGate, { onRetry: () => retries++ }, React.createElement('ReadyScreen')));
  assert.ok(JSON.stringify(tree.toJSON()).includes('No pudimos preparar el inicio')); assert.ok(f.splash > 0);
  await act(async () => tree.root.findByType('Pressable').props.onPress()); assert.equal(retries, 1);
  f.fonts = [true, null]; await act(async () => tree.update(React.createElement(FontGate, { onRetry: () => retries++ }, React.createElement('ReadyScreen'))));
  assert.equal(tree.root.findAllByType('ReadyScreen').length, 1); await unmount(tree);
});

test('a rendering failure can return to a fresh app tree without erasing saved projects', async () => {
  fixture(); let fail = true, retries = 0;
  const { default: Boundary } = await loadMobile('src/navigation/AppBoundary.tsx', mocks);
  const Child = () => { if (fail) throw Error('synthetic-render-error'); return React.createElement('RecoveredScreen'); };
  const currentError = console.error;
  console.error = (...args) => { if (args[0]?.message !== 'synthetic-render-error') currentError(...args); };
  let tree;
  try { tree = await render(() => React.createElement(Boundary, { onRetry: () => { retries++; fail = false; } }, React.createElement(Child))); }
  finally { console.error = currentError; }
  assert.ok(JSON.stringify(tree.toJSON()).includes('No pudimos abrir esta pantalla'));
  await act(async () => tree.root.findByType('Pressable').props.onPress());
  assert.equal(retries, 1); assert.equal(tree.root.findAllByType('RecoveredScreen').length, 1); await unmount(tree);
});

test('More opens each web tool once, keeps the native context and recovers from browser failure', async () => {
  const f = fixture(); f.browser = deferred(); f.urls = [];
  const { default: More } = await loadMobile('src/projects/MoreScreen.tsx', { ...mocks,
    'expo-web-browser': `export function openBrowserAsync(url){const f=globalThis.__shellQA;f.urls.push(url);return f.browser.promise}`,
    '../utils/config': `export const PUBLIC_WEB_URL='https://urbanfix.com.ar';`,
  });
  const tree = await render(More);
  const buttons = () => tree.root.findAllByType('Pressable').filter(node => /· web$/.test(node.props.accessibilityLabel || ''));
  const labels = buttons().map(node => node.props.accessibilityLabel);
  await act(async () => { buttons()[0].props.onPress(); buttons()[1].props.onPress(); });
  assert.equal(f.urls.length, 1, 'Repeated presses do not stack browsers.');
  await act(async () => f.browser.resolve({ type: 'dismiss' }));
  for (const label of labels.slice(1)) {
    f.browser = deferred();
    await act(async () => buttons().find(node => node.props.accessibilityLabel === label).props.onPress());
    await act(async () => f.browser.resolve({ type: 'dismiss' }));
  }
  assert.equal(f.urls.length, labels.length);
  assert.ok(f.urls.every(url => new URL(url).origin === 'https://urbanfix.com.ar' && !/token|authorization/i.test(url)));
  assert.equal(f.current.user.id, ownerA); assert.equal(f.cache.get('private-project'), ownerA);
  f.browser = Promise.reject(Error('Browser unavailable')); f.browser = { promise: f.browser };
  await act(async () => buttons()[0].props.onPress());
  assert.ok(JSON.stringify(tree.toJSON()).includes('No se pudo abrir UrbanFix Web'));
  assert.ok(buttons().every(node => !node.props.disabled)); await unmount(tree);
});
