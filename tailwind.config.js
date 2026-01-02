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
        // ============================================
        // VAY-MASTER: КАРДИНАЛЬНЫЙ РЕДИЗАЙН
        // Графитово-чёрный основной, красный только акцент
        // ============================================
        
        // КРАСНЫЙ - ТОЛЬКО АКЦЕНТ (CTA, статусы, критические сигналы)
        brand: {
          accent: '#C7362F',         // Основной красный - ТОЛЬКО для акцентов
          'accent-hover': '#A92C27', // Hover красный
          'accent-dark': '#7F1D1D',  // Тёмный премиум - для PRO/статусов
        },
        
        // ГРАФИТОВО-ЧЁРНЫЙ - ОСНОВНОЙ ЦВЕТ СИСТЕМЫ
        graphite: {
          primary: '#1C1C1E',        // Основной графитовый
          secondary: '#111111',     // Вторичный графитовый
          tertiary: '#2C2C2E',      // Третичный - для кнопок secondary
        },
        
        // ТЕКСТОВАЯ ПАЛИТРА
        text: {
          primary: '#111111',       // Основной текст - графитовый
          secondary: '#6B7280',     // Вторичный текст
          muted: '#9CA3AF',         // Подписи / мета
        },
        
        // ФОНОВАЯ СИСТЕМА - НЕЙТРАЛЬНЫЕ ПРОФЕССИОНАЛЬНЫЕ
        bg: {
          primary: '#F4F4F4',       // Основной фон - нейтральный серый
          'primary-alt': '#F2F2F2', // Альтернативный основной
          secondary: '#E8E8E8',     // Вторичный фон
          card: '#FFFFFF',          // Фон карточек - белый
          dark: '#1C1C1E',          // Тёмные секции - графитовый
        },
        
        // ГРАНИЦЫ
        border: {
          DEFAULT: '#D1D5DB',       // Основная граница
          light: '#E5E7EB',         // Светлая граница
          hover: '#9CA3AF',          // Hover граница
        },
      },
      fontFamily: {
        sans: ['Inter', 'Manrope', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      fontSize: {
        'xs': ['12px', { lineHeight: '1.75' }],
        'sm': ['14px', { lineHeight: '1.75' }],
        'base': ['16px', { lineHeight: '1.75' }],  // Увеличенный для профессиональной читаемости
        'lg': ['18px', { lineHeight: '1.75' }],
        'xl': ['20px', { lineHeight: '1.7' }],
        '2xl': ['24px', { lineHeight: '1.6' }],
        '3xl': ['28px', { lineHeight: '1.5' }],
        '4xl': ['32px', { lineHeight: '1.4' }],
        '5xl': ['40px', { lineHeight: '1.3' }],    // Крупные уверенные заголовки
        '6xl': ['48px', { lineHeight: '1.2' }],
      },
      fontWeight: {
        normal: '400',
        medium: '500',
        semibold: '600',
      },
      borderRadius: {
        'DEFAULT': '6px',           // Строже, меньше скругления
        'sm': '4px',
        'md': '6px',
        'lg': '8px',
      },
      boxShadow: {
        'card': '0 2px 8px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.1)',
        'premium': '0 8px 24px rgba(0, 0, 0, 0.12), 0 4px 8px rgba(0, 0, 0, 0.08)',
      },
      letterSpacing: {
        'tight': '-0.01em',         // Строгий, инженерный
        'tighter': '-0.02em',
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
    },
  },
  plugins: [],
}

