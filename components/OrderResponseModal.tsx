'use client'

import { useState } from 'react'
import { FiX, FiDollarSign } from 'react-icons/fi'

interface OrderResponseModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (price: string, message: string) => Promise<void>
  orderTitle?: string
}

export default function OrderResponseModal({
  isOpen,
  onClose,
  onSubmit,
  orderTitle
}: OrderResponseModalProps) {
  const [price, setPrice] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!message.trim()) {
      setError('Сообщение обязательно')
      return
    }

    setSubmitting(true)
    try {
      await onSubmit(price, message)
      // Сбрасываем форму после успешной отправки
      setPrice('')
      setMessage('')
      onClose()
    } catch (err: any) {
      setError(err.message || 'Ошибка при отправке отклика')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!submitting) {
      setPrice('')
      setMessage('')
      setError('')
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-bg-primary rounded-lg shadow-xl w-full max-w-md mx-4 border border-border-color">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border-color">
          <h2 className="text-xl font-semibold text-text-primary">
            Откликнуться на заказ
          </h2>
          <button
            onClick={handleClose}
            disabled={submitting}
            className="p-2 hover:bg-bg-secondary rounded-md transition-colors disabled:opacity-50"
          >
            <FiX size={20} className="text-text-secondary" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {orderTitle && (
            <div className="text-sm text-text-secondary mb-4">
              Заказ: <span className="font-medium text-text-primary">{orderTitle}</span>
            </div>
          )}

          {/* Price */}
          <div>
            <label className="block text-sm font-semibold text-text-primary mb-2">
              Предложенная цена (₽)
              <span className="text-text-secondary font-normal ml-1">(необязательно)</span>
            </label>
            <div className="relative">
              <FiDollarSign 
                size={20} 
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary" 
              />
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0"
                min="0"
                step="0.01"
                className="input pl-10"
                disabled={submitting}
              />
            </div>
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-semibold text-text-primary mb-2">
              Сообщение <span className="text-brand-accent">*</span>
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Расскажите о своем опыте, подходе к работе, сроках выполнения..."
              rows={6}
              required
              className="textarea resize-none"
              disabled={submitting}
            />
            <div className="text-xs text-text-secondary mt-1">
              Минимум 10 символов. Опишите ваш подход к выполнению заказа.
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={submitting}
              className="flex-1 btn btn-secondary"
            >
              Отменить
            </button>
            <button
              type="submit"
              disabled={submitting || !message.trim()}
              className="flex-1 btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Отправка...' : 'Отправить отклик'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

