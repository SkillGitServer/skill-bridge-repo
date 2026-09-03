/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Outfit', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        heading: ['Outfit', 'Inter', 'sans-serif'],
      },
      colors: {
        carbonBlack: '#0a0a0a',
        surfaceDark: '#171717',
        successGreen: '#28a745',
        cleanWhite: '#ffffff',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        floatSlow: {
          '0%, 100%': { transform: 'translateY(0) scale(1)' },
          '50%': { transform: 'translateY(-20px) scale(1.05)' },
        },
        floatFast: {
          '0%, 100%': { transform: 'translateY(0) rotate(0deg)' },
          '50%': { transform: 'translateY(-15px) rotate(5deg)' },
        },
        flip3D: {
          '0%': { transform: 'rotateX(0deg) rotateY(0deg)' },
          '50%': { transform: 'rotateX(180deg) rotateY(90deg)' },
          '100%': { transform: 'rotateX(360deg) rotateY(360deg)' },
        },
        pulseDepth: {
          '0%, 100%': { transform: 'translateZ(0px) scale(1)' },
          '50%': { transform: 'translateZ(50px) scale(1.1)' },
        },
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.6s ease-out forwards',
        'float-slow': 'floatSlow 6s ease-in-out infinite',
        'float-fast': 'floatFast 4s ease-in-out infinite',
        'flip-3d': 'flip3D 3s infinite ease-in-out',
        'pulse-depth': 'pulseDepth 2s infinite ease-in-out',
      },
    },
  },
  plugins: [],
}
