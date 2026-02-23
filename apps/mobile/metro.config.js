const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Obtener rutas
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

// Obtener configuracion por defecto
const config = getDefaultConfig(projectRoot);

// 1. Mantener los watchFolders por defecto de Expo y agregar el workspace root
const defaultWatchFolders = config.watchFolders || [];
config.watchFolders = Array.from(new Set([...defaultWatchFolders, workspaceRoot]));

// 2. IMPORTANTE: Forzar a Metro a resolver 'react' y 'react-dom'
// desde la carpeta local de la app movil, ignorando la version de la web/raiz.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  react: path.resolve(projectRoot, 'node_modules/react'),
  'react-dom': path.resolve(projectRoot, 'node_modules/react-dom'),
  'react-native': path.resolve(projectRoot, 'node_modules/react-native'),
};

module.exports = config;
