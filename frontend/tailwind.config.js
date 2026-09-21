/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx}',
    './src/components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#10b981',
        secondary: '#06b6d4',
        danger: '#ef4444',
        warning: '#f59e0b',
      },
    },
  },
  plugins: [],
};
