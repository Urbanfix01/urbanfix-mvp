export const PUBLIC_PROFILE_SELECT_RICH = [
  'id',
  'access_granted',
  'profile_published',
  'full_name',
  'business_name',
  'phone',
  'city',
  'coverage_area',
  'working_hours',
  'specialties',
  'avatar_url',
  'company_logo_url',
  'banner_url',
  'facebook_url',
  'instagram_url',
  'public_rating',
  'public_reviews_count',
  'completed_jobs_total',
  'references_summary',
  'client_recommendations',
  'achievement_badges',
  'public_likes_count',
  'created_at',
].join(',');

export const PUBLIC_PROFILE_SELECT_FALLBACK = [
  'id',
  'access_granted',
  'profile_published',
  'full_name',
  'business_name',
  'phone',
  'city',
  'coverage_area',
  'specialties',
  'created_at',
].join(',');

export const PUBLISHED_TECHNICIANS_SELECT_RICH = [
  'id',
  'access_granted',
  'profile_published',
  'full_name',
  'business_name',
  'phone',
  'address',
  'company_address',
  'city',
  'coverage_area',
  'working_hours',
  'service_lat',
  'service_lng',
  'service_radius_km',
  'specialties',
  'company_logo_url',
  'avatar_url',
  'banner_url',
  'facebook_url',
  'instagram_url',
  'public_likes_count',
  'public_rating',
  'public_reviews_count',
  'completed_jobs_total',
  'created_at',
].join(',');

export const PUBLISHED_TECHNICIANS_SELECT_FALLBACK = [
  'id',
  'access_granted',
  'profile_published',
  'full_name',
  'business_name',
  'phone',
  'address',
  'city',
  'coverage_area',
  'service_lat',
  'service_lng',
  'specialties',
  'created_at',
].join(',');

export const isMissingPublicProfileFieldError = (message: string) => {
  const normalized = String(message || '').toLowerCase();
  return (
    normalized.includes('column') ||
    normalized.includes('schema cache') ||
    normalized.includes('working_hours') ||
    normalized.includes('avatar_url') ||
    normalized.includes('company_logo_url') ||
    normalized.includes('banner_url') ||
    normalized.includes('facebook_url') ||
    normalized.includes('instagram_url') ||
    normalized.includes('public_likes_count') ||
    normalized.includes('public_reviews_count') ||
    normalized.includes('completed_jobs_total') ||
    normalized.includes('achievement_badges') ||
    normalized.includes('references_summary') ||
    normalized.includes('client_recommendations') ||
    normalized.includes('company_address') ||
    normalized.includes('service_radius_km')
  );
};