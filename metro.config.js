const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const defaultConfig = getDefaultConfig(__dirname);

const config = {
  resolver: {
    // PENTING: mergeConfig TIDAK menggabung array, dia menimpa total.
    // Jadi wajib spread defaultConfig.resolver.assetExts di sini supaya
    // ekstensi asset bawaan (png, jpg, svg, dst) tidak hilang.
    assetExts: [...defaultConfig.resolver.assetExts, 'tflite'],
  },
};

module.exports = mergeConfig(defaultConfig, config);