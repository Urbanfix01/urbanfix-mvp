import { clientSupabase } from '@/app/api/client/_shared/auth';

const toText = (value: unknown) => String(value || '').trim();

const toCount = (value: unknown) => {
  const parsed = Number(value || 0);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.round(parsed));
};

const normalizeText = (value: unknown) =>
  toText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const normalizePhone = (value: unknown) => toText(value).replace(/\D/g, '');

const getWordSet = (value: string) => new Set(value.split(' ').filter((item) => item.length >= 3));

const getOverlapCount = (left: string, right: string) => {
  if (!left || !right) return 0;
  const leftWords = getWordSet(left);
  const rightWords = getWordSet(right);
  let overlap = 0;
  leftWords.forEach((word) => {
    if (rightWords.has(word)) overlap += 1;
  });
  return overlap;
};

const getStrongestToken = (value: string) =>
  value
    .split(' ')
    .map((item) => item.trim())
    .filter((item) => item.length >= 4)
    .sort((left, right) => right.length - left.length)[0] || '';

type ProfileStatusRow = {
  id?: unknown;
  email?: unknown;
  full_name?: unknown;
  business_name?: unknown;
  phone?: unknown;
  access_granted?: unknown;
  profile_published?: unknown;
  completed_jobs_total?: unknown;
  public_reviews_count?: unknown;
  company_logo_url?: unknown;
  avatar_url?: unknown;
  updated_at?: unknown;
};

export type TechnicianProfileStatusSummary = {
  id: string;
  email: string | null;
  full_name: string | null;
  business_name: string | null;
  phone: string | null;
  access_granted: boolean;
  profile_published: boolean;
  completed_jobs_total: number;
  public_reviews_count: number;
  company_logo_url: string | null;
  avatar_url: string | null;
  updated_at: string | null;
};

export type TechnicianPublicProfileStatusResult =
  | {
      status: 200;
      error: null;
      mode: 'current_profile' | 'recommended_profile';
      reason: 'published_current' | 'duplicate_unpublished_account' | 'unpublished_profile' | 'missing_profile';
      currentProfile: TechnicianProfileStatusSummary | null;
      previewProfile: TechnicianProfileStatusSummary | null;
      matchingProfilesCount: number;
      matchSignals: string[];
    }
  | {
      status: 401 | 404 | 500;
      error: string;
      mode: 'current_profile';
      reason: 'missing_profile';
      currentProfile: TechnicianProfileStatusSummary | null;
      previewProfile: TechnicianProfileStatusSummary | null;
      matchingProfilesCount: number;
      matchSignals: string[];
    };

const PROFILE_SELECT =
  'id,email,full_name,business_name,phone,access_granted,profile_published,completed_jobs_total,public_reviews_count,company_logo_url,avatar_url,updated_at';

const toSummary = (row: ProfileStatusRow | null): TechnicianProfileStatusSummary | null => {
  if (!row?.id) return null;

  return {
    id: toText(row.id),
    email: toText(row.email) || null,
    full_name: toText(row.full_name) || null,
    business_name: toText(row.business_name) || null,
    phone: toText(row.phone) || null,
    access_granted: Boolean(row.access_granted),
    profile_published: Boolean(row.profile_published),
    completed_jobs_total: toCount(row.completed_jobs_total),
    public_reviews_count: toCount(row.public_reviews_count),
    company_logo_url: toText(row.company_logo_url) || null,
    avatar_url: toText(row.avatar_url) || null,
    updated_at: toText(row.updated_at) || null,
  };
};

const mergeCandidateRows = (target: Map<string, ProfileStatusRow>, rows: ProfileStatusRow[] | null | undefined) => {
  (rows || []).forEach((row) => {
    const id = toText(row?.id);
    if (!id) return;
    target.set(id, row);
  });
};

