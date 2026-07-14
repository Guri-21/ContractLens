import type { Config } from 'tailwindcss';

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: 'var(--accent)',
          hover: 'var(--accent-hover)',
          soft: 'var(--accent-soft)',
          text: 'var(--accent-text)',
        }
      },
      fontFamily: {
        sans: ['Public Sans', 'system-ui', 'sans-serif'],
        serif: ['Newsreader', 'serif'],
        mono: ['IBM Plex Mono', 'monospace'],
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
