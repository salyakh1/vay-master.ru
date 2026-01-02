'use client'

import { useState } from 'react'
import { FiX, FiSend, FiAlertCircle } from 'react-icons/fi'
import { supabase } from '@/lib/supabase'

interface ComplaintModalProps {
  isOpen: boolean
  onClose: () => void
  reportedUserId: string
  chatId: string
  onSuccess?: () => void
}

export default function ComplaintModal({
  isOpen,
  onClose,
  reportedUserId,
  chatId,
  onSuccess,
}: ComplaintModalProps) {
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!comment.trim()) {
      alert('Пожалуйста, укажите причину жалобы')
      return
    }

    setSubmitting(true)
    try {
      // Получаем токен из Supabase сессии
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Не авторизован')
      }

      const response = await fetch('/api/complaints', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          reported_user_id: reportedUserId,
          chat_id: chatId,
          comment: comment.trim(),
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Ошибка при отправке жалобы')
      }

      alert('Жалоба успешно отправлена администратору')
      setComment('')
      onClose()
      if (onSuccess) onSuccess()
    } catch (error: any) {
      console.error('Error submitting complaint:', error)
      alert(error.message || 'Ошибка при отправке жалобы')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 animate-fade-in">
      <div className="relative w-full max-w-lg bg-bg-primary border border-border-color rounded-lg shadow-card animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border-color">
          <div className="flex items-center gap-3">
            <FiAlertCircle size={24} className="text-red-600" />
            <h2 className="text-xl font-semibold text-graphite-secondary tracking-tight">Пожаловаться</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-text-secondary hover:text-graphite-secondary transition-colors"
          >
            <FiX size={24} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-4">
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2 text-text-primary">
              Опишите причину жалобы
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Расскажите, что произошло..."
              className="input w-full min-h-[120px] resize-none"
              disabled={submitting}
              required
            />
            <p className="text-xs text-text-secondary mt-2">
              Ваша жалоба будет рассмотрена администратором в ближайшее время.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="btn flex-1 bg-bg-secondary hover:bg-bg-primary text-text-primary border border-border-color"
              disabled={submitting}
            >
              Отмена
            </button>
            <button
              type="submit"
              className="btn flex-1 btn-primary flex items-center justify-center gap-2"
              disabled={submitting || !comment.trim()}
            >
              <FiSend size={18} />
              <span>{submitting ? 'Отправка...' : 'Отправить жалобу'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

