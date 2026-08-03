import { NextRequest, NextResponse } from 'next/server';
import { resolve4, resolve6, resolveMx } from 'node:dns/promises';
import { enforceRateLimit } from '@/lib/api/rate-limit';
import { readLimitedJsonBody } from '@/lib/api/read-json-body';

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

type DnsResolutionResult = 'resolvable' | 'not_found' | 'temporarily_unavailable';

const getDnsErrorCode = (error: unknown) =>
  String((error as { code?: string } | null)?.code || '').toUpperCase();

const isDefinitiveDnsMiss = (error: unknown) =>
  ['ENODATA', 'ENOTFOUND', 'ENONAME', 'NOTFOUND', 'NXDOMAIN'].includes(getDnsErrorCode(error));

const resolveMailDomain = async (domain: string): Promise<DnsResolutionResult> => {
  const errors: unknown[] = [];

  try {
    const mx = await resolveMx(domain);
    if (mx.some((record) => record.exchange && Number.isFinite(Number(record.priority)))) {
      return 'resolvable';
    }
  } catch (error) {
    errors.push(error);
    // Some valid domains receive mail through address records.
  }

  try {
    const records = await resolve4(domain);
    if (records.length > 0) return 'resolvable';
  } catch (error) {
    errors.push(error);
    // Continue to IPv6 before deciding whether the failure is definitive.
  }

  try {
    const records = await resolve6(domain);
    if (records.length > 0) return 'resolvable';
  } catch (error) {
    errors.push(error);
  }

  return errors.length > 0 && errors.every(isDefinitiveDnsMiss)
    ? 'not_found'
    : 'temporarily_unavailable';
};

export async function POST(request: NextRequest) {
  const rateLimit = enforceRateLimit(request, {
    keyPrefix: 'auth-validate-email',
    max: 30,
    windowMs: 60 * 1000,
  });
  if (!rateLimit.ok) {
    return NextResponse.json(
      { valid: false, code: 'rate_limited', error: rateLimit.error },
      { status: rateLimit.status, headers: rateLimit.headers }
    );
  }

  const bodyResult = await readLimitedJsonBody<{ email?: unknown }>(request, { maxBytes: 2 * 1024 });
  if (!bodyResult.ok) {
    return NextResponse.json(
      { valid: false, code: 'invalid_request', error: bodyResult.error },
      { status: bodyResult.status }
    );
  }
  const email = normalizeEmail(bodyResult.body?.email);

  if (!EMAIL_PATTERN.test(email)) {
    return NextResponse.json(
      { valid: false, code: 'invalid_format', error: 'Ingresa un correo válido.' },
      { status: 400 }
    );
  }

  const domain = email.split('@')[1] || '';
  const domainParts = domain.split('.').filter(Boolean);
  const tld = domainParts[domainParts.length - 1] || '';

  if (domainParts.length < 2 || BLOCKED_DOMAINS.has(domain) || BLOCKED_TLDS.has(tld)) {
    return NextResponse.json(
      { valid: false, code: 'blocked_domain', error: 'Ingresa un correo real para crear la cuenta.' },
      { status: 400 }
    );
  }

  const dnsResult = await resolveMailDomain(domain);
  if (dnsResult === 'not_found') {
    return NextResponse.json(
      {
        valid: false,
        code: 'domain_not_found',
        error: 'No pudimos encontrar el dominio del correo. Revisa que esté bien escrito.',
      },
      { status: 400 }
    );
  }

  if (dnsResult === 'temporarily_unavailable') {
    return NextResponse.json({
      valid: true,
      code: 'dns_temporarily_unavailable',
      warning: 'No pudimos verificar el dominio ahora. Supabase confirmará que el correo te pertenece.',
    });
  }

  return NextResponse.json({ valid: true, code: 'validated' });
}
