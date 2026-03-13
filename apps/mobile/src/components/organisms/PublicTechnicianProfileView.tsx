import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Platform,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import {
  ClientTechnicianProfile,
  ClientTechnicianProfilePayload,
  fetchClientTechnicianProfile,
  fetchTechnicianProfileLikes,
  toggleTechnicianProfileLike,
} from '../../api/client';
import { ScreenHeader } from '../molecules/ScreenHeader';
import { getStatusLabelEs } from '../../utils/status';
import { COLORS, FONTS } from '../../utils/theme';
import { getPublicTechnicianProfileUrl } from '../../utils/config';

type PublicTechnicianProfileViewProps = {
  technicianId: string;
  headerTitle: string;
  headerSubtitle: string;
  heroEyebrow?: string;
  previewNote?: string;
  loadingMessage?: string;
  emptyMessage?: string;
  technicianFallback?: Partial<ClientTechnicianProfile> | null;
  shareProfileId?: string | null;
  shareUnavailableReason?: string;
};

type SocialPlatform = 'instagram' | 'facebook';

type SocialActionLink = {
  key: SocialPlatform;
  label: string;
  icon: 'logo-instagram' | 'logo-facebook';
  url: string;
  accentColor: string;
};

type SocialProfileCard = {
  key: SocialPlatform;
  label: string;
  ctaLabel: string;
  icon: 'logo-instagram' | 'logo-facebook';
  url: string;
  accentColor: string;
  surfaceColor: string;
  handle: string;
  copy: string;
  description: string;
};

type SocialPostCard = {
  key: SocialPlatform;
  label: string;
  ctaLabel: string;
  icon: 'logo-instagram' | 'logo-facebook';
  url: string;
  embedUrl: string | null;
  accentColor: string;
  surfaceColor: string;
  copy: string;
};

const HtmlFrame = 'iframe' as any;

const toErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message.trim() ? error.message : fallback;

const isValidUrl = (value: string | null | undefined) => {
  const safeValue = String(value || '').trim();
  return safeValue.startsWith('http://') || safeValue.startsWith('https://');
};

