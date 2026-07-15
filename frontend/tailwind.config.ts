import type { Config } from 'tailwindcss';

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#7B1E3A', // Deep Burgundy
          hover: '#6A1931',
          light: '#8F2645',
        },
        secondary: {
          DEFAULT: '#FAF7F2', // Warm Ivory
          hover: '#F2ECE1',
        },
        accent: {
          DEFAULT: '#C49A4A', // Muted Gold
          hover: '#B38B42',
        },
        background: {
          DEFAULT: '#F5F4F1', // Soft Stone
          surface: '#FFFFFF', // White Surface
          muted: '#EAE8E3',
        },
        text: {
          DEFAULT: '#334155', // Slate Gray
          light: '#64748B',
          dark: '#0F172A',
        },
        status: {
          success: '#10B981', // Emerald
          warning: '#F59E0B', // Amber
          danger: '#E11D48',  // Crimson
          info: '#3B82F6',    // Blue
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Newsreader', 'serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
      boxShadow: {
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'DEFAULT': '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
        'md': '0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.02)',
      },
      animation: {
        'cl-rise': 'clRise 0.28s ease both',
        'cl-fade': 'clFade 0.15s ease both',
        'cl-grow': 'clGrow 0.28s ease both',
      }
    },
  },
  plugins: [],
} satisfies Config;
