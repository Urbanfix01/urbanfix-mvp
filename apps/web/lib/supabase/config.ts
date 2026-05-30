const PLACEHOLDER_SUPABASE_HOST = 'placeholder.supabase.co';
const PLACEHOLDER_KEYS = new Set(['placeholder-anon-key', 'missing-supabase-anon-key']);

export const supabaseConfigError =
  'Falta configurar Supabase para este entorno. Revisa NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.';

export const supabaseServerConfigError =
  'Falta configurar Supabase server. Revisa SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.';

export const normalizeEnvValue = (value?: string | null) => String(value || '').trim();

export const isUsableSupabaseUrl = (value?: string | null) => {
  const normalized = normalizeEnvValue(value);
  if (!normalized || normalized.includes(PLACEHOLDER_SUPABASE_HOST)) return false;
  try {
    const parsed = new URL(normalized);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
};

export const isUsableSupabaseKey = (value?: string | null) => {
  const normalized = normalizeEnvValue(value);
  return Boolean(normalized && !PLACEHOLDER_KEYS.has(normalized));
};

export const getPublicSupabaseConfig = () => {
  const url = normalizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const anonKey = normalizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const hasConfig = isUsableSupabaseUrl(url) && isUsableSupabaseKey(anonKey);
  return { url, anonKey, hasConfig };
};

export const getServiceSupabaseConfig = () => {
  const url = normalizeEnvValue(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL);
  const serviceRoleKey = normalizeEnvValue(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const hasConfig = isUsableSupabaseUrl(url) && isUsableSupabaseKey(serviceRoleKey);
  return { url, serviceRoleKey, hasConfig };
};
