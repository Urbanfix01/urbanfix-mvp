import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { readLimitedJsonBody } from '@/lib/api/read-json-body';
import { getServiceRoleClient } from '@/lib/supabase/server';

const webhookSecret = process.env.NOTIFY_WEBHOOK_SECRET;
const MIN_WEBHOOK_SECRET_LENGTH = 32;

const supabase = getServiceRoleClient();

const isWeakSecret = (value: string) => {
  const normalized = value.trim().toLowerCase();
  if (normalized.length < MIN_WEBHOOK_SECRET_LENGTH) return true;
  return ['replace_with_secure_token', 'replace_me', 'your_token_here', 'changeme', 'example', 'test'].includes(
    normalized
  );
};

const safeSecretCompare = (a: string, b: string) => {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
};

export async function POST(request: NextRequest) {
  const normalizedSecret = String(webhookSecret || '').trim();
  if (!normalizedSecret) {
    return NextResponse.json({ error: 'Missing NOTIFY_WEBHOOK_SECRET' }, { status: 500 });
  }
  if (isWeakSecret(normalizedSecret)) {
    return NextResponse.json({ error: 'Misconfigured NOTIFY_WEBHOOK_SECRET' }, { status: 500 });
  }

  const headerSecret = String(request.headers.get('x-hook-secret') || '').trim();
  if (!headerSecret || !safeSecretCompare(headerSecret, normalizedSecret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!supabase) {
    return NextResponse.json({ error: 'Servicio no disponible.' }, { status: 503 });
  }

  const bodyResult = await readLimitedJsonBody(request, { maxBytes: 16 * 1024 });
  if (!bodyResult.ok) {
    return NextResponse.json({ error: bodyResult.error }, { status: bodyResult.status });
  }
  const payload = bodyResult.body as Record<string, any>;
  const record = (payload?.record || payload?.new || payload) as Record<string, any>;
  const userId = record?.user_id;
  const title = record?.title;
  const body = record?.body;

  if (!userId || !title || !body) {
    return NextResponse.json({ ok: true });
  }

  const { data: tokens } = await supabase
    .from('device_tokens')
    .select('expo_push_token, platform')
    .eq('user_id', userId);

  if (!tokens || tokens.length === 0) {
    return NextResponse.json({ ok: true });
  }

  const messages = tokens
    .filter((token) => token.platform === 'android' || !token.platform)
    .map((token) => ({
      to: token.expo_push_token,
      title,
      body,
      data: record?.data || { notification_id: record?.id },
    }));

  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(messages),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return NextResponse.json({ error: errorText }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
