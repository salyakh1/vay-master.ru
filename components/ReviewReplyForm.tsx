'use client'

import { useState } from 'react'
import { FiMessageCircle, FiX } from 'react-icons/fi'
import { supabase } from '@/lib/supabase'

interface ReviewReplyFormProps {
  reviewId: string
  reviewType: 'master' | 'product'
  currentUserId: string
  onSuccess?: () => void
  onCancel?: () => void
}

export default function ReviewReplyForm({
  reviewId,
  reviewType,
  currentUserId,
  onSuccess,
  onCancel,
}: ReviewReplyFormProps) {
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!content.trim()) {
      alert('Введите текст ответа')
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase
        .from('review_replies')
        .insert({
          review_id: reviewId,
          review_type: reviewType,
          author_id: currentUserId,
          content: content.trim(),
        })

      if (error) throw error

      setContent('')
      if (onSuccess) {
        onSuccess()
      }
    } catch (error) {
      console.error('Error saving reply:', error)
      alert('Ошибка при сохранении ответа')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="border-t border-border-light/40 pt-4 mt-4">
      <div className="flex gap-2">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={2}
          className="input flex-1 resize-none"
          placeholder="Написать ответ..."
          maxLength={500}
        />
      </div>
      <div className="flex items-center justify-between mt-2">
        <div className="text-xs text-text-secondary">
          {content.length}/500
        </div>
        <div className="flex gap-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1.5 text-sm text-text-secondary hover:text-graphite-secondary transition-colors"
            >
              Отмена
            </button>
          )}
          <button
            type="submit"
            disabled={saving || !content.trim()}
            className="btn btn-primary text-sm px-4 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Отправка...' : 'Ответить'}
          </button>
        </div>
      </div>
    </form>
  )
}
