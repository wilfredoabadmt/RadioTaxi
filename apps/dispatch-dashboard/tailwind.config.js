/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Space Grotesk', 'Outfit', 'sans-serif'],
      },
      colors: {
        // Custom neon-like futuristic color palette
        accent: {
          cyan: '#06b6d4',
          magenta: '#d946ef',
          yellow: '#eab308',
          blue: '#3b82f6',
        }
      },
      boxShadow: {
        'futuristic': '0 0 15px rgba(6, 182, 212, 0.15)',
        'futuristic-glow': '0 0 25px rgba(217, 70, 239, 0.25)',
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        }
      }
    },
  },
  plugins: [],
}
