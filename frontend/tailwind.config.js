/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
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
        display: ['Newsreader', 'serif'],
        body: ['Public Sans', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
