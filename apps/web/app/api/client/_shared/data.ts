export const DIRECT_TIMEOUT_MS = 20 * 60 * 1000;
export const MARKETPLACE_MATCH_LIMIT = 5;

type AnyRecord = Record<string, any>;

const statusSet = new Set([
  'published',
  'matched',
  'quoted',
  'direct_sent',
  'selected',
  'scheduled',
  'in_progress',
  'completed',
  'cancelled',
]);

const PROFILE_PUBLIC_BASE_SELECT =
  'id,full_name,business_name,phone,address,company_address,city,coverage_area,specialties,working_hours,public_rating,public_reviews_count,completed_jobs_total,references_summary,client_recommendations,achievement_badges';
const PROFILE_PUBLIC_GEO_SELECT = `${PROFILE_PUBLIC_BASE_SELECT},service_province,service_district,service_city,coverage_zones`;
const PROFILE_MATCH_BASE_SELECT =
  'id,full_name,business_name,phone,address,company_address,specialties,city,coverage_area,working_hours,references_summary,public_rating,completed_jobs_total,last_seen_at';
const PROFILE_MATCH_GEO_SELECT = `${PROFILE_MATCH_BASE_SELECT},service_province,service_district,service_city,coverage_zones`;

const shouldFallbackGeoSelect = (message: string) =>
  /service_province|service_district|service_city|coverage_zones/i.test(message || '');

const normalizeText = (value: unknown) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const toNumberOrNull = (value: unknown) => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toInt = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.round(parsed));
};

const splitTextLines = (value: unknown) =>
  String(value || '')
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);

const parseBadgeArray = (value: unknown) => {
  if (Array.isArray(value)) {
    return Array.from(
      new Set(
        value
          .map((item) => String(item || '').trim())
          .filter(Boolean)
      )
    );
  }
  if (typeof value === 'string') {
    return Array.from(
      new Set(
        value
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
      )
    );
  }
  return [] as string[];
};

const formatCoverageZone = (zoneRaw: unknown) => {
  const zone = String(zoneRaw || '').trim();
  if (!zone) return '';
  const match = zone.match(/^comuna[_\s-]?(\d{1,2})$/i);
  if (match) return `Comuna ${match[1]}`;
  return zone;
};

const getCoverageCityFallback = (coverageRaw: unknown) =>
  String(coverageRaw || '')
    .split(',')
    .map((segment) => segment.trim())
    .filter(Boolean)[0] || '';

const getTechnicianVisibilityScore = (profile?: AnyRecord | null) => {
  if (!profile) return 0;
  const checks = [
    Boolean(String(profile.business_name || profile.full_name || '').trim()),
    Boolean(String(profile.phone || '').trim()),
    Boolean(
      String(profile.service_city || profile.city || '').trim() ||
        String(profile.coverage_area || '').trim()
    ),
    Boolean(String(profile.specialties || '').trim()),
    Boolean(String(profile.working_hours || '').trim()),
    Boolean(String(profile.company_address || profile.address || '').trim()),
  ];
  const completed = checks.filter(Boolean).length;
  return Math.round((completed / checks.length) * 100);
};

const getTechnicianVisibilityBonus = (profile?: AnyRecord | null) => {
  if (!profile) return 0;
  let bonus = 0;
  if (String(profile.business_name || profile.full_name || '').trim()) bonus += 2;
  if (String(profile.phone || '').trim()) bonus += 2;
  if (String(profile.specialties || '').trim()) bonus += 3;
  if (String(profile.service_city || profile.city || '').trim() || String(profile.coverage_area || '').trim()) bonus += 3;
  if (String(profile.service_province || '').trim()) bonus += 1;
  if (String(profile.service_district || '').trim()) bonus += 1;
  if (String(profile.working_hours || '').trim()) bonus += 1;
  if (String(profile.references_summary || '').trim()) bonus += 1;
  const rating = Number(profile.public_rating);
  if (Number.isFinite(rating) && rating > 0) bonus += Math.min(3, rating / 2);
  const completedJobs = toInt(profile.completed_jobs_total, 0);
  if (completedJobs >= 10) bonus += 2;
  else if (completedJobs > 0) bonus += 1;
  return bonus;
};

