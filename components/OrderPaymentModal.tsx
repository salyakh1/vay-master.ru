'use client'

import { FiX, FiCreditCard } from 'react-icons/fi'

interface OrderPaymentModalProps {
  isOpen: boolean
  onClose: () => void
  priceRub: number
  onConfirmPaid: () => void
  loading?: boolean
  /** true — редирект на Тинькофф; false — подтверждение оплаты без банка (пока терминал не подключён) */
  tinkoffReady?: boolean
}

export default function OrderPaymentModal({
  isOpen,
  onClose,
  priceRub,
  onConfirmPaid,
  loading,
  tinkoffReady = false,
}: OrderPaymentModalProps) {
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
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center">
              <FiCreditCard size={22} className="text-brand-accent" />
            </div>
            <div>
              <div className="text-lg font-semibold text-graphite-secondary">Публикация заказа платная</div>
              <div className="text-sm text-text-secondary">Заказ появится в списке после оплаты</div>
            </div>
          </div>

          <div className="bg-bg-secondary/60 border border-border-light/60 rounded-lg p-4 mb-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">Стоимость публикации</span>
              <span className="text-lg font-semibold text-brand-accent">
                {priceRub.toLocaleString('ru-RU')} ₽
              </span>
            </div>
          </div>

          <button
            className="w-full btn btn-primary"
            onClick={onConfirmPaid}
            disabled={loading}
          >
            {loading
              ? tinkoffReady
                ? 'Переход к оплате...'
                : 'Оплата...'
              : tinkoffReady
                ? `Оплатить ${priceRub.toLocaleString('ru-RU')} ₽`
                : `Оплатить ${priceRub.toLocaleString('ru-RU')} ₽`}
          </button>

          <p className="text-xs text-text-muted mt-3 text-center">
            {tinkoffReady
              ? 'Откроется защищённая страница банка (Тинькофф). После успешной оплаты заказ появится в списке.'
              : 'Оплата публикации обязательна для всех ролей. После подтверждения заказ будет опубликован.'}
          </p>
        </div>
      </div>
    </div>
  )
}
