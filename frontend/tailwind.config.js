/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'paylabs-orange': '#F9591B',
        'paylabs-blue': '#296E8F',
        'paylabs-teal': '#2DB0AB',
        'paylabs-navy': '#2A3954',
        'paylabs-bg': '#050607',
        'paylabs-gray': '#6C757D',
        'paylabs-white': '#FFFFFF',
        'paylabs-red': '#FF0000',
        'paylabs-green': '#00FF1E',
      }
    },
  },
  plugins: [],
}

