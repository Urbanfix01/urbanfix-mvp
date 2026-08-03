export const TECHNICAL_REGISTRATION_ATTEMPT_KEY = 'urbanfix_technical_registration_attempt';
export const TECHNICAL_REGISTRATION_CONSUMED_KEY = 'urbanfix_technical_registration_consumed';
export const TECHNICAL_REGISTRATION_ATTEMPT_TTL_MS = 30 * 60 * 1000;
const TECHNICAL_REGISTRATION_CONSUMED_TTL_MS = 24 * 60 * 60 * 1000;

export type TechnicalRegistrationProfile = 'tecnico' | 'empresa';
export type TechnicalRegistrationMethod = 'email' | 'google';
export type TechnicalRegistrationSource =
  | 'home'
  | 'portal'
  | 'technician_dashboard'
  | 'direct';

export type TechnicalRegistrationAttempt = {
  attemptId: string;
  accessProfile: TechnicalRegistrationProfile;
  source: TechnicalRegistrationSource;
  mode: 'register';
  method?: TechnicalRegistrationMethod;
  createdAt: number;
  updatedAt: number;
  startedEventAt?: number;
  methodEventAt?: number;
  submittedEventAt?: number;
};

type ConsumedTechnicalRegistrationAttempt = {
  attemptId: string;
  consumedAt: number;
};

const TECHNICAL_REGISTRATION_SOURCES = new Set<TechnicalRegistrationSource>([
  'home',
  'portal',
  'technician_dashboard',
  'direct',
]);

const getSessionStorage = () => {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
};

const getLocalStorage = () => {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

const readStorageValue = (storage: Storage | null, key: string) => {
  if (!storage) return null;
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
};

const writeStorageValue = (storage: Storage | null, key: string, value: string) => {
  if (!storage) return;
  try {
    storage.setItem(key, value);
  } catch {
    // Auth continues even when embedded browsers block storage.
  }
};

const removeStorageValue = (storage: Storage | null, key: string) => {
  if (!storage) return;
  try {
    storage.removeItem(key);
  } catch {
    // Ignore storage errors.
  }
};

const isTechnicalRegistrationProfile = (value: unknown): value is TechnicalRegistrationProfile =>
  value === 'tecnico' || value === 'empresa';

const isTechnicalRegistrationMethod = (value: unknown): value is TechnicalRegistrationMethod =>
  value === 'email' || value === 'google';

export const normalizeTechnicalRegistrationSource = (
  value: unknown
): TechnicalRegistrationSource => {
  const normalized = String(value || '').trim().toLowerCase() as TechnicalRegistrationSource;
  return TECHNICAL_REGISTRATION_SOURCES.has(normalized) ? normalized : 'direct';
};

const parseAttempt = (raw: string | null): TechnicalRegistrationAttempt | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<TechnicalRegistrationAttempt>;
    const attemptId = String(parsed.attemptId || '').trim();
    const createdAt = Number(parsed.createdAt || 0);
    const updatedAt = Number(parsed.updatedAt || createdAt);
    if (
      !attemptId ||
      !isTechnicalRegistrationProfile(parsed.accessProfile) ||
      parsed.mode !== 'register' ||
      !Number.isFinite(createdAt) ||
      createdAt <= 0 ||
      Date.now() - createdAt > TECHNICAL_REGISTRATION_ATTEMPT_TTL_MS
    ) {
      return null;
    }

    return {
      attemptId,
      accessProfile: parsed.accessProfile,
      source: normalizeTechnicalRegistrationSource(parsed.source),
      mode: 'register',
      method: isTechnicalRegistrationMethod(parsed.method) ? parsed.method : undefined,
      createdAt,
      updatedAt: Number.isFinite(updatedAt) && updatedAt > 0 ? updatedAt : createdAt,
      startedEventAt: Number(parsed.startedEventAt || 0) || undefined,
      methodEventAt: Number(parsed.methodEventAt || 0) || undefined,
      submittedEventAt: Number(parsed.submittedEventAt || 0) || undefined,
    };
  } catch {
    return null;
  }
};

const persistAttempt = (attempt: TechnicalRegistrationAttempt) => {
  const value = JSON.stringify(attempt);
  writeStorageValue(getSessionStorage(), TECHNICAL_REGISTRATION_ATTEMPT_KEY, value);
  writeStorageValue(getLocalStorage(), TECHNICAL_REGISTRATION_ATTEMPT_KEY, value);
  return attempt;
};

