// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

const { resolver } = config;

config.resolver = {
    ...resolver,
    assetExts: resolver.assetExts.filter((ext) => ext !== 'json'),
    sourceExts: [...resolver.sourceExts, 'cjs', 'json'],
};

module.exports = config;
