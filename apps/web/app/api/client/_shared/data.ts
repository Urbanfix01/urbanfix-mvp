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

const resolveTechName = (profile: AnyRecord) =>
  String(profile?.full_name || profile?.business_name || 'Tecnico').trim() || 'Tecnico';

const normalizeResponseType = (value: unknown) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'application' || normalized === 'direct_quote') return normalized;
  return null;
};

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

const buildKnownTechnicians = (requestRows: AnyRecord[], matchRows: AnyRecord[]) => {
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

  matchRows.forEach((row) => {
    const technicianId = String(row.technician_id || '').trim();
    const technicianName = String(row.technician_name || '').trim();
    const technicianPhone = String(row.technician_phone || '').trim();
    if (!technicianId || !technicianName || !technicianPhone) return;
    if (seen.has(technicianId)) return;
    if (String(row.quote_status || '').trim() !== 'submitted' && String(row.quote_status || '').trim() !== 'accepted') {
      return;
    }
    seen.add(technicianId);
    result.push({
      id: technicianId,
      name: technicianName,
      phone: technicianPhone,
      specialty: String(row.technician_specialty || 'General').trim() || 'General',
      rating: toNumberOrNull(row.technician_rating),
      lastJobAt: row.updated_at,
    });
  });

  return result;
};

const mapQuoteRow = (row: AnyRecord) => ({
  id: String(row.id),
  technicianId: String(row.technician_id || ''),
  technicianName: String(row.technician_name || 'Tecnico'),
  specialty: String(row.technician_specialty || 'General'),
  phone: String(row.technician_phone || ''),
  priceArs: toNumberOrNull(row.price_ars),
  etaHours: toNumberOrNull(row.eta_hours),
  responseType: normalizeResponseType(row.response_type),
  responseMessage: String(row.response_message || '').trim(),
  visitEtaHours: toNumberOrNull(row.visit_eta_hours),
  quoteStatus: String(row.quote_status || 'pending'),
  rating: toNumberOrNull(row.technician_rating),
  submittedAt: row.submitted_at ? toIso(row.submitted_at) : null,
});

const mapFeedbackRow = (row: AnyRecord | null, requestRow: AnyRecord) => {
  if (!row) return null;

  const parsedRating = Math.round(Number(row.rating || 0));

  return {
    id: String(row.id),
    quoteId: row.quote_id ? String(row.quote_id) : null,
    matchId: row.client_request_match_id ? String(row.client_request_match_id) : null,
    technicianId: row.technician_id
      ? String(row.technician_id)
      : requestRow.assigned_technician_id
        ? String(requestRow.assigned_technician_id)
        : requestRow.target_technician_id
          ? String(requestRow.target_technician_id)
          : null,
    technicianName:
      String(
        row.technician_name_snapshot ||
          requestRow.assigned_technician_name ||
          requestRow.target_technician_name ||
          'Tecnico UrbanFix'
      ).trim() || 'Tecnico UrbanFix',
    rating: Math.min(5, Math.max(1, Number.isFinite(parsedRating) ? parsedRating : 1)),
    comment: String(row.comment || '').trim(),
    isPublic: Boolean(row.is_public),
    createdAt: row.created_at ? toIso(row.created_at) : null,
    updatedAt: row.updated_at ? toIso(row.updated_at) : null,
  };
};

