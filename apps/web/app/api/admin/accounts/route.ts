import { NextRequest, NextResponse } from 'next/server';
import { adminSupabase as supabase, ensureAdmin, getAuthUser } from '@/app/api/admin/_shared/auth';

type AccountAudience = 'cliente' | 'empresa' | 'tecnico' | 'desconocido';

const AUTH_USERS_PAGE_SIZE = 1000;
const MANAGED_AUDIENCES = new Set(['cliente', 'empresa']);
const PROFILE_SELECT = [
  'id',
  'full_name',
  'business_name',
  'email',
  'phone',
  'country',
  'address',
  'city',
  'service_city',
  'service_province',
  'service_district',
  'company_address',
  'coverage_area',
  'working_hours',
  'specialties',
  'access_granted',
  'profile_published',
  'created_at',
  'updated_at',
  'last_seen_at',
  'last_seen_path',
  'avatar_url',
  'company_logo_url',
].join(',');

const toText = (value: unknown) => String(value || '').trim();

const normalizeRole = (value: unknown): AccountAudience | '' => {
  const normalized = toText(value).toLowerCase();
  if (normalized === 'cliente' || normalized === 'client') return 'cliente';
  if (normalized === 'empresa' || normalized === 'company' || normalized === 'business') return 'empresa';
  if (normalized === 'tecnico' || normalized === 'technician') return 'tecnico';
  return '';
};

const chunk = <T,>(items: T[], size: number) => {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

const listAllAuthUsers = async () => {
  if (!supabase) return [];

  const users: any[] = [];
  let page = 1;

  while (page < 100) {
    const result = await supabase.auth.admin.listUsers({ page, perPage: AUTH_USERS_PAGE_SIZE });
    if (result.error) throw result.error;
    const batch = result.data?.users || [];
    users.push(...batch);
    if (batch.length < AUTH_USERS_PAGE_SIZE) break;
    page += 1;
  }

  return users;
};

const loadProfilesMap = async (userIds: string[]) => {
  const map = new Map<string, any>();
  if (!supabase || userIds.length === 0) return map;

  for (const ids of chunk(userIds, 200)) {
    const { data, error } = await supabase.from('profiles').select(PROFILE_SELECT).in('id', ids);
    if (error) throw error;
    (data || []).forEach((row: any) => {
      map.set(row.id, row);
    });
  }

  return map;
};

const getExplicitAudience = (metadata: Record<string, unknown>) => {
  const candidates = [metadata.user_type, metadata.profile, metadata.app_audience, metadata.account_type];
  for (const candidate of candidates) {
    const role = normalizeRole(candidate);
    if (role) return role;
  }
  return '';
};

const hasTechnicalProfileShape = (profile: any) =>
  profile?.access_granted === true ||
  profile?.profile_published === true ||
  Boolean(toText(profile?.specialties)) ||
  Boolean(toText(profile?.service_city)) ||
  Boolean(toText(profile?.company_address));

const resolveAudience = (user: any, profile: any): AccountAudience => {
  const metadata = (user?.user_metadata || {}) as Record<string, unknown>;
  const explicit = getExplicitAudience(metadata);
  if (explicit) return explicit;
  if (hasTechnicalProfileShape(profile)) return 'tecnico';
  if (profile || user?.email) return 'cliente';
  return 'desconocido';
};

export async function GET(request: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ error: 'Servicio no disponible.' }, { status: 503 });
  }

  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const isAdmin = await ensureAdmin(user.id);
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const audience = toText(request.nextUrl.searchParams.get('audience')).toLowerCase();
  if (!MANAGED_AUDIENCES.has(audience)) {
    return NextResponse.json({ error: 'Audiencia invalida.' }, { status: 400 });
  }

  try {
    const authUsers = await listAllAuthUsers();
    const profiles = await loadProfilesMap(authUsers.map((item) => item.id).filter(Boolean));
    const accounts = authUsers
      .map((authUser) => {
        const profile = profiles.get(authUser.id) || null;
        const metadata = (authUser.user_metadata || {}) as Record<string, unknown>;
        const resolvedAudience = resolveAudience(authUser, profile);
        return {
          id: authUser.id,
          audience: resolvedAudience,
          audienceSource: getExplicitAudience(metadata) ? 'metadata' : 'inferido',
          email: authUser.email || profile?.email || null,
          phone: toText(profile?.phone) || toText(metadata.phone) || null,
          createdAt: authUser.created_at || null,
          lastSignInAt: authUser.last_sign_in_at || null,
          confirmedAt: authUser.email_confirmed_at || authUser.confirmed_at || null,
          bannedUntil: authUser.banned_until || null,
          metadata: {
            fullName: toText(metadata.full_name),
            businessName: toText(metadata.business_name),
            userType: toText(metadata.user_type),
            profile: toText(metadata.profile),
            appAudience: toText(metadata.app_audience),
          },
          profile,
        };
      })
      .filter((item) => item.audience === audience)
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

    return NextResponse.json({ audience, accounts });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'No se pudieron cargar las cuentas.' },
      { status: 500 }
    );
  }
}