const getInitials = (value: string) => {
  const safeValue = value.trim();
  if (!safeValue) return 'UF';
  const parts = safeValue.split(/\s+/).filter(Boolean);
  return parts.length === 1
    ? parts[0].slice(0, 2).toUpperCase()
    : `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
};

const formatCount = (value: number, singular: string, plural: string) => {
  const safeValue = Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0;
  return `${safeValue} ${safeValue === 1 ? singular : plural}`;
};

const formatMetricNumber = (value: number | null | undefined) => {
  const safeValue = Number(value || 0);
  if (!Number.isFinite(safeValue)) return '0';
  return String(Math.max(0, Math.round(safeValue)));
};

const getCoverageLabel = (technician: ClientTechnicianProfile | null) =>
  technician?.coverage_area || technician?.city || 'Cobertura no informada';

const createFallbackTechnician = (
  fallback: Partial<ClientTechnicianProfile> | null | undefined
): ClientTechnicianProfile | null => {
  if (!fallback?.id) return null;

  const businessName = String(fallback.business_name || fallback.name || '').trim();
  const fullName = String(fallback.full_name || '').trim();
  const companyName = businessName || fullName || 'Tecnico UrbanFix';
  const city = String(fallback.city || '').trim() || 'Argentina';
  const specialty = String(fallback.specialty || '').trim() || 'Servicios generales';

  return {
    id: String(fallback.id),
    name: String(fallback.name || companyName),
    business_name: businessName || null,
    full_name: fullName || null,
    phone: fallback.phone || null,
    city,
    specialty,
    rating: Number.isFinite(Number(fallback.rating)) ? Number(fallback.rating) : null,
    available_now: Boolean(fallback.available_now),
    address: String(fallback.address || fallback.coverage_area || city),
    coverage_area: fallback.coverage_area || null,
    company_logo_url: fallback.company_logo_url || null,
    avatar_url: fallback.avatar_url || null,
    working_hours_label: fallback.working_hours_label || 'Horario no informado',
    public_reviews_count: Math.max(0, Number(fallback.public_reviews_count || 0)),
    completed_jobs_total: Math.max(0, Number(fallback.completed_jobs_total || 0)),
    public_likes_count: Math.max(0, Number(fallback.public_likes_count || 0)),
    references_summary: fallback.references_summary || null,
    client_recommendations: fallback.client_recommendations || null,
    achievement_badges: Array.isArray(fallback.achievement_badges) ? fallback.achievement_badges : [],
    instagram_profile_url: fallback.instagram_profile_url || null,
    facebook_profile_url: fallback.facebook_profile_url || null,
    instagram_post_url: fallback.instagram_post_url || null,
    facebook_post_url: fallback.facebook_post_url || null,
    work_photo_urls: Array.isArray(fallback.work_photo_urls) ? fallback.work_photo_urls : [],
    recent_works: Array.isArray(fallback.recent_works) ? fallback.recent_works : [],
    reviews: Array.isArray(fallback.reviews) ? fallback.reviews : [],
    lat: Number.isFinite(Number(fallback.lat)) ? Number(fallback.lat) : null,
    lng: Number.isFinite(Number(fallback.lng)) ? Number(fallback.lng) : null,
    geo_source: fallback.geo_source || null,
  };
};

const mergeTechnicianWithFallback = (
  remote: ClientTechnicianProfile | null,
  fallback: Partial<ClientTechnicianProfile> | null | undefined
) => {
  const fallbackTechnician = createFallbackTechnician(fallback);

  if (!remote) return fallbackTechnician;
  if (!fallbackTechnician) return remote;
  if (String(remote.id) !== String(fallbackTechnician.id)) return remote;

  return {
    ...remote,
    name: fallbackTechnician.name || remote.name,
    business_name: fallbackTechnician.business_name ?? remote.business_name,
    full_name: fallbackTechnician.full_name ?? remote.full_name,
    phone: fallbackTechnician.phone ?? remote.phone,
    city: fallbackTechnician.city || remote.city,
    specialty: fallbackTechnician.specialty || remote.specialty,
    address: fallbackTechnician.address || remote.address,
    coverage_area: fallbackTechnician.coverage_area ?? remote.coverage_area,
    company_logo_url: fallbackTechnician.company_logo_url ?? remote.company_logo_url,
    avatar_url: fallbackTechnician.avatar_url ?? remote.avatar_url,
    working_hours_label: fallbackTechnician.working_hours_label || remote.working_hours_label,
    rating:
      fallbackTechnician.rating !== null && fallbackTechnician.rating !== undefined
        ? fallbackTechnician.rating
        : remote.rating,
    public_reviews_count: Math.max(remote.public_reviews_count || 0, fallbackTechnician.public_reviews_count || 0),
    completed_jobs_total: Math.max(remote.completed_jobs_total || 0, fallbackTechnician.completed_jobs_total || 0),
    public_likes_count: Math.max(remote.public_likes_count || 0, fallbackTechnician.public_likes_count || 0),
    references_summary: fallbackTechnician.references_summary ?? remote.references_summary,
    client_recommendations: fallbackTechnician.client_recommendations ?? remote.client_recommendations,
    achievement_badges:
      fallbackTechnician.achievement_badges.length > 0 ? fallbackTechnician.achievement_badges : remote.achievement_badges,
    instagram_profile_url: fallbackTechnician.instagram_profile_url ?? remote.instagram_profile_url,
    facebook_profile_url: fallbackTechnician.facebook_profile_url ?? remote.facebook_profile_url,
    instagram_post_url: fallbackTechnician.instagram_post_url ?? remote.instagram_post_url,
    facebook_post_url: fallbackTechnician.facebook_post_url ?? remote.facebook_post_url,
    work_photo_urls: fallbackTechnician.work_photo_urls.length > 0 ? fallbackTechnician.work_photo_urls : remote.work_photo_urls,
  };
};

const getSummaryText = (technician: ClientTechnicianProfile | null) => {
  if (!technician) return 'Perfil publico no disponible.';
  if (technician.references_summary) return technician.references_summary;

  const parts = [
    technician.specialty || 'Servicios generales',
    technician.city ? `Base en ${technician.city}` : '',
    technician.coverage_area ? `cobertura ${technician.coverage_area}` : '',
  ].filter(Boolean);

  return parts.length
    ? `${parts.join(' | ')}. Perfil visible para clientes de UrbanFix.`
    : 'Perfil visible para clientes de UrbanFix.';
};

const getSocialDisplayUrl = (value: string) => {
  try {
    const parsed = new URL(value);
    const raw = `${parsed.hostname.replace(/^www\./i, '')}${parsed.pathname.replace(/\/+$/, '')}`;
    return raw.length > 52 ? `${raw.slice(0, 49)}...` : raw;
  } catch {
    return value;
  }
};

const getSocialHandle = (value: string, platform: SocialPlatform) => {
  try {
    const parsed = new URL(value);
    const segments = parsed.pathname
      .split('/')
      .map((segment) => segment.trim())
      .filter(Boolean);
    const primary = segments[0] || '';
    if (!primary || primary.toLowerCase() === 'profile.php') {
      return getSocialDisplayUrl(value);
    }
    if (platform === 'instagram') {
      return `@${primary.replace(/^@/, '')}`;
    }
    return primary.startsWith('@') ? primary : `@${primary}`;
  } catch {
    return getSocialDisplayUrl(value);
  }
};

const getInstagramEmbedUrl = (value: string) => {
  try {
    const parsed = new URL(value);
    const path = parsed.pathname.endsWith('/') ? parsed.pathname : `${parsed.pathname}/`;
    return `https://www.instagram.com${path}embed/captioned/`;
  } catch {
    return null;
  }
};

const getFacebookEmbedUrl = (value: string) =>
  `https://www.facebook.com/plugins/post.php?href=${encodeURIComponent(value)}&show_text=true&width=500`;

