import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './features/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        theme: {
          white: '#ffffff',
          red: '#ff0000',
          black: '#000000',
        },
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)'],
        mono: ['var(--font-geist-mono)'],
        pixel: ['var(--font-geist-pixel-grid)', 'var(--font-geist-pixel-square)', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
