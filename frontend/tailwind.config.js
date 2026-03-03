/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'paylabs-teal':  '#296E8F',
        'paylabs-navy':  '#2A3954',
        'paylabs-bg':    '#FAFBFE',
      },
    },
  },
  plugins: [],
}

