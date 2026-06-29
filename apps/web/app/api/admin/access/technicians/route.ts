import { NextRequest, NextResponse } from 'next/server';
import { adminSupabase as supabase, ensureAdmin, getAuthUser } from '@/app/api/admin/_shared/auth';

type TechnicalAudience = 'tecnico' | 'empresa';

const AUTH_USERS_PAGE_SIZE = 1000;
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
  'access_granted_at',
  'profile_published',
  'profile_published_at',
  'service_lat',
  'service_lng',
  'service_location_precision',
  'admin_review_status',
  'admin_review_reason',
  'admin_review_marked_at',
  'created_at',
  'updated_at',
].join(',');

const toText = (value: unknown) => String(value || '').trim();

const normalizeRole = (value: unknown): TechnicalAudience | 'cliente' | '' => {
  const normalized = toText(value).toLowerCase();
  if (normalized === 'tecnico' || normalized === 'technician') return 'tecnico';
  if (normalized === 'empresa' || normalized === 'company' || normalized === 'business') return 'empresa';
  if (normalized === 'cliente' || normalized === 'client') return 'cliente';
  return '';
};

const getExplicitAudience = (metadata: Record<string, unknown>) => {
  const candidates = [metadata.user_type, metadata.profile, metadata.app_audience, metadata.account_type];
  for (const candidate of candidates) {
    const role = normalizeRole(candidate);
    if (role) return role;
  }
  return '';
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

  const audienceParam = toText(request.nextUrl.searchParams.get('audience')).toLowerCase();
  const audience = audienceParam === 'empresa' || audienceParam === 'tecnico' ? audienceParam : '';

  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_SELECT)
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) {
    return NextResponse.json({ error: error.message || 'No se pudieron cargar tecnicos.' }, { status: 500 });
  }

  if (!audience) {
    return NextResponse.json({ profiles: data || [] });
  }

  try {
    const authUsers = await listAllAuthUsers();
    const audienceByUserId = new Map<string, string>();
    authUsers.forEach((authUser) => {
      const explicit = getExplicitAudience((authUser.user_metadata || {}) as Record<string, unknown>);
      if (explicit) audienceByUserId.set(authUser.id, explicit);
    });

    const profiles = (data || []).filter((profile: any) => {
      const explicit = audienceByUserId.get(profile.id);
      if (explicit) return explicit === audience;
      if (audience === 'empresa') return false;
      return profile.access_granted === true || Boolean(toText(profile.specialties)) || Boolean(toText(profile.business_name));
    });

    return NextResponse.json({ profiles });
  } catch (authError: any) {
    return NextResponse.json(
      { error: authError?.message || 'No se pudieron clasificar los perfiles.' },
      { status: 500 }
    );
  }
}
