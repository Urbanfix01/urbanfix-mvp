import { supabase } from '../lib/supabase';
import { ProjectScope } from '../projects/projectWorkspace';
import { workflowRequest as designRequest } from '../api/workflows';
export { designRequest };

export async function loadDesignPrices(scope: ProjectScope, type: unknown) {
  if (!['material', 'labor'].includes(String(type))) throw new Error('Catálogo no disponible.');
  const items: unknown[] = [];
  for (let page = 1; page <= 100; page++) {
    const result = await designRequest(scope, 'pricing-workflow-v2', { action: 'list_active', data: { type, country_code: scope.countryCode, user_id: scope.owner, page, page_size: 100 } });
    if (!Array.isArray(result.items)) throw new Error('Respuesta de precios no compatible.');
    items.push(...result.items);
    const pages = result.pagination?.pages ?? 1;
    if (!Number.isSafeInteger(pages) || pages < 1 || pages > 100) throw new Error('Paginación de precios no compatible.');
    if (page >= pages) return items;
  }
  throw new Error('El catálogo supera el límite de consulta.');
}
export async function loadMaterialRenders(scope: ProjectScope, materialId: unknown) {
  if (typeof materialId !== 'string' || !/^[\w-]{1,160}$/.test(materialId)) throw new Error('Material no válido.');
  if ((await supabase.auth.getSession()).data.session?.user.id !== scope.owner) throw new Error('La sesión cambió.');
  const { data, error } = await supabase.from('render_library').select('id,title,object_path,thumbnail_path,material_id,is_primary')
    .eq('status', 'published').eq('material_id', materialId).order('is_primary', { ascending: false }).order('id').limit(20);
  if (error) throw new Error('No se pudieron consultar los renders publicados.');
  const rows = [];
  for (const row of data || []) {
    const signed = await supabase.storage.from('render-library').createSignedUrl(row.object_path, 300);
    if (signed.error || !signed.data?.signedUrl) throw new Error('No se pudo autorizar la imagen. Reintentá actualizar los renders.');
    const url = new URL(signed.data.signedUrl);
    if (url.protocol !== 'https:' || url.hostname !== 'jfqutuptbrgtwbofpawp.supabase.co') throw new Error('Dirección de imagen no compatible.');
    rows.push({ id: row.id, title: row.title, url: url.toString() });
  }
  if ((await supabase.auth.getSession()).data.session?.user.id !== scope.owner) throw new Error('La sesión cambió.');
  return rows;
}
