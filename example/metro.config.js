const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

// Watch the parent package source
config.watchFolders = [monorepoRoot];

// Resolve node_modules from both example and parent
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// Force shared deps to resolve from example's node_modules
// (extraNodeModules is not enough — Node resolution walks up from the source file)
const pinnedModules = ['react', 'react-native', 'react-native-webview', 'react-native-view-shot'];

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (pinnedModules.some(m => moduleName === m || moduleName.startsWith(m + '/'))) {
    return context.resolveRequest(
      { ...context, originModulePath: path.resolve(projectRoot, 'package.json') },
      moduleName,
      platform,
    );
  }
  return context.resolveRequest(context, moduleName, platform);
};

// Block parent's react-native and react from being bundled
const escape = (p) => p.replace(/[/\\]/g, '[/\\\\]');
config.resolver.blockList = [
  new RegExp(escape(path.resolve(monorepoRoot, 'node_modules', 'react-native')) + '[/\\\\].*'),
  new RegExp(escape(path.resolve(monorepoRoot, 'node_modules', 'react')) + '[/\\\\].*'),
];

module.exports = config;
