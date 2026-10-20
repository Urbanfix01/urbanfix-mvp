export type Country = 'AR' | 'UY';
export type ProjectScope = { owner: string; countryCode: Country };
export const PROJECT_TOOLS = { plano: 'Plano libre', casa: 'Casa modelo', ambientes: 'Ambientes', estructuras: 'Estructuras', redes: 'Red de agua', colector: 'Colector' } as const;
export type ProjectTool = keyof typeof PROJECT_TOOLS;
export type ProjectMeta = ProjectScope & { id: string; projectKey: string; tool: ProjectTool; name: string; capturedAt: string; label: string; digest: string; synced: boolean };
export type ProjectRecord = ProjectMeta & { document: { version: 1; draft: Record<string, any>; auxiliary: Record<string, string>; protectedRaw?: string } };
export type SitePoint = { lat: number; lng: number; source: 'gps' | 'manual' | 'georef' | 'map'; accuracy: number | null };
export type ClientReference = { contactId: string; owner: string };
export type NewProjectForm = { name: string; clientName: string; location: string; width: string; depth: string; height: string; siteLocation: SitePoint | null; clientReference: ClientReference | null };
export const EMPTY_PROJECT_FORM: NewProjectForm = { name: '', clientName: '', location: '', width: '', depth: '', height: '2.6', siteLocation: null, clientReference: null };
export const PROJECT_STEPS = [
  { title: 'Proyecto', fields: ['name', 'clientName'] }, { title: 'Ubicación', fields: ['location'] },
  { title: 'Terreno', fields: ['width', 'depth', 'height'] }, { title: 'Revisión', fields: [] },
] as const;
export type FormError = { field: keyof NewProjectForm; message: string };
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export function validateScope(scope: ProjectScope) {
  if (!uuid.test(scope.owner) || !['AR', 'UY'].includes(scope.countryCode)) throw new Error('La cuenta o el país del proyecto no están disponibles.');
}
export function normalizePoint(point: SitePoint | null): SitePoint | null {
  if (point == null) return null;
  if (typeof point.lat !== 'number' || typeof point.lng !== 'number' || !Number.isFinite(point.lat) || !Number.isFinite(point.lng)
    || Math.abs(point.lat) > 90 || Math.abs(point.lng) > 180 || !['gps', 'manual', 'georef', 'map'].includes(point.source)
    || point.accuracy !== null && (typeof point.accuracy !== 'number' || !Number.isFinite(point.accuracy) || point.accuracy < 0)) throw new Error('Coordenadas inválidas.');
  return { lat: Math.round(point.lat * 1e6) / 1e6, lng: Math.round(point.lng * 1e6) / 1e6, source: point.source, accuracy: point.accuracy };
}
export function validateProjectForm(form: NewProjectForm, scope: ProjectScope): FormError[] {
  validateScope(scope);
  const errors: FormError[] = [];
  for (const [field, label, max, required] of [['name', 'Nombre del proyecto', 100, true], ['clientName', 'Cliente', 100, false], ['location', 'Ubicación', 200, false]] as const) {
    if (typeof form[field] !== 'string' || form[field].length > max || required && !form[field].trim()) errors.push({ field, message: `${label}: ${required ? 'completá el campo, con' : 'ingresá'} hasta ${max} caracteres.` });
  }
  if (form.clientReference && (!uuid.test(form.clientReference.contactId) || form.clientReference.owner !== scope.owner)) errors.push({ field: 'clientName', message: 'El cliente seleccionado no corresponde a esta cuenta.' });
  try { normalizePoint(form.siteLocation); } catch { errors.push({ field: 'location', message: 'Revisá las coordenadas de la obra.' }); }
  for (const [field, label, min, max] of [['width', 'Frente del terreno', 1, 100], ['depth', 'Fondo del terreno', 1, 100], ['height', 'Altura de dibujo', .5, 6]] as const) {
    const value = Number(form[field]);
    if (!form[field]?.trim() || !Number.isFinite(value) || value < min || value > max) errors.push({ field, message: `${label}: entre ${min} y ${max} m.` });
  }
  return errors;
}

