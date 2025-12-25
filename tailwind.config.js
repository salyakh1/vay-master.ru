/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Фирменная цветовая система VAY-MASTER
        brand: {
          accent: '#C7362F', // Приглушённый красный из логотипа
        },
        text: {
          primary: '#111111',   // Основной текст
          secondary: '#6B7280', // Вторичный текст
        },
        bg: {
          primary: '#FFFFFF',   // Основной фон
          secondary: '#F5F6F7', // Альтернативный фон
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      fontSize: {
        'xs': ['12px', { lineHeight: '1.5' }],
        'sm': ['14px', { lineHeight: '1.6' }],
        'base': ['16px', { lineHeight: '1.6' }],
        'lg': ['18px', { lineHeight: '1.6' }],
        'xl': ['20px', { lineHeight: '1.5' }],
        '2xl': ['24px', { lineHeight: '1.4' }],
        '3xl': ['28px', { lineHeight: '1.3' }],
        '4xl': ['32px', { lineHeight: '1.2' }],
      },
      fontWeight: {
        normal: '400',
        medium: '500',
        semibold: '600',
      },
      borderRadius: {
        'DEFAULT': '10px',
        'sm': '8px',
        'md': '10px',
        'lg': '12px',
      },
      boxShadow: {
        'card': '0 8px 24px rgba(0, 0, 0, 0.04)',
        'card-hover': '0 12px 32px rgba(0, 0, 0, 0.08)',
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
    },
  },
  plugins: [],
}

