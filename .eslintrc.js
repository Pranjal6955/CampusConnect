module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['react', 'react-native', 'prettier', '@typescript-eslint'],
  extends: [
    'expo',
    'plugin:react/recommended',
    'plugin:react-native/all',
    'plugin:prettier/recommended',
  ],
  rules: {
    'prettier/prettier': 'error',
    'react/react-in-jsx-scope': 'off', // for React 17+
    'react-native/no-inline-styles': 'warn',
    '@typescript-eslint/no-unused-vars': ['warn'],
  },
};
