/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: 'rgb(var(--color-ink) / <alpha-value>)',
          soft: 'rgb(var(--color-ink-soft) / <alpha-value>)',
          teal: 'rgb(var(--color-ink-teal) / <alpha-value>)',
        },
        magenta: {
          DEFAULT: '#C81E6E',
          light: '#E14C8C',
        },
        ember: {
          DEFAULT: '#F5811F',
          light: '#FBAA4C',
        },
        cream: {
          DEFAULT: 'rgb(var(--color-cream) / <alpha-value>)',
          dim: 'rgb(var(--color-cream-dim) / <alpha-value>)',
        },
        white: 'rgb(var(--color-white) / <alpha-value>)',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
      },
      backgroundImage: {
        'vibe-gradient': 'linear-gradient(120deg, #C81E6E 0%, #F5811F 100%)',
        'vibe-gradient-soft': 'linear-gradient(120deg, rgba(200,30,110,0.12) 0%, rgba(245,129,31,0.12) 100%)',
        'vibe-radial': 'radial-gradient(circle at 20% 20%, rgba(245,129,31,0.18), transparent 45%)',
      },
      boxShadow: {
        card: '0 1px 2px rgba(15,42,61,0.06), 0 8px 24px rgba(15,42,61,0.08)',
        glow: '0 0 0 1px rgba(200,30,110,0.15), 0 12px 32px rgba(200,30,110,0.18)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
      opacity: {
        5: '0.05',
        6: '0.06',
        8: '0.08',
        15: '0.15',
      },
    },
  },
  plugins: [],
};
