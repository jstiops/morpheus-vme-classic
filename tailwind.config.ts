import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        hpe: {
          green: '#00B388',
          'green-dark': '#00956F',
          'green-light': '#17EBA0',
        },
        nav: {
          bg: '#0A0E1A',
          border: '#1A2240',
        },
        sidebar: {
          bg: '#0D1117',
          hover: '#161D2E',
          selected: '#1A2540',
          border: '#1E2A45',
        },
        content: {
          bg: '#0F1419',
          card: '#141C2E',
          'card-hover': '#1A2440',
          border: '#1E2A45',
        },
        status: {
          running: '#00B388',
          stopped: '#6B7280',
          suspended: '#F59E0B',
          failed: '#EF4444',
          warning: '#F59E0B',
          unknown: '#6B7280',
        },
      },
      fontFamily: {
        sans: [
          'HPE Graphik',
          'Metric',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      fontSize: {
        '2xs': '0.625rem',
        xs: '0.75rem',
        sm: '0.8125rem',
        base: '0.875rem',
        lg: '1rem',
        xl: '1.125rem',
        '2xl': '1.25rem',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.6)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.5)',
        nav: '0 2px 8px rgba(0,0,0,0.5)',
        modal: '0 20px 60px rgba(0,0,0,0.7)',
        dropdown: '0 8px 24px rgba(0,0,0,0.6)',
      },
      animation: {
        'spin-slow': 'spin 2s linear infinite',
        'pulse-green': 'pulseGreen 2s ease-in-out infinite',
        'fade-in': 'fadeIn 0.15s ease-out',
        'slide-in': 'slideIn 0.2s ease-out',
      },
      keyframes: {
        pulseGreen: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideIn: {
          from: { opacity: '0', transform: 'translateY(-4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config
