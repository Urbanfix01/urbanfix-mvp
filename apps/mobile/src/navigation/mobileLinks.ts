import type { MobileAudience } from '../utils/audience';

type Destination = { name: string; params?: Record<string, unknown> };
type Intent = { audience?: MobileAudience; destination?: Destination; profile?: true };
const techTabs: Record<string, string> = { proyectos: 'Proyectos', panel: 'Panel', agenda: 'Agenda', operativo: 'Operativo', herramientas: 'Más' };
const clientTabs: Record<string, string> = { solicitudes: 'Solicitudes', publicar: 'Publicar' };
const techScreens: Record<string, string> = { notificaciones: 'Notificaciones', catalogo: 'Catalogo' };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Explicit app routes only. OAuth, payment links, arbitrary nested state and
// external web destinations are deliberately not navigation commands.
export function parseMobileLink(raw: string, scheme = 'urbanfix'): Intent | null {
  if (typeof raw !== 'string' || raw.length > 2048 || !['urbanfix', 'urbanfix-preview'].includes(scheme)) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== `${scheme}:` || url.username || url.password || url.port || url.hash || /\\|%2f|%5c|%2e|\.\./i.test(raw)) return null;
    const path = `${url.hostname}${url.pathname}`.replace(/^\/+|\/+$/g, '');
    const parts = path.split('/');
    const keys = [...url.searchParams.keys()];
    const country = url.searchParams.get('pais') || 'AR';
    if (path === 'proyectos/nuevo' || parts[0] === 'proyectos' && parts.length === 2 && uuid.test(parts[1])) {
      if (keys.some(key => key !== 'pais') || !['AR', 'UY'].includes(country)) return null;
      return { audience: 'tecnico', destination: path === 'proyectos/nuevo'
        ? { name: 'NewProject', params: { countryCode: country } }
        : { name: 'ProjectLink', params: { projectId: parts[1], countryCode: country } } };
    }
    if (path === 'catalogo') {
      const tab = url.searchParams.get('tipo') || 'all';
      if (keys.some(key => key !== 'tipo') || !['all', 'labor', 'material'].includes(tab)) return null;
      return { audience: 'tecnico', destination: { name: techScreens[path], params: { initialTab: tab } } };
    }
    if (keys.length) return null;
    if (Object.hasOwn(techTabs, path)) return { audience: 'tecnico', destination: { name: 'Main', params: { screen: techTabs[path] } } };
    if (Object.hasOwn(clientTabs, path)) return { audience: 'cliente', destination: { name: 'ClientMain', params: { screen: clientTabs[path] } } };
    if (path === 'mapa') return { destination: { name: 'Mapa' } };
    if (path === 'perfil') return { profile: true };
    if (Object.hasOwn(techScreens, path)) return { audience: 'tecnico', destination: { name: techScreens[path] } };
    return null;
  } catch { return null; }
}

export function createMobileLinkQueue(scheme = 'urbanfix') {
  let pending: { intent: Intent; owner: string | null } | null = null;
  return {
    receive(url: string, owner: string | null) {
      const intent = parseMobileLink(url, scheme);
      if (!intent) return false;
      pending = { intent, owner };
      return true;
    },
    take({ owner, audience, ready }: { owner: string | null; audience: MobileAudience; ready: boolean }): { destination?: Destination; message?: string } | null {
      if (!pending) return null;
      if (!pending.owner && owner) pending.owner = owner;
      if (pending.owner && pending.owner !== owner) { pending = null; return null; }
      if (!ready || !owner) return null;
      const { intent } = pending; pending = null;
      if (intent.audience && intent.audience !== audience) return { message: 'Este enlace corresponde al otro espacio de UrbanFix. Abrilo con el perfil correspondiente.' };
      if (intent.profile) return { destination: audience === 'cliente' ? { name: 'ClientMain', params: { screen: 'MiPerfil' } } : { name: 'Perfil' } };
      if (intent.destination?.name === 'Mapa' && audience === 'cliente') return { destination: { name: 'ClientMain', params: { screen: 'Mapa' } } };
      return { destination: intent.destination };
    },
  };
}
