import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase =
  supabaseUrl && serviceRoleKey
    ? createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    : null;

const sanitizeText = (value: unknown, maxLength: number) =>
  String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, maxLength);

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export async function POST(request: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ error: 'Missing server config' }, { status: 500 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body invalido.' }, { status: 400 });
  }

  const fullName = sanitizeText(body.fullName, 120);
  const email = sanitizeText(body.email, 160).toLowerCase();
  const phone = sanitizeText(body.phone, 40);
  const companyName = sanitizeText(body.companyName, 160);
  const role = sanitizeText(body.role, 120);
  const city = sanitizeText(body.city, 120);
  const teamSize = sanitizeText(body.teamSize, 80);
  const platformInterest = sanitizeText(body.platformInterest, 80);
  const useCase = sanitizeText(body.useCase, 240);
  const notes = sanitizeText(body.notes, 1200);
  const source = sanitizeText(body.source, 80) || 'download-page';

  if (fullName.length < 3) {
    return NextResponse.json({ error: 'Ingresa un nombre valido.' }, { status: 400 });
  }

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: 'Ingresa un email valido.' }, { status: 400 });
  }

  if (!useCase) {
    return NextResponse.json({ error: 'Cuéntanos brevemente que quieres probar.' }, { status: 400 });
  }

  const { error } = await supabase.from('demo_requests').insert({
    source,
    full_name: fullName,
    email,
    phone: phone || null,
    company_name: companyName || null,
    role: role || null,
    city: city || null,
    team_size: teamSize || null,
    platform_interest: platformInterest || null,
    use_case: useCase,
    notes: notes || null,
  });

  if (error) {
    return NextResponse.json(
      { error: error.message || 'No pudimos registrar tu solicitud ahora.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}