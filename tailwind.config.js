/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all files that contain Nativewind classes.
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: {
          'sky-blue': '#0EA5E9',
          'sky-blue-dark': '#0284C7',
          'sky-blue-light': '#38BDF8',
        },
      },
    },
  },
  plugins: [],
};
