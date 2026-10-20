import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { getWebApiUrl } from '../utils/config';

type Workflow = 'pricing-workflow-v2' | 'pricing-review' | 'quote-workflow' | 'supabase-technician-data';
const workflows = new Set<Workflow>(['pricing-workflow-v2', 'pricing-review', 'quote-workflow', 'supabase-technician-data']);

export async function workflowRequest(scope: { owner: string }, name: Workflow, body: unknown, signal?: AbortSignal) {
  if (!workflows.has(name)) throw new Error('Consulta no disponible.');
  const { data, error } = await supabase.auth.getSession();
  if (error || data.session?.user.id !== scope.owner || !data.session.access_token) throw new Error('La sesion cambio. Volve a ingresar con tu cuenta.');
  const url = new URL(getWebApiUrl(`/api/functions/${name}`));
  if (url.protocol !== 'https:' || !['www.urbanfix.com.ar', 'www.urbanfixar.com'].includes(url.hostname) || url.port || url.username || url.password) throw new Error('El servidor de sincronizacion no es valido.');
  const destination = Platform.OS === 'web' && __DEV__ && ['127.0.0.1', 'localhost'].includes(window.location.hostname)
    ? new URL(`/api/functions/${name}`, window.location.origin).toString() : url.toString();
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 20000);
  const cancel = () => controller.abort();
  signal?.addEventListener('abort', cancel, { once: true });
  if (signal?.aborted) controller.abort();
  try {
    const response = await fetch(destination, { method: 'POST', redirect: 'error', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session.access_token}` }, body: JSON.stringify(body), signal: controller.signal });
    const result = await response.json().catch(() => null);
    if (!response.ok || !result || result.ok !== true) throw new Error(result?.error || 'El servidor no devolvio una respuesta compatible. Reintenta con conexion.');
    if ((await supabase.auth.getSession()).data.session?.user.id !== scope.owner) throw new Error('La sesion cambio durante la consulta.');
    return result;
  } catch (error) {
    if (controller.signal.aborted && !signal?.aborted) throw new Error('La consulta demoro demasiado. Reintenta actualizar.');
    throw error;
  } finally { clearTimeout(timer); signal?.removeEventListener('abort', cancel); }
}
