import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: '#111827',
        'surface-elevated': '#1a2235',
        'surface-card': '#1e293b',
        'surface-hover': '#243044',
        'border-default': '#1e293b',
        'border-light': '#334155',
      },
      animation: {
        'spin-slow': 'spin 2s linear infinite',
        'pulse-ring': 'pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        'pulse-ring': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '.5' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
