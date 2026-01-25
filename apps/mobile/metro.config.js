const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];

// Force Metro to use the app's React to avoid duplicate React copies.
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  react: path.resolve(projectRoot, 'node_modules/react'),
  'react-dom': path.resolve(projectRoot, 'node_modules/react-dom'),
  'react-dom/client': path.resolve(
    projectRoot,
    'node_modules/react-dom/client.js'
  ),
  'react-dom/server': path.resolve(
    projectRoot,
    'node_modules/react-dom/server.js'
  ),
};

// Still allow resolving hoisted deps from the workspace root.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

const toBlockListPattern = (modulePath) =>
  modulePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/[/\\\\]/g, '[\\\\/]');

// Prevent Metro from ever resolving React from the workspace root.
const reactPath = toBlockListPattern(
  path.resolve(workspaceRoot, 'node_modules/react')
);
const reactDomPath = toBlockListPattern(
  path.resolve(workspaceRoot, 'node_modules/react-dom')
);
config.resolver.blockList = new RegExp(
  `(${reactPath}.*|${reactDomPath}.*)$`
);

module.exports = config;
