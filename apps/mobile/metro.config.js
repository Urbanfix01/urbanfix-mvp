const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const fs = require('fs');

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

module.exports = config;