const getSocialProfiles = (technician: ClientTechnicianProfile | null): SocialProfileCard[] => {
  if (!technician) return [];

  const cards: SocialProfileCard[] = [];

  if (isValidUrl(technician.instagram_profile_url)) {
    cards.push({
      key: 'instagram',
      label: 'Instagram',
      ctaLabel: 'Ver perfil',
      icon: 'logo-instagram',
      url: technician.instagram_profile_url!,
      accentColor: '#C13584',
      surfaceColor: '#FFF1F7',
      handle: getSocialHandle(technician.instagram_profile_url!, 'instagram'),
      copy: getSocialDisplayUrl(technician.instagram_profile_url!),
      description: 'Cuenta comercial para que clientes vean la marca y contenido reciente.',
    });
  }

  if (isValidUrl(technician.facebook_profile_url)) {
    cards.push({
      key: 'facebook',
      label: 'Facebook',
      ctaLabel: 'Ver pagina',
      icon: 'logo-facebook',
      url: technician.facebook_profile_url!,
      accentColor: '#1877F2',
      surfaceColor: '#EEF4FF',
      handle: getSocialHandle(technician.facebook_profile_url!, 'facebook'),
      copy: getSocialDisplayUrl(technician.facebook_profile_url!),
      description: 'Canal comercial para recomendaciones, consultas y seguimiento de obras.',
    });
  }

  return cards;
};

const getSocialPosts = (technician: ClientTechnicianProfile | null): SocialPostCard[] => {
  if (!technician) return [];

  const cards: SocialPostCard[] = [];

  if (isValidUrl(technician.instagram_post_url)) {
    cards.push({
      key: 'instagram',
      label: 'Instagram',
      ctaLabel: 'Abrir Instagram',
      icon: 'logo-instagram',
      url: technician.instagram_post_url!,
      embedUrl: getInstagramEmbedUrl(technician.instagram_post_url!),
      accentColor: '#C13584',
      surfaceColor: '#FFF1F7',
      copy: getSocialDisplayUrl(technician.instagram_post_url!),
    });
  }

  if (isValidUrl(technician.facebook_post_url)) {
    cards.push({
      key: 'facebook',
      label: 'Facebook',
      ctaLabel: 'Abrir Facebook',
      icon: 'logo-facebook',
      url: technician.facebook_post_url!,
      embedUrl: getFacebookEmbedUrl(technician.facebook_post_url!),
      accentColor: '#1877F2',
      surfaceColor: '#EEF4FF',
      copy: getSocialDisplayUrl(technician.facebook_post_url!),
    });
  }

  return cards;
};

const getSocialActions = (technician: ClientTechnicianProfile | null): SocialActionLink[] => {
  if (!technician) return [];

  const links: SocialActionLink[] = [];
  const instagramUrl = isValidUrl(technician.instagram_profile_url)
    ? technician.instagram_profile_url
    : isValidUrl(technician.instagram_post_url)
      ? technician.instagram_post_url
      : null;
  const facebookUrl = isValidUrl(technician.facebook_profile_url)
    ? technician.facebook_profile_url
    : isValidUrl(technician.facebook_post_url)
      ? technician.facebook_post_url
      : null;

  if (instagramUrl) {
    links.push({
      key: 'instagram',
      label: 'Instagram',
      icon: 'logo-instagram',
      url: instagramUrl,
      accentColor: '#C13584',
    });
  }

  if (facebookUrl) {
    links.push({
      key: 'facebook',
      label: 'Facebook',
      icon: 'logo-facebook',
      url: facebookUrl,
      accentColor: '#1877F2',
    });
  }

  return links;
};

const getWhatsappDigits = (phone: string | null | undefined) => String(phone || '').replace(/\D/g, '');

const formatDateLabel = (value: string | null | undefined) => {
  const safeValue = String(value || '').trim();
  if (!safeValue) return 'Fecha no informada';
  const date = new Date(safeValue);
  return Number.isNaN(date.getTime())
    ? 'Fecha no informada'
    : date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });
};

const buildShareMessage = (
  technician: ClientTechnicianProfile | null,
  companyName: string,
  locality: string,
  coverage: string,
  shareUrl: string
) =>
  [
    companyName,
    technician?.specialty || 'Servicios generales',
    `Localidad: ${locality}`,
    `Cobertura: ${coverage}`,
    technician?.phone ? `WhatsApp: ${technician.phone}` : '',
    'Perfil publicado en UrbanFix',
    shareUrl,
  ]
    .filter(Boolean)
    .join('\n');

