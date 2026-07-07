/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: {
          base: '#0D1117',
          surface: '#161B22',
          elevated: '#21262D',
          overlay: '#2D333B',
        },
        border: {
          subtle: '#21262D',
          default: '#30363D',
          strong: '#484F58',
        },
        text: {
          primary: '#E6EDF3',
          secondary: '#8B949E',
          muted: '#6E7681',
          inverse: '#0D1117',
        },
        brand: {
          400: '#38BDF8',
          500: '#0EA5E9',
          600: '#0284C7',
          bg: 'rgba(14,165,233,0.12)',
        },
        success: {
          DEFAULT: '#3FB950',
          bg: 'rgba(63,185,80,0.12)',
        },
        warning: {
          DEFAULT: '#D29922',
          bg: 'rgba(210,153,34,0.12)',
        },
        danger: {
          DEFAULT: '#F85149',
          bg: 'rgba(248,81,73,0.12)',
        },
        info: {
          DEFAULT: '#58A6FF',
          bg: 'rgba(88,166,255,0.12)',
        }
      },
      boxShadow: {
        soft: '0 4px 20px -2px rgba(0, 0, 0, 0.5)',
        smooth: '0 10px 40px -10px rgba(0, 0, 0, 0.7)',
        glow: '0 0 15px rgba(14, 165, 233, 0.4)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out forwards',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '10%': { opacity: '0.1' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      }
    },
  },
  plugins: [],
}
