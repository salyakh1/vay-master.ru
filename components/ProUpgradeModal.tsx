'use client'

import { useRouter } from 'next/navigation'
import { FiX, FiLock, FiArrowRight } from 'react-icons/fi'

interface ProUpgradeModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  description?: string
  note?: string
  ctaText?: string
  countdownText?: string
}

export default function ProUpgradeModal({
  isOpen,
  onClose,
  title = 'Требуется PRO мастер',
  description = 'Эта функция доступна только в статусе PRO. Оформите подписку, чтобы снять ограничения.',
  note,
  ctaText = 'Купить PRO',
  countdownText,
}: ProUpgradeModalProps) {
  const router = useRouter()
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md glass-strong border border-white/30 rounded-2xl shadow-premium animate-fade-in overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-transparent pointer-events-none" />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-text-secondary hover:text-graphite-secondary transition-all p-2 rounded-lg hover:bg-white/10 z-30"
          aria-label="Закрыть"
        >
          <FiX size={20} />
        </button>

        <div className="p-6 relative z-20">
          <div className="flex items-center justify-center mb-4">
            <div className="w-14 h-14 bg-gradient-to-br from-brand-accent/15 to-brand-accent/5 rounded-full flex items-center justify-center border border-brand-accent/25 shadow-glow">
              <FiLock size={28} className="text-brand-accent" />
            </div>
          </div>

          <h2 className="text-xl font-semibold text-graphite-secondary mb-3 text-center tracking-tight">
            {title}
          </h2>

          <p className="text-base text-text-secondary mb-4 text-center leading-relaxed">
            {description}
          </p>

          {countdownText && (
            <div className="mb-4 text-center">
              <span className="inline-flex items-center px-3 py-1.5 text-sm font-semibold rounded-lg bg-brand-accent/10 text-brand-accent border border-brand-accent/20">
                {countdownText}
              </span>
            </div>
          )}

          {note && (
            <div className="text-sm text-text-secondary bg-bg-secondary/60 border border-border-light/60 rounded-lg p-3 mb-5">
              {note}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => {
                onClose()
                router.push('/pro')
              }}
              className="flex-1 btn btn-primary flex items-center justify-center gap-2"
            >
              <span>{ctaText}</span>
              <FiArrowRight size={18} />
            </button>
            <button
              onClick={onClose}
              className="flex-1 btn btn-outline"
            >
              Позже
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

