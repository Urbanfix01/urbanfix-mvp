import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useProjectOwner } from '../projects/ProjectSession';
import { MasterItem } from '../types/database';
import { resolveCatalogMaterial } from './catalogRenderBindings';
import catalog from './materialRenderCatalog.json';
import { materialPreviews } from './materialPreviews';
import { workPreviews } from './workPreviews';
import { resolveCatalogWork, WorkPreviewBinding } from './catalogWorkBindings';
import type { ImageSourcePropType } from 'react-native';
export type CatalogRenderPreview = { material: { id: string; name: string } | null; fallback?: ImageSourcePropType;
  source?: ImageSourcePropType; published?: { title: string; uri: string }; revision?: number; work?: WorkPreviewBinding | null };

export async function loadCatalogRenders(owner: string, ids: string[]) {
  if ((await supabase.auth.getSession()).data.session?.user.id !== owner) throw new Error('La sesión cambió.');
  const chosen = new Map<string, { title: string; path: string }>();
  for (let start = 0; start < ids.length; start += 50) {
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await supabase.from('render_library').select('id,title,material_id,thumbnail_path,object_path,is_primary')
        .eq('status', 'published').in('material_id', ids.slice(start, start + 50))
        .order('is_primary', { ascending: false }).order('created_at', { ascending: false }).order('id').range(offset, offset + 499);
      if (error) throw new Error('No se pudieron actualizar los renders publicados.');
      for (const row of data || []) if (row.material_id && !chosen.has(row.material_id)) chosen.set(row.material_id, { title: row.title, path: row.thumbnail_path || row.object_path });
      if (!data || data.length < 500) break;
      if (offset >= 4500) throw new Error('La biblioteca supera el límite de esta consulta.');
    }
  }
  const paths = [...new Set([...chosen.values()].map((row) => row.path))], urls = new Map<string, string>();
  for (let offset = 0; offset < paths.length; offset += 100) {
    const { data, error } = await supabase.storage.from('render-library').createSignedUrls(paths.slice(offset, offset + 100), 300);
    if (error) throw new Error('No se pudieron autorizar las imágenes.');
    for (const row of data || []) if (row.path && row.signedUrl && !row.error) {
      const url = new URL(row.signedUrl);
      if (url.protocol === 'https:' && url.hostname === 'jfqutuptbrgtwbofpawp.supabase.co') urls.set(row.path, row.signedUrl);
    }
  }
  if ((await supabase.auth.getSession()).data.session?.user.id !== owner) throw new Error('La sesión cambió.');
  return Object.fromEntries([...chosen.entries()].flatMap(([id, row]) => urls.has(row.path) ? [[id, { title: row.title, uri: urls.get(row.path)! }]] : []));
}
export function useCatalogRenders(items: MasterItem[]) {
  const owner = useProjectOwner();
  const bindings = useMemo(() => items.map((item) => ({ item, material: resolveCatalogMaterial(item, catalog), work: resolveCatalogWork(item) })), [items]);
  const ids = [...new Set(bindings.filter(({ item }) => item.type !== 'labor').flatMap(({ item, material }) => [item.id, ...(material ? [material.id] : [])]))].sort();
  const query = useQuery({ queryKey: ['catalog-material-renders', owner, ids], queryFn: () => loadCatalogRenders(owner, ids),
    enabled: ids.length > 0, staleTime: 180000, gcTime: 300000, retry: 1, refetchInterval: 240000 });
  const previews = new Map<string, CatalogRenderPreview>(bindings.map(({ item, material, work }) => {
    const published = item.type === 'labor' ? undefined : query.data?.[item.id] || (material ? query.data?.[material.id] : undefined);
    const fallback = material ? materialPreviews[material.id] : work?.model ? workPreviews[work.model] : work?.equipment ? materialPreviews[work.equipment] : undefined;
    return [item.id, { material, work, fallback, published, revision: query.dataUpdatedAt,
      source: published ? { uri: published.uri } : fallback }];
  }));
  return { previews, retry: query.refetch, loading: query.isFetching, error: query.isError ? 'No se pudieron actualizar los renders publicados. Se conservan las imágenes ilustrativas disponibles.' : '' };
}
