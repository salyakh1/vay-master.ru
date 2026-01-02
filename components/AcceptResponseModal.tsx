'use client'

import { useState } from 'react'
import { FiX, FiAlertCircle, FiCheckCircle } from 'react-icons/fi'

interface AcceptResponseModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
  masterName: string
  price?: number
}

export default function AcceptResponseModal({
  isOpen,
  onClose,
  onConfirm,
  masterName,
  price
}: AcceptResponseModalProps) {
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleConfirm = async () => {
    setError('')
    setConfirming(true)
    try {
      await onConfirm()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Ошибка при принятии отклика')
    } finally {
      setConfirming(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-bg-primary rounded-lg shadow-xl w-full max-w-md mx-4 border border-border-color">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border-color">
          <h2 className="text-xl font-semibold text-text-primary">
            Подтвердите выбор исполнителя
          </h2>
          <button
            onClick={onClose}
            disabled={confirming}
            className="p-2 hover:bg-bg-secondary rounded-md transition-colors disabled:opacity-50"
          >
            <FiX size={20} className="text-text-secondary" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <FiAlertCircle size={20} className="text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <p className="font-medium mb-2">После принятия этого отклика:</p>
              <ul className="list-disc list-inside space-y-1 text-yellow-700">
                <li>Другие пользователи не смогут откликаться</li>
                <li>Заказ перейдёт в работу</li>
                <li>Все остальные отклики будут отклонены</li>
              </ul>
            </div>
          </div>

          <div className="p-4 bg-bg-secondary rounded-md border border-border-color">
            <div className="text-sm text-text-secondary mb-2">Выбранный исполнитель:</div>
            <div className="text-lg font-semibold text-text-primary mb-2">
              {masterName}
            </div>
            {price && (
              <div className="text-base font-medium text-brand-accent">
                {price.toLocaleString('ru-RU')} ₽
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm flex items-start gap-2">
              <FiAlertCircle size={18} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={confirming}
              className="flex-1 btn btn-secondary"
            >
              Отменить
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={confirming}
              className="flex-1 btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {confirming ? (
                <>
                  <span className="animate-spin">⏳</span>
                  <span>Принятие...</span>
                </>
              ) : (
                <>
                  <FiCheckCircle size={18} />
                  <span>Принять отклик</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

