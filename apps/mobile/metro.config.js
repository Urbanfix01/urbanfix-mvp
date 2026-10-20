const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const fs = require('fs');
const https = require('https');

// Obtener rutas
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

// Obtener configuracion por defecto
const config = getDefaultConfig(projectRoot);

// 1. Decirle a Metro que puede mirar en la carpeta raiz (para node_modules compartidos)
config.watchFolders = [workspaceRoot];

// 2. IMPORTANTE: Forzar a Metro a resolver 'react' y 'react-dom'
// desde la carpeta local de la app movil, ignorando la version de la web/raiz.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

const resolveModulePath = (moduleName) => {
  const localModulePath = path.resolve(projectRoot, 'node_modules', moduleName);
  if (fs.existsSync(localModulePath)) {
    return localModulePath;
  }

  return path.resolve(workspaceRoot, 'node_modules', moduleName);
};

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  react: resolveModulePath('react'),
  'react-dom': resolveModulePath('react-dom'),
  'react-native': resolveModulePath('react-native'),
};

// Only the loopback Expo Web preview needs a same-origin API proxy. Native
// requests go directly to the HTTPS API; credentials never enter the renderer.
const enhance = config.server.enhanceMiddleware;
config.server.enhanceMiddleware = (middleware, server) => {
  const next = enhance ? enhance(middleware, server) : middleware;
  return (request, response, ...args) => {
    const routes = ['/api/functions/pricing-workflow-v2', '/api/functions/pricing-review', '/api/functions/quote-workflow', '/api/functions/supabase-technician-data'];
    if (!routes.includes(request.url)) return next(request, response, ...args);
    const remote = request.socket.remoteAddress;
    if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(remote) || request.method !== 'POST'
      || !/^Bearer [\w.-]+$/.test(request.headers.authorization || '') || !/^application\/json\b/.test(request.headers['content-type'] || '')) {
      response.writeHead(403, { 'Content-Type': 'application/json' }); response.end(JSON.stringify({ ok: false, error: 'Consulta local no autorizada.' })); return;
    }
    const upstream = https.request({ hostname: 'www.urbanfix.com.ar', path: request.url, method: 'POST', headers: {
      'Content-Type': 'application/json', Authorization: request.headers.authorization,
    } }, (result) => { response.writeHead(result.statusCode, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); result.pipe(response); });
    upstream.setTimeout(20000, () => upstream.destroy(new Error('timeout')));
    upstream.on('error', () => { if (!response.headersSent) response.writeHead(502, { 'Content-Type': 'application/json' }); response.end(JSON.stringify({ ok: false, error: 'No se pudo consultar el servidor.' })); });
    let bytes = 0;
    request.on('data', (chunk) => { bytes += chunk.length; if (bytes > 4_000_000) { upstream.destroy(); request.destroy(); } });
    request.on('aborted', () => upstream.destroy()); request.pipe(upstream);
  };
};

module.exports = config;
