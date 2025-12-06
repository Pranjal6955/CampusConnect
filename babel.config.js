module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      [
        "babel-preset-expo",
        {
          // Disable reanimated plugin since we removed react-native-reanimated
          // Even though it's a transitive dependency, we don't want to use it
          reanimated: false,
        },
      ],
      "nativewind/babel",
    ],
  };
};