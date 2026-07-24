-- Comunidad UrbanFix: ampliar tipos reales de publicacion.
-- Safe to run multiple times.

alter table if exists public.community_posts
  drop constraint if exists community_posts_post_type_chk;

alter table if exists public.community_posts
  add constraint community_posts_post_type_chk
  check (post_type in ('post', 'publicidad', 'trabajo', 'aviso', 'consulta', 'antes_despues'));

notify pgrst, 'reload schema';
