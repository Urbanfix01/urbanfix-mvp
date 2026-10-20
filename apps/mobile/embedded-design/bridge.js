const requests = new Map();
let init = null, sequence = 0;
export const memory = new Map();
// WKWebView's local document may lack randomUUID, but supports secure entropy.
if (typeof crypto.randomUUID !== 'function') crypto.randomUUID = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(16)); bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};
Object.defineProperty(window, 'localStorage', { value: { get length() { return memory.size; }, key: (i) => [...memory.keys()][i] ?? null,
  getItem: (key) => memory.get(key) ?? null, setItem: (key, value) => { memory.set(key, String(value)); window.dispatchEvent(new Event('workspace-storage')); },
  removeItem: (key) => memory.delete(key), clear: () => memory.clear() }, configurable: true });
export function send(message) {
  const data = JSON.stringify({ version: 1, nonce: init?.nonce, ...message });
  if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(data);
  else window.parent.postMessage(data, '*'); // Sandboxed srcdoc has an opaque origin; host verifies event.source.
}
export function request(method, params = {}) {
  const id = String(++sequence);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { requests.delete(id); reject(new Error('La consulta no respondió. Reintentá con conexión.')); }, 25000);
    requests.set(id, { resolve, reject, timer }); send({ id, method, params });
  });
}
export const getInit = () => init;
export function start(ready) {
  window.__urbanfixReceive = (message) => {
    if (message?.version !== 1) return;
    if (message.type === 'init' && !init) { init = message; ready(message); return; }
    if (!init || message.nonce !== init.nonce) return;
    const pending = requests.get(message.id);
    if (!pending) return;
    clearTimeout(pending.timer); requests.delete(message.id);
    message.error ? pending.reject(new Error(message.error)) : pending.resolve(message.result);
  };
  window.addEventListener('message', (event) => {
    if (event.source !== window.parent) return;
    try { window.__urbanfixReceive(typeof event.data === 'string' ? JSON.parse(event.data) : event.data); } catch { /* Unrelated host message. */ }
  });
  send({ type: 'ready' });
}
