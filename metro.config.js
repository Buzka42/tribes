const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Enable package exports to resolve 'react-map-gl' subpath '.'
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
