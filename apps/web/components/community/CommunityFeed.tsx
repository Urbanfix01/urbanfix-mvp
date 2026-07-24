'use client';

import { type FormEvent, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  BadgeCheck,
  Camera,
  Globe2,
  Heart,
  ImageIcon,
  Loader2,
  Megaphone,
  MessageCircle,
  Send,
  Share2,
  Sparkles,
  X,
} from 'lucide-react';

import { hasSupabaseConfig, supabase } from '../../lib/supabase/supabase';
import { buildTechnicianPath } from '../../lib/seo/technician-profile';
import { parseGremioSpecialties } from '../../lib/seo/gremios-data';
import { TECH_SPECIALTY_OPTIONS, TECH_SPECIALTY_SEARCH_ALIASES } from '../../lib/technician-specialties';

type PostType = 'post' | 'publicidad' | 'trabajo' | 'aviso' | 'consulta' | 'antes_despues';
type AuthorRole = 'tecnico' | 'empresa';

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
  whatsapp_url: string | null;
  author_location: string | null;
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
  phone: string | null;
  location: string | null;
  specialties: string[];
  profileHref: string;
  whatsappHref: string;
};

type CommunityAuthorPublicProfile = {
  id: string;
  name: string;
  avatarUrl: string | null;
  profileHref: string;
  whatsappHref: string;
  location: string | null;
  specialties: string[];
};

const roleLabel: Record<AuthorRole, string> = {
  tecnico: 'Tecnico',
  empresa: 'Empresa',
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

const composerPostTypes: PostType[] = ['trabajo', 'aviso', 'consulta', 'antes_despues'];

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

const buildWhatsappLink = (phone: string | null | undefined) => {
  const raw = String(phone || '').replace(/\D/g, '');
  if (!raw) return '';

  let normalized = raw;
  if (normalized.startsWith('00')) normalized = normalized.slice(2);
  if (!normalized.startsWith('54')) {
    if (normalized.startsWith('0')) normalized = normalized.slice(1);
    if (normalized.length === 11 && normalized.slice(2, 4) === '15') {
      normalized = `${normalized.slice(0, 2)}${normalized.slice(4)}`;
    }
    normalized = `54${normalized}`;
  }

  return `https://wa.me/${normalized}`;
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
    whatsappHref: buildWhatsappLink(row?.phone),
    location: buildProfileLocation(row),
    specialties: parseGremioSpecialties(row?.specialties).slice(0, 6),
  };
};

const profileToAuthorProfile = (profile: CommunityProfile): CommunityAuthorPublicProfile => ({
  id: profile.id,
  name: profile.name,
  avatarUrl: profile.avatarUrl,
  profileHref: profile.profileHref,
  whatsappHref: profile.whatsappHref,
  location: profile.location,
  specialties: profile.specialties,
});

