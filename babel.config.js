export default function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'expo-router/babel',
      'react-native-reanimated/plugin',
      '@babel/plugin-proposal-export-namespace-from',
      'react-native-paper/babel',
    ],
  };
}
