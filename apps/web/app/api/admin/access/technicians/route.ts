import { NextRequest, NextResponse } from 'next/server';
import { adminSupabase as supabase, ensureAdmin, getAuthUser } from '@/app/api/admin/_shared/auth';

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

  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_SELECT)
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) {
    return NextResponse.json({ error: error.message || 'No se pudieron cargar tecnicos.' }, { status: 500 });
  }

  return NextResponse.json({ profiles: data || [] });
}