const resolveTechName = (profile: AnyRecord) =>
  String(profile?.full_name || profile?.business_name || 'Tecnico').trim() || 'Tecnico';

const resolveTokensForCategory = (categoryRaw: unknown) => {
  const category = normalizeText(categoryRaw);
  if (!category) return [] as string[];
  if (category.includes('electric')) return ['electricidad', 'electrico', 'electrica', 'tablero', 'cableado'];
  if (category.includes('plomer') || category.includes('sanitar')) return ['plomeria', 'sanitario', 'agua', 'caneria'];
  if (category.includes('gas')) return ['gas'];
  if (category.includes('alban') || category.includes('mampost')) return ['albanileria', 'mamposteria', 'revoque'];
  if (category.includes('pint')) return ['pintura', 'pintor', 'pintar'];
  return [category];
};

const extractCityFromAddress = (addressRaw: unknown) => {
  const address = String(addressRaw || '').trim();
  if (!address) return '';
  const parts = address.split(',').map((part) => part.trim()).filter(Boolean);
  return parts.length ? normalizeText(parts[parts.length - 1]) : normalizeText(address);
};

const toIso = (value: unknown) => (value ? new Date(String(value)).toISOString() : new Date().toISOString());

const isRequestStatus = (value: unknown) => statusSet.has(String(value || '').trim());

const buildKnownTechnicians = (requestRows: AnyRecord[]) => {
  const seen = new Set<string>();
  const result: AnyRecord[] = [];

  requestRows.forEach((row) => {
    const candidates = [
      {
        id: row.assigned_technician_id,
        name: row.assigned_technician_name,
        phone: row.assigned_technician_phone,
        specialty: row.category || 'General',
        rating: 4.7,
        lastJobAt: row.updated_at,
      },
      {
        id: row.target_technician_id,
        name: row.target_technician_name,
        phone: row.target_technician_phone,
        specialty: row.category || 'General',
        rating: 4.7,
        lastJobAt: row.updated_at,
      },
    ];

    candidates.forEach((candidate) => {
      if (!candidate.id || !candidate.name || !candidate.phone) return;
      if (seen.has(candidate.id)) return;
      seen.add(candidate.id);
      result.push(candidate);
    });
  });

  return result;
};

const mapQuoteRow = (row: AnyRecord, profile?: AnyRecord | null) => {
  const profileRating = toNumberOrNull(profile?.public_rating);
  const rowRating = toNumberOrNull(row.technician_rating);
  const rating = rowRating ?? profileRating;
  const recommendations = splitTextLines(profile?.client_recommendations).slice(0, 3);
  const coverageZones = parseBadgeArray(profile?.coverage_zones).map((zone) => formatCoverageZone(zone)).filter(Boolean);
  const coverageArea =
    coverageZones
      .map((zone) => String(zone || '').trim())
      .filter(Boolean)
      .join(', ') || String(profile?.coverage_area || '').trim();
  const province = String(profile?.service_province || '').trim();
  const district = String(profile?.service_district || '').trim();
  const serviceCity = String(profile?.service_city || '').trim();
  const city =
    String(row.technician_city || '').trim() ||
    serviceCity ||
    String(profile?.city || '').trim() ||
    getCoverageCityFallback(coverageArea);
  const technicianName =
    String(row.technician_name || '').trim() ||
    String(profile?.full_name || '').trim() ||
    String(profile?.business_name || '').trim() ||
    'Tecnico';

  return {
    id: String(row.id),
    technicianId: String(row.technician_id || ''),
    technicianName,
    businessName: String(profile?.business_name || '').trim() || null,
    specialty: String(row.technician_specialty || '').trim() || String(profile?.specialties || '').trim() || 'General',
    province: province || null,
    district: district || null,
    city,
    coverageZones,
    coverageArea: coverageArea || null,
    phone: String(row.technician_phone || '').trim() || String(profile?.phone || '').trim() || '',
    workingHours: String(profile?.working_hours || '').trim() || null,
    priceArs: toNumberOrNull(row.price_ars),
    etaHours: toNumberOrNull(row.eta_hours),
    quoteStatus: String(row.quote_status || 'pending'),
    rating,
    reviewsCount: toInt(profile?.public_reviews_count, 0),
    completedJobsTotal: toInt(profile?.completed_jobs_total, 0),
    referencesSummary: String(profile?.references_summary || '').trim() || null,
    recommendations,
    badges: parseBadgeArray(profile?.achievement_badges),
    visibilityScore: getTechnicianVisibilityScore(profile),
  };
};

