const fs = require('fs');
const path = require('path');

const appRoot = path.resolve(__dirname, '..');
const communityPath = path.join(appRoot, 'components', 'community', 'CommunityFeed.tsx');
const postAuthPath = path.join(appRoot, 'lib', 'auth', 'post-auth.ts');
const analyticsPath = path.join(appRoot, 'app', 'api', 'admin', 'analytics', 'summary', 'route.ts');

const read = (filePath) => (fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '');
const community = read(communityPath);
const postAuth = read(postAuthPath);
const analytics = read(analyticsPath);
const failures = [];

const requireMarkers = (source, label, markers) => {
  markers.forEach((marker) => {
    if (!source.includes(marker)) failures.push(`${label} falta ${marker}`);
  });
};

const forbidMarkers = (source, label, markers) => {
  markers.forEach((marker) => {
    if (source.includes(marker)) failures.push(`${label} no debe contener ${marker}`);
  });
};

requireMarkers(community, 'CommunityFeed', [
  'data-community-composer',
  'Crear publicacion en Comunidad',
  'Opciones avanzadas',
  'buildCommunityAuthHref',
  "params.set('crear'",
  "params.set('post'",
  "params.set('accion'",
  'scrollIntoView',
  'commentInputRefs',
  'likeButtonRefs',
  'Ver perfil',
  'contact_url: profileContactUrl',
  'community_post_started',
  'community_comment_started',
  'community_post_like_requested',
  'community_auth_requested',
  'community_profile_opened',
  'community_post_published',
  'community_comment_published',
  'community_post_liked',
]);

forbidMarkers(community, 'CommunityFeed', [
  'whatsapp_url',
  'buildWhatsappLink',
  'https://wa.me/',
  '>WhatsApp<',
  'fixed inset-0 z-[10000]',
]);

requireMarkers(postAuth, 'post-auth.ts', ["'/comunidad'", 'sanitizeNextPath']);
requireMarkers(analytics, 'analytics summary', [
  'community_post_started',
  'community_comment_started',
  'community_post_like_requested',
  'community_auth_requested',
  'community_profile_opened',
  'community_to_participation',
]);

if (failures.length > 0) {
  console.error('Flujo Comunidad a participacion incompleto:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Flujo Comunidad a participacion verificado.');