const mapRequestRow = (
  row: AnyRecord,
  quoteRows: AnyRecord[],
  eventRows: AnyRecord[],
  feedbackRow: AnyRecord | null
) => ({
  id: String(row.id),
  title: String(row.title || ''),
  category: String(row.category || ''),
  address: String(row.address || ''),
  city: String(row.city || ''),
  province: String(row.province || ''),
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
  photoUrls: Array.isArray(row.photo_urls)
    ? row.photo_urls
        .map((value: unknown) => String(value || '').trim())
        .filter(Boolean)
    : [],
  responses: quoteRows.map(mapQuoteRow),
  quotes: quoteRows.map(mapQuoteRow),
  timeline: eventRows.map((event) => ({
    id: String(event.id),
    at: toIso(event.created_at),
    label: String(event.label || ''),
  })),
  feedbackAllowed:
    String(row.status || '').trim() === 'completed' &&
    Boolean(row.assigned_technician_id || row.selected_match_id || row.target_technician_id),
  feedback: mapFeedbackRow(feedbackRow, row),
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
  let feedbackRows: AnyRecord[] = [];

  if (requestIds.length) {
    const [
      { data: matchRows, error: matchError },
      { data: eventRows, error: eventError },
      { data: feedbackData, error: feedbackError },
    ] = await Promise.all([
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
      supabase
        .from('client_request_feedback')
        .select('*')
        .in('client_request_id', requestIds)
        .eq('client_id', userId)
        .order('updated_at', { ascending: false }),
    ]);

    if (matchError) {
      throw new Error(matchError.message || 'No pudimos cargar matches.');
    }
    if (eventError) {
      throw new Error(eventError.message || 'No pudimos cargar timeline.');
    }
    if (feedbackError) {
      throw new Error(feedbackError.message || 'No pudimos cargar las resenas del trabajo.');
    }

    matches = (matchRows || []) as AnyRecord[];
    events = (eventRows || []) as AnyRecord[];
    feedbackRows = (feedbackData || []) as AnyRecord[];
  }

  const matchMap = new Map<string, AnyRecord[]>();
  matches.forEach((row) => {
    const requestId = String(row.request_id);
    const list = matchMap.get(requestId) || [];
    list.push(row);
    matchMap.set(requestId, list);
  });

  const eventMap = new Map<string, AnyRecord[]>();
  events.forEach((row) => {
    const requestId = String(row.request_id);
    const list = eventMap.get(requestId) || [];
    list.push(row);
    eventMap.set(requestId, list);
  });

  const feedbackMap = new Map<string, AnyRecord>();
  feedbackRows.forEach((row) => {
    const requestId = String(row.client_request_id || '');
    if (!requestId || feedbackMap.has(requestId)) return;
    feedbackMap.set(requestId, row);
  });

  return {
    requests: requests.map((row) =>
      mapRequestRow(
        row,
        matchMap.get(String(row.id)) || [],
        eventMap.get(String(row.id)) || [],
        feedbackMap.get(String(row.id)) || null
      )
    ),
    knownTechnicians: buildKnownTechnicians(requests, matches),
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

  const profileSelect = 'id,full_name,business_name,phone,specialties,city,coverage_area,last_seen_at';
  let profileRows: AnyRecord[] = [];

  const primary = await supabase
    .from('profiles')
    .select(profileSelect)
    .neq('id', userId)
    .eq('access_granted', true)
    .limit(500);

  if (primary.error && /access_granted/i.test(String(primary.error.message || ''))) {
    const fallback = await supabase.from('profiles').select(profileSelect).neq('id', userId).limit(500);
    if (fallback.error) {
      throw new Error(fallback.error.message || 'No pudimos buscar tecnicos.');
    }
    profileRows = (fallback.data || []) as AnyRecord[];
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
      const city = normalizeText(profile.city);
      const coverage = normalizeText(profile.coverage_area);
      const phone = String(profile.phone || '').trim();

      let score = 0;
      if (categoryTokens.some((token) => token && specialty.includes(token))) score += 8;
      if (requestCity && city === requestCity) score += 4;
      if (requestCity && coverage.includes(requestCity)) score += 3;
      if (requestAddress && city && requestAddress.includes(city)) score += 2;
      if (phone) score += 1;

      return {
        profile,
        score,
        specialty: String(profile.specialties || '').trim() || String(requestRow.category || 'General'),
        city: String(profile.city || '').trim(),
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
    response_type: null,
    response_message: null,
    visit_eta_hours: null,
    submitted_at: null,
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
