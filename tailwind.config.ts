import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0B0C0E',
        paper: '#EEE9DF',
        sand: '#C1B9AB',
        champagne: '#C5A880',
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Arial', 'sans-serif'],
        display: ['Playfair Display', 'Georgia', 'serif'],
      },
      boxShadow: {
        glass: '0 24px 70px rgba(0,0,0,.34), inset 0 1px rgba(255,255,255,.07)',
      },
    },
  },
  plugins: [],
};

export default config;