// Version 1 empty-plan contract shared with urbanfix_web/src/lib/houseDrawing.js.
// No construction coefficients, geometry inference or prices are duplicated here.
export function createProjectDraft(form: NewProjectForm, scope: ProjectScope, id: string, createdAt: string) {
  const errors = validateProjectForm(form, scope);
  if (errors.length) throw new Error(errors[0].message);
  if (!uuid.test(id) || !Number.isFinite(Date.parse(createdAt))) throw new Error('Identidad de proyecto inválida.');
  const siteLocation = normalizePoint(form.siteLocation);
  return { version: 1, kind: 'house-drawing', unit: 'm', id, name: form.name.trim(), walls: [], roomLabels: [], elements: [], furniture: [], furnitureLayouts: [], prices: {},
    settings: { height: Number(form.height), thickness: .18, construction: null, snap: true, step: .1, lotWidth: Number(form.width), lotDepth: Number(form.depth), furnitureClearance: .6 },
    projectInfo: { version: 1, kind: 'design-project', countryCode: scope.countryCode, clientName: form.clientName.trim(), location: form.location.trim(), createdAt,
      ...(form.clientReference ? { clientReference: { ...form.clientReference } } : {}), ...(siteLocation ? { siteLocation } : {}) } };
}
export function metadata(record: ProjectRecord): ProjectMeta { const { document: _document, ...row } = record; return row; }
export function validateMeta(row: ProjectMeta, scope: ProjectScope): ProjectMeta {
  validateScope(scope);
  if (!row || row.owner !== scope.owner || row.countryCode !== scope.countryCode || !uuid.test(row.id) || !Object.hasOwn(PROJECT_TOOLS, row.tool)
    || typeof row.projectKey !== 'string' || !row.projectKey || row.projectKey.length > 200 || typeof row.name !== 'string' || row.name.length > 160
    || typeof row.label !== 'string' || !Number.isFinite(Date.parse(row.capturedAt)) || !/^[a-f0-9]{64}$/.test(row.digest) || typeof row.synced !== 'boolean') throw new Error('La versión no corresponde a esta cuenta y país, o no es compatible.');
  return row;
}
export function validateRecord(record: ProjectRecord, scope: ProjectScope): ProjectRecord {
  validateMeta(record, scope);
  const doc = record.document;
  if (doc?.version !== 1 || !doc.draft || typeof doc.draft !== 'object' || Array.isArray(doc.draft) || JSON.stringify(doc).length > 4_000_000) throw new Error('Documento de proyecto incompatible. Se conserva sin modificar.');
  return record;
}
export function mergeProjects(local: ProjectMeta[], remote: ProjectMeta[]): ProjectMeta[] {
  const rows = new Map<string, ProjectMeta>();
  for (const row of [...remote, ...local]) {
    const key = JSON.stringify([row.owner, row.countryCode, row.tool, row.projectKey]), previous = rows.get(key);
    if (!previous || row.capturedAt > previous.capturedAt || row.id === previous.id) rows.set(key, { ...row, synced: row.synced || row.id === previous?.id && previous.synced });
  }
  return [...rows.values()].sort((a, b) => b.capturedAt.localeCompare(a.capturedAt));
}
export function projectWebUrl(row: ProjectMeta, base = 'https://www.urbanfix.com.ar') {
  validateMeta(row, row);
  const url = new URL('/diseno-y-obra/proyectos', base);
  if (url.protocol !== 'https:' || !['www.urbanfix.com.ar', 'www.urbanfixar.com'].includes(url.hostname) || url.port || url.username || url.password) throw new Error('El destino web del proyecto no es válido.');
  url.search = new URLSearchParams({ pais: row.countryCode, proyecto: row.projectKey, editor: row.tool }).toString();
  return url.toString();
}
export interface ProjectStorage { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<void>; getAllKeys(): Promise<readonly string[]>; }
export interface ProjectCloud {
  currentOwner(): Promise<string | null>;
  list(scope: ProjectScope): Promise<ProjectMeta[]>;
  versions(scope: ProjectScope, row: ProjectMeta, page: number): Promise<ProjectMeta[]>;
  get(scope: ProjectScope, id: string): Promise<ProjectRecord>;
  insert(scope: ProjectScope, record: ProjectRecord): Promise<void>;
}
export interface ProjectPorts { storage: ProjectStorage; cloud: ProjectCloud; randomUUID(): string; digest(value: string): Promise<string>; now(): string; }

