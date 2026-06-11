import { NextRequest, NextResponse } from 'next/server';
import { resolve4, resolve6, resolveMx } from 'node:dns/promises';

export const runtime = 'nodejs';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const BLOCKED_DOMAINS = new Set([
  'example.com',
  'example.net',
  'example.org',
  'invalid.com',
  'mailinator.com',
  'tempmail.com',
  'temp-mail.org',
  '10minutemail.com',
  'guerrillamail.com',
  'yopmail.com',
  'sharklasers.com',
  'trashmail.com',
]);

const BLOCKED_TLDS = new Set(['test', 'invalid', 'example', 'localhost', 'local']);

const normalizeEmail = (value: unknown) => String(value || '').trim().toLowerCase();

const hasResolvableMailDomain = async (domain: string) => {
  try {
    const mx = await resolveMx(domain);
    if (mx.some((record) => record.exchange && Number.isFinite(Number(record.priority)))) return true;
  } catch {
    // Some valid domains can receive mail via address records. Check them before rejecting.
  }

  try {
    const records = await resolve4(domain);
    if (records.length > 0) return true;
  } catch {
    // Continue to IPv6 fallback.
  }

  try {
    const records = await resolve6(domain);
    return records.length > 0;
  } catch {
    return false;
  }
};

export async function POST(request: NextRequest) {
  let email = '';

  try {
    const body = await request.json();
    email = normalizeEmail(body?.email);
  } catch {
    email = '';
  }

  if (!EMAIL_PATTERN.test(email)) {
    return NextResponse.json({ valid: false, error: 'Ingresa un correo válido.' }, { status: 400 });
  }

  const domain = email.split('@')[1] || '';
  const domainParts = domain.split('.').filter(Boolean);
  const tld = domainParts[domainParts.length - 1] || '';

  if (domainParts.length < 2 || BLOCKED_DOMAINS.has(domain) || BLOCKED_TLDS.has(tld)) {
    return NextResponse.json(
      { valid: false, error: 'Ingresa un correo real para crear la cuenta.' },
      { status: 400 }
    );
  }

  const hasMailDomain = await hasResolvableMailDomain(domain);
  if (!hasMailDomain) {
    return NextResponse.json(
      { valid: false, error: 'No pudimos validar el dominio del correo. Usa una cuenta real.' },
      { status: 400 }
    );
  }

  return NextResponse.json({ valid: true });
}
