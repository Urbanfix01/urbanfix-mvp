'use client';

import { type FormEvent, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  BadgeCheck,
  Camera,
  ClipboardList,
  Globe2,
  Heart,
  ImageIcon,
  Loader2,
  Megaphone,
  MessageCircle,
  Send,
  Share2,
  Sparkles,
  UserRound,
  X,
} from 'lucide-react';

import { hasSupabaseConfig, supabase } from '../../lib/supabase/supabase';
import { trackFunnelEvent } from '../../lib/analytics';
import {
  COUNTRY_SELECTION_OPTIONS,
  getCountryOptionLabel,
  getStoredCountryPreference,
  normalizeCountryPreference,
  storeCountryPreference,
} from '../../lib/country-preference';
import { buildTechnicianPath } from '../../lib/seo/technician-profile';
import { parseGremioSpecialties } from '../../lib/seo/gremios-data';
import { TECH_SPECIALTY_OPTIONS, TECH_SPECIALTY_SEARCH_ALIASES } from '../../lib/technician-specialties';

type PostType = 'post' | 'publicidad' | 'trabajo' | 'pedido' | 'aviso' | 'consulta' | 'antes_despues';
type AuthorRole = 'tecnico' | 'empresa' | 'cliente' | 'admin';
type CommunityPostAction = 'comentar' | 'like';

type CommunityMedia = {
  url: string;
  type: 'image' | 'video';
  name?: string | null;
};

type PendingMedia = CommunityMedia & {
  id: string;
  file: File;
};

type CommunityCoordinates = {
  lat: number;
  lng: number;
};

type CommunityPost = {
  id: string;
  author_id: string | null;
  author_name: string;
  author_role: AuthorRole;
  author_avatar_url: string | null;
  post_type: PostType;
  title: string | null;
  body: string;
  category: string | null;
  location: string | null;
  coordinates: CommunityCoordinates | null;
  contact_url: string | null;
  author_location: string | null;
  author_country: string | null;
  author_specialties: string[];
  tags: string[];
  media_items: CommunityMedia[];
  likes_count: number;
  comments_count: number;
  created_at: string;
};

type CommunityComment = {
  id: string;
  post_id: string;
  author_id: string | null;
  author_name: string;
  author_avatar_url: string | null;
  body: string;
  created_at: string;
};

type CommunityProfile = {
  id: string;
  name: string;
  role: AuthorRole | null;
  avatarUrl: string | null;
  location: string | null;
  country: string | null;
  specialties: string[];
  profileHref: string;
};

type CommunityAuthorPublicProfile = {
  id: string;
  name: string;
  avatarUrl: string | null;
  profileHref: string;
  location: string | null;
  country: string | null;
  specialties: string[];
};

type AdminCommunityProfileDraft = {
  name: string;
  logoUrl: string;
};

const ADMIN_COMMUNITY_PROFILE_STORAGE_KEY = 'urbanfix.community.adminProfile';
const COMMUNITY_TUTORIAL_STORAGE_KEY = 'urbanfix.community.tutorialHidden';
const DEFAULT_ADMIN_COMMUNITY_PROFILE: AdminCommunityProfileDraft = {
  name: 'UrbanFix',
  logoUrl: '/logo-ufx-main.png',
};

const roleLabel: Record<AuthorRole, string> = {
  tecnico: 'Tecnico',
  empresa: 'Empresa',
  cliente: 'Cliente',
  admin: 'UrbanFix',
};

const roleBadgeClass: Record<AuthorRole, string> = {
  tecnico: 'bg-emerald-50 text-emerald-700',
  empresa: 'bg-violet-50 text-violet-700',
  cliente: 'bg-sky-50 text-sky-700',
  admin: 'bg-[#fff4e8] text-[#b65b00]',
};

const postTypeMeta: Record<
  PostType,
  {
    label: string;
    shortLabel: string;
    helper: string;
    badgeClass: string;
    bodyPlaceholder: string;
  }
> = {
  trabajo: {
    label: 'Trabajo terminado',
    shortLabel: 'Trabajo',
    helper: 'Mostra una obra, reparacion o servicio finalizado.',
    badgeClass: 'bg-emerald-50 text-emerald-700',
    bodyPlaceholder: 'Conta que hiciste, en que zona y que resultado lograste.',
  },
  pedido: {
    label: 'Pedido de trabajo',
    shortLabel: 'Pedido',
    helper: 'Para clientes que quieren resolver un trabajo.',
    badgeClass: 'bg-blue-50 text-blue-700',
    bodyPlaceholder: 'Conta que trabajo necesitas, en que zona estas, urgencia y detalles importantes.',
  },
  aviso: {
    label: 'Aviso / promo',
    shortLabel: 'Aviso',
    helper: 'Publica disponibilidad, promo o novedad de tu servicio.',
    badgeClass: 'bg-orange-50 text-orange-700',
    bodyPlaceholder: 'Conta tu aviso, promocion o disponibilidad.',
  },
  consulta: {
    label: 'Consulta tecnica',
    shortLabel: 'Consulta',
    helper: 'Pedi opinion o ayuda a la comunidad UrbanFix.',
    badgeClass: 'bg-sky-50 text-sky-700',
    bodyPlaceholder: 'Escribi tu consulta tecnica para que otros puedan ayudarte.',
  },
  antes_despues: {
    label: 'Antes y despues',
    shortLabel: 'Antes/despues',
    helper: 'Ideal para mostrar evolucion visual de un trabajo.',
    badgeClass: 'bg-violet-50 text-violet-700',
    bodyPlaceholder: 'Conta que cambio entre el antes y el despues.',
  },
  publicidad: {
    label: 'Aviso / promo',
    shortLabel: 'Aviso',
    helper: 'Publica disponibilidad, promo o novedad de tu servicio.',
    badgeClass: 'bg-orange-50 text-orange-700',
    bodyPlaceholder: 'Conta tu aviso, promocion o disponibilidad.',
  },
  post: {
    label: 'Publicacion',
    shortLabel: 'Post',
    helper: 'Comparte una actualizacion general.',
    badgeClass: 'bg-slate-100 text-slate-700',
    bodyPlaceholder: 'Que queres compartir con la comunidad?',
  },
};

const technicianComposerPostTypes: PostType[] = ['trabajo', 'aviso', 'consulta', 'antes_despues'];
const clientComposerPostTypes: PostType[] = ['pedido', 'consulta'];
const adminComposerPostTypes: PostType[] = ['post', 'aviso', 'consulta'];

const getComposerPostTypes = (role: AuthorRole | null | undefined) =>
  role === 'admin' ? adminComposerPostTypes : role === 'cliente' ? clientComposerPostTypes : technicianComposerPostTypes;

const getDefaultPostType = (role: AuthorRole | null | undefined): PostType =>
  role === 'admin' ? 'post' : role === 'cliente' ? 'pedido' : 'trabajo';

const normalizeAdminCommunityProfile = (value: Partial<AdminCommunityProfileDraft> | null | undefined) => {
  const name = String(value?.name || '').trim() || DEFAULT_ADMIN_COMMUNITY_PROFILE.name;
  const logoUrl = String(value?.logoUrl || '').trim() || DEFAULT_ADMIN_COMMUNITY_PROFILE.logoUrl;
  return { name, logoUrl };
};

const readStoredAdminCommunityProfile = () => {
  if (typeof window === 'undefined') return DEFAULT_ADMIN_COMMUNITY_PROFILE;

  try {
    const raw = window.localStorage.getItem(ADMIN_COMMUNITY_PROFILE_STORAGE_KEY);
    if (!raw) return DEFAULT_ADMIN_COMMUNITY_PROFILE;
    return normalizeAdminCommunityProfile(JSON.parse(raw));
  } catch {
    return DEFAULT_ADMIN_COMMUNITY_PROFILE;
  }
};

const writeStoredAdminCommunityProfile = (profile: AdminCommunityProfileDraft) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(ADMIN_COMMUNITY_PROFILE_STORAGE_KEY, JSON.stringify(profile));
};

const buildAdminCommunityProfile = (userId: string, draft: AdminCommunityProfileDraft): CommunityProfile => ({
  id: userId,
  name: draft.name,
  role: 'admin',
  avatarUrl: draft.logoUrl,
  location: 'UrbanFix',
  country: null,
  specialties: [],
  profileHref: '/urbanfix',
});