const scoreCandidate = (currentRow: ProfileStatusRow, candidateRow: ProfileStatusRow) => {
  const currentFullName = normalizeText(currentRow.full_name);
  const currentBusinessName = normalizeText(currentRow.business_name);
  const currentPhone = normalizePhone(currentRow.phone);

  const candidateFullName = normalizeText(candidateRow.full_name);
  const candidateBusinessName = normalizeText(candidateRow.business_name);
  const candidatePhone = normalizePhone(candidateRow.phone);

  let score = 0;
  const matchSignals: string[] = [];

  if (currentPhone && candidatePhone && currentPhone === candidatePhone) {
    score += 8;
    matchSignals.push('same_phone');
  }

  if (currentBusinessName && candidateBusinessName) {
    if (currentBusinessName === candidateBusinessName) {
      score += 8;
      matchSignals.push('same_business_name');
    } else {
      const overlap = getOverlapCount(currentBusinessName, candidateBusinessName);
      if (overlap > 0) {
        score += overlap * 2;
        matchSignals.push('business_name_overlap');
      }
    }
  }

  if (currentFullName && candidateFullName) {
    if (currentFullName === candidateFullName) {
      score += 7;
      matchSignals.push('same_full_name');
    } else {
      const overlap = getOverlapCount(currentFullName, candidateFullName);
      if (overlap > 0) {
        score += overlap * 2;
        matchSignals.push('full_name_overlap');
      }
    }
  }

  if (toCount(candidateRow.completed_jobs_total) > 0) {
    score += Math.min(6, toCount(candidateRow.completed_jobs_total));
    matchSignals.push('has_completed_jobs');
  }

  if (toCount(candidateRow.public_reviews_count) > 0) {
    score += Math.min(3, toCount(candidateRow.public_reviews_count));
    matchSignals.push('has_public_reviews');
  }

  if (toText(candidateRow.company_logo_url) || toText(candidateRow.avatar_url)) {
    score += 1;
    matchSignals.push('has_branding');
  }

  return { score, matchSignals };
};

const findRelatedPublishedProfiles = async (currentRow: ProfileStatusRow) => {
  if (!clientSupabase) return [] as ProfileStatusRow[];

  const currentId = toText(currentRow.id);
  const currentFullName = toText(currentRow.full_name);
  const currentBusinessName = toText(currentRow.business_name);
  const currentPhone = toText(currentRow.phone);

  const candidates = new Map<string, ProfileStatusRow>();

  const queries: Array<PromiseLike<{ data: ProfileStatusRow[] | null; error: { message?: string } | null }>> = [];

  if (currentFullName) {
    queries.push(
      clientSupabase
        .from('profiles')
        .select(PROFILE_SELECT)
        .eq('access_granted', true)
        .eq('profile_published', true)
        .ilike('full_name', currentFullName)
        .limit(10)
    );

    const strongestFullNameToken = getStrongestToken(currentFullName);
    if (strongestFullNameToken) {
      queries.push(
        clientSupabase
          .from('profiles')
          .select(PROFILE_SELECT)
          .eq('access_granted', true)
          .eq('profile_published', true)
          .ilike('full_name', `%${strongestFullNameToken}%`)
          .limit(10)
      );
    }
  }

  if (currentBusinessName) {
    queries.push(
      clientSupabase
        .from('profiles')
        .select(PROFILE_SELECT)
        .eq('access_granted', true)
        .eq('profile_published', true)
        .ilike('business_name', currentBusinessName)
        .limit(10)
    );

    const strongestBusinessToken = getStrongestToken(currentBusinessName);
    if (strongestBusinessToken) {
      queries.push(
        clientSupabase
          .from('profiles')
          .select(PROFILE_SELECT)
          .eq('access_granted', true)
          .eq('profile_published', true)
          .ilike('business_name', `%${strongestBusinessToken}%`)
          .limit(10)
      );
    }
  }

  if (currentPhone) {
    queries.push(
      clientSupabase
        .from('profiles')
        .select(PROFILE_SELECT)
        .eq('access_granted', true)
        .eq('profile_published', true)
        .eq('phone', currentPhone)
        .limit(10)
    );
  }

  if (queries.length === 0) return [] as ProfileStatusRow[];

  const results = await Promise.allSettled(queries);
  results.forEach((result) => {
    if (result.status !== 'fulfilled') return;
    if (result.value.error) return;
    mergeCandidateRows(candidates, result.value.data);
  });

  return [...candidates.values()].filter((row) => toText(row.id) && toText(row.id) !== currentId);
};

export const getTechnicianPublicProfileStatus = async (userId: string, userEmail?: string | null) => {
  if (!clientSupabase) {
    return {
      status: 500,
      error: 'Missing server config',
      mode: 'current_profile',
      reason: 'missing_profile',
      currentProfile: null,
      previewProfile: null,
      matchingProfilesCount: 0,
      matchSignals: [],
    } as const satisfies TechnicianPublicProfileStatusResult;
  }

  const safeUserId = toText(userId);
  if (!safeUserId) {
    return {
      status: 401,
      error: 'Unauthorized',
      mode: 'current_profile',
      reason: 'missing_profile',
      currentProfile: null,
      previewProfile: null,
      matchingProfilesCount: 0,
      matchSignals: [],
    } as const satisfies TechnicianPublicProfileStatusResult;
  }

  const { data, error } = await clientSupabase
    .from('profiles')
    .select(PROFILE_SELECT)
    .eq('id', safeUserId)
    .maybeSingle();

  if (error) {
    return {
      status: 500,
      error: error.message || 'No se pudo leer tu perfil.',
      mode: 'current_profile',
      reason: 'missing_profile',
      currentProfile: null,
      previewProfile: null,
      matchingProfilesCount: 0,
      matchSignals: [],
    } as const satisfies TechnicianPublicProfileStatusResult;
  }

  const currentRow = (data || null) as ProfileStatusRow | null;
  const currentProfile = toSummary(
    currentRow
      ? {
          ...currentRow,
          email: toText(currentRow.email) || toText(userEmail) || null,
        }
      : null
  );

  if (!currentRow || !currentProfile) {
    return {
      status: 404,
      error: 'Perfil no encontrado.',
      mode: 'current_profile',
      reason: 'missing_profile',
      currentProfile: null,
      previewProfile: null,
      matchingProfilesCount: 0,
      matchSignals: [],
    } as const satisfies TechnicianPublicProfileStatusResult;
  }

  if (currentProfile.profile_published) {
    return {
      status: 200,
      error: null,
      mode: 'current_profile',
      reason: 'published_current',
      currentProfile,
      previewProfile: currentProfile,
      matchingProfilesCount: 1,
      matchSignals: [],
    } as const satisfies TechnicianPublicProfileStatusResult;
  }

  const relatedPublishedRows = await findRelatedPublishedProfiles(currentRow);
  const scoredCandidates = relatedPublishedRows
    .map((row) => ({
      row,
      ...scoreCandidate(currentRow, row),
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      const rightJobs = toCount(right.row.completed_jobs_total);
      const leftJobs = toCount(left.row.completed_jobs_total);
      if (rightJobs !== leftJobs) return rightJobs - leftJobs;
      return toText(right.row.updated_at).localeCompare(toText(left.row.updated_at));
    });

  const recommended = scoredCandidates[0];
  if (recommended?.row) {
    return {
      status: 200,
      error: null,
      mode: 'recommended_profile',
      reason: 'duplicate_unpublished_account',
      currentProfile,
      previewProfile: toSummary(recommended.row),
      matchingProfilesCount: scoredCandidates.length + 1,
      matchSignals: recommended.matchSignals,
    } as const satisfies TechnicianPublicProfileStatusResult;
  }

  return {
    status: 200,
    error: null,
    mode: 'current_profile',
    reason: 'unpublished_profile',
    currentProfile,
    previewProfile: currentProfile,
    matchingProfilesCount: 1,
    matchSignals: [],
  } as const satisfies TechnicianPublicProfileStatusResult;
};
