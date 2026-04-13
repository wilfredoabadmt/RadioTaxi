module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "../../node_modules/lucide-react/dist/**/*.js"
  ],
  theme: {
    extend: {
      fontFamily: {
        outfit: ['var(--font-outfit)', 'sans-serif'],
        sans: ['var(--font-inter)', 'sans-serif'],
      },
      colors: {
        amber: {
          500: '#F59E0B',
          400: '#FBBF24',
        }
      }
    },
  },
  plugins: [],
}
