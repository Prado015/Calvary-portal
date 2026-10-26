/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: '#0d1525', card: '#13213a', input: '#0d1a2e' },
        gold: { DEFAULT: '#c9922a', light: '#e8b84b' },
        brand: {
          border: 'rgba(255,255,255,0.08)',
          text: '#e0e8f5',
          muted: '#6b7f99',
          green: '#22c55e',
          error: '#ff4d6d'
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['"Playfair Display"', 'serif']
      },
      borderRadius: { brand: '14px' },
      backgroundImage: {
        'gold-btn': 'linear-gradient(135deg, #e8b84b 0%, #c9922a 100%)'
      }
    }
  },
  plugins: []
}
