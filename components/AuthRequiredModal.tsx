'use client'

import { useRouter } from 'next/navigation'
import { FiX, FiLock, FiLogIn, FiUserPlus } from 'react-icons/fi'

interface AuthRequiredModalProps {
  isOpen: boolean
  onClose: () => void
  type?: 'master' | 'product'
}

export default function AuthRequiredModal({ isOpen, onClose, type = 'master' }: AuthRequiredModalProps) {
  const router = useRouter()

  if (!isOpen) return null

  const handleLogin = () => {
    onClose()
    router.push('/auth/login')
  }

  const handleRegister = () => {
    onClose()
    router.push('/auth/register')
  }

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-md bg-bg-primary border border-border-color rounded-lg shadow-card animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-text-secondary hover:text-graphite-secondary transition-colors p-1"
          aria-label="Закрыть"
        >
          <FiX size={20} />
        </button>

        {/* Content */}
        <div className="p-6">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-brand-accent/10 rounded-full flex items-center justify-center">
              <FiLock size={32} className="text-brand-accent" />
            </div>
          </div>

          <h2 className="text-xl font-semibold text-graphite-secondary mb-3 text-center tracking-tight">
            Требуется авторизация
          </h2>

          <p className="text-base text-text-secondary mb-6 text-center leading-relaxed">
            {type === 'master' 
              ? 'Полная информация о мастере доступна только авторизованным пользователям. Зарегистрируйтесь или войдите, чтобы просмотреть профиль, портфолио и связаться с мастером.'
              : 'Полная информация о товаре доступна только авторизованным пользователям. Зарегистрируйтесь или войдите, чтобы просмотреть детали, связаться с продавцом и оформить заказ.'
            }
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleLogin}
              className="flex-1 btn btn-primary flex items-center justify-center gap-2"
            >
              <FiLogIn size={18} />
              <span>Войти</span>
            </button>
            <button
              onClick={handleRegister}
              className="flex-1 btn btn-secondary flex items-center justify-center gap-2"
            >
              <FiUserPlus size={18} />
              <span>Зарегистрироваться</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

