/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        display: ['"Unbounded"', '"Space Grotesk"', 'sans-serif'],
      },
      colors: {
        ink: '#1b1b1f',
        paper: '#f7f3ed',
        accent: '#d04f2a',
        teal: '#2c8b7d',
      },
      boxShadow: {
        soft: '0 12px 30px rgba(27, 27, 31, 0.12)',
      },
    },
  },
  plugins: [],
}
