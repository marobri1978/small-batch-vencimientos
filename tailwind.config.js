/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        tinto: { DEFAULT: '#4A1C2C', 600: '#8C2F39' },
        papel: '#F5EFE4',
        dorado: '#D9B44A',
        oliva: '#5E7D4E',
        lacre: '#B33A2B',
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['"Work Sans"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
