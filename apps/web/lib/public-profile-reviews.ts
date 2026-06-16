export type PublicProfileReviewStats = {
  rating: number | null;
  reviewsCount: number;
  commentsCount: number;
};

const emptyStats: PublicProfileReviewStats = {
  rating: null,
  reviewsCount: 0,
  commentsCount: 0,
};

const isMissingReviewsSource = (message: string) => {
  const normalized = String(message || '').toLowerCase();
  return (
    normalized.includes('quote_feedback_reviews') ||
    normalized.includes('profile_public_reviews') ||
    normalized.includes('does not exist') ||
    normalized.includes('schema cache')
  );
};

const normalizeReviewRow = (row: any) => {
  const technicianId = String(row?.technician_id || '').trim();
  const rating = Math.max(1, Math.min(5, Math.round(Number(row?.rating || 0))));
  const comment = String(row?.comment || '').trim();
  if (!technicianId || !Number.isFinite(rating) || rating < 1) return null;
  return { technicianId, rating, hasComment: Boolean(comment) };
};

const loadReviewRows = async (supabase: any, table: string, profileIds: string[]) => {
  const { data, error } = await supabase
    .from(table)
    .select('technician_id, rating, comment')
    .in('technician_id', profileIds)
    .eq('is_public', true);

  if (error) {
    if (!isMissingReviewsSource(error.message || '')) {
      console.error(`Error loading ${table} stats:`, error);
    }
    return [];
  }

  return Array.isArray(data) ? data.map(normalizeReviewRow).filter(Boolean) : [];
};

export const fetchPublicReviewStatsByProfileIds = async (
  supabase: any,
  profileIds: string[]
): Promise<Map<string, PublicProfileReviewStats>> => {
  const uniqueProfileIds = Array.from(new Set(profileIds.map((id) => String(id || '').trim()).filter(Boolean)));
  const statsByProfile = new Map<string, PublicProfileReviewStats>();
  uniqueProfileIds.forEach((id) => statsByProfile.set(id, { ...emptyStats }));

  if (!supabase || uniqueProfileIds.length === 0) return statsByProfile;

  const [verifiedRows, profileRows] = await Promise.all([
    loadReviewRows(supabase, 'quote_feedback_reviews', uniqueProfileIds),
    loadReviewRows(supabase, 'profile_public_reviews', uniqueProfileIds),
  ]);

  const totals = new Map<string, { ratingSum: number; reviewsCount: number; commentsCount: number }>();
  [...verifiedRows, ...profileRows].forEach((row) => {
    if (!row) return;
    const current = totals.get(row.technicianId) || { ratingSum: 0, reviewsCount: 0, commentsCount: 0 };
    current.ratingSum += row.rating;
    current.reviewsCount += 1;
    if (row.hasComment) current.commentsCount += 1;
    totals.set(row.technicianId, current);
  });

  totals.forEach((total, profileId) => {
    statsByProfile.set(profileId, {
      rating: total.reviewsCount > 0 ? Number((total.ratingSum / total.reviewsCount).toFixed(1)) : null,
      reviewsCount: total.reviewsCount,
      commentsCount: total.commentsCount,
    });
  });

  return statsByProfile;
};
