import { NextRequest, NextResponse } from 'next/server';
import { adminSupabase as supabase, ensureAdmin, getAuthUser } from '@/app/api/admin/_shared/auth';

const isMissingColumnError = (error: any, column: string) => {
  const message = String(error?.message || '').toLowerCase();
  return message.includes('column') && message.includes(column.toLowerCase()) && message.includes('does not exist');
};

const buildSelectColumns = (includeActive: boolean, includeTechnicalNotes: boolean, includeUnit: boolean) =>
  [
    'id',
    'name',
    'type',
    'suggested_price',
    'category',
    'source_ref',
    includeTechnicalNotes ? 'technical_notes' : null,
    includeUnit ? 'unit' : null,
    includeActive ? 'active' : null,
    'created_at',
  ]
    .filter(Boolean)
    .join(',');

export async function GET(request: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ error: 'Missing server config' }, { status: 500 });
  }

  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const isAdmin = await ensureAdmin(user.id);
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const type = (request.nextUrl.searchParams.get('type') || '').trim() || 'labor';
  const onlyActive = request.nextUrl.searchParams.get('active') === 'true';

  const variants = [
    { includeActive: true, includeTechnicalNotes: true, includeUnit: true },
    { includeActive: true, includeTechnicalNotes: true, includeUnit: false },
    { includeActive: true, includeTechnicalNotes: false, includeUnit: false },
    { includeActive: false, includeTechnicalNotes: true, includeUnit: true },
    { includeActive: false, includeTechnicalNotes: true, includeUnit: false },
    { includeActive: false, includeTechnicalNotes: false, includeUnit: false },
  ];

  let lastError: any = null;
  for (const variant of variants) {
    let query = supabase
      .from('master_items')
      .select(buildSelectColumns(variant.includeActive, variant.includeTechnicalNotes, variant.includeUnit))
      .eq('type', type);

    if (onlyActive && variant.includeActive) {
      query = query.eq('active', true);
    }

    if (variant.includeActive) {
      query = query.order('active', { ascending: false });
    }

    const { data, error } = await query.order('category', { ascending: true }).order('name', { ascending: true }).limit(5000);
    if (!error) {
      return NextResponse.json({ items: data || [] });
    }

    lastError = error;

    const activeMissing = isMissingColumnError(error, 'active');
    const technicalNotesMissing = isMissingColumnError(error, 'technical_notes');
    const unitMissing = isMissingColumnError(error, 'unit');
    if (
      (activeMissing && variant.includeActive) ||
      (technicalNotesMissing && variant.includeTechnicalNotes) ||
      (unitMissing && variant.includeUnit)
    ) {
      continue;
    }

    break;
  }

  return NextResponse.json({ error: lastError?.message || 'No se pudo cargar master_items.' }, { status: 500 });
}

