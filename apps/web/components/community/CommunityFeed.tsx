'use client';

import { type FormEvent, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Camera, Globe2, Heart, ImageIcon, MessageCircle, Send, Smile, X } from 'lucide-react';

import { hasSupabaseConfig, supabase } from '../../lib/supabase/supabase';

type PostType = 'post' | 'publicidad';
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
  tags: string[];
  media_items: CommunityMedia[];
  likes_count: number;
  comments_count: number;
  created_at: string;
  source?: 'remote' | 'local' | 'seed';
};

type CommunityProfile = {
  id: string;
  name: string;
  role: AuthorRole | null;
  avatarUrl: string | null;
};

const LOCAL_POSTS_KEY = 'urbanfix_community_local_posts_v1';

const seedPosts: CommunityPost[] = [
  {
    id: 'seed-post-1',
    author_id: null,
    author_name: 'UrbanFix',
    author_role: 'empresa',
    author_avatar_url: null,
    post_type: 'post',
    title: 'Bienvenidos a Comunidad',
    body: 'Este espacio es para compartir novedades, trabajos, servicios y publicidades de tecnicos y empresas UrbanFix.',
    category: null,
    location: null,
    coordinates: null,
    contact_url: '/tecnicos?perfil=tecnico',
    tags: [],
    media_items: [],
    likes_count: 18,
    comments_count: 3,
    created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    source: 'seed',
  },
  {
    id: 'seed-post-2',
    author_id: null,
    author_name: 'OBRAS CASTILLO',
    author_role: 'empresa',
    author_avatar_url: null,
    post_type: 'publicidad',
    title: 'Mantenimiento integral',
    body: 'Pintura, reparaciones y mantenimiento general. Presupuesto claro y seguimiento por UrbanFix.',
    category: 'Mantenimiento',
    location: 'Buenos Aires',
    coordinates: null,
    contact_url: '/vidriera',
    tags: ['mantenimiento', 'pintura'],
    media_items: [],
    likes_count: 41,
    comments_count: 7,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    source: 'seed',
  },
];

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

const normalizePost = (row: any, source: CommunityPost['source'] = 'remote'): CommunityPost => ({
  id: String(row.id),
  author_id: row.author_id ? String(row.author_id) : null,
  author_name: String(row.author_name || 'Tecnico UrbanFix'),
  author_role: row.author_role === 'empresa' ? 'empresa' : 'tecnico',
  author_avatar_url: row.author_avatar_url ? String(row.author_avatar_url) : null,
  post_type: row.post_type === 'publicidad' ? 'publicidad' : 'post',
  title: row.title ? String(row.title) : null,
  body: String(row.body || ''),
  category: row.category ? String(row.category) : null,
  location: row.location ? String(row.location) : null,
  coordinates: normalizeCoordinates(row.coordinates),
  contact_url: row.contact_url ? String(row.contact_url) : null,
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
  source,
});

const readLocalPosts = (): CommunityPost[] => {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(LOCAL_POSTS_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.map((row) => normalizePost(row, 'local')) : [];
  } catch {
    return [];
  }
};

const writeLocalPosts = (posts: CommunityPost[]) => {
  if (typeof window === 'undefined') return;
  try {
    const serializablePosts = posts.slice(0, 40).map((post) => ({
      ...post,
      media_items: post.media_items.filter((item) => !item.url.startsWith('blob:')),
    }));
    window.localStorage.setItem(LOCAL_POSTS_KEY, JSON.stringify(serializablePosts));
  } catch {
    // Community posts stay visible for the current session even if storage is blocked.
  }
};