const normalizePost = (
  row: any,
  authorProfiles: Record<string, CommunityAuthorPublicProfile> = {}
): CommunityPost => {
  const authorId = row.author_id ? String(row.author_id) : null;
  const publicProfile = authorId ? authorProfiles[authorId] : null;
  const authorName = publicProfile?.name || String(row.author_name || 'Tecnico UrbanFix');
  const authorSpecialties = publicProfile?.specialties || [];

  return {
    id: String(row.id),
    author_id: authorId,
    author_name: authorName,
    author_role: row.author_role === 'empresa' ? 'empresa' : 'tecnico',
    author_avatar_url: publicProfile?.avatarUrl || (row.author_avatar_url ? String(row.author_avatar_url) : null),
    post_type: postTypeMeta[row.post_type as PostType] ? (row.post_type as PostType) : 'post',
    title: row.title ? String(row.title) : null,
    body: String(row.body || ''),
    category: row.category ? String(row.category) : authorSpecialties[0] || null,
    location: row.location ? String(row.location) : publicProfile?.location || null,
    coordinates: normalizeCoordinates(row.coordinates),
    contact_url: row.contact_url ? String(row.contact_url) : publicProfile?.profileHref || (authorId ? `/tecnico/${authorId}` : null),
    whatsapp_url: publicProfile?.whatsappHref || null,
    author_location: publicProfile?.location || null,
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

  if (code === 'PGRST205' || code === '42P01' || message.includes('community_posts')) {
    return 'El muro esta listo en la app, pero falta activar la tabla community_posts en Supabase.';
  }

  if (code === '42501' || message.toLowerCase().includes('permission denied')) {
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

export default function CommunityFeed() {
  const mediaInputRef = useRef<HTMLInputElement | null>(null);
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
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [pendingMedia, setPendingMedia] = useState<PendingMedia[]>([]);
  const [openCommentsPostId, setOpenCommentsPostId] = useState<string | null>(null);
  const [commentsByPost, setCommentsByPost] = useState<Record<string, CommunityComment[]>>({});
  const [commentsLoading, setCommentsLoading] = useState<Record<string, boolean>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [commentFeedback, setCommentFeedback] = useState<Record<string, string>>({});
  const [commentSubmitting, setCommentSubmitting] = useState<Record<string, boolean>>({});
  const [locationFilter, setLocationFilter] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('');
  const [authorFilter, setAuthorFilter] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadSessionProfile = async () => {
      if (!hasSupabaseConfig) {
        setAuthLoading(false);
        return undefined;
      }

      const applyUser = async (user: any) => {
        if (!user) {
          if (!cancelled) {
            setProfile(null);
            setAuthLoading(false);
          }
          return;
        }

        const metadata = user.user_metadata || {};
        const metadataRole = String(metadata.user_type || metadata.profile || '').toLowerCase();
        const role: AuthorRole | null =
          metadataRole === 'empresa' ? 'empresa' : metadataRole === 'tecnico' ? 'tecnico' : null;

        const { data } = await supabase
          .from('profiles')
          .select(
            'id, full_name, business_name, avatar_url, company_logo_url, phone, country, city, service_city, service_district, service_province, specialties'
          )
          .eq('id', user.id)
          .maybeSingle();

        if (cancelled) return;

        const profileName =
          String(data?.business_name || data?.full_name || metadata.business_name || metadata.full_name || user.email || '')
            .trim() || 'Tecnico UrbanFix';
        const profileSpecialties = parseGremioSpecialties(data?.specialties).slice(0, 6);

        setProfile({
          id: user.id,
          name: profileName,
          role,
          avatarUrl: String(data?.company_logo_url || data?.avatar_url || metadata.avatar_url || '').trim() || null,
          phone: String(data?.phone || metadata.phone || metadata.whatsapp || '').trim() || null,
          location: buildProfileLocation(data),
          specialties: profileSpecialties,
          profileHref: buildTechnicianPath(user.id, profileName),
          whatsappHref: buildWhatsappLink(data?.phone || metadata.phone || metadata.whatsapp),
        });
        setAuthLoading(false);
      };

      const { data } = await supabase.auth.getSession();
      await applyUser(data.session?.user || null);

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, nextSession) => {
        void applyUser(nextSession?.user || null);
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
    setAuthorFilter(new URLSearchParams(window.location.search).get('autor') || '');
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
              'id, email, full_name, business_name, avatar_url, company_logo_url, phone, country, city, service_city, service_district, service_province, specialties'
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

  const canPublish = Boolean(profile?.role);
  const canComment = Boolean(profile?.id);
  const displayName = profile?.name || 'Comunidad UrbanFix';
  const firstName = profile?.name?.trim().split(/\s+/)[0] || 'UrbanFix';
  const loginHref = `/tecnicos?perfil=tecnico&mode=login&next=${encodeURIComponent('/comunidad')}`;
  const selectedPostType = postTypeMeta[postType];
  const normalizedLocationFilter = normalizeFilterText(locationFilter);
  const hasActiveFilters = Boolean(normalizedLocationFilter || specialtyFilter || authorFilter);
  const filteredPosts = posts.filter((post) => {
    const locationText = normalizeFilterText([post.location, post.author_location].filter(Boolean).join(' '));
    const matchesLocation = !normalizedLocationFilter || locationText.includes(normalizedLocationFilter);
    const matchesSpecialty = !specialtyFilter || postMatchesSpecialty(post, specialtyFilter);
    const matchesAuthor = !authorFilter || post.author_id === authorFilter;
    return matchesLocation && matchesSpecialty && matchesAuthor;
  });

  const openComposer = (nextPostType: PostType = postType) => {
    setPostType(nextPostType);
    setIsComposerOpen(true);
  };

  useEffect(() => {
    if (authLoading || !canPublish || isComposerOpen || typeof window === 'undefined') return;

    const requestedType = new URLSearchParams(window.location.search).get('crear') as PostType | null;
    if (requestedType && composerPostTypes.includes(requestedType)) {
      setPostType(requestedType);
      setIsComposerOpen(true);
    }
  }, [authLoading, canPublish, isComposerOpen]);

  const resetComposer = () => {
    setPostType('trabajo');
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
      setFeedback('Ingresa como tecnico o empresa para publicar.');
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
          author_name: profile.name || 'Tecnico UrbanFix',
          author_role: profile.role || 'tecnico',
          author_avatar_url: profile.avatarUrl || null,
          post_type: postType,
          title: safeTitle || null,
          body: safeBody,
          category: profile.specialties[0] || null,
          location: profile.location,
          contact_url: profile.profileHref,
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
      setFeedback('Publicado.');
      resetComposer();
      setIsComposerOpen(false);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'No pudimos publicar en la comunidad.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLike = (postId: string) => {
    const wasLiked = Boolean(likedPosts[postId]);
    setLikedPosts((current) => ({ ...current, [postId]: !wasLiked }));
    setPosts((current) =>
      current.map((post) =>
        post.id === postId
          ? { ...post, likes_count: Math.max(0, post.likes_count + (wasLiked ? -1 : 1)) }
          : post
      )
    );
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

  const toggleComments = (postId: string) => {
    setOpenCommentsPostId((current) => (current === postId ? null : postId));
    if (!commentsByPost[postId]) void loadComments(postId);
  };

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
    }

    setCommentSubmitting((current) => ({ ...current, [postId]: false }));
  };

  return (
    <section className="mx-auto grid w-full max-w-7xl gap-5 px-4 pb-12 pt-5 sm:px-6 lg:grid-cols-[230px_minmax(0,1fr)_280px]">
      <aside className="hidden lg:block">
        <div className="sticky top-20 space-y-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Comunidad</p>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Muro UrbanFix</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Posteos reales de tecnicos y empresas dentro de la plataforma.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-2 shadow-sm">
            {[
              { label: 'Publicaciones', icon: MessageCircle },
              { label: 'Trabajos recientes', icon: Camera },
              { label: 'Avisos y promos', icon: Megaphone },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  type="button"
                  className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-bold text-slate-700 transition hover:bg-slate-100"
                >
                  <Icon className="h-4 w-4 text-[#ff8f1f]" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </aside>

      <div className="min-w-0 space-y-4">
        <div className="overflow-hidden rounded-[28px] border border-[#f0d8bd] bg-[#2a0338] text-white shadow-xl">
          <div className="bg-[radial-gradient(circle_at_15%_10%,rgba(255,143,31,0.36),transparent_28%),linear-gradient(135deg,#2a0338,#401354)] px-5 py-6 sm:px-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-[#ffd7a6]">
                  <Sparkles className="h-3.5 w-3.5" />
                  Muro de la comunidad
                </span>
                <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">Comparte, muestra y conecta</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-white/78">
                  Un feed para publicar avances, trabajos terminados, novedades y avisos sin mezclar actividad ficticia.
                </p>
              </div>
              <Link
                href="/vidriera"
                className="inline-flex rounded-full border border-white/20 bg-white px-4 py-2 text-sm font-black text-[#2a0338] transition hover:bg-[#ff8f1f]"
              >
                Ver tecnicos
              </Link>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => openComposer('trabajo')}
              className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#2a0338] text-sm font-black text-white"
              aria-label="Abrir perfil para publicar"
            >
              {profile?.avatarUrl ? (
                <img src={profile.avatarUrl} alt={profile.name} className="h-full w-full object-cover" />
              ) : (
                getInitials(profile?.name || 'UF')
              )}
            </button>

            <button
              type="button"
              onClick={() => openComposer('trabajo')}
              className="min-w-0 flex-1 rounded-full bg-slate-100 px-4 py-3 text-left text-sm font-semibold text-slate-500 transition hover:bg-slate-200"
            >
              {canPublish ? `Que queres compartir, ${firstName}?` : 'Ingresa como tecnico o empresa para publicar'}
            </button>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 sm:grid-cols-4">
            <button
              type="button"
              onClick={() => openComposer('trabajo')}
              className="inline-flex items-center justify-center gap-2 rounded-2xl px-3 py-2 text-xs font-black text-slate-600 transition hover:bg-slate-100"
            >
              <Camera className="h-4 w-4 text-emerald-600" />
              Trabajo
            </button>
            <button
              type="button"
              onClick={() => openComposer('aviso')}
              className="inline-flex items-center justify-center gap-2 rounded-2xl px-3 py-2 text-xs font-black text-slate-600 transition hover:bg-slate-100"
            >
              <Megaphone className="h-4 w-4 text-[#ff8f1f]" />
              Aviso
            </button>
            <button
              type="button"
              onClick={() => openComposer('consulta')}
              className="inline-flex items-center justify-center gap-2 rounded-2xl px-3 py-2 text-xs font-black text-slate-600 transition hover:bg-slate-100"
            >
              <MessageCircle className="h-4 w-4 text-sky-600" />
              Consulta
            </button>
            <button
              type="button"
              onClick={() => openComposer('antes_despues')}
              className="inline-flex items-center justify-center gap-2 rounded-2xl px-3 py-2 text-xs font-black text-slate-600 transition hover:bg-slate-100"
            >
              <ImageIcon className="h-4 w-4 text-violet-600" />
              Antes/despues
            </button>
          </div>

          {feedback && <p className="mt-3 text-sm font-semibold text-slate-500">{feedback}</p>}
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="grid gap-2 sm:grid-cols-[1fr_230px_auto]">
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
          {hasActiveFilters ? (
            <p className="mt-2 text-xs font-bold text-slate-500">
              Mostrando {filteredPosts.length} de {posts.length} publicacion(es).
            </p>
          ) : null}
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
              Cuando un tecnico o empresa publique, el contenido va a aparecer aca.
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
              post.contact_url || (post.author_id ? buildTechnicianPath(post.author_id, post.author_name) : '/vidriera');
            const isLiked = Boolean(likedPosts[post.id]);
            const postMeta = postTypeMeta[post.post_type];
            const visibleSpecialties = post.author_specialties.slice(0, 4);
            const commentsOpen = openCommentsPostId === post.id;
            const postComments = commentsByPost[post.id] || [];
            const isCommentsLoading = Boolean(commentsLoading[post.id]);
            const commentValue = commentInputs[post.id] || '';
            const isCommentSubmitting = Boolean(commentSubmitting[post.id]);
            const postCommentFeedback = commentFeedback[post.id] || '';

            return (
              <article key={post.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="p-4 sm:p-5">
                  <div className="flex gap-3">
                    <Link
                      href={profileHref}
                      className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-950 text-sm font-black text-white"
                    >
                      {post.author_avatar_url ? (
                        <img src={post.author_avatar_url} alt={post.author_name} className="h-full w-full object-cover" />
                      ) : (
                        getInitials(post.author_name)
                      )}
                    </Link>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link href={profileHref} className="truncate text-base font-black text-slate-950 hover:text-[#b65b00]">
                          {post.author_name}
                        </Link>
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.1em] text-emerald-700">
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

                  <div className={`grid gap-2 pt-2 ${post.whatsapp_url ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'}`}>
                    <button
                      type="button"
                      onClick={() => handleLike(post.id)}
                      className={`inline-flex items-center justify-center gap-2 rounded-2xl px-3 py-2 text-sm font-black transition ${
                        isLiked ? 'bg-rose-50 text-rose-700' : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
                      Me gusta
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleComments(post.id)}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl px-3 py-2 text-sm font-black text-slate-600 transition hover:bg-slate-100"
                    >
                      <MessageCircle className="h-4 w-4" />
                      Comentar
                    </button>
                    <Link
                      href={profileHref}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl px-3 py-2 text-sm font-black text-slate-600 transition hover:bg-slate-100"
                    >
                      <Share2 className="h-4 w-4" />
                      Ver perfil
                    </Link>
                    {post.whatsapp_url ? (
                      <Link
                        href={post.whatsapp_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-50 px-3 py-2 text-sm font-black text-emerald-700 transition hover:bg-emerald-100"
                      >
                        <Send className="h-4 w-4" />
                        WhatsApp
                      </Link>
                    ) : null}
                  </div>
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
                            href={loginHref}
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

      <aside className="hidden lg:block">
        <div className="sticky top-20 space-y-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Publicar</p>
            <h3 className="mt-2 text-lg font-black text-slate-950">Solo cuentas UrbanFix</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              El muro queda reservado para tecnicos y empresas con cuenta iniciada.
            </p>
            {canPublish ? (
              <button
                type="button"
                onClick={() => openComposer('trabajo')}
                className="mt-4 inline-flex w-full justify-center rounded-full bg-[#ff8f1f] px-4 py-2.5 text-sm font-black text-[#2a0338] transition hover:bg-[#ffa748]"
              >
                Crear publicacion
              </button>
            ) : (
              <Link
                href={loginHref}
                className="mt-4 inline-flex w-full justify-center rounded-full bg-[#2a0338] px-4 py-2.5 text-sm font-black text-white transition hover:bg-[#401354]"
              >
                Ingresar
              </Link>
            )}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Actividad real</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-2xl bg-slate-100 p-3">
                <p className="text-2xl font-black text-slate-950">{posts.length}</p>
                <p className="text-xs font-bold text-slate-500">posteos</p>
              </div>
              <div className="rounded-2xl bg-slate-100 p-3">
                <p className="text-2xl font-black text-slate-950">{posts.filter((post) => post.media_items.length).length}</p>
                <p className="text-xs font-bold text-slate-500">con media</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {isComposerOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 px-4 py-6">
          <form
            onSubmit={handleSubmit}
            className="max-h-[92vh] w-full max-w-xl overflow-hidden rounded-3xl bg-white text-slate-950 shadow-2xl"
          >
            <div className="relative border-b border-slate-100 px-5 py-4 text-center">
              <h2 className="text-xl font-black">Crear publicacion</h2>
              <button
                type="button"
                onClick={() => setIsComposerOpen(false)}
                className="absolute right-4 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-950"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[calc(92vh-70px)] overflow-y-auto p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#2a0338] text-sm font-black text-white">
                  {profile?.avatarUrl ? (
                    <img src={profile.avatarUrl} alt={displayName} className="h-full w-full object-cover" />
                  ) : (
                    getInitials(displayName)
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-black">{authLoading ? 'Cargando...' : displayName}</p>
                  <span className="mt-1 inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs font-black text-slate-600">
                    <Globe2 className="h-3.5 w-3.5" />
                    {selectedPostType.shortLabel}
                  </span>
                </div>
              </div>

              {!canPublish && !authLoading ? (
                <div className="mt-4 rounded-2xl border border-orange-200 bg-orange-50 px-3 py-3 text-sm font-semibold text-orange-800">
                  Para publicar, ingresa con una cuenta de tecnico o empresa.
                  <Link href={loginHref} className="ml-2 font-black underline">
                    Ingresar
                  </Link>
                </div>
              ) : null}

              <div className="mt-4 grid grid-cols-2 gap-2">
                {composerPostTypes.map((type) => {
                  const meta = postTypeMeta[type];
                  const isSelected = type === postType;

                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setPostType(type)}
                      disabled={!canPublish || submitting}
                      className={`rounded-2xl border px-3 py-3 text-left transition disabled:opacity-50 ${
                        isSelected
                          ? 'border-[#ff8f1f] bg-[#fff4e8] text-[#2a0338]'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <span className="block text-sm font-black">{meta.label}</span>
                      <span className="mt-1 block text-xs font-semibold leading-5 text-slate-500">{meta.helper}</span>
                    </button>
                  );
                })}
              </div>

              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder={`Titulo opcional para ${selectedPostType.shortLabel.toLowerCase()}`}
                disabled={!canPublish || submitting}
                className="mt-4 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none transition focus:border-[#ff8f1f] disabled:opacity-50"
              />

              <textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder={selectedPostType.bodyPlaceholder || `Que queres compartir, ${firstName}?`}
                rows={7}
                autoFocus
                disabled={!canPublish || submitting}
                className="mt-3 min-h-[180px] w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-lg leading-8 outline-none transition placeholder:text-slate-400 focus:border-[#ff8f1f] disabled:opacity-50"
              />

              <input
                value={tagInput}
                onChange={(event) => setTagInput(event.target.value)}
                placeholder="Etiquetas: pintura, sanitarios, obra..."
                disabled={!canPublish || submitting}
                className="mt-3 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none transition focus:border-[#ff8f1f] disabled:opacity-50"
              />

              <input
                ref={mediaInputRef}
                type="file"
                accept="image/*,video/*"
                multiple
                className="hidden"
                onChange={(event) => handleMediaSelect(event.target.files)}
              />

              {pendingMedia.length > 0 && (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {pendingMedia.map((item) => (
                    <div key={item.id} className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                      {item.type === 'image' ? (
                        <img src={item.url} alt={item.name || 'Imagen adjunta'} className="h-44 w-full object-cover" />
                      ) : (
                        <video src={item.url} className="h-44 w-full object-cover" controls />
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
              )}

              <div className="mt-4 flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3">
                <p className="text-sm font-black text-slate-700">Agregar a tu publicacion</p>
                <button
                  type="button"
                  onClick={() => mediaInputRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-200"
                >
                  <ImageIcon className="h-4 w-4 text-emerald-600" />
                  Foto o video
                </button>
              </div>

              <button
                type="submit"
                disabled={!canPublish || submitting || body.trim().length < 12}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#ff8f1f] px-4 py-3 text-sm font-black text-[#2a0338] transition hover:bg-[#ffa748] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {submitting ? 'Publicando...' : 'Publicar'}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}

