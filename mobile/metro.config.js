const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add web-specific resolver to handle react-native-maps
config.resolver = {
  ...config.resolver,
  resolveRequest: (context, moduleName, platform) => {
    // For web platform, redirect react-native-maps to a mock
    if (platform === 'web' && moduleName === 'react-native-maps') {
      return {
        type: 'empty',
      };
    }
    // Otherwise, use the default resolver
    return context.resolveRequest(context, moduleName, platform);
  },
};

module.exports = config;