const buildId = () => {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  } catch {
    // Fall back below.
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
  const [posts, setPosts] = useState<CommunityPost[]>(seedPosts);
  const [profile, setProfile] = useState<CommunityProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [pendingMedia, setPendingMedia] = useState<PendingMedia[]>([]);

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
          .select('id, full_name, business_name, avatar_url, company_logo_url')
          .eq('id', user.id)
          .maybeSingle();

        if (cancelled) return;

        setProfile({
          id: user.id,
          name:
            String(data?.business_name || data?.full_name || metadata.business_name || metadata.full_name || user.email || '')
              .trim() || 'Tecnico UrbanFix',
          role,
          avatarUrl: String(data?.company_logo_url || data?.avatar_url || metadata.avatar_url || '').trim() || null,
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
    let cancelled = false;

    const loadPosts = async () => {
      const localPosts = readLocalPosts();

      if (!hasSupabaseConfig) {
        if (!cancelled) {
          setPosts([...localPosts, ...seedPosts]);
          setPostsLoading(false);
        }
        return;
      }

      const { data, error } = await supabase
        .from('community_posts')
        .select(
          'id, author_id, author_name, author_role, author_avatar_url, post_type, title, body, category, location, contact_url, tags, media_items, likes_count, comments_count, created_at'
        )
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(50);

      if (cancelled) return;

      setPosts(error ? [...localPosts, ...seedPosts] : [...(data || []).map((row) => normalizePost(row, 'remote')), ...localPosts, ...seedPosts]);
      setPostsLoading(false);
    };

    void loadPosts();

    return () => {
      cancelled = true;
    };
  }, []);

  const canPublish = Boolean(profile?.role);
  const displayName = profile?.name || 'Comunidad UrbanFix';
  const firstName = profile?.name?.trim().split(/\s+/)[0] || 'UrbanFix';

  const resetComposer = (options?: { revokeMedia?: boolean }) => {
    const shouldRevokeMedia = options?.revokeMedia ?? true;
    setTitle('');
    setBody('');
    setTagInput('');
    if (shouldRevokeMedia) pendingMedia.forEach((item) => URL.revokeObjectURL(item.url));
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

  const saveLocalPost = (post: CommunityPost) => {
    const localPosts = [post, ...readLocalPosts()];
    writeLocalPosts(localPosts);
    setPosts((current) => [post, ...current]);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback('');

    if (!canPublish) {
      setFeedback('Ingresa como tecnico o empresa para publicar.');
      return;
    }

    const safeBody = body.trim();
    const safeTitle = title.trim();
    if (safeBody.length < 12) {
      setFeedback('Escribe una descripcion un poco mas completa.');
      return;
    }

    setSubmitting(true);

    const nextPost: CommunityPost = {
      id: buildId(),
      author_id: profile?.id || null,
      author_name: profile?.name || 'Tecnico UrbanFix',
      author_role: profile?.role || 'tecnico',
      author_avatar_url: profile?.avatarUrl || null,
      post_type: 'post',
      title: safeTitle || null,
      body: safeBody,
      category: null,
      location: null,
      coordinates: null,
      contact_url: profile?.id ? `/tecnico/${profile.id}` : null,
      tags: parseTags(tagInput),
      media_items: pendingMedia.map((item) => ({
        url: item.url,
        type: item.type,
        name: item.name || null,
      })),
      likes_count: 0,
      comments_count: 0,
      created_at: new Date().toISOString(),
      source: 'local',
    };
    let fallbackMedia = nextPost.media_items;

    if (hasSupabaseConfig) {
      try {
        const uploadedMedia = await uploadPendingMedia(profile?.id || '');
        fallbackMedia = uploadedMedia;
        const { data, error } = await supabase
          .from('community_posts')
          .insert({
            author_id: nextPost.author_id,
            author_name: nextPost.author_name,
            author_role: nextPost.author_role,
            author_avatar_url: nextPost.author_avatar_url,
            post_type: nextPost.post_type,
            title: nextPost.title,
            body: nextPost.body,
            contact_url: nextPost.contact_url,
            tags: nextPost.tags,
            media_items: uploadedMedia,
            is_published: true,
          })
          .select(
            'id, author_id, author_name, author_role, author_avatar_url, post_type, title, body, category, location, contact_url, tags, media_items, likes_count, comments_count, created_at'
          )
          .maybeSingle();

        if (!error && data) {
          setPosts((current) => [normalizePost(data, 'remote'), ...current]);
          setFeedback('Publicado.');
          resetComposer();
          setIsComposerOpen(false);
          setSubmitting(false);
          return;
        }
      } catch {
        // If storage is not ready, keep the publication usable locally.
      }
    }

    saveLocalPost({ ...nextPost, media_items: fallbackMedia });
    setFeedback('Publicado localmente.');
    resetComposer({ revokeMedia: fallbackMedia.every((item) => !item.url.startsWith('blob:')) });
    setIsComposerOpen(false);
    setSubmitting(false);
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

  return (
    <section className="mx-auto w-full max-w-3xl px-4 pb-12 pt-2 sm:px-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsComposerOpen(true)}
            className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#2a0338] text-xs font-black text-white"
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
            onClick={() => setIsComposerOpen(true)}
            className="min-w-0 flex-1 rounded-full bg-slate-100 px-4 py-2.5 text-left text-sm font-medium text-slate-500 transition hover:bg-slate-200"
          >
            {canPublish ? `¿Qué estás pensando, ${firstName}?` : 'Ingresa como tecnico o empresa para publicar'}
          </button>

          <button
            type="button"
            onClick={() => setIsComposerOpen(true)}
            className="hidden rounded-full p-2 text-rose-500 transition hover:bg-rose-50 sm:inline-flex"
            aria-label="Agregar video"
          >
            <Camera className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => setIsComposerOpen(true)}
            className="hidden rounded-full p-2 text-emerald-600 transition hover:bg-emerald-50 sm:inline-flex"
            aria-label="Agregar imagen"
          >
            <ImageIcon className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => setIsComposerOpen(true)}
            className="hidden rounded-full p-2 text-orange-500 transition hover:bg-orange-50 sm:inline-flex"
            aria-label="Agregar estado"
          >
            <Smile className="h-5 w-5" />
          </button>
        </div>
        {feedback && <p className="mt-3 text-sm text-slate-500">{feedback}</p>}
      </div>

      {isComposerOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/55 px-4 py-6">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-xl overflow-hidden rounded-2xl bg-[#242526] text-white shadow-2xl"
          >
            <div className="relative border-b border-white/10 px-5 py-4 text-center">
              <h2 className="text-xl font-bold">Crear publicación</h2>
              <button
                type="button"
                onClick={() => setIsComposerOpen(false)}
                className="absolute right-4 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white/70 transition hover:bg-white/15 hover:text-white"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10 text-sm font-black text-white">
                  {profile?.avatarUrl ? (
                    <img src={profile.avatarUrl} alt={displayName} className="h-full w-full object-cover" />
                  ) : (
                    getInitials(displayName)
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{authLoading ? 'Cargando...' : displayName}</p>
                  <span className="mt-1 inline-flex items-center gap-1 rounded-md bg-white/10 px-2 py-1 text-xs font-bold text-white/82">
                    <Globe2 className="h-3.5 w-3.5" />
                    Público
                  </span>
                </div>
              </div>

              {!canPublish && !authLoading ? (
                <div className="mt-4 rounded-xl border border-orange-400/25 bg-orange-400/10 px-3 py-2 text-sm text-orange-100">
                  Para publicar, ingresa con una cuenta de tecnico o empresa.
                  <Link href="/tecnicos?perfil=tecnico" className="ml-2 font-bold text-white underline">
                    Ingresar
                  </Link>
                </div>
              ) : null}

              <textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder={`¿Qué estás pensando, ${firstName}?`}
                rows={7}
                autoFocus
                disabled={!canPublish || submitting}
                className="mt-4 min-h-[190px] w-full resize-none bg-transparent text-2xl leading-9 text-white outline-none placeholder:text-white/55 disabled:opacity-50"
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
                    <div key={item.id} className="relative overflow-hidden rounded-xl border border-white/12 bg-black/20">
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

              <div className="mt-4 flex items-center justify-between rounded-xl border border-white/18 px-4 py-3">
                <p className="text-sm font-bold text-white/86">Agregar a tu publicación</p>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => mediaInputRef.current?.click()}
                    className="rounded-full p-2 text-emerald-400 transition hover:bg-white/10"
                    aria-label="Foto o video"
                  >
                    <ImageIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={!canPublish || submitting || body.trim().length < 12}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#ff8f1f] px-4 py-3 text-sm font-bold text-[#2a0338] transition hover:bg-[#ffa748] disabled:cursor-not-allowed disabled:bg-white/14 disabled:text-white/35"
              >
                <Send className="h-4 w-4" />
                {submitting ? 'Publicando...' : 'Publicar'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="mt-5 flex justify-end">
        <span className="text-xs text-slate-400">{postsLoading ? 'Actualizando...' : `${posts.length}`}</span>
      </div>

      <div className="mt-3 space-y-3">
        {posts.map((post) => {
          const profileHref = post.author_id ? `/tecnico/${post.author_id}` : '/vidriera';

          return (
            <article key={post.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex gap-3">
                <Link
                  href={profileHref}
                  className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-900 text-xs font-black text-white"
                >
                  {post.author_avatar_url ? (
                    <img src={post.author_avatar_url} alt={post.author_name} className="h-full w-full object-cover" />
                  ) : (
                    getInitials(post.author_name)
                  )}
                </Link>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={profileHref} className="truncate text-sm font-semibold text-slate-950 hover:text-[#b65b00]">
                      {post.author_name}
                    </Link>
                    <span className="text-xs text-slate-400">{formatTimeAgo(post.created_at)}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] ${
                        post.post_type === 'publicidad' ? 'bg-orange-50 text-orange-700' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {post.post_type === 'publicidad' ? 'Publicidad' : 'Posteo'}
                    </span>
                  </div>

                  {post.title && <h2 className="mt-2 text-base font-semibold text-slate-950">{post.title}</h2>}
                  <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">{post.body}</p>

                  {post.media_items.length > 0 && (
                    <div className="mt-3 grid gap-2 overflow-hidden rounded-xl sm:grid-cols-2">
                      {post.media_items.map((item, index) => (
                        <div key={`${item.url}-${index}`} className="overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
                          {item.type === 'video' ? (
                            <video src={item.url} className="max-h-[420px] w-full object-cover" controls />
                          ) : (
                            <img
                              src={item.url}
                              alt={item.name || 'Imagen de publicacion'}
                              className="max-h-[420px] w-full object-cover"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {post.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {post.tags.map((tag) => (
                        <span key={tag} className="text-xs font-semibold text-[#b65b00]">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3">
                    <button
                      type="button"
                      onClick={() => handleLike(post.id)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold transition ${
                        likedPosts[post.id] ? 'bg-rose-50 text-rose-700' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      <Heart className="h-3.5 w-3.5" />
                      {post.likes_count}
                    </button>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-500">
                      <MessageCircle className="h-3.5 w-3.5" />
                      {post.comments_count}
                    </span>
                    {post.contact_url && (
                      <Link href={post.contact_url} className="ml-auto text-xs font-bold text-[#b65b00] hover:text-[#8b4600]">
                        Contactar
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
