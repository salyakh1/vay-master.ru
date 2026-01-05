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
        'card-hover': '0 8px 24px rgba(0, 0, 0, 0.12), 0 4px 12px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(255, 255, 255, 0.1)',
        'premium': '0 12px 32px rgba(0, 0, 0, 0.15), 0 6px 16px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
        'glow': '0 0 20px rgba(199, 54, 47, 0.3), 0 0 40px rgba(199, 54, 47, 0.1)',
        'glow-hover': '0 0 30px rgba(199, 54, 47, 0.4), 0 0 60px rgba(199, 54, 47, 0.15)',
        'glass': '0 8px 32px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
        'glossy': '0 4px 16px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.4)',
      },
      backgroundImage: {
        'gradient-red': 'linear-gradient(135deg, #C7362F 0%, #E84A42 50%, #C7362F 100%)',
        'gradient-red-hover': 'linear-gradient(135deg, #A92C27 0%, #C7362F 50%, #A92C27 100%)',
        'gradient-dark': 'linear-gradient(135deg, #1C1C1E 0%, #2C2C2E 50%, #1C1C1E 100%)',
        'gradient-glossy': 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 50%, rgba(255, 255, 255, 0.1) 100%)',
        'shimmer': 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.3) 50%, transparent 100%)',
      },
      backdropBlur: {
        'glass': '10px',
        'glass-strong': '20px',
      },
      letterSpacing: {
        'tight': '-0.01em',         // Строгий, инженерный
        'tighter': '-0.02em',
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
      animation: {
        'shimmer': 'shimmer 2s infinite',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'glossy-shine': 'glossy-shine 3s ease-in-out infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(199, 54, 47, 0.3)' },
          '50%': { boxShadow: '0 0 30px rgba(199, 54, 47, 0.5)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'glossy-shine': {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
      },
    },
  },
  plugins: [],
}

