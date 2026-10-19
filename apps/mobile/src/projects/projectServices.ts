import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { supabase } from '../lib/supabase';
import { createProjectRepository, ProjectCloud, ProjectMeta, ProjectRecord, ProjectScope } from './projectWorkspace';

const columns = 'id,owner_user_id,country_code,tool,project_key,name,captured_at,label,digest';
type DbRow = { id: string; owner_user_id: string; country_code: 'AR' | 'UY'; tool: ProjectMeta['tool']; project_key: string; name: string; captured_at: string; label: string; digest: string; document: ProjectRecord['document'] };
type Query = (signal: AbortSignal) => PromiseLike<{ data: unknown; error: { code?: string } | null }>;
async function timed(query: Query) {
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 12000);
  try { return await query(controller.signal); } finally { clearTimeout(timer); }
}
const unpack = (row: DbRow): ProjectMeta => ({ id: row.id, owner: row.owner_user_id, countryCode: row.country_code, tool: row.tool,
  projectKey: row.project_key, name: row.name, capturedAt: row.captured_at, label: row.label, digest: row.digest, synced: true });
const currentOwner = async () => (await supabase.auth.getSession()).data.session?.user.id || null;
const cloud: ProjectCloud = {
  currentOwner,
  async list(scope) {
    const rows: ProjectMeta[] = [];
    for (let start = 0; ; start += 100) {
      const { data, error } = await timed((signal) => supabase.from('design_project_latest').select(columns).eq('owner_user_id', scope.owner)
        .eq('country_code', scope.countryCode).order('captured_at', { ascending: false }).order('id').range(start, start + 99).abortSignal(signal));
      if (error || !Array.isArray(data)) throw new Error('No se pudo consultar el respaldo de la cuenta. Las copias locales siguen disponibles.');
      rows.push(...(data as DbRow[]).map(unpack)); if (data.length < 100) return rows;
    }
  },
  async versions(scope, row, page) {
    const { data, error } = await timed((signal) => supabase.from('design_project_history').select(columns).eq('owner_user_id', scope.owner)
      .eq('country_code', scope.countryCode).eq('tool', row.tool).eq('project_key', row.projectKey)
      .order('captured_at', { ascending: false }).order('id').range(page * 50, page * 50 + 49).abortSignal(signal));
    if (error || !Array.isArray(data)) throw new Error('No se pudieron consultar las versiones de la cuenta.');
    return (data as DbRow[]).map(unpack);
  },
  async get(scope, id) {
    const { data, error } = await timed((signal) => supabase.from('design_project_history').select(`${columns},document`).eq('owner_user_id', scope.owner)
      .eq('country_code', scope.countryCode).eq('id', id).abortSignal(signal).single());
    if (error || !data) throw new Error('No se pudo recuperar esta versión de la cuenta.');
    return { ...unpack(data as DbRow), document: (data as DbRow).document };
  },
  async insert(scope, record) {
    const { error } = await timed((signal) => supabase.from('design_project_history').insert({ id: record.id, owner_user_id: scope.owner,
      country_code: scope.countryCode, tool: record.tool, project_key: record.projectKey, name: record.name,
      captured_at: record.capturedAt, label: record.label, digest: record.digest, document: record.document }).abortSignal(signal));
    if (!error) return;
    if (error.code === '23505') {
      const result = await timed((signal) => supabase.from('design_project_history').select('digest').eq('id', record.id).eq('owner_user_id', scope.owner).abortSignal(signal).single());
      if (!result.error && (result.data as { digest?: string })?.digest === record.digest) return;
    }
    throw new Error('Respaldo en cuenta pendiente. La copia local se conserva; podés reintentar.');
  },
};
export const projectRepository = createProjectRepository({ storage: AsyncStorage, cloud, randomUUID: () => Crypto.randomUUID(),
  digest: (value) => Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, value), now: () => new Date().toISOString() });

export type ProjectClient = { id: string; name: string; email: string; phone: string; address: string };
export async function loadProjectClients(scope: ProjectScope): Promise<ProjectClient[]> {
  if (await currentOwner() !== scope.owner) throw new Error('La sesión cambió.');
  const { data, error } = await timed((signal) => supabase.from('technician_clients').select('id,name,email,phone,address').eq('technician_user_id', scope.owner)
    .order('last_used_at', { ascending: false, nullsFirst: false }).order('updated_at', { ascending: false }).limit(500).abortSignal(signal));
  if (error || !Array.isArray(data)) throw new Error('No se pudo consultar tu historial de clientes. Podés continuar con un nombre manual.');
  return data.filter((row) => row && typeof row.id === 'string' && typeof row.name === 'string').map((row) => ({ id: row.id, name: row.name,
    email: typeof row.email === 'string' ? row.email : '', phone: typeof row.phone === 'string' ? row.phone : '', address: typeof row.address === 'string' ? row.address : '' }));
}