const normalizeCoordinates = (value: any): CommunityCoordinates | null => {
  const lat = Number(value?.lat ?? value?.latitude);
  const lng = Number(value?.lng ?? value?.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return {
    lat: Number(lat.toFixed(6)),
    lng: Number(lng.toFixed(6)),
  };
};

const buildProfileLocation = (row: any) =>
  [
    row?.service_city || row?.city,
    row?.service_district,
    row?.service_province,
    row?.country,
  ]
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .join(', ') || null;

const normalizeAuthorProfile = (row: any): CommunityAuthorPublicProfile => {
  const name =
    String(row?.business_name || row?.full_name || row?.email || '').trim() || 'Tecnico UrbanFix';

  return {
    id: String(row.id),
    name,
    avatarUrl: String(row?.company_logo_url || row?.avatar_url || '').trim() || null,
    profileHref: buildTechnicianPath(String(row.id), name),
    location: buildProfileLocation(row),
    country: normalizeCountryPreference(row?.country) || null,
    specialties: parseGremioSpecialties(row?.specialties).slice(0, 6),
  };
};

const profileToAuthorProfile = (profile: CommunityProfile): CommunityAuthorPublicProfile => ({
  id: profile.id,
  name: profile.name,
  avatarUrl: profile.avatarUrl,
  profileHref: profile.profileHref,
  location: profile.location,
  country: profile.country,
  specialties: profile.specialties,
});

const normalizePost = (
  row: any,
  authorProfiles: Record<string, CommunityAuthorPublicProfile> = {}
): CommunityPost => {
  const authorId = row.author_id ? String(row.author_id) : null;
  const publicProfile = authorId ? authorProfiles[authorId] : null;
  const authorRole: AuthorRole =
    row.author_role === 'admin'
      ? 'admin'
      : row.author_role === 'empresa'
        ? 'empresa'
        : row.author_role === 'cliente'
          ? 'cliente'
          : 'tecnico';
  const rowAuthorName = String(row.author_name || '').trim();
  const authorName =
    authorRole === 'admin'
      ? rowAuthorName || DEFAULT_ADMIN_COMMUNITY_PROFILE.name
      : authorRole === 'cliente'
      ? rowAuthorName || publicProfile?.name || 'Cliente UrbanFix'
      : publicProfile?.name || rowAuthorName || 'Tecnico UrbanFix';
  const authorSpecialties = authorRole === 'admin' ? [] : publicProfile?.specialties || [];
  const profileContactUrl =
    authorRole === 'admin'
      ? '/urbanfix'
      : authorRole === 'cliente'
      ? null
      : publicProfile?.profileHref || (authorId ? buildTechnicianPath(authorId, authorName) : null);

  return {
    id: String(row.id),
    author_id: authorId,
    author_name: authorName,
    author_role: authorRole,
    author_avatar_url:
      authorRole === 'admin'
        ? String(row.author_avatar_url || DEFAULT_ADMIN_COMMUNITY_PROFILE.logoUrl).trim() || null
        : publicProfile?.avatarUrl || (row.author_avatar_url ? String(row.author_avatar_url) : null),
    post_type: postTypeMeta[row.post_type as PostType] ? (row.post_type as PostType) : 'post',
    title: row.title ? String(row.title) : null,
    body: String(row.body || ''),
    category: row.category ? String(row.category) : authorSpecialties[0] || null,
    location: row.location ? String(row.location) : publicProfile?.location || null,
    coordinates: normalizeCoordinates(row.coordinates),
    contact_url: profileContactUrl,
    author_location: publicProfile?.location || null,
    author_country: publicProfile?.country || null,
    author_specialties: authorSpecialties,
    tags: Array.isArray(row.tags) ? row.tags.map((tag: unknown) => String(tag)).filter(Boolean) : [],
    media_items: Array.isArray(row.media_items)
      ? row.media_items
          .map((item: any) => ({
            url: String(item?.url || '').trim(),
            type: item?.type === 'video' ? 'video' : 'image',
            name: item?.name ? String(item.name) : null,
          }))
          .filter((item: CommunityMedia) => Boolean(item.url))
      : [],
    likes_count: Number(row.likes_count || 0),
    comments_count: Number(row.comments_count || 0),
    created_at: row.created_at ? String(row.created_at) : new Date().toISOString(),
  };
};

const normalizeComment = (row: any): CommunityComment => ({
  id: String(row.id),
  post_id: String(row.post_id),
  author_id: row.author_id ? String(row.author_id) : null,
  author_name: String(row.author_name || 'Usuario UrbanFix'),
  author_avatar_url: row.author_avatar_url ? String(row.author_avatar_url) : null,
  body: String(row.body || ''),
  created_at: row.created_at ? String(row.created_at) : new Date().toISOString(),
});

const buildId = () => {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  } catch {
    // Fallback below.
  }
  return `local-${Date.now()}-${Math.round(Math.random() * 100000)}`;
};

const getMediaType = (file: File): CommunityMedia['type'] | null => {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  return null;
};

const sanitizeFileName = (name: string) =>
  String(name || 'archivo')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90) || 'archivo';

