module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      [
        "babel-preset-expo",
        {
          // Disable reanimated plugin since we removed react-native-reanimated
          reanimated: false,
        },
      ],
      "nativewind/babel",
    ],
  };
};