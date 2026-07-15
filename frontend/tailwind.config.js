/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#7B1E3A',
          hover: '#6A1931',
          light: '#8F2645',
        },
        secondary: {
          DEFAULT: '#FAF7F2',
          hover: '#F2ECE1',
        },
        accent: {
          DEFAULT: '#C49A4A',
          hover: '#B38B42',
        },
        background: {
          DEFAULT: '#F5F4F1',
          surface: '#FFFFFF',
          muted: '#EAE8E3',
        },
        text: {
          DEFAULT: '#334155',
          light: '#64748B',
          dark: '#0F172A',
        },
        status: {
          success: '#10B981',
          warning: '#F59E0B',
          danger: '#E11D48',
          info: '#3B82F6',
        },
        legal: {
          bg: '#F3F4F6',
          surface: '#FFFFFF',
          text: '#111827',
          meta: '#4B5563',
          border: '#E5E7EB',
          focus: '#1E3A8A',
        },
        risk: {
          critical: '#9E1B1B', // Deep Crimson
          high: '#9E1B1B', // Deep Crimson
          medium: '#B45309', // Burnt Ochre
          low: '#334155', // Slate Blue
        },
        redline: {
          add: '#065F46', // Deep Pine Green
          addBg: '#ECFDF5',
          remove: '#9E1B1B', // Deep Crimson
          removeBg: '#FEF2F2',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Newsreader', 'serif'],
        display: ['Newsreader', 'serif'],
        body: ['Public Sans', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
      boxShadow: {
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        DEFAULT: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
        md: '0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.02)',
      },
      animation: {
        'cl-rise': 'clRise 0.28s ease both',
        'cl-fade': 'clFade 0.15s ease both',
        'cl-grow': 'clGrow 0.28s ease both',
      },
    },
  },
  plugins: [],
}