const parseTags = (value: string) =>
  value
    .split(/[,\n#]+/)
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 4);

const getCommunityPostShareUrl = (postId: string) => {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://www.urbanfix.com.ar';
  return `${baseUrl}/comunidad?post=${encodeURIComponent(postId)}`;
};

const buildCommunityPath = ({
  createType,
  postId,
  action,
  country,
}: {
  createType?: PostType;
  postId?: string;
  action?: CommunityPostAction;
  country?: string;
}) => {
  const params = new URLSearchParams();
  if (createType) params.set('crear', createType);
  if (postId) params.set('post', postId);
  if (action) params.set('accion', action);
  if (country) params.set('pais', country);
  const query = params.toString();
  return `/comunidad${query ? `?${query}` : ''}`;
};

const buildCommunityAuthHref = (nextPath: string) =>
  `/tecnicos?mode=login&next=${encodeURIComponent(nextPath)}`;

const buildCommunityPostShareText = (post: CommunityPost) => {
  const parts = [
    post.title,
    post.body,
    post.location ? `Zona: ${post.location}` : null,
    post.tags.length ? post.tags.map((tag) => `#${tag}`).join(' ') : null,
    `Publicado en UrbanFix por ${post.author_name}.`,
  ];

  return parts.filter(Boolean).join('\n\n');
};

const copyTextToClipboard = async (text: string) => {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  if (typeof document === 'undefined') return;

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
};

const normalizeFilterText = (value: string | null | undefined) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const getSpecialtyTerms = (specialty: string) =>
  [specialty, ...(TECH_SPECIALTY_SEARCH_ALIASES[specialty] || [])]
    .map((term) => normalizeFilterText(term))
    .filter(Boolean);

const postMatchesSpecialty = (post: CommunityPost, specialty: string) => {
  const terms = getSpecialtyTerms(specialty);
  if (!terms.length) return true;

  const searchable = normalizeFilterText(
    [post.category, post.title, post.body, ...post.tags, ...post.author_specialties]
      .filter(Boolean)
      .join(' ')
  );

  return terms.some((term) => searchable.includes(term));
};

const getCommunityPostsErrorMessage = (error: any) => {
  const code = String(error?.code || '');
  const message = String(error?.message || '');
  const normalizedMessage = message.toLowerCase();

  if (
    code === '23514' ||
    normalizedMessage.includes('community_posts_author_role_chk') ||
    normalizedMessage.includes('community_posts_post_type_chk')
  ) {
    return 'La publicacion no se guardo porque falta actualizar Supabase para aceptar publicaciones de clientes y administradores.';
  }

  if (
    code === 'PGRST205' ||
    code === '42P01' ||
    (normalizedMessage.includes('relation') && normalizedMessage.includes('community_posts'))
  ) {
    return 'El muro esta listo en la app, pero falta activar la tabla community_posts en Supabase.';
  }

  if (code === '42501' || normalizedMessage.includes('permission denied')) {
    return 'La tabla del muro existe, pero faltan permisos para leer o publicar.';
  }

  if (code === '42703' || code === 'PGRST204') {
    return 'La tabla del muro necesita actualizar sus columnas antes de publicar.';
  }

  return 'No pudimos cargar publicaciones reales. Intenta actualizar en unos segundos.';
};

const getCommunityCommentsErrorMessage = (error: any) => {
  const code = String(error?.code || '');
  const message = String(error?.message || '');

  if (code === 'PGRST205' || code === '42P01' || message.includes('community_post_comments')) {
    return 'Falta activar la tabla de comentarios del muro.';
  }

  if (code === '42501' || message.toLowerCase().includes('permission denied')) {
    return 'Faltan permisos para comentar en el muro.';
  }

  return 'No pudimos guardar el comentario. Intenta otra vez.';
};

const getCommunityLikesErrorMessage = (error: any) => {
  const code = String(error?.code || '');
  const message = String(error?.message || '');
  const normalizedMessage = message.toLowerCase();

  if (code === 'PGRST205' || code === '42P01' || normalizedMessage.includes('community_post_likes')) {
    return 'Falta activar los Me gusta del muro en Supabase.';
  }

  if (code === '42501' || normalizedMessage.includes('permission denied')) {
    return 'Faltan permisos para guardar Me gusta en el muro.';
  }

  return 'No pudimos guardar el Me gusta. Intenta otra vez.';
};

const formatTimeAgo = (value: string) => {
  const date = new Date(value);
  const minutes = Math.max(1, Math.round((Date.now() - date.getTime()) / 60000));
  if (!Number.isFinite(minutes)) return 'Ahora';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h`;
  return `${Math.round(hours / 24)} d`;
};

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return `${parts[0]?.charAt(0) || 'U'}${parts[1]?.charAt(0) || ''}`.toUpperCase();
};

const verifyAdminSession = async (accessToken: string | null | undefined) => {
  if (!accessToken) return false;

  try {
    const response = await fetch('/api/admin/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    });
    if (!response.ok) return false;
    const payload = await response.json();
    return Boolean(payload?.isAdmin);
  } catch {
    return false;
  }
};

export default function CommunityFeed() {
  const mediaInputRef = useRef<HTMLInputElement | null>(null);
  const bodyInputRef = useRef<HTMLTextAreaElement | null>(null);
  const postRefs = useRef<Record<string, HTMLElement | null>>({});
  const commentInputRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});
  const likeButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const handledPostIntentRef = useRef('');
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [profile, setProfile] = useState<CommunityProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(true);
  const [postsError, setPostsError] = useState('');
  const [postType, setPostType] = useState<PostType>('trabajo');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});
  const [likesLoading, setLikesLoading] = useState<Record<string, boolean>>({});
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [pendingMedia, setPendingMedia] = useState<PendingMedia[]>([]);
  const [openCommentsPostId, setOpenCommentsPostId] = useState<string | null>(null);
  const [commentsByPost, setCommentsByPost] = useState<Record<string, CommunityComment[]>>({});
  const [commentsLoading, setCommentsLoading] = useState<Record<string, boolean>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [commentFeedback, setCommentFeedback] = useState<Record<string, string>>({});
  const [commentSubmitting, setCommentSubmitting] = useState<Record<string, boolean>>({});
  const [postActionFeedback, setPostActionFeedback] = useState<Record<string, string>>({});
  const [authIntentByPost, setAuthIntentByPost] = useState<Record<string, CommunityPostAction | undefined>>({});
  const [targetPostId, setTargetPostId] = useState('');
  const [targetPostAction, setTargetPostAction] = useState<CommunityPostAction | null>(null);
  const [highlightedPostId, setHighlightedPostId] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('');
  const [authorFilter, setAuthorFilter] = useState('');
  const [adminProfileDraft, setAdminProfileDraft] = useState<AdminCommunityProfileDraft>(
    DEFAULT_ADMIN_COMMUNITY_PROFILE
  );
  const [adminProfileFeedback, setAdminProfileFeedback] = useState('');
  const [showCommunityTutorial, setShowCommunityTutorial] = useState(false);
  const postIdsKey = posts.map((post) => post.id).join('|');

  useEffect(() => {
    let cancelled = false;

    const loadSessionProfile = async () => {
      if (!hasSupabaseConfig) {
        setAuthLoading(false);
        return undefined;
      }

      const applyUser = async (user: any, accessToken?: string | null) => {
        if (!user) {
          if (!cancelled) {
            setProfile(null);
            setAuthLoading(false);
          }
          return;
        }

        const isAdmin = await verifyAdminSession(accessToken);
        if (cancelled) return;

        if (isAdmin) {
          const storedAdminProfile = readStoredAdminCommunityProfile();
          setAdminProfileDraft(storedAdminProfile);
          setProfile(buildAdminCommunityProfile(user.id, storedAdminProfile));
          setAuthLoading(false);
          return;
        }

        const metadata = user.user_metadata || {};
        const metadataRole = String(metadata.user_type || metadata.profile || '').toLowerCase();
        const role: AuthorRole | null =
          metadataRole === 'empresa'
            ? 'empresa'
            : metadataRole === 'tecnico'
              ? 'tecnico'
              : metadataRole === 'cliente'
                ? 'cliente'
                : null;

        const { data } = await supabase
          .from('profiles')
          .select(
            'id, full_name, business_name, avatar_url, company_logo_url, country, city, service_city, service_district, service_province, specialties'
          )
          .eq('id', user.id)
          .maybeSingle();

        if (cancelled) return;

        const profileName =
          String(data?.business_name || data?.full_name || metadata.business_name || metadata.full_name || user.email || '')
            .trim() || (role === 'cliente' ? 'Cliente UrbanFix' : 'Tecnico UrbanFix');
        const profileSpecialties = parseGremioSpecialties(data?.specialties).slice(0, 6);

        setProfile({
          id: user.id,
          name: profileName,
          role,
          avatarUrl: String(data?.company_logo_url || data?.avatar_url || metadata.avatar_url || '').trim() || null,
          location: buildProfileLocation(data),
          country: normalizeCountryPreference(data?.country) || null,
          specialties: profileSpecialties,
          profileHref: role === 'cliente' ? '/cliente' : buildTechnicianPath(user.id, profileName),
        });
        setAuthLoading(false);
      };

      const { data } = await supabase.auth.getSession();
      await applyUser(data.session?.user || null, data.session?.access_token || null);

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, nextSession) => {
        void applyUser(nextSession?.user || null, nextSession?.access_token || null);
      });

      return () => subscription.unsubscribe();
    };

    let cleanup: undefined | (() => void);
    loadSessionProfile().then((nextCleanup) => {
      cleanup = nextCleanup;
    });

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const action = params.get('accion');
    setCountryFilter(
      normalizeCountryPreference(params.get('pais')) || getStoredCountryPreference()
    );
    setAuthorFilter((params.get('autor') || '').slice(0, 80));
    setTargetPostId((params.get('post') || '').slice(0, 80));
    setTargetPostAction(action === 'comentar' || action === 'like' ? action : null);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setShowCommunityTutorial(window.localStorage.getItem(COMMUNITY_TUTORIAL_STORAGE_KEY) !== '1');
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadPosts = async () => {
      setPostsError('');

      if (!hasSupabaseConfig) {
        if (!cancelled) {
          setPosts([]);
          setPostsError('Conecta Supabase para ver publicaciones reales de la comunidad.');
          setPostsLoading(false);
        }
        return;
      }

      const { data, error } = await supabase
        .from('community_posts')
        .select(
          'id, author_id, author_name, author_role, author_avatar_url, post_type, title, body, category, location, coordinates, contact_url, tags, media_items, likes_count, comments_count, created_at'
        )
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(50);

      if (cancelled) return;

      if (error) {
        setPosts([]);
        setPostsError(getCommunityPostsErrorMessage(error));
      } else {
        const rows = data || [];
        const authorIds = Array.from(
          new Set(rows.map((row: any) => String(row.author_id || '').trim()).filter(Boolean))
        );
        let authorProfiles: Record<string, CommunityAuthorPublicProfile> = {};

        if (authorIds.length) {
          const { data: profileRows } = await supabase
            .from('profiles')
            .select(
              'id, email, full_name, business_name, avatar_url, company_logo_url, country, city, service_city, service_district, service_province, specialties'
            )
            .in('id', authorIds);

          authorProfiles = Object.fromEntries(
            (profileRows || []).map((profileRow) => {
              const normalized = normalizeAuthorProfile(profileRow);
              return [normalized.id, normalized];
            })
          );
        }

        if (cancelled) return;
        setPosts(rows.map((row) => normalizePost(row, authorProfiles)));
      }

      setPostsLoading(false);
    };

    void loadPosts();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!profile?.id || !hasSupabaseConfig) {
      setLikedPosts({});
      return;
    }

    if (!postIdsKey) {
      setLikedPosts({});
      return;
    }

    let cancelled = false;

    const loadLikedPosts = async () => {
      const postIds = postIdsKey.split('|').filter(Boolean);
      const { data, error } = await supabase
        .from('community_post_likes')
        .select('post_id')
        .eq('user_id', profile.id)
        .in('post_id', postIds);

      if (cancelled) return;
      if (error) return;

      const nextLikedPosts = Object.fromEntries((data || []).map((row: any) => [String(row.post_id), true]));
      setLikedPosts(nextLikedPosts);
    };

    void loadLikedPosts();

    return () => {
      cancelled = true;
    };
  }, [profile?.id, postIdsKey]);

  const canPublish = Boolean(profile?.role);
  const canComment = Boolean(profile?.id);
  const isAdminProfile = profile?.role === 'admin';
  const displayName = profile?.name || 'Comunidad UrbanFix';
  const firstName = profile?.name?.trim().split(/\s+/)[0] || 'UrbanFix';
  const availableComposerPostTypes = getComposerPostTypes(profile?.role);
  const defaultPostType = getDefaultPostType(profile?.role);
  const selectedPostType = postTypeMeta[postType];
  const quickComposerActions =
    profile?.role === 'admin'
      ? [
          { type: 'post' as PostType, label: 'Comunicado', icon: Sparkles, iconClass: 'text-[#ff8f1f]' },
          { type: 'aviso' as PostType, label: 'Aviso', icon: Megaphone, iconClass: 'text-[#ff8f1f]' },
          { type: 'consulta' as PostType, label: 'Consulta', icon: MessageCircle, iconClass: 'text-sky-600' },
        ]
      : profile?.role === 'cliente'
      ? [
          { type: 'pedido' as PostType, label: 'Pedido', icon: ClipboardList, iconClass: 'text-blue-600' },
          { type: 'consulta' as PostType, label: 'Consulta', icon: MessageCircle, iconClass: 'text-sky-600' },
        ]
      : [
          { type: 'trabajo' as PostType, label: 'Trabajo', icon: Camera, iconClass: 'text-emerald-600' },
          { type: 'aviso' as PostType, label: 'Aviso', icon: Megaphone, iconClass: 'text-[#ff8f1f]' },
          { type: 'consulta' as PostType, label: 'Consulta', icon: MessageCircle, iconClass: 'text-sky-600' },
          { type: 'antes_despues' as PostType, label: 'Antes/despues', icon: ImageIcon, iconClass: 'text-violet-600' },
        ];
  const normalizedCountryFilter = normalizeFilterText(countryFilter);
  const normalizedLocationFilter = normalizeFilterText(locationFilter);
  const hasActiveFilters = Boolean(
    normalizedCountryFilter || normalizedLocationFilter || specialtyFilter || authorFilter
  );
  const filteredPosts = posts.filter((post) => {
    const locationText = normalizeFilterText([post.location, post.author_location].filter(Boolean).join(' '));
    const postCountry = normalizeFilterText(post.author_country);
    const matchesCountry =
      !normalizedCountryFilter ||
      post.author_role === 'admin' ||
      post.id === targetPostId ||
      postCountry === normalizedCountryFilter ||
      locationText.includes(normalizedCountryFilter);
    const matchesLocation = !normalizedLocationFilter || locationText.includes(normalizedLocationFilter);
    const matchesSpecialty = !specialtyFilter || postMatchesSpecialty(post, specialtyFilter);
    const matchesAuthor = !authorFilter || post.author_id === authorFilter;
    return matchesCountry && matchesLocation && matchesSpecialty && matchesAuthor;
  });

  const handleCountryFilterChange = (value: string) => {
    const nextCountry = normalizeCountryPreference(value);
    setCountryFilter(nextCountry);
    if (nextCountry) storeCountryPreference(nextCountry);

    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (nextCountry) url.searchParams.set('pais', nextCountry);
      else url.searchParams.delete('pais');
      window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
    }

    const normalizedNextCountry = normalizeFilterText(nextCountry);
    const resultCount = posts.filter((post) => {
      if (!normalizedNextCountry || post.author_role === 'admin') return true;
      const postLocation = normalizeFilterText(
        [post.location, post.author_location].filter(Boolean).join(' ')
      );
      return (
        normalizeFilterText(post.author_country) === normalizedNextCountry ||
        postLocation.includes(normalizedNextCountry)
      );
    }).length;
    trackFunnelEvent('community_country_filtered', {
      origin: 'community_filters',
      country: nextCountry || 'all',
      result_count: resultCount,
    });
  };

  const getPostAnalyticsContext = (postId: string, origin = 'community_feed') => {
    const targetPost = posts.find((post) => post.id === postId);
    return {
      origin,
      post_id: postId,
      post_type: targetPost?.post_type || 'unknown',
      author_role: targetPost?.author_role || 'unknown',
      country: targetPost?.author_country || 'unknown',
    };
  };

  const openComposer = (nextPostType: PostType = defaultPostType) => {
    setFeedback('');
    const safePostType = availableComposerPostTypes.includes(nextPostType) ? nextPostType : defaultPostType;

    if (!canPublish) {
      trackFunnelEvent('community_auth_requested', {
        origin: 'community_composer',
        action: 'publish',
        post_type: safePostType,
      });
      window.location.href = buildCommunityAuthHref(
        buildCommunityPath({ createType: safePostType, country: countryFilter || undefined })
      );
      return;
    }

    setPostType(safePostType);
    setIsComposerOpen(true);
    trackFunnelEvent('community_post_started', {
      origin: 'community_composer',
      post_type: safePostType,
      author_role: profile?.role || 'unknown',
    });
    window.setTimeout(() => bodyInputRef.current?.focus(), 0);
  };

  const saveAdminProfile = () => {
    if (!profile || profile.role !== 'admin') return;

    const nextProfile = normalizeAdminCommunityProfile(adminProfileDraft);
    setAdminProfileDraft(nextProfile);
    writeStoredAdminCommunityProfile(nextProfile);
    setProfile(buildAdminCommunityProfile(profile.id, nextProfile));
    setAdminProfileFeedback('Perfil de autor actualizado. Para publicar, usa el cuadro de arriba.');
    window.setTimeout(() => setAdminProfileFeedback(''), 2400);
  };

  const hideCommunityTutorial = () => {
    setShowCommunityTutorial(false);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(COMMUNITY_TUTORIAL_STORAGE_KEY, '1');
    }
  };

  useEffect(() => {
    if (authLoading || !canPublish || isComposerOpen || typeof window === 'undefined') return;

    const requestedType = new URLSearchParams(window.location.search).get('crear') as PostType | null;
    if (requestedType && Object.prototype.hasOwnProperty.call(postTypeMeta, requestedType)) {
      const safePostType = availableComposerPostTypes.includes(requestedType) ? requestedType : defaultPostType;
      setPostType(safePostType);
      setIsComposerOpen(true);
      trackFunnelEvent('community_post_started', {
        origin: 'post_auth_return',
        post_type: safePostType,
        requested_post_type: requestedType,
        author_role: profile?.role || 'unknown',
      });
      window.setTimeout(() => bodyInputRef.current?.focus(), 0);
    }
  }, [authLoading, availableComposerPostTypes, canPublish, defaultPostType, isComposerOpen, profile?.role]);

  useEffect(() => {
    if (!availableComposerPostTypes.includes(postType)) {
      setPostType(defaultPostType);
    }
  }, [availableComposerPostTypes, defaultPostType, postType]);

  const resetComposer = () => {
    setPostType(defaultPostType);
    setTitle('');
    setBody('');
    setTagInput('');
    pendingMedia.forEach((item) => URL.revokeObjectURL(item.url));
    setPendingMedia([]);
    if (mediaInputRef.current) mediaInputRef.current.value = '';
  };

  const handleMediaSelect = (files: FileList | null) => {
    const nextFiles = Array.from(files || [])
      .map((file) => ({ file, type: getMediaType(file) }))
      .filter((item): item is { file: File; type: CommunityMedia['type'] } => Boolean(item.type))
      .slice(0, Math.max(0, 4 - pendingMedia.length));

    if (!nextFiles.length) return;

    const nextMedia = nextFiles.map(({ file, type }) => ({
      id: buildId(),
      file,
      type,
      url: URL.createObjectURL(file),
      name: file.name,
    }));

    setPendingMedia((current) => [...current, ...nextMedia].slice(0, 4));
  };

  const removePendingMedia = (id: string) => {
    setPendingMedia((current) => {
      const target = current.find((item) => item.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return current.filter((item) => item.id !== id);
    });
  };

  const uploadPendingMedia = async (authorId: string): Promise<CommunityMedia[]> => {
    if (!pendingMedia.length) return [];

    const uploaded: CommunityMedia[] = [];
    for (const item of pendingMedia) {
      const storagePath = `community/${authorId}/${buildId()}-${sanitizeFileName(item.file.name)}`;
      const { error } = await supabase.storage.from('urbanfix-assets').upload(storagePath, item.file, {
        cacheControl: '3600',
        contentType: item.file.type || undefined,
        upsert: false,
      });

      if (error) throw error;

      const { data } = supabase.storage.from('urbanfix-assets').getPublicUrl(storagePath);
      uploaded.push({
        url: data.publicUrl,
        type: item.type,
        name: item.name || null,
      });
    }

    return uploaded;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback('');

    if (!canPublish) {
      setFeedback('Ingresa con tu cuenta UrbanFix para publicar.');
      return;
    }

    if (!profile) {
      setFeedback('No pudimos leer tu perfil para publicar.');
      return;
    }

    const safeBody = body.trim();
    const safeTitle = title.trim();
    if (safeBody.length < 12) {
      setFeedback('Escribe una descripcion un poco mas completa.');
      return;
    }

    if (!hasSupabaseConfig) {
      setFeedback('No se puede publicar porque Supabase no esta conectado.');
      return;
    }

    setSubmitting(true);

    try {
      const uploadedMedia = await uploadPendingMedia(profile.id);
      const authorProfile = profileToAuthorProfile(profile);
      const { data, error } = await supabase
        .from('community_posts')
        .insert({
          author_id: profile.id,
          author_name: profile.name || (profile.role === 'cliente' ? 'Cliente UrbanFix' : 'Tecnico UrbanFix'),
          author_role: profile.role || 'tecnico',
          author_avatar_url: profile.avatarUrl || null,
          post_type: postType,
          title: safeTitle || null,
          body: safeBody,
          category: profile.role === 'cliente' ? null : profile.specialties[0] || null,
          location: profile.location,
          contact_url: profile.role === 'cliente' ? null : profile.profileHref,
          tags: parseTags(tagInput),
          media_items: uploadedMedia,
          is_published: true,
        })
        .select(
          'id, author_id, author_name, author_role, author_avatar_url, post_type, title, body, category, location, coordinates, contact_url, tags, media_items, likes_count, comments_count, created_at'
        )
        .maybeSingle();

      if (error || !data) {
        throw new Error(error ? getCommunityPostsErrorMessage(error) : 'No pudimos guardar la publicacion.');
      }

      setPosts((current) => [normalizePost(data, { [authorProfile.id]: authorProfile }), ...current]);
      trackFunnelEvent('community_post_published', {
        origin: 'community_inline_composer',
        post_id: String(data.id),
        post_type: postType,
        author_role: profile.role,
        country: profile.country || 'unknown',
      });
      setFeedback('Publicado.');
      resetComposer();
      setIsComposerOpen(false);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'No pudimos publicar en la comunidad.');
    } finally {
      setSubmitting(false);
    }
  };

  const refreshPostLikeCount = async (postId: string) => {
    const { data, error } = await supabase
      .from('community_posts')
      .select('likes_count')
      .eq('id', postId)
      .maybeSingle();

    if (error || !data) return;

    setPosts((current) =>
      current.map((post) =>
        post.id === postId ? { ...post, likes_count: Math.max(0, Number(data.likes_count || 0)) } : post
      )
    );
  };

  const handleLike = async (postId: string) => {
    const analyticsContext = getPostAnalyticsContext(postId);
    trackFunnelEvent('community_post_like_requested', analyticsContext);

    if (!profile?.id) {
      setAuthIntentByPost((current) => ({ ...current, [postId]: 'like' }));
      setPostActionFeedback((current) => ({
        ...current,
        [postId]: 'Ingresa con tu cuenta UrbanFix para confirmar tu Me gusta.',
      }));
      trackFunnelEvent('community_auth_requested', {
        ...analyticsContext,
        action: 'like',
      });
      return;
    }

    if (!hasSupabaseConfig) {
      setPostActionFeedback((current) => ({
        ...current,
        [postId]: 'No se puede guardar el Me gusta porque Supabase no esta conectado.',
      }));
      return;
    }

    if (likesLoading[postId]) return;

    const wasLiked = Boolean(likedPosts[postId]);
    setAuthIntentByPost((current) => ({ ...current, [postId]: undefined }));
    setPostActionFeedback((current) => ({ ...current, [postId]: '' }));
    setLikesLoading((current) => ({ ...current, [postId]: true }));
    setLikedPosts((current) => ({ ...current, [postId]: !wasLiked }));
    setPosts((current) =>
      current.map((post) =>
        post.id === postId
          ? { ...post, likes_count: Math.max(0, post.likes_count + (wasLiked ? -1 : 1)) }
          : post
      )
    );

    try {
      if (wasLiked) {
        const { error } = await supabase
          .from('community_post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', profile.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('community_post_likes').insert({
          post_id: postId,
          user_id: profile.id,
        });

        if (error && String(error.code || '') !== '23505') throw error;
        trackFunnelEvent('community_post_liked', analyticsContext);
      }

      await refreshPostLikeCount(postId);
    } catch (error) {
      setLikedPosts((current) => ({ ...current, [postId]: wasLiked }));
      setPosts((current) =>
        current.map((post) =>
          post.id === postId
            ? { ...post, likes_count: Math.max(0, post.likes_count + (wasLiked ? 1 : -1)) }
            : post
        )
      );
      setPostActionFeedback((current) => ({
        ...current,
        [postId]: getCommunityLikesErrorMessage(error),
      }));
    } finally {
      setLikesLoading((current) => ({ ...current, [postId]: false }));
    }
  };

  const handleSharePost = async (post: CommunityPost) => {
    const url = getCommunityPostShareUrl(post.id);
    const text = buildCommunityPostShareText(post);
    const title = post.title || `Publicacion de ${post.author_name} en UrbanFix`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
      }
    }

    await copyTextToClipboard(`${text}\n\n${url}`);
    setFeedback('Copiamos el texto y el enlace de la publicacion.');
  };

  const loadComments = async (postId: string) => {
    if (!hasSupabaseConfig) {
      setCommentFeedback((current) => ({
        ...current,
        [postId]: 'Conecta Supabase para cargar comentarios reales.',
      }));
      return;
    }

    setCommentsLoading((current) => ({ ...current, [postId]: true }));
    setCommentFeedback((current) => ({ ...current, [postId]: '' }));

    const { data, error } = await supabase
      .from('community_post_comments')
      .select('id, post_id, author_id, author_name, author_avatar_url, body, created_at')
      .eq('post_id', postId)
      .eq('is_published', true)
      .order('created_at', { ascending: true })
      .limit(50);

    if (error) {
      setCommentFeedback((current) => ({
        ...current,
        [postId]: getCommunityCommentsErrorMessage(error),
      }));
    } else {
      setCommentsByPost((current) => ({
        ...current,
        [postId]: (data || []).map(normalizeComment),
      }));
    }

    setCommentsLoading((current) => ({ ...current, [postId]: false }));
  };

  const toggleComments = (post: CommunityPost) => {
    const isOpening = openCommentsPostId !== post.id;
    setOpenCommentsPostId(isOpening ? post.id : null);
    if (!isOpening) return;

    trackFunnelEvent('community_comment_started', getPostAnalyticsContext(post.id));
    if (!commentsByPost[post.id]) void loadComments(post.id);
    if (profile?.id) {
      window.setTimeout(() => commentInputRefs.current[post.id]?.focus(), 0);
    }
  };

  useEffect(() => {
    if (authLoading || postsLoading || !targetPostId || typeof window === 'undefined') return;

    const targetPost = posts.find((post) => post.id === targetPostId);
    if (!targetPost) return;

    const intentKey = `${targetPostId}:${targetPostAction || 'view'}:${profile?.id ? 'auth' : 'anon'}`;
    if (handledPostIntentRef.current === intentKey) return;
    handledPostIntentRef.current = intentKey;
    setHighlightedPostId(targetPostId);

    if (targetPostAction === 'comentar') {
      setOpenCommentsPostId(targetPostId);
      if (!commentsByPost[targetPostId]) void loadComments(targetPostId);
      if (profile?.id) {
        trackFunnelEvent(
          'community_comment_started',
          getPostAnalyticsContext(targetPostId, 'post_auth_return')
        );
      }
    }

    window.setTimeout(() => {
      postRefs.current[targetPostId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (targetPostAction === 'comentar' && profile?.id) {
        commentInputRefs.current[targetPostId]?.focus();
      }
      if (targetPostAction === 'like') {
        likeButtonRefs.current[targetPostId]?.focus();
      }
    }, 80);

    window.setTimeout(() => {
      setHighlightedPostId((current) => (current === targetPostId ? '' : current));
    }, 5000);
  }, [authLoading, commentsByPost, posts, postsLoading, profile?.id, targetPostAction, targetPostId]);

  const handleCommentSubmit = async (event: FormEvent<HTMLFormElement>, postId: string) => {
    event.preventDefault();
    setCommentFeedback((current) => ({ ...current, [postId]: '' }));

    if (!canComment || !profile) {
      setCommentFeedback((current) => ({
        ...current,
        [postId]: 'Ingresa con tu cuenta UrbanFix para comentar.',
      }));
      return;
    }

    const safeBody = (commentInputs[postId] || '').trim();
    if (safeBody.length < 4) {
      setCommentFeedback((current) => ({
        ...current,
        [postId]: 'Escribe al menos 4 caracteres.',
      }));
      return;
    }

    if (!hasSupabaseConfig) {
      setCommentFeedback((current) => ({
        ...current,
        [postId]: 'No se puede comentar porque Supabase no esta conectado.',
      }));
      return;
    }

    setCommentSubmitting((current) => ({ ...current, [postId]: true }));

    const { data, error } = await supabase
      .from('community_post_comments')
      .insert({
        post_id: postId,
        author_id: profile.id,
        author_name: profile.name,
        author_avatar_url: profile.avatarUrl,
        body: safeBody,
        is_published: true,
      })
      .select('id, post_id, author_id, author_name, author_avatar_url, body, created_at')
      .maybeSingle();

    if (error || !data) {
      setCommentFeedback((current) => ({
        ...current,
        [postId]: getCommunityCommentsErrorMessage(error),
      }));
    } else {
      const normalized = normalizeComment(data);
      setCommentsByPost((current) => ({
        ...current,
        [postId]: [...(current[postId] || []), normalized],
      }));
      setCommentInputs((current) => ({ ...current, [postId]: '' }));
      setCommentFeedback((current) => ({ ...current, [postId]: 'Comentario publicado.' }));
      setPosts((current) =>
        current.map((post) =>
          post.id === postId ? { ...post, comments_count: post.comments_count + 1 } : post
        )
      );
      trackFunnelEvent('community_comment_published', getPostAnalyticsContext(postId));
    }

    setCommentSubmitting((current) => ({ ...current, [postId]: false }));
  };

  return (
    <section
      className={`mx-auto grid w-full gap-5 px-4 pb-12 pt-5 sm:px-6 ${
        isAdminProfile ? 'max-w-6xl lg:grid-cols-[minmax(0,1fr)_260px]' : 'max-w-4xl'
      }`}
    >
      <div className="min-w-0 space-y-4">
        {showCommunityTutorial ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Guia rapida</p>
                <h3 className="mt-1 text-lg font-black text-slate-950">Como usar el muro</h3>
              </div>
              <button
                type="button"
                onClick={hideCommunityTutorial}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-950"
                aria-label="Ocultar tutorial"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {[
                { label: 'Publica', text: 'Pedidos, trabajos, avisos o consultas reales.' },
                { label: 'Filtra', text: 'Busca por ciudad, barrio o rubro.' },
                { label: 'Conecta', text: 'Abre el perfil o conversa en los comentarios.' },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-sm font-black text-[#2a0338]">{item.label}</p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div data-community-composer className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          {!isComposerOpen ? (
            <>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => openComposer(defaultPostType)}
                  className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#2a0338] text-sm font-black text-white"
                  aria-label="Comenzar una publicacion"
                >
                  {profile?.avatarUrl ? (
                    <img src={profile.avatarUrl} alt={profile.name} className="h-full w-full object-cover" />
                  ) : (
                    getInitials(profile?.name || 'UF')
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => openComposer(defaultPostType)}
                  className="min-w-0 flex-1 rounded-full bg-slate-100 px-4 py-3 text-left text-sm font-semibold text-slate-500 transition hover:bg-slate-200"
                >
                  {canPublish ? `Que queres compartir, ${firstName}?` : 'Ingresa con tu cuenta UrbanFix para publicar'}
                </button>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 sm:grid-cols-4">
                {quickComposerActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.type}
                      type="button"
                      onClick={() => openComposer(action.type)}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl px-3 py-2 text-xs font-black text-slate-600 transition hover:bg-slate-100"
                    >
                      <Icon className={`h-4 w-4 ${action.iconClass}`} />
                      {action.label}
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" aria-label="Crear publicacion en Comunidad">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#2a0338] text-sm font-black text-white">
                  {profile?.avatarUrl ? (
                    <img src={profile.avatarUrl} alt={displayName} className="h-full w-full object-cover" />
                  ) : (
                    getInitials(displayName)
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-slate-950">{displayName}</p>
                  <p className="mt-0.5 text-xs font-semibold text-slate-500">Publicacion visible en el muro</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    resetComposer();
                    setFeedback('');
                    setIsComposerOpen(false);
                  }}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-950"
                  aria-label="Cerrar editor"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {availableComposerPostTypes.map((type) => {
                  const meta = postTypeMeta[type];
                  const isSelected = type === postType;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setPostType(type)}
                      disabled={submitting}
                      className={`rounded-2xl border px-3 py-2 text-left text-xs font-black transition disabled:opacity-50 ${
                        isSelected
                          ? 'border-[#ff8f1f] bg-[#fff4e8] text-[#2a0338]'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {meta.label}
                    </button>
                  );
                })}
              </div>

              <textarea
                ref={bodyInputRef}
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder={selectedPostType.bodyPlaceholder || `Que queres compartir, ${firstName}?`}
                rows={4}
                maxLength={3000}
                disabled={submitting}
                className="min-h-[128px] w-full resize-y rounded-2xl border border-slate-200 px-4 py-3 text-base leading-7 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#ff8f1f] disabled:opacity-50"
              />

              <input
                ref={mediaInputRef}
                type="file"
                accept="image/*,video/*"
                multiple
                className="hidden"
                onChange={(event) => handleMediaSelect(event.target.files)}
              />

              {pendingMedia.length > 0 ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {pendingMedia.map((item) => (
                    <div key={item.id} className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                      {item.type === 'image' ? (
                        <img src={item.url} alt={item.name || 'Imagen adjunta'} className="h-40 w-full object-cover" />
                      ) : (
                        <video src={item.url} className="h-40 w-full object-cover" controls />
                      )}
                      <button
                        type="button"
                        onClick={() => removePendingMedia(item.id)}
                        className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/65 text-white transition hover:bg-black"
                        aria-label="Quitar adjunto"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => mediaInputRef.current?.click()}
                  disabled={submitting || pendingMedia.length >= 4}
                  className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ImageIcon className="h-4 w-4 text-emerald-600" />
                  Foto o video{pendingMedia.length ? ` (${pendingMedia.length}/4)` : ''}
                </button>

                <details className="min-w-[210px] flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-2">
                  <summary className="cursor-pointer text-sm font-black text-slate-600">Opciones avanzadas</summary>
                  <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                    <input
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      placeholder="Titulo opcional"
                      maxLength={180}
                      disabled={submitting}
                      className="h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm font-bold outline-none transition focus:border-[#ff8f1f] disabled:opacity-50"
                    />
                    <input
                      value={tagInput}
                      onChange={(event) => setTagInput(event.target.value)}
                      placeholder="Etiquetas: pintura, sanitarios, obra..."
                      disabled={submitting}
                      className="h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm font-semibold outline-none transition focus:border-[#ff8f1f] disabled:opacity-50"
                    />
                  </div>
                </details>

                <button
                  type="submit"
                  disabled={submitting || body.trim().length < 12}
                  className="inline-flex min-h-11 min-w-[138px] items-center justify-center gap-2 rounded-2xl bg-[#ff8f1f] px-5 py-2 text-sm font-black text-[#2a0338] transition hover:bg-[#ffa748] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {submitting ? 'Publicando...' : 'Publicar'}
                </button>
              </div>
            </form>
          )}

          {feedback ? (
            <p
              className={`mt-3 rounded-2xl border px-3 py-2 text-sm font-bold ${
                feedback === 'Publicado.'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-orange-200 bg-orange-50 text-orange-800'
              }`}
            >
              {feedback}
            </p>
          ) : null}
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-[210px_1fr_230px_auto]">
            <select
              value={countryFilter}
              onChange={(event) => handleCountryFilterChange(event.target.value)}
              aria-label="Filtrar Comunidad por país"
              className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-800 outline-none transition focus:border-[#ff8f1f]"
            >
              <option value="">Todos los países</option>
              {COUNTRY_SELECTION_OPTIONS.map((country) => (
                <option key={country} value={country}>
                  {getCountryOptionLabel(country)}
                </option>
              ))}
            </select>
            <input
              value={locationFilter}
              onChange={(event) => setLocationFilter(event.target.value)}
              placeholder="Ciudad, barrio o provincia"
              className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#ff8f1f]"
            />
            <select
              value={specialtyFilter}
              onChange={(event) => setSpecialtyFilter(event.target.value)}
              className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-800 outline-none transition focus:border-[#ff8f1f]"
            >
              <option value="">Todos los rubros</option>
              {TECH_SPECIALTY_OPTIONS.map((specialty) => (
                <option key={specialty} value={specialty}>
                  {specialty}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => {
                handleCountryFilterChange('');
                setLocationFilter('');
                setSpecialtyFilter('');
                setAuthorFilter('');
              }}
              disabled={!hasActiveFilters}
              className="h-12 rounded-2xl bg-slate-100 px-4 text-sm font-black text-slate-600 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Limpiar
            </button>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
            <p className="text-xs font-bold text-slate-500">
              {hasActiveFilters
                ? `Mostrando ${filteredPosts.length} de ${posts.length} publicacion(es).`
                : `${posts.length} publicacion(es) reales en el muro global.`}
            </p>
            <Link
              href={countryFilter ? `/vidriera?pais=${encodeURIComponent(countryFilter)}` : '/vidriera'}
              onClick={() =>
                trackFunnelEvent('community_marketplace_opened', {
                  origin: 'community_filters',
                  country: countryFilter || 'all',
                  community_result_count: filteredPosts.length,
                })
              }
              className="inline-flex items-center gap-2 rounded-full bg-[#2a0338] px-4 py-2 text-xs font-black text-white transition hover:bg-[#401354]"
            >
              <Globe2 className="h-4 w-4 text-[#ff9c1a]" />
              Ver técnicos{countryFilter ? ` en ${countryFilter}` : ''}
            </Link>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black uppercase tracking-[0.14em] text-slate-400">Publicaciones recientes</h3>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-500 shadow-sm">
            {postsLoading ? 'Actualizando' : `${filteredPosts.length} posteo(s)`}
          </span>
        </div>

        {postsError && (
          <div className="rounded-3xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-800">
            {postsError}
          </div>
        )}

        {postsLoading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <Loader2 className="mx-auto h-7 w-7 animate-spin text-[#ff8f1f]" />
            <p className="mt-3 text-sm font-bold text-slate-500">Cargando comunidad...</p>
          </div>
        ) : null}

        {!postsLoading && posts.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-500">
              <MessageCircle className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-xl font-black text-slate-950">Todavia no hay publicaciones reales</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              Cuando un cliente, tecnico o empresa publique, el contenido va a aparecer aca.
            </p>
          </div>
        ) : null}

        {!postsLoading && posts.length > 0 && filteredPosts.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-500">
              <MessageCircle className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-xl font-black text-slate-950">No hay publicaciones para esos filtros</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              Proba otra ciudad, barrio o rubro para ver mas actividad del muro.
            </p>
          </div>
        ) : null}

        <div className="space-y-4">
          {filteredPosts.map((post) => {
            const profileHref =
              post.contact_url ||
              (post.author_role === 'cliente'
                ? ''
                : post.author_id
                  ? buildTechnicianPath(post.author_id, post.author_name)
                  : '/vidriera');
            const hasProfileLink = Boolean(profileHref);
            const isLiked = Boolean(likedPosts[post.id]);
            const isLikeLoading = Boolean(likesLoading[post.id]);
            const postMeta = postTypeMeta[post.post_type];
            const visibleSpecialties = post.author_specialties.slice(0, 4);
            const commentsOpen = openCommentsPostId === post.id;
            const postComments = commentsByPost[post.id] || [];
            const isCommentsLoading = Boolean(commentsLoading[post.id]);
            const commentValue = commentInputs[post.id] || '';
            const isCommentSubmitting = Boolean(commentSubmitting[post.id]);
            const postCommentFeedback = commentFeedback[post.id] || '';
            const postActionMessage = postActionFeedback[post.id] || '';
            const authIntent = authIntentByPost[post.id];
            const isHighlighted = highlightedPostId === post.id;

            return (
              <article
                key={post.id}
                id={`community-post-${post.id}`}
                data-community-post-id={post.id}
                ref={(element) => {
                  postRefs.current[post.id] = element;
                }}
                className={`overflow-hidden rounded-3xl border bg-white shadow-sm transition duration-300 ${
                  isHighlighted
                    ? 'border-[#ff8f1f] ring-4 ring-[#ff8f1f]/20'
                    : 'border-slate-200'
                }`}
              >
                <div className="p-4 sm:p-5">
                  <div className="flex gap-3">
                    {hasProfileLink ? (
                      <Link
                        href={profileHref}
                        onClick={() =>
                          trackFunnelEvent('community_profile_opened', {
                            ...getPostAnalyticsContext(post.id, 'community_author_avatar'),
                            profile_id: post.author_id || 'unknown',
                          })
                        }
                        className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-950 text-sm font-black text-white"
                      >
                        {post.author_avatar_url ? (
                          <img src={post.author_avatar_url} alt={post.author_name} className="h-full w-full object-cover" />
                        ) : (
                          getInitials(post.author_name)
                        )}
                      </Link>
                    ) : (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-950 text-sm font-black text-white">
                        {post.author_avatar_url ? (
                          <img src={post.author_avatar_url} alt={post.author_name} className="h-full w-full object-cover" />
                        ) : (
                          getInitials(post.author_name)
                        )}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {hasProfileLink ? (
                          <Link
                            href={profileHref}
                            onClick={() =>
                              trackFunnelEvent('community_profile_opened', {
                                ...getPostAnalyticsContext(post.id, 'community_author_name'),
                                profile_id: post.author_id || 'unknown',
                              })
                            }
                            className="truncate text-base font-black text-slate-950 hover:text-[#b65b00]"
                          >
                            {post.author_name}
                          </Link>
                        ) : (
                          <span className="truncate text-base font-black text-slate-950">{post.author_name}</span>
                        )}
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.1em] ${roleBadgeClass[post.author_role]}`}>
                          <BadgeCheck className="h-3 w-3" />
                          {roleLabel[post.author_role]}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.1em] ${postMeta.badgeClass}`}
                        >
                          {postMeta.shortLabel}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-400">
                        <span>{formatTimeAgo(post.created_at)}</span>
                        {post.location ? <span>{post.location}</span> : null}
                        <span className="inline-flex items-center gap-1">
                          <Globe2 className="h-3.5 w-3.5" />
                          Publico
                        </span>
                      </div>
                    </div>
                  </div>

                  {post.title && <h2 className="mt-4 text-xl font-black text-slate-950">{post.title}</h2>}
                  <p className="mt-2 whitespace-pre-line text-[15px] leading-7 text-slate-700">{post.body}</p>

                  {visibleSpecialties.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {visibleSpecialties.map((specialty) => (
                        <span
                          key={specialty}
                          className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-black text-slate-600"
                        >
                          {specialty}
                        </span>
                      ))}
                    </div>
                  )}

                  {post.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {post.tags.map((tag) => (
                        <span key={tag} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {post.media_items.length > 0 && (
                  <div className={`grid gap-1 bg-slate-100 ${post.media_items.length > 1 ? 'sm:grid-cols-2' : ''}`}>
                    {post.media_items.map((item, index) => (
                      <div key={`${item.url}-${index}`} className="overflow-hidden bg-slate-100">
                        {item.type === 'video' ? (
                          <video src={item.url} className="max-h-[520px] w-full object-cover" controls />
                        ) : (
                          <img
                            src={item.url}
                            alt={item.name || 'Imagen de publicacion'}
                            className="max-h-[520px] w-full object-cover"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="px-4 py-3 sm:px-5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 text-xs font-bold text-slate-500">
                    <span>{post.likes_count} me gusta</span>
                    <span>{post.comments_count} comentarios</span>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2">
                    <button
                      ref={(element) => {
                        likeButtonRefs.current[post.id] = element;
                      }}
                      type="button"
                      onClick={() => void handleLike(post.id)}
                      disabled={isLikeLoading}
                      className={`inline-flex min-w-[128px] flex-1 items-center justify-center gap-2 rounded-2xl px-3 py-2 text-sm font-black transition disabled:cursor-wait disabled:opacity-70 ${
                        isLiked
                          ? 'bg-rose-50 text-rose-700'
                          : isHighlighted && targetPostAction === 'like'
                            ? 'bg-[#fff4e8] text-[#9a4b00] ring-2 ring-[#ff8f1f]/30'
                            : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {isLikeLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
                      )}
                      {isLiked ? 'Te gusta' : 'Me gusta'}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleComments(post)}
                      className="inline-flex min-w-[128px] flex-1 items-center justify-center gap-2 rounded-2xl px-3 py-2 text-sm font-black text-slate-600 transition hover:bg-slate-100"
                    >
                      <MessageCircle className="h-4 w-4" />
                      Comentar
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleSharePost(post)}
                      className="inline-flex min-w-[128px] flex-1 items-center justify-center gap-2 rounded-2xl px-3 py-2 text-sm font-black text-slate-600 transition hover:bg-slate-100"
                    >
                      <Share2 className="h-4 w-4" />
                      Compartir
                    </button>
                    {hasProfileLink && (post.author_role === 'tecnico' || post.author_role === 'empresa') ? (
                      <Link
                        href={profileHref}
                        onClick={() =>
                          trackFunnelEvent('community_profile_opened', {
                            ...getPostAnalyticsContext(post.id, 'community_post_actions'),
                            profile_id: post.author_id || 'unknown',
                          })
                        }
                        className="inline-flex min-w-[128px] flex-1 items-center justify-center gap-2 rounded-2xl bg-[#fff4e8] px-3 py-2 text-sm font-black text-[#8b4300] transition hover:bg-[#ffe5c8]"
                      >
                        <UserRound className="h-4 w-4" />
                        Ver perfil
                      </Link>
                    ) : null}
                  </div>

                  {postActionMessage ? (
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-slate-50 px-3 py-2 text-sm font-bold text-slate-600">
                      <span>{postActionMessage}</span>
                      {authIntent ? (
                        <Link
                          href={buildCommunityAuthHref(
                            buildCommunityPath({
                              postId: post.id,
                              action: authIntent,
                              country: countryFilter || undefined,
                            })
                          )}
                          className="inline-flex rounded-full bg-[#2a0338] px-4 py-2 text-xs font-black text-white transition hover:bg-[#401354]"
                        >
                          Ingresar
                        </Link>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                {commentsOpen ? (
                  <div className="border-t border-slate-100 bg-slate-50 px-4 py-4 sm:px-5">
                    {isCommentsLoading ? (
                      <div className="flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-5 text-sm font-bold text-slate-500">
                        <Loader2 className="h-4 w-4 animate-spin text-[#ff8f1f]" />
                        Cargando comentarios...
                      </div>
                    ) : postComments.length > 0 ? (
                      <div className="space-y-3">
                        {postComments.map((comment) => (
                          <div key={comment.id} className="flex gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-900 text-[11px] font-black text-white">
                              {comment.author_avatar_url ? (
                                <img
                                  src={comment.author_avatar_url}
                                  alt={comment.author_name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                getInitials(comment.author_name)
                              )}
                            </div>
                            <div className="min-w-0 flex-1 rounded-2xl bg-white px-3 py-2 shadow-sm">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-black text-slate-950">{comment.author_name}</p>
                                <span className="text-[11px] font-bold text-slate-400">
                                  {formatTimeAgo(comment.created_at)}
                                </span>
                              </div>
                              <p className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-700">{comment.body}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-2xl bg-white px-4 py-5 text-center text-sm font-bold text-slate-500 shadow-sm">
                        Se el primero en comentar esta publicacion.
                      </div>
                    )}

                    <div className="mt-4">
                      {canComment ? (
                        <form onSubmit={(event) => handleCommentSubmit(event, post.id)} className="flex gap-2">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#2a0338] text-xs font-black text-white">
                            {profile?.avatarUrl ? (
                              <img src={profile.avatarUrl} alt={displayName} className="h-full w-full object-cover" />
                            ) : (
                              getInitials(displayName)
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <textarea
                              ref={(element) => {
                                commentInputRefs.current[post.id] = element;
                              }}
                              value={commentValue}
                              onChange={(event) =>
                                setCommentInputs((current) => ({ ...current, [post.id]: event.target.value }))
                              }
                              placeholder="Escribi un comentario..."
                              rows={2}
                              maxLength={700}
                              className="min-h-[70px] w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#ff8f1f]"
                            />
                            <div className="mt-2 flex items-center justify-between gap-2">
                              <span className="text-xs font-bold text-slate-400">{commentValue.trim().length}/700</span>
                              <button
                                type="submit"
                                disabled={isCommentSubmitting}
                                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#ff8f1f] px-4 py-2 text-sm font-black text-[#2a0338] transition hover:bg-[#ffa748] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
                              >
                                {isCommentSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                Publicar
                              </button>
                            </div>
                          </div>
                        </form>
                      ) : (
                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm">
                          <p className="text-sm font-bold text-slate-500">Ingresa con tu cuenta UrbanFix para comentar.</p>
                          <Link
                            href={buildCommunityAuthHref(
                              buildCommunityPath({
                                postId: post.id,
                                action: 'comentar',
                                country: countryFilter || undefined,
                              })
                            )}
                            onClick={() =>
                              trackFunnelEvent('community_auth_requested', {
                                ...getPostAnalyticsContext(post.id),
                                action: 'comment',
                              })
                            }
                            className="inline-flex rounded-full bg-[#2a0338] px-4 py-2 text-sm font-black text-white transition hover:bg-[#401354]"
                          >
                            Ingresar
                          </Link>
                        </div>
                      )}

                      {postCommentFeedback ? (
                        <p className="mt-2 rounded-2xl bg-white px-3 py-2 text-sm font-bold text-slate-500 shadow-sm">
                          {postCommentFeedback}
                        </p>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </div>

      {isAdminProfile ? (
        <aside className="hidden lg:block">
          <div className="sticky top-20 space-y-3">
            <details className="rounded-3xl border border-[#f0d8bd] bg-white p-4 shadow-sm">
	              <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
	                <div className="flex items-center justify-between gap-3">
	                  <div className="flex min-w-0 items-center gap-3">
	                    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white text-xs font-black text-slate-950">
	                      {adminProfileDraft.logoUrl ? (
	                        <img
	                          src={adminProfileDraft.logoUrl}
	                          alt={adminProfileDraft.name || 'UrbanFix'}
	                          className="h-full w-full object-contain p-1.5"
	                        />
	                      ) : (
	                        getInitials(adminProfileDraft.name || 'UrbanFix')
	                      )}
	                    </div>
	                    <div className="min-w-0">
	                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#b65b00]">
	                        Configuracion
	                      </p>
	                      <h3 className="truncate text-sm font-black text-slate-950">Autor: {displayName}</h3>
	                    </div>
	                  </div>
	                  <span className="inline-flex items-center gap-1 rounded-full bg-[#fff4e8] px-2 py-1 text-[10px] font-black text-[#b65b00]">
	                    <BadgeCheck className="h-3 w-3" />
	                    Oficial
	                  </span>
	                </div>
	              </summary>

	              <div className="mt-4 space-y-2 border-t border-[#f4e2ce] pt-4">
	                <input
	                  value={adminProfileDraft.name}
	                  onChange={(event) =>
	                    setAdminProfileDraft((current) => ({ ...current, name: event.target.value }))
	                  }
	                  placeholder="Nombre para publicar"
	                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#ff8f1f]"
	                />
	                <input
	                  value={adminProfileDraft.logoUrl}
	                  onChange={(event) =>
	                    setAdminProfileDraft((current) => ({ ...current, logoUrl: event.target.value }))
	                  }
	                  placeholder="/logo-ufx-main.png"
	                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#ff8f1f]"
	                />
	                <button
	                  type="button"
	                  onClick={saveAdminProfile}
	                  className="h-11 w-full rounded-2xl bg-[#2a0338] px-4 text-sm font-black text-white transition hover:bg-[#401354]"
	                >
	                  Guardar perfil
	                </button>
	                {adminProfileFeedback ? (
	                  <p className="text-xs font-bold text-emerald-700">{adminProfileFeedback}</p>
	                ) : null}
	              </div>
            </details>
          </div>
        </aside>
      ) : null}

    </section>
  );
}

