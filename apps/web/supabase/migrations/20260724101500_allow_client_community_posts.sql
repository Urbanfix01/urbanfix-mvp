-- Comunidad UrbanFix: permite pedidos publicados por clientes y comunicados oficiales admin.
-- Safe to run multiple times.

alter table if exists public.community_posts
  drop constraint if exists community_posts_author_role_chk;

alter table if exists public.community_posts
  add constraint community_posts_author_role_chk
  check (author_role in ('tecnico', 'empresa', 'cliente', 'admin'));

alter table if exists public.community_posts
  drop constraint if exists community_posts_post_type_chk;

alter table if exists public.community_posts
  add constraint community_posts_post_type_chk
  check (post_type in ('post', 'publicidad', 'trabajo', 'pedido', 'aviso', 'consulta', 'antes_despues'));

notify pgrst, 'reload schema';