export const getTechnicalRegistrationAttempt = () => {
  const sessionAttempt = parseAttempt(
    readStorageValue(getSessionStorage(), TECHNICAL_REGISTRATION_ATTEMPT_KEY)
  );
  const localAttempt = parseAttempt(
    readStorageValue(getLocalStorage(), TECHNICAL_REGISTRATION_ATTEMPT_KEY)
  );
  const attempt =
    sessionAttempt && localAttempt
      ? sessionAttempt.updatedAt >= localAttempt.updatedAt
        ? sessionAttempt
        : localAttempt
      : sessionAttempt || localAttempt;

  if (!attempt) {
    removeStorageValue(getSessionStorage(), TECHNICAL_REGISTRATION_ATTEMPT_KEY);
    removeStorageValue(getLocalStorage(), TECHNICAL_REGISTRATION_ATTEMPT_KEY);
  }
  return attempt;
};

const createAttemptId = () => {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    // Use a non-identifying fallback when crypto is unavailable.
  }
  return `reg_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
};

export const getOrCreateTechnicalRegistrationAttempt = (
  accessProfile: TechnicalRegistrationProfile,
  source: TechnicalRegistrationSource
) => {
  const current = getTechnicalRegistrationAttempt();
  if (current && current.accessProfile === accessProfile) {
    if (current.source === 'direct' && source !== 'direct') {
      return persistAttempt({ ...current, source, updatedAt: Date.now() });
    }
    return current;
  }

  const now = Date.now();
  return persistAttempt({
    attemptId: createAttemptId(),
    accessProfile,
    source,
    mode: 'register',
    createdAt: now,
    updatedAt: now,
  });
};

export const updateTechnicalRegistrationAttempt = (
  attempt: TechnicalRegistrationAttempt,
  patch: Partial<
    Pick<
      TechnicalRegistrationAttempt,
      'method' | 'startedEventAt' | 'methodEventAt' | 'submittedEventAt'
    >
  >
) => persistAttempt({ ...attempt, ...patch, updatedAt: Date.now() });

export const clearTechnicalRegistrationAttempt = () => {
  removeStorageValue(getSessionStorage(), TECHNICAL_REGISTRATION_ATTEMPT_KEY);
  removeStorageValue(getLocalStorage(), TECHNICAL_REGISTRATION_ATTEMPT_KEY);
};

const parseConsumedAttempt = (raw: string | null): ConsumedTechnicalRegistrationAttempt | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<ConsumedTechnicalRegistrationAttempt>;
    const attemptId = String(parsed.attemptId || '').trim();
    const consumedAt = Number(parsed.consumedAt || 0);
    if (
      !attemptId ||
      !Number.isFinite(consumedAt) ||
      consumedAt <= 0 ||
      Date.now() - consumedAt > TECHNICAL_REGISTRATION_CONSUMED_TTL_MS
    ) {
      return null;
    }
    return { attemptId, consumedAt };
  } catch {
    return null;
  }
};

export const wasTechnicalRegistrationAttemptConsumed = (attemptId: string) => {
  const consumed =
    parseConsumedAttempt(
      readStorageValue(getSessionStorage(), TECHNICAL_REGISTRATION_CONSUMED_KEY)
    ) ||
    parseConsumedAttempt(readStorageValue(getLocalStorage(), TECHNICAL_REGISTRATION_CONSUMED_KEY));
  return consumed?.attemptId === attemptId;
};

export const consumeTechnicalRegistrationAttempt = (attemptId: string) => {
  const value = JSON.stringify({ attemptId, consumedAt: Date.now() });
  writeStorageValue(getSessionStorage(), TECHNICAL_REGISTRATION_CONSUMED_KEY, value);
  writeStorageValue(getLocalStorage(), TECHNICAL_REGISTRATION_CONSUMED_KEY, value);
  clearTechnicalRegistrationAttempt();
};

export const isUserCreatedDuringTechnicalRegistrationAttempt = (
  userCreatedAt: string | null | undefined,
  attempt: TechnicalRegistrationAttempt
) => {
  const createdAt = new Date(String(userCreatedAt || '')).getTime();
  if (!Number.isFinite(createdAt)) return false;
  return (
    createdAt >= attempt.createdAt - 60 * 1000 &&
    createdAt <= attempt.createdAt + TECHNICAL_REGISTRATION_ATTEMPT_TTL_MS
  );
};

export const getTechnicalRegistrationEventContext = (
  attempt: TechnicalRegistrationAttempt,
  extra: Record<string, string | number | boolean> = {}
) => ({
  attempt_id: attempt.attemptId,
  access_profile: attempt.accessProfile,
  source: attempt.source,
  ...(attempt.method ? { provider: attempt.method } : {}),
  ...extra,
});