export default function PublicTechnicianProfileView({
  technicianId,
  headerTitle,
  headerSubtitle,
  heroEyebrow = 'Tecnico publicado',
  previewNote,
  loadingMessage = 'Cargando perfil del tecnico...',
  emptyMessage = 'No encontramos el perfil solicitado.',
  technicianFallback = null,
  shareProfileId = null,
  shareUnavailableReason = 'Todavia no pudimos generar un link publico para este perfil.',
}: PublicTechnicianProfileViewProps) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [payload, setPayload] = useState<ClientTechnicianProfilePayload | null>(null);
  const [likesCount, setLikesCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [liking, setLiking] = useState(false);

  const loadProfile = useCallback(
    async (isRefresh = false) => {
      if (!technicianId) {
        setErrorMessage('Tecnico invalido.');
        setPayload(null);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      setErrorMessage('');
      try {
        const [profileResult, likesResult] = await Promise.allSettled([
          fetchClientTechnicianProfile(technicianId),
          fetchTechnicianProfileLikes(technicianId),
        ]);

        if (profileResult.status === 'rejected') throw profileResult.reason;

        const nextPayload = profileResult.value;
        setPayload(nextPayload);

        if (likesResult.status === 'fulfilled') {
          setLikesCount(Math.max(0, Number(likesResult.value.likesCount || 0)));
          setLiked(Boolean(likesResult.value.liked));
        } else {
          setLikesCount(Math.max(0, Number(nextPayload.technician.public_likes_count || 0)));
          setLiked(false);
        }
      } catch (error) {
        setPayload(null);
        setLikesCount(0);
        setLiked(false);
        setErrorMessage(toErrorMessage(error, 'No pudimos cargar el perfil del tecnico.'));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [technicianId]
  );

  useFocusEffect(
    useCallback(() => {
      void loadProfile();
    }, [loadProfile])
  );

  const technician = useMemo(
    () => mergeTechnicianWithFallback(payload?.technician || null, technicianFallback),
    [payload?.technician, technicianFallback]
  );
  const socialProfiles = useMemo(() => getSocialProfiles(technician), [technician]);
  const socialPosts = useMemo(() => getSocialPosts(technician), [technician]);
  const socialActions = useMemo(() => getSocialActions(technician), [technician]);
  const companyName = technician?.business_name || technician?.name || 'Tecnico UrbanFix';
  const personName =
    technician?.full_name && technician.full_name.trim() !== companyName.trim() ? technician.full_name.trim() : '';
  const locality = technician?.city || 'Argentina';
  const coverage = getCoverageLabel(technician);
  const heroLogoUrl = isValidUrl(technician?.company_logo_url) ? technician?.company_logo_url : null;
  const avatarUrl = isValidUrl(technician?.avatar_url)
    ? technician?.avatar_url
    : isValidUrl(technician?.company_logo_url)
      ? technician?.company_logo_url
      : null;
  const workPhotos = Array.isArray(technician?.work_photo_urls) ? technician!.work_photo_urls : [];
  const recentWorks = Array.isArray(technician?.recent_works) ? technician!.recent_works : [];
  const reviews = Array.isArray(technician?.reviews) ? technician!.reviews : [];
  const badges = Array.isArray(technician?.achievement_badges) ? technician!.achievement_badges : [];
  const resolvedShareProfileId = String(shareProfileId || technician?.id || '').trim();
  const shareUrl = resolvedShareProfileId ? getPublicTechnicianProfileUrl(resolvedShareProfileId) : '';
  const metricCards = [
    {
      key: 'rating',
      value: technician?.rating && Number(technician.rating) > 0 ? Number(technician.rating).toFixed(1) : '0.0',
      label: 'Calificacion',
      detail: technician?.rating && Number(technician.rating) > 0 ? 'Rating publico' : 'Aun sin rating',
    },
    {
      key: 'reviews',
      value: formatMetricNumber(technician?.public_reviews_count),
      label: 'Resenas',
      detail: formatCount(technician?.public_reviews_count || 0, 'resena', 'resenas'),
    },
    {
      key: 'jobs',
      value: formatMetricNumber(technician?.completed_jobs_total),
      label: 'Obras',
      detail: formatCount(technician?.completed_jobs_total || 0, 'trabajo', 'trabajos'),
    },
    {
      key: 'likes',
      value: formatMetricNumber(likesCount),
      label: 'Me gusta',
      detail: likesCount === 1 ? '1 cliente lo guardo' : `${formatMetricNumber(likesCount)} clientes lo guardaron`,
    },
  ];

  const handleOpenExternal = async (url: string, fallbackLabel: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      setErrorMessage(`No pudimos abrir ${fallbackLabel.toLowerCase()} en este dispositivo.`);
    }
  };

  const handleOpenWhatsapp = async () => {
    const digits = getWhatsappDigits(technician?.phone);
    if (digits.length < 8) {
      setErrorMessage('Este perfil todavia no tiene WhatsApp cargado.');
      return;
    }
    await handleOpenExternal(`https://wa.me/${digits}`, 'WhatsApp');
  };

  const handleShareProfile = async () => {
    if (!shareUrl) {
      setErrorMessage(shareUnavailableReason);
      return;
    }

    const message = buildShareMessage(technician, companyName, locality, coverage, shareUrl);

    if (Platform.OS === 'web') {
      const browserNavigator = typeof navigator !== 'undefined' ? (navigator as any) : null;
      try {
        if (browserNavigator?.share) {
          await browserNavigator.share({ title: companyName, text: message, url: shareUrl || undefined });
          return;
        }
        if (browserNavigator?.clipboard?.writeText) {
          await browserNavigator.clipboard.writeText(message);
          if (typeof window !== 'undefined') window.alert('Perfil copiado para compartir.');
          return;
        }
      } catch {
        // fallback below
      }
      if (typeof window !== 'undefined') window.prompt('Copia este perfil', message);
      return;
    }

    try {
      await Share.share({ title: companyName, message, url: shareUrl || undefined });
    } catch {
      setErrorMessage('No pudimos compartir el perfil en este dispositivo.');
    }
  };

  const handleToggleLike = async () => {
    if (!technicianId || liking) return;
    try {
      setLiking(true);
      const nextState = await toggleTechnicianProfileLike(technicianId);
      setLikesCount(Math.max(0, Number(nextState.likesCount || 0)));
      setLiked(Boolean(nextState.liked));
    } catch (error) {
      setErrorMessage(toErrorMessage(error, 'No pudimos registrar el like del perfil.'));
    } finally {
      setLiking(false);
    }
  };

  const infoRows: Array<{
    icon: React.ComponentProps<typeof Ionicons>['name'];
    label: string;
    value: string;
  }> = [
    { icon: 'build-outline' as const, label: 'Especialidad', value: technician?.specialty || 'Servicios generales' },
    { icon: 'location-outline' as const, label: 'Localidad', value: locality },
    { icon: 'navigate-outline' as const, label: 'Cobertura', value: coverage },
    { icon: 'time-outline' as const, label: 'Horario', value: technician?.working_hours_label || 'Horario no informado' },
  ];

  if (technician?.phone) {
    infoRows.push({ icon: 'logo-whatsapp' as const, label: 'Contacto', value: technician.phone });
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title={headerTitle} subtitle={headerSubtitle} showBack />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.primary} />
          <Text style={styles.loadingText}>{loadingMessage}</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadProfile(true)} />}
          showsVerticalScrollIndicator={false}
        >
          {!!previewNote && (
            <View style={styles.noteCard}>
              <Ionicons name="eye-outline" size={18} color="#92400E" />
              <Text style={styles.noteText}>{previewNote}</Text>
            </View>
          )}
          {technician ? (
            <>
              <View style={styles.heroCard}>
                <View style={styles.heroCover}>
                  <View style={styles.heroGlowBlue} />
                  <View style={styles.heroGlowOrange} />
                  <Text style={styles.heroEyebrow}>{heroEyebrow}</Text>

                  {heroLogoUrl ? (
                    <View style={styles.heroLogoWrap}>
                      <Image source={{ uri: heroLogoUrl }} style={styles.heroLogo} resizeMode="contain" />
                    </View>
                  ) : (
                    <View style={styles.heroLogoFallback}>
                      <Text style={styles.heroLogoFallbackText}>{getInitials(companyName)}</Text>
                    </View>
                  )}

                  <View style={styles.heroIdentity}>
                    <View style={styles.avatarFrame}>
                      {avatarUrl ? (
                        <Image source={{ uri: avatarUrl }} style={styles.avatar} />
                      ) : (
                        <View style={styles.avatarFallback}>
                          <Text style={styles.avatarFallbackText}>{getInitials(companyName)}</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.heroCopy}>
                      <Text style={styles.heroCompanyName}>{companyName}</Text>
                      {!!personName && <Text style={styles.heroPersonName}>{personName}</Text>}
                      <Text style={styles.heroSubtitle}>{`${technician.specialty || 'Servicios generales'} | ${locality}`}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.heroBody}>
                  <View style={styles.chipRow}>
                    <View style={[styles.chip, technician.available_now ? styles.chipSuccess : styles.chipWarning]}>
                      <Ionicons
                        name={technician.available_now ? 'checkmark-circle' : 'time-outline'}
                        size={13}
                        color={technician.available_now ? '#166534' : '#92400E'}
                      />
                      <Text style={[styles.chipText, technician.available_now ? styles.chipTextSuccess : styles.chipTextWarning]}>
                        {technician.available_now ? 'Disponible ahora' : 'Fuera de horario'}
                      </Text>
                    </View>
                    <View style={styles.metaChip}>
                      <Ionicons name="location-outline" size={13} color="#334155" />
                      <Text style={styles.metaChipText}>{locality}</Text>
                    </View>
                    <View style={styles.metaChip}>
                      <Ionicons name="navigate-outline" size={13} color="#334155" />
                      <Text style={styles.metaChipText}>{coverage}</Text>
                    </View>
                  </View>

                  <View style={styles.actionRow}>
                    {!!technician.phone && (
                      <TouchableOpacity style={styles.actionPrimary} onPress={handleOpenWhatsapp}>
                        <Ionicons name="logo-whatsapp" size={16} color="#FFFFFF" />
                        <Text style={styles.actionPrimaryText}>WhatsApp</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={[styles.actionSoft, !shareUrl && styles.actionSoftDisabled]}
                      onPress={handleShareProfile}
                      disabled={!shareUrl}
                    >
                      <Ionicons name="share-social-outline" size={15} color="#0F172A" />
                      <Text style={styles.actionSoftText}>Compartir</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionSoft, liked && styles.actionSoftLiked]}
                      onPress={handleToggleLike}
                      disabled={liking}
                    >
                      {liking ? (
                        <ActivityIndicator size="small" color={liked ? '#BE123C' : '#0F172A'} />
                      ) : (
                        <Ionicons name={liked ? 'heart' : 'heart-outline'} size={15} color={liked ? '#BE123C' : '#0F172A'} />
                      )}
                      <Text style={[styles.actionSoftText, liked && styles.actionSoftLikedText]}>{likesCount}</Text>
                    </TouchableOpacity>
                    {socialActions.map((link) => (
                      <TouchableOpacity
                        key={`social-${link.key}`}
                        style={[styles.actionSoft, { borderColor: link.accentColor }]}
                        onPress={() => handleOpenExternal(link.url, link.label)}
                      >
                        <Ionicons name={link.icon} size={15} color={link.accentColor} />
                        <Text style={[styles.actionSoftText, { color: link.accentColor }]}>{link.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <View style={styles.metricRow}>
                    {metricCards.map((metric) => (
                      <View key={metric.key} style={styles.metricCard}>
                        <Text style={styles.metricValue}>{metric.value}</Text>
                        <Text style={styles.metricLabel}>{metric.label}</Text>
                        <Text style={styles.metricDetail}>{metric.detail}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>

              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Presentacion comercial</Text>
                <Text style={styles.sectionText}>{getSummaryText(technician)}</Text>
                {!!technician.client_recommendations && (
                  <View style={styles.highlightCard}>
                    <Ionicons name="chatbubble-ellipses-outline" size={16} color="#7C3AED" />
                    <Text style={styles.highlightText}>{technician.client_recommendations}</Text>
                  </View>
                )}
                {badges.length > 0 && (
                  <View style={styles.badgeRow}>
                    {badges.map((badge) => (
                      <View key={badge} style={styles.badgePill}>
                        <Ionicons name="sparkles-outline" size={13} color="#B45309" />
                        <Text style={styles.badgeText}>{badge}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Ultimos trabajos</Text>
                <Text style={styles.sectionHint}>Las obras cerradas aparecen primero para dar una lectura comercial mas fuerte.</Text>
                {recentWorks.length > 0 ? (
                  <View style={styles.stack}>
                    {recentWorks.map((work) => (
                      <View key={work.id} style={styles.listCard}>
                        <View style={styles.listHeader}>
                          <Text style={styles.listTitle}>{work.title || 'Trabajo UrbanFix'}</Text>
                          <Text style={styles.listPill}>{getStatusLabelEs(work.status || 'completed')}</Text>
                        </View>
                        <Text style={styles.listMeta}>{formatDateLabel(work.happened_at)}</Text>
                        {!!work.location_label && <Text style={styles.listValue}>{work.location_label}</Text>}
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={styles.emptyCard}>
                    <Ionicons name="briefcase-outline" size={20} color="#94A3B8" />
                    <Text style={styles.emptyText}>Todavia no hay trabajos visibles en este perfil.</Text>
                  </View>
                )}
              </View>

              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Resenas de clientes</Text>
                {reviews.length > 0 ? (
                  <View style={styles.stack}>
                    {reviews.map((review) => (
                      <View key={review.id} style={[styles.listCard, styles.reviewCard]}>
                        <View style={styles.listHeader}>
                          <Text style={styles.listTitle}>{review.author || 'Cliente UrbanFix'}</Text>
                          <Ionicons name="star" size={15} color="#F59E0B" />
                        </View>
                        <Text style={styles.sectionText}>{review.text}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={styles.emptyCard}>
                    <Ionicons name="chatbubble-ellipses-outline" size={20} color="#94A3B8" />
                    <Text style={styles.emptyText}>Todavia no hay resenas detalladas para mostrar.</Text>
                  </View>
                )}
              </View>

              {workPhotos.length > 0 && (
                <View style={styles.sectionCard}>
                  <Text style={styles.sectionTitle}>Galeria de trabajos</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galleryRow}>
                    {workPhotos.map((photoUrl, index) => (
                      <View key={`${photoUrl}-${index}`} style={styles.galleryCard}>
                        <Image source={{ uri: photoUrl }} style={styles.galleryImage} />
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}

              {socialProfiles.length > 0 && (
                <View style={styles.sectionCard}>
                  <Text style={styles.sectionTitle}>Perfiles sociales</Text>
                  <Text style={styles.sectionHint}>Mostramos las cuentas comerciales para que el cliente valide marca, actividad y confianza.</Text>
                  <View style={styles.stack}>
                    {socialProfiles.map((profile) => (
                      <View key={profile.key} style={[styles.socialProfileCard, { backgroundColor: profile.surfaceColor }]}>
                        <View style={styles.socialProfileHeader}>
                          <View style={[styles.socialProfileIcon, { backgroundColor: profile.accentColor }]}>
                            <Ionicons name={profile.icon} size={18} color="#FFFFFF" />
                          </View>
                          <View style={styles.socialProfileCopy}>
                            <Text style={styles.socialProfileLabel}>{profile.label}</Text>
                            <Text style={styles.socialProfileHandle}>{profile.handle}</Text>
                            <Text style={styles.socialProfileUrl}>{profile.copy}</Text>
                          </View>
                        </View>
                        <Text style={styles.sectionText}>{profile.description}</Text>
                        <TouchableOpacity
                          style={[styles.actionPrimary, { alignSelf: 'flex-start', backgroundColor: profile.accentColor }]}
                          onPress={() => handleOpenExternal(profile.url, profile.label)}
                        >
                          <Ionicons name={profile.icon} size={15} color="#FFFFFF" />
                          <Text style={styles.actionPrimaryText}>{profile.ctaLabel}</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {socialPosts.length > 0 && (
                <View style={styles.sectionCard}>
                  <Text style={styles.sectionTitle}>Publicaciones destacadas</Text>
                  <View style={styles.stack}>
                    {socialPosts.map((post) => (
                      <View key={post.key} style={styles.listCard}>
                        <View style={styles.listHeader}>
                          <Text style={styles.listTitle}>{post.label}</Text>
                          <Text style={[styles.listPill, { color: post.accentColor, borderColor: post.accentColor }]}>{post.copy}</Text>
                        </View>
                        {Platform.OS === 'web' && post.embedUrl ? (
                          <View style={styles.embedWrap}>
                            <HtmlFrame
                              src={post.embedUrl}
                              style={{ width: '100%', height: post.key === 'facebook' ? 520 : 460, backgroundColor: '#FFFFFF' }}
                              frameBorder="0"
                              scrolling="no"
                              allowTransparency
                              allow="encrypted-media; clipboard-write"
                            />
                          </View>
                        ) : (
                          <View style={[styles.previewSurface, { backgroundColor: post.surfaceColor }]}>
                            <Ionicons name={post.icon} size={26} color={post.accentColor} />
                            <Text style={styles.sectionText}>En mobile nativo abrimos la publicacion real fuera de la app.</Text>
                          </View>
                        )}
                        <TouchableOpacity
                          style={[styles.actionPrimary, { alignSelf: 'flex-start', backgroundColor: post.accentColor }]}
                          onPress={() => handleOpenExternal(post.url, post.label)}
                        >
                          <Ionicons name={post.icon} size={15} color="#FFFFFF" />
                          <Text style={styles.actionPrimaryText}>{post.ctaLabel}</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Informacion clave</Text>
                <View style={styles.stack}>
                  {infoRows.map((item) => (
                    <View key={`${item.label}-${item.value}`} style={styles.infoRow}>
                      <View style={styles.infoIcon}>
                        <Ionicons name={item.icon} size={15} color="#475569" />
                      </View>
                      <View style={styles.infoCopy}>
                        <Text style={styles.infoLabel}>{item.label}</Text>
                        <Text style={styles.infoValue}>{item.value}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            </>
          ) : (
            <View style={styles.errorCard}>
              <Ionicons name="alert-circle-outline" size={18} color="#991B1B" />
              <Text style={styles.errorText}>{errorMessage || emptyMessage}</Text>
            </View>
          )}

          {!!errorMessage && technician ? (
            <View style={styles.errorInline}>
              <Ionicons name="warning-outline" size={16} color="#991B1B" />
              <Text style={styles.errorInlineText}>{errorMessage}</Text>
            </View>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F5F8' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
  loadingText: { fontFamily: FONTS.body, color: COLORS.textSecondary },
  content: { padding: 16, gap: 14, paddingBottom: 30 },
  noteCard: { borderRadius: 18, borderWidth: 1, borderColor: '#FBD38D', backgroundColor: '#FFF7ED', padding: 14, flexDirection: 'row', gap: 10 },
  noteText: { flex: 1, fontFamily: FONTS.body, color: '#92400E', fontSize: 12, lineHeight: 18 },
  heroCard: { backgroundColor: '#FFFFFF', borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: '#E5E7EB' },
  heroCover: { minHeight: 270, padding: 18, gap: 18, backgroundColor: '#0F172A', overflow: 'hidden' },
  heroGlowBlue: { position: 'absolute', left: -28, bottom: -32, width: 200, height: 200, borderRadius: 999, backgroundColor: 'rgba(56, 189, 248, 0.22)' },
  heroGlowOrange: { position: 'absolute', right: -24, top: -34, width: 220, height: 220, borderRadius: 999, backgroundColor: 'rgba(249, 115, 22, 0.26)' },
  heroEyebrow: { fontFamily: FONTS.subtitle, color: 'rgba(255,255,255,0.82)', fontSize: 10, letterSpacing: 1.3, textTransform: 'uppercase' },
  heroLogoWrap: { minHeight: 106, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  heroLogo: { width: '100%', height: 84 },
  heroLogoFallback: { width: 92, height: 92, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.14)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  heroLogoFallbackText: { color: '#FFFFFF', fontFamily: FONTS.title, fontSize: 30 },
  heroIdentity: { flexDirection: 'row', alignItems: 'flex-end', gap: 14 },
  avatarFrame: { width: 98, height: 98, borderRadius: 49, borderWidth: 4, borderColor: '#FFFFFF', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#E2E8F0' },
  avatarFallback: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#F59E0B', alignItems: 'center', justifyContent: 'center' },
  avatarFallbackText: { fontFamily: FONTS.title, color: '#FFFFFF', fontSize: 24 },
  heroCopy: { flex: 1, gap: 4 },
  heroCompanyName: { fontFamily: FONTS.title, color: '#FFFFFF', fontSize: 28 },
  heroPersonName: { fontFamily: FONTS.body, color: '#E2E8F0', fontSize: 13 },
  heroSubtitle: { fontFamily: FONTS.body, color: '#CBD5E1', fontSize: 13, lineHeight: 18 },
  heroBody: { padding: 18, gap: 16 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1 },
  chipSuccess: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
  chipWarning: { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' },
  chipText: { fontFamily: FONTS.subtitle, fontSize: 10 },
  chipTextSuccess: { color: '#166534' },
  chipTextWarning: { color: '#92400E' },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#EEF2F7' },
  metaChipText: { color: '#334155', fontFamily: FONTS.subtitle, fontSize: 10 },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionPrimary: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 999, backgroundColor: '#16A34A', paddingHorizontal: 16, paddingVertical: 12 },
  actionPrimaryText: { fontFamily: FONTS.subtitle, color: '#FFFFFF', fontSize: 12 },
  actionSoft: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 999, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#FFFFFF', paddingHorizontal: 14, paddingVertical: 11 },
  actionSoftDisabled: { opacity: 0.45 },
  actionSoftText: { fontFamily: FONTS.subtitle, color: '#0F172A', fontSize: 12 },
  actionSoftLiked: { borderColor: '#FECDD3', backgroundColor: '#FFF1F2' },
  actionSoftLikedText: { color: '#BE123C' },
  metricRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metricCard: { flex: 1, minWidth: 92, borderRadius: 18, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 12, paddingVertical: 14, gap: 6 },
  metricValue: { fontFamily: FONTS.title, color: '#0F172A', fontSize: 24, lineHeight: 28 },
  metricLabel: { fontFamily: FONTS.subtitle, color: '#334155', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
  metricDetail: { fontFamily: FONTS.body, color: '#64748B', fontSize: 11, lineHeight: 16 },
  sectionCard: { backgroundColor: '#FFFFFF', borderRadius: 22, borderWidth: 1, borderColor: '#E5E7EB', padding: 18, gap: 12 },
  sectionTitle: { fontFamily: FONTS.title, color: '#0F172A', fontSize: 19 },
  sectionText: { fontFamily: FONTS.body, color: '#475569', fontSize: 13, lineHeight: 20 },
  sectionHint: { fontFamily: FONTS.body, color: '#64748B', fontSize: 12, lineHeight: 18 },
  highlightCard: { borderRadius: 16, borderWidth: 1, borderColor: '#E9D5FF', backgroundColor: '#FAF5FF', padding: 14, gap: 8 },
  highlightText: { fontFamily: FONTS.body, color: '#5B21B6', fontSize: 13, lineHeight: 20 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badgePill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 999, backgroundColor: '#FFF7ED', borderWidth: 1, borderColor: '#FCD34D' },
  badgeText: { fontFamily: FONTS.subtitle, color: '#92400E', fontSize: 11 },
  stack: { gap: 12 },
  listCard: { borderRadius: 18, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#FBFCFE', padding: 14, gap: 10 },
  reviewCard: { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' },
  listHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  listTitle: { flex: 1, fontFamily: FONTS.subtitle, color: '#0F172A', fontSize: 14 },
  listPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, overflow: 'hidden', borderWidth: 1, borderColor: '#C7D2FE', color: '#4338CA', fontFamily: FONTS.subtitle, fontSize: 10 },
  listMeta: { fontFamily: FONTS.body, color: '#64748B', fontSize: 11 },
  listValue: { fontFamily: FONTS.subtitle, color: '#0F172A', fontSize: 13 },
  emptyCard: { borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: '#CBD5E1', backgroundColor: '#F8FAFC', paddingVertical: 20, paddingHorizontal: 16, alignItems: 'center', gap: 8 },
  emptyText: { fontFamily: FONTS.body, color: '#64748B', fontSize: 12, lineHeight: 18, textAlign: 'center' },
  galleryRow: { gap: 12, paddingRight: 4 },
  galleryCard: { width: 220, height: 156, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC' },
  galleryImage: { width: '100%', height: '100%' },
  socialProfileCard: { borderRadius: 18, borderWidth: 1, borderColor: '#E2E8F0', padding: 14, gap: 12 },
  socialProfileHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  socialProfileIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  socialProfileCopy: { flex: 1, gap: 2 },
  socialProfileLabel: { fontFamily: FONTS.subtitle, color: '#0F172A', fontSize: 14 },
  socialProfileHandle: { fontFamily: FONTS.title, color: '#0F172A', fontSize: 20, lineHeight: 24 },
  socialProfileUrl: { fontFamily: FONTS.body, color: '#64748B', fontSize: 12, lineHeight: 18 },
  embedWrap: { borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC' },
  previewSurface: { borderRadius: 16, padding: 16, alignItems: 'flex-start', gap: 10 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: 16, backgroundColor: '#F8FAFC', padding: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  infoIcon: { width: 28, height: 28, borderRadius: 999, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  infoCopy: { flex: 1, gap: 2 },
  infoLabel: { fontFamily: FONTS.subtitle, color: '#334155', fontSize: 11 },
  infoValue: { fontFamily: FONTS.body, color: '#64748B', fontSize: 12, lineHeight: 18 },
  errorCard: { borderRadius: 18, borderWidth: 1, borderColor: '#FECACA', backgroundColor: '#FEF2F2', padding: 16, flexDirection: 'row', gap: 10 },
  errorText: { flex: 1, fontFamily: FONTS.body, color: '#991B1B', fontSize: 13, lineHeight: 19 },
  errorInline: { borderRadius: 16, borderWidth: 1, borderColor: '#FECACA', backgroundColor: '#FEF2F2', padding: 12, flexDirection: 'row', gap: 10 },
  errorInlineText: { flex: 1, fontFamily: FONTS.body, color: '#991B1B', fontSize: 12, lineHeight: 18 },
});