const mapRequestRow = (
  row: AnyRecord,
  quoteRows: AnyRecord[],
  eventRows: AnyRecord[],
  profilesById: Map<string, AnyRecord>
) => ({
  id: String(row.id),
  title: String(row.title || ''),
  category: String(row.category || ''),
  address: String(row.address || ''),
  city: String(row.city || ''),
  description: String(row.description || ''),
  urgency: String(row.urgency || 'media'),
  preferredWindow: String(row.preferred_window || ''),
  mode: String(row.mode || 'marketplace'),
  status: isRequestStatus(row.status) ? String(row.status) : 'published',
  updatedAt: toIso(row.updated_at),
  targetTechId: row.target_technician_id ? String(row.target_technician_id) : null,
  targetTechName: row.target_technician_name ? String(row.target_technician_name) : null,
  targetTechPhone: row.target_technician_phone ? String(row.target_technician_phone) : null,
  assignedTechId: row.assigned_technician_id ? String(row.assigned_technician_id) : null,
  assignedTechName: row.assigned_technician_name ? String(row.assigned_technician_name) : null,
  assignedTechPhone: row.assigned_technician_phone ? String(row.assigned_technician_phone) : null,
  directExpiresAt: row.direct_expires_at ? toIso(row.direct_expires_at) : null,
  selectedQuoteId: row.selected_match_id ? String(row.selected_match_id) : null,
  quotes: quoteRows.map((quoteRow) => mapQuoteRow(quoteRow, profilesById.get(String(quoteRow.technician_id || '')))),
  timeline: eventRows.map((event) => ({
    id: String(event.id),
    at: toIso(event.created_at),
    label: String(event.label || ''),
  })),
});

export const getClientWorkspaceSnapshot = async (supabase: any, userId: string) => {
  const { data: requestRows, error: requestError } = await supabase
    .from('client_requests')
    .select('*')
    .eq('client_id', userId)
    .order('updated_at', { ascending: false });

  if (requestError) {
    throw new Error(requestError.message || 'No pudimos cargar solicitudes.');
  }

  const requests = (requestRows || []) as AnyRecord[];
  const requestIds = requests.map((row) => String(row.id));

  let matches: AnyRecord[] = [];
  let events: AnyRecord[] = [];

  if (requestIds.length) {
    const [{ data: matchRows, error: matchError }, { data: eventRows, error: eventError }] = await Promise.all([
      supabase
        .from('client_request_matches')
        .select('*')
        .in('request_id', requestIds)
        .order('score', { ascending: false })
        .order('created_at', { ascending: false }),
      supabase
        .from('client_request_events')
        .select('*')
        .in('request_id', requestIds)
        .order('created_at', { ascending: false }),
    ]);

    if (matchError) {
      throw new Error(matchError.message || 'No pudimos cargar matches.');
    }
    if (eventError) {
      throw new Error(eventError.message || 'No pudimos cargar timeline.');
    }

    matches = (matchRows || []) as AnyRecord[];
    events = (eventRows || []) as AnyRecord[];
  }

  const matchMap = new Map<string, AnyRecord[]>();
  matches.forEach((row) => {
    const requestId = String(row.request_id);
    const list = matchMap.get(requestId) || [];
    list.push(row);
    matchMap.set(requestId, list);
  });

  const profilesById = new Map<string, AnyRecord>();
  const technicianIds = Array.from(
    new Set(
      matches
        .map((row) => String(row.technician_id || '').trim())
        .filter(Boolean)
    )
  );
  if (technicianIds.length) {
    let profileRows: AnyRecord[] = [];
    let profileError: any = null;

    const withGeo = await supabase
      .from('profiles')
      .select(PROFILE_PUBLIC_GEO_SELECT)
      .in('id', technicianIds);

    if (withGeo.error && shouldFallbackGeoSelect(String(withGeo.error.message || ''))) {
      const fallback = await supabase
        .from('profiles')
        .select(PROFILE_PUBLIC_BASE_SELECT)
        .in('id', technicianIds);
      profileRows = (fallback.data || []) as AnyRecord[];
      profileError = fallback.error;
    } else {
      profileRows = (withGeo.data || []) as AnyRecord[];
      profileError = withGeo.error;
    }

    if (!profileError) {
      (profileRows || []).forEach((profile: AnyRecord) => {
        const id = String(profile?.id || '').trim();
        if (id) {
          profilesById.set(id, profile);
        }
      });
    }
  }

  const eventMap = new Map<string, AnyRecord[]>();
  events.forEach((row) => {
    const requestId = String(row.request_id);
    const list = eventMap.get(requestId) || [];
    list.push(row);
    eventMap.set(requestId, list);
  });

  return {
    requests: requests.map((row) =>
      mapRequestRow(
        row,
        matchMap.get(String(row.id)) || [],
        eventMap.get(String(row.id)) || [],
        profilesById
      )
    ),
    knownTechnicians: buildKnownTechnicians(requests),
  };
};

export const loadClientRequest = async (supabase: any, requestId: string, userId: string) => {
  const { data, error } = await supabase
    .from('client_requests')
    .select('*')
    .eq('id', requestId)
    .eq('client_id', userId)
    .maybeSingle();

  if (error) throw new Error(error.message || 'No pudimos cargar la solicitud.');
  if (!data) throw new Error('Solicitud no encontrada.');
  return data as AnyRecord;
};

export const insertClientEvent = async (supabase: any, requestId: string, actorId: string, label: string) => {
  const { error } = await supabase.from('client_request_events').insert({
    request_id: requestId,
    actor_id: actorId,
    label,
  });
  if (error) {
    throw new Error(error.message || 'No pudimos registrar el evento.');
  }
};

export const ensureMarketplaceMatches = async (
  supabase: any,
  requestRow: AnyRecord,
  userId: string,
  limit = MARKETPLACE_MATCH_LIMIT
) => {
  const requestId = String(requestRow.id);
  const safeLimit = Math.max(1, Math.min(10, Number(limit) || MARKETPLACE_MATCH_LIMIT));

  const { data: existingRows, error: existingError } = await supabase
    .from('client_request_matches')
    .select('*')
    .eq('request_id', requestId)
    .order('score', { ascending: false })
    .order('created_at', { ascending: false });

  if (existingError) {
    throw new Error(existingError.message || 'No pudimos cargar matches.');
  }

  if (existingRows && existingRows.length) {
    return existingRows as AnyRecord[];
  }

  let profileRows: AnyRecord[] = [];

  const primary = await supabase
    .from('profiles')
    .select(PROFILE_MATCH_GEO_SELECT)
    .neq('id', userId)
    .eq('access_granted', true)
    .limit(500);

  if (primary.error && /access_granted/i.test(String(primary.error.message || ''))) {
    let fallbackData: AnyRecord[] = [];
    let fallbackError: any = null;

    const withGeoFallback = await supabase
      .from('profiles')
      .select(PROFILE_MATCH_GEO_SELECT)
      .neq('id', userId)
      .limit(500);

    if (withGeoFallback.error && shouldFallbackGeoSelect(String(withGeoFallback.error.message || ''))) {
      const noGeoFallback = await supabase
        .from('profiles')
        .select(PROFILE_MATCH_BASE_SELECT)
        .neq('id', userId)
        .limit(500);
      fallbackData = (noGeoFallback.data || []) as AnyRecord[];
      fallbackError = noGeoFallback.error;
    } else {
      fallbackData = (withGeoFallback.data || []) as AnyRecord[];
      fallbackError = withGeoFallback.error;
    }

    if (fallbackError) {
      throw new Error(fallbackError.message || 'No pudimos buscar tecnicos.');
    }
    profileRows = fallbackData;
  } else if (primary.error && shouldFallbackGeoSelect(String(primary.error.message || ''))) {
    const noGeoPrimary = await supabase
      .from('profiles')
      .select(PROFILE_MATCH_BASE_SELECT)
      .neq('id', userId)
      .eq('access_granted', true)
      .limit(500);
    if (noGeoPrimary.error) {
      throw new Error(noGeoPrimary.error.message || 'No pudimos buscar tecnicos.');
    }
    profileRows = (noGeoPrimary.data || []) as AnyRecord[];
  } else if (primary.error) {
    throw new Error(primary.error.message || 'No pudimos buscar tecnicos.');
  } else {
    profileRows = (primary.data || []) as AnyRecord[];
  }

  const categoryTokens = resolveTokensForCategory(requestRow.category);
  const requestCity = normalizeText(requestRow.city) || extractCityFromAddress(requestRow.address);
  const requestAddress = normalizeText(requestRow.address);

  const scored = profileRows
    .map((profile) => {
      const specialty = normalizeText(profile.specialties);
      const city = normalizeText(profile.service_city || profile.city);
      const coverageZones = parseBadgeArray(profile.coverage_zones).map((zone) => normalizeText(zone));
      const coverage = normalizeText(profile.coverage_area);
      const district = normalizeText(profile.service_district);
      const phone = String(profile.phone || '').trim();

      let score = 0;
      if (categoryTokens.some((token) => token && specialty.includes(token))) score += 8;
      if (requestCity && city === requestCity) score += 4;
      if (requestCity && coverage.includes(requestCity)) score += 3;
      if (requestCity && coverageZones.some((zone) => zone.includes(requestCity))) score += 3;
      if (requestCity && district.includes(requestCity)) score += 2;
      if (requestAddress && city && requestAddress.includes(city)) score += 2;
      if (phone) score += 1;
      score += getTechnicianVisibilityBonus(profile);

      return {
        profile,
        score,
        specialty: String(profile.specialties || '').trim() || String(requestRow.category || 'General'),
        city:
          String(profile.service_city || '').trim() ||
          String(profile.city || '').trim() ||
          String(profile.coverage_area || '').split(',')[0].trim(),
        lastSeenAt: profile.last_seen_at ? new Date(String(profile.last_seen_at)).getTime() : 0,
      };
    })
    .filter((candidate) => candidate.profile?.id && resolveTechName(candidate.profile))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.lastSeenAt !== a.lastSeenAt) return b.lastSeenAt - a.lastSeenAt;
      const aName = resolveTechName(a.profile);
      const bName = resolveTechName(b.profile);
      return aName.localeCompare(bName, 'es');
    });

  const topScored = scored.filter((candidate) => candidate.score > 0).slice(0, safeLimit);
  const selectedCandidates = (topScored.length ? topScored : scored).slice(0, safeLimit);

  if (!selectedCandidates.length) return [] as AnyRecord[];

  const payload = selectedCandidates.map((candidate) => ({
    request_id: requestId,
    technician_id: candidate.profile.id,
    technician_name: resolveTechName(candidate.profile),
    technician_phone: String(candidate.profile.phone || '').trim() || null,
    technician_specialty: candidate.specialty || null,
    technician_city: candidate.city || null,
    technician_rating: null,
    score: candidate.score,
    quote_status: 'pending',
    price_ars: null,
    eta_hours: null,
  }));

  const { error: upsertError } = await supabase
    .from('client_request_matches')
    .upsert(payload, { onConflict: 'request_id,technician_id' });

  if (upsertError) {
    throw new Error(upsertError.message || 'No pudimos guardar matches.');
  }

  const { data: refreshedRows, error: refreshedError } = await supabase
    .from('client_request_matches')
    .select('*')
    .eq('request_id', requestId)
    .order('score', { ascending: false })
    .order('created_at', { ascending: false });

  if (refreshedError) {
    throw new Error(refreshedError.message || 'No pudimos actualizar matches.');
  }

  return (refreshedRows || []) as AnyRecord[];
};
