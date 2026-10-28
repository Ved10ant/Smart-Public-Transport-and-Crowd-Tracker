/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        transit: {
          red: '#dc2626',
          blue: '#2563eb',
          green: '#059669',
          purple: '#7c3aed',
        }
      }
    },
  },
  plugins: [],
}
