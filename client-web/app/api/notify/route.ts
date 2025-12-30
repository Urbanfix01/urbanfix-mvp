import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const webhookSecret = process.env.NOTIFY_WEBHOOK_SECRET;

const supabase =
  supabaseUrl && serviceRoleKey ? createClient(supabaseUrl, serviceRoleKey) : null;

export async function POST(request: NextRequest) {
  if (webhookSecret) {
    const headerSecret = request.headers.get('x-hook-secret');
    if (headerSecret !== webhookSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  if (!supabase) {
    return NextResponse.json({ error: 'Missing server config' }, { status: 500 });
  }

  const payload = await request.json();
  const record = payload?.record || payload?.new || payload;
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