export function createProjectRepository(ports: ProjectPorts) {
  const syncing = new Map<string, Promise<void>>();
  const prefix = (scope: ProjectScope) => { validateScope(scope); return `urbanfix:mobile-project-history:v1:${scope.owner}:${scope.countryCode}:`; };
  const documentKey = (scope: ProjectScope, id: string) => `${prefix(scope)}document:${id}`;
  const metaKey = (scope: ProjectScope, id: string) => `${prefix(scope)}meta:${id}`;
  const localRecord = async (scope: ProjectScope, id: string) => {
    if (!uuid.test(id)) throw new Error('Identificador de versión inválido.');
    const raw = await ports.storage.getItem(documentKey(scope, id)); if (raw === null) return null;
    let row: ProjectRecord, deviceDigest: string | undefined;
    try { const { deviceDigest: checksum, ...saved } = JSON.parse(raw); row = validateRecord(saved, scope); deviceDigest = checksum; } catch { throw new Error('Copia local ilegible. Se conserva sin modificar; revisá el respaldo de la cuenta.'); }
    if (deviceDigest !== undefined && !/^[a-f0-9]{64}$/.test(deviceDigest)) throw new Error('Verificación local inválida.');
    if (row.id !== id || await ports.digest(JSON.stringify(row.document)) !== (deviceDigest || row.digest)) throw new Error('La copia local cambió o no se pudo verificar. Se conserva sin modificar.');
    const index = await ports.storage.getItem(metaKey(scope, id));
    if (index) {
      const meta = validateMeta(JSON.parse(index), scope);
      if (meta.id !== row.id || meta.digest !== row.digest || meta.projectKey !== row.projectKey || meta.tool !== row.tool) throw new Error('El índice no coincide con la copia local. Se conserva sin modificar.');
      row = { ...row, synced: meta.synced };
    }
    return row;
  };
  const local = async (scope: ProjectScope): Promise<ProjectMeta[]> => {
    const root = prefix(scope), keys = await ports.storage.getAllKeys(), rows: ProjectMeta[] = [];
    const metaKeys = keys.filter((key) => key.startsWith(`${root}meta:`));
    for (const key of metaKeys) {
      const raw = await ports.storage.getItem(key); if (raw === null) continue;
      const row = validateMeta(JSON.parse(raw), scope);
      if (key !== metaKey(scope, row.id)) throw new Error('Índice de historial incompatible. Se conserva sin modificar.');
      rows.push(row);
    }
    // Recover a snapshot whose metadata write was interrupted, without deleting it.
    for (const key of keys.filter((key) => key.startsWith(`${root}document:`))) {
      const id = key.slice(`${root}document:`.length);
      if (metaKeys.includes(metaKey(scope, id))) continue;
      const record = await localRecord(scope, id);
      if (record) { const row = metadata(record); await ports.storage.setItem(metaKey(scope, id), JSON.stringify(row)); rows.push(row); }
    }
    return rows.sort((a, b) => b.capturedAt.localeCompare(a.capturedAt));
  };
  const requireOwner = async (scope: ProjectScope) => {
    validateScope(scope);
    if (await ports.cloud.currentOwner() !== scope.owner) throw new Error('La sesión cambió. La copia local sigue disponible para su cuenta.');
  };
  return {
    local,
    async revise(scope: ProjectScope, parent: ProjectRecord, document: ProjectRecord['document']) {
      await requireOwner(scope); validateRecord(parent, scope);
      if (parent.tool !== 'plano' || document?.draft?.kind !== 'house-drawing' || document.draft.id !== parent.projectKey
        || document.draft.projectInfo?.countryCode && document.draft.projectInfo.countryCode !== scope.countryCode) throw new Error('El documento no corresponde al plano abierto.');
      const auxiliary = document.auxiliary || {};
      const suffix = `:${parent.projectKey}`;
      if (Object.entries(auxiliary).some(([key, value]) => !(key === ':material-selections' || key === ':labor-selections'
        || key === `${suffix}:material-selections` || key === `${suffix}:labor-selections`
        || key.startsWith(`:labor-references:${scope.owner}:`) || key.startsWith(`${suffix}:labor-references:${scope.owner}:`))
        || typeof value !== 'string' || value.length > 500_000)) throw new Error('Selecciones del proyecto no compatibles.');
      const record: ProjectRecord = { ...metadata(parent), id: ports.randomUUID(), name: String(document.draft.name || parent.name).slice(0, 160),
        document, digest: await ports.digest(JSON.stringify(document)), capturedAt: ports.now(), label: 'Editado desde la app', synced: false };
      validateRecord(record, scope);
      if (await ports.storage.getItem(documentKey(scope, record.id)) !== null) throw new Error('La versión ya existe.');
      await ports.storage.setItem(documentKey(scope, record.id), JSON.stringify(record));
      try { await ports.storage.setItem(metaKey(scope, record.id), JSON.stringify(metadata(record))); } catch { /* Recovered by local(). */ }
      return record;
    },
    async create(scope: ProjectScope, form: NewProjectForm) {
      await requireOwner(scope);
      const draft = createProjectDraft(form, scope, ports.randomUUID(), ports.now());
      const document: ProjectRecord['document'] = { version: 1, draft, auxiliary: {} };
      const record: ProjectRecord = { ...scope, id: ports.randomUUID(), tool: 'plano', projectKey: draft.id, name: draft.name,
        capturedAt: draft.projectInfo.createdAt, label: 'Creado desde la app móvil', digest: await ports.digest(JSON.stringify(document)), synced: false, document };
      validateRecord(record, scope);
      if (await ports.storage.getItem(documentKey(scope, record.id)) !== null) throw new Error('La versión ya existe. No se sobrescribió.');
      await ports.storage.setItem(documentKey(scope, record.id), JSON.stringify(record));
      // The durable snapshot is authoritative; local() repairs an interrupted index write.
      try { await ports.storage.setItem(metaKey(scope, record.id), JSON.stringify(metadata(record))); } catch { /* Recovered on the next history read. */ }
      return record;
    },
    sync(scope: ProjectScope): Promise<void> {
      const key = prefix(scope), pending = syncing.get(key); if (pending) return pending;
      const task = (async () => {
        await requireOwner(scope);
        for (const row of (await local(scope)).filter((row) => !row.synced).sort((a, b) => a.capturedAt.localeCompare(b.capturedAt))) {
          const record = await localRecord(scope, row.id); if (!record) throw new Error('Falta una copia local; no se marcó como respaldada.');
          await requireOwner(scope); await ports.cloud.insert(scope, record); await requireOwner(scope);
          await ports.storage.setItem(metaKey(scope, row.id), JSON.stringify({ ...metadata(record), synced: true }));
        }
      })().finally(() => syncing.delete(key));
      syncing.set(key, task); return task;
    },
    async remote(scope: ProjectScope) { await requireOwner(scope); const rows = await ports.cloud.list(scope); await requireOwner(scope); return rows.map((row) => validateMeta(row, scope)); },
    async get(scope: ProjectScope, id: string) {
      const cached = await localRecord(scope, id); if (cached) return cached;
      await requireOwner(scope);
      const record = validateRecord(await ports.cloud.get(scope, id), scope);
      await requireOwner(scope);
      if (record.id !== id) throw new Error('La versión recuperada no coincide con la solicitada.');
      // JSONB can reorder keys, so the web's original digest is a version identifier,
      // not a checksum of the retrieved serialization. Establish a separate local checksum.
      if (await ports.storage.getItem(documentKey(scope, id)) === null) {
        try {
          await ports.storage.setItem(documentKey(scope, id), JSON.stringify({ ...record, deviceDigest: await ports.digest(JSON.stringify(record.document)) }));
          await ports.storage.setItem(metaKey(scope, id), JSON.stringify(metadata(record)));
        } catch { /* Cloud copy remains intact if the device is full. */ }
      }
      return record;
    },
    async versions(scope: ProjectScope, row: ProjectMeta, page = 0) {
      validateMeta(row, scope);
      const cached = (await local(scope)).filter((item) => item.tool === row.tool && item.projectKey === row.projectKey);
      await requireOwner(scope);
      const remote = await ports.cloud.versions(scope, row, page);
      await requireOwner(scope);
      remote.forEach((item) => { validateMeta(item, scope); if (item.tool !== row.tool || item.projectKey !== row.projectKey) throw new Error('Historial de otro proyecto.'); });
      return { local: cached, remote, hasMore: remote.length === 50 };
    },
  };
}
