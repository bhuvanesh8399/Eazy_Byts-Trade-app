import type { Config } from 'tailwindcss';

export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#1e90ff', teal: '#2dd4bf', mint: '#99f6e4', coal: '#0b1220', glass: 'rgba(255,255,255,0.08)' },
        success: '#22c55e',
        danger: '#ef4444',
        warn: '#f59e0b',
      },
      boxShadow: {
        glass: '0 10px 30px rgba(0,0,0,.25)',
        soft: '0 8px 24px rgba(0,0,0,.15)',
      },
      backdropBlur: { xs: '2px' },
      borderRadius: { '2xl': '1rem' },
    },
  },
  plugins: [],
} satisfies Config;
