import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const LIKE_COOKIE_KEY = 'urbanfix_profile_like_sid';
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

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

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const isMissingLikesMigration = (message: string) => {
  const lower = String(message || '').toLowerCase();
  return (
    lower.includes('profile_likes') ||
    lower.includes('public_likes_count') ||
    (lower.includes('does not exist') && lower.includes('likes'))
  );
};

const getAuthUserId = async (request: NextRequest) => {
  if (!supabase) return null;
  const authHeader = (request.headers.get('authorization') || '').trim();
  const token = authHeader.replace(/^bearer\s+/i, '').trim();
  if (!token) return null;
  const { data, error } = await supabase.auth.getUser(token);
  if (error) return null;
  return data?.user?.id || null;
};

const getOrCreateSessionKey = async () => {
  const cookieStore = await cookies();
  const existing = String(cookieStore.get(LIKE_COOKIE_KEY)?.value || '').trim();
  if (existing) {
    return { key: existing, created: false };
  }
  return { key: crypto.randomUUID(), created: true };
};

const buildResponse = (
  payload: Record<string, unknown>,
  status: number,
  shouldSetCookie: boolean,
  cookieValue: string
) => {
  const response = NextResponse.json(payload, { status });
  if (shouldSetCookie && cookieValue) {
    response.cookies.set({
      name: LIKE_COOKIE_KEY,
      value: cookieValue,
      maxAge: COOKIE_MAX_AGE_SECONDS,
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    });
  }
  return response;
};

const getLikesState = async (profileId: string, userId: string | null, sessionKey: string) => {
  if (!supabase) {
    return { status: 500, error: 'Missing server config' } as const;
  }

  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('id, profile_published, public_likes_count')
    .eq('id', profileId)
    .maybeSingle();

  if (profileError) {
    return {
      status: isMissingLikesMigration(profileError.message || '') ? 500 : 500,
      error: isMissingLikesMigration(profileError.message || '')
        ? 'Falta migracion de likes de perfiles (profile_likes/public_likes_count).'
        : profileError.message || 'No se pudo leer el perfil.',
    } as const;
  }

  if (!profileData || !profileData.id || !profileData.profile_published) {
    return { status: 404, error: 'Perfil no disponible.' } as const;
  }

  let likedQuery = supabase
    .from('profile_likes')
    .select('id')
    .eq('profile_id', profileId)
    .limit(1);

  if (userId) {
    likedQuery = likedQuery.eq('user_id', userId);
  } else {
    likedQuery = likedQuery.eq('session_key', sessionKey);
  }

  const { data: likedData, error: likedError } = await likedQuery.maybeSingle();
  if (likedError) {
    return {
      status: isMissingLikesMigration(likedError.message || '') ? 500 : 500,
      error: isMissingLikesMigration(likedError.message || '')
        ? 'Falta migracion de likes de perfiles (profile_likes/public_likes_count).'
        : likedError.message || 'No se pudo consultar likes.',
    } as const;
  }

  return {
    status: 200,
    likesCount: Math.max(0, Number(profileData.public_likes_count || 0)),
    liked: Boolean(likedData?.id),
  } as const;
};

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!supabase) {
    return NextResponse.json({ error: 'Missing server config' }, { status: 500 });
  }

  const resolvedParams = await params;
  const profileId = String(resolvedParams?.id || '').trim();
  if (!isUuid(profileId)) {
    return NextResponse.json({ error: 'Invalid profile id' }, { status: 400 });
  }

  const userId = await getAuthUserId(request);
  const { key: sessionKey, created } = await getOrCreateSessionKey();
  const state = await getLikesState(profileId, userId, sessionKey);
  if (state.status !== 200) {
    return buildResponse({ error: state.error }, state.status, created, sessionKey);
  }
  return buildResponse(
    {
      profileId,
      likesCount: state.likesCount,
      liked: state.liked,
    },
    200,
    created,
    sessionKey
  );
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!supabase) {
    return NextResponse.json({ error: 'Missing server config' }, { status: 500 });
  }

  const resolvedParams = await params;
  const profileId = String(resolvedParams?.id || '').trim();
  if (!isUuid(profileId)) {
    return NextResponse.json({ error: 'Invalid profile id' }, { status: 400 });
  }

  const userId = await getAuthUserId(request);
  const { key: sessionKey, created } = await getOrCreateSessionKey();

  const currentState = await getLikesState(profileId, userId, sessionKey);
  if (currentState.status !== 200) {
    return buildResponse({ error: currentState.error }, currentState.status, created, sessionKey);
  }

  if (currentState.liked) {
    let deleteQuery = supabase.from('profile_likes').delete().eq('profile_id', profileId);
    if (userId) {
      deleteQuery = deleteQuery.eq('user_id', userId);
    } else {
      deleteQuery = deleteQuery.eq('session_key', sessionKey);
    }
    const { error } = await deleteQuery;
    if (error) {
      return buildResponse(
        {
          error: isMissingLikesMigration(error.message || '')
            ? 'Falta migracion de likes de perfiles (profile_likes/public_likes_count).'
            : error.message || 'No se pudo quitar el like.',
        },
        500,
        created,
        sessionKey
      );
    }
  } else {
    const payload: Record<string, unknown> = {
      profile_id: profileId,
      session_key: userId ? null : sessionKey,
      user_id: userId,
    };
    const { error } = await supabase.from('profile_likes').insert(payload);
    if (error) {
      return buildResponse(
        {
          error: isMissingLikesMigration(error.message || '')
            ? 'Falta migracion de likes de perfiles (profile_likes/public_likes_count).'
            : error.message || 'No se pudo registrar el like.',
        },
        500,
        created,
        sessionKey
      );
    }
  }

  const nextState = await getLikesState(profileId, userId, sessionKey);
  if (nextState.status !== 200) {
    return buildResponse({ error: nextState.error }, nextState.status, created, sessionKey);
  }

  return buildResponse(
    {
      profileId,
      likesCount: nextState.likesCount,
      liked: nextState.liked,
    },
    200,
    created,
    sessionKey
  );
}
