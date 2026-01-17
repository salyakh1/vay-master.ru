'use client'

import { useState, useRef } from 'react'
import { FiX, FiCamera, FiStar } from 'react-icons/fi'
import RatingStars from './RatingStars'
import { supabase } from '@/lib/supabase'

interface ReviewFormProps {
  targetId: string // ID мастера или товара
  targetType: 'master' | 'product'
  sellerId?: string // Для отзывов о товарах
  currentUserId: string
  onSuccess?: () => void
  onCancel?: () => void
  existingReview?: {
    id: string
    rating: number
    comment?: string
    images?: string[]
  }
}

export default function ReviewForm({
  targetId,
  targetType,
  sellerId,
  currentUserId,
  onSuccess,
  onCancel,
  existingReview,
}: ReviewFormProps) {
  const [rating, setRating] = useState(existingReview?.rating || 0)
  const [comment, setComment] = useState(existingReview?.comment || '')
  const [images, setImages] = useState<string[]>(existingReview?.images || [])
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return

    const files = Array.from(e.target.files)
    if (files.length + images.length > 5) {
      alert('Можно загрузить не более 5 фотографий')
      return
    }

    setUploading(true)
    try {
      const uploadPromises = files.map(async (file) => {
        const fileExt = file.name.split('.').pop()
        const fileName = `${Math.random()}.${fileExt}`
        const filePath = `reviews/${targetId}/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('images')
          .upload(filePath, file)

        if (uploadError) throw uploadError

        const { data } = supabase.storage.from('images').getPublicUrl(filePath)
        return data.publicUrl
      })

      const uploadedUrls = await Promise.all(uploadPromises)
      setImages([...images, ...uploadedUrls])
    } catch (error) {
      console.error('Error uploading images:', error)
      alert('Ошибка при загрузке фотографий')
    } finally {
      setUploading(false)
    }
  }

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (rating === 0) {
      alert('Пожалуйста, выберите рейтинг')
      return
    }

    setSaving(true)
    try {
      const reviewData: any = {
        reviewer_id: currentUserId,
        rating,
        comment: comment.trim() || null,
        images: images.length > 0 ? images : null,
      }

      if (targetType === 'master') {
        reviewData.master_id = targetId

        if (existingReview) {
          const { error } = await supabase
            .from('master_reviews')
            .update(reviewData)
            .eq('id', existingReview.id)
          
          if (error) throw error
        } else {
          const { error } = await supabase
            .from('master_reviews')
            .insert(reviewData)
          
          if (error) throw error
        }
      } else if (targetType === 'product') {
        reviewData.product_id = targetId
        reviewData.seller_id = sellerId

        if (existingReview) {
          const { error } = await supabase
            .from('product_reviews')
            .update(reviewData)
            .eq('id', existingReview.id)
          
          if (error) throw error
        } else {
          const { error } = await supabase
            .from('product_reviews')
            .insert(reviewData)
          
          if (error) throw error
        }
      }

      if (onSuccess) {
        onSuccess()
      }
    } catch (error: any) {
      console.error('Error saving review:', error)
      if (error.code === '23505') {
        alert('Вы уже оставили отзыв. Можно редактировать существующий.')
      } else {
        alert('Ошибка при сохранении отзыва')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card-glossy">
      <h3 className="text-lg font-semibold text-graphite-secondary mb-4">
        {existingReview ? 'Редактировать отзыв' : 'Оставить отзыв'}
      </h3>

      {/* Рейтинг */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-graphite-secondary mb-2">
          Ваша оценка *
        </label>
        <RatingStars
          rating={rating}
          onRatingChange={setRating}
          size="lg"
          showValue
        />
      </div>

      {/* Комментарий */}
      <div className="mb-4">
        <label htmlFor="comment" className="block text-sm font-medium text-graphite-secondary mb-2">
          Комментарий (необязательно)
        </label>
        <textarea
          id="comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          className="input w-full resize-none"
          placeholder="Расскажите о вашем опыте..."
          maxLength={1000}
        />
        <div className="text-xs text-text-secondary mt-1 text-right">
          {comment.length}/1000
        </div>
      </div>

      {/* Фотографии */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-graphite-secondary mb-2">
          Фотографии (до 5 шт.)
        </label>
        {images.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-2">
            {images.map((img, idx) => (
              <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-border-light/60 group">
                <img src={img} alt={`Фото ${idx + 1}`} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(idx)}
                  className="absolute top-1 right-1 w-6 h-6 bg-black/70 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <FiX size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
        {images.length < 5 && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2 border border-border-light rounded-lg hover:bg-bg-secondary transition-colors text-sm text-text-secondary"
          >
            <FiCamera size={16} />
            <span>{uploading ? 'Загрузка...' : 'Добавить фото'}</span>
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleImageUpload}
          className="hidden"
        />
      </div>

      {/* Кнопки */}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving || rating === 0}
          className="btn btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Сохранение...' : existingReview ? 'Сохранить изменения' : 'Оставить отзыв'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="btn btn-secondary"
          >
            Отмена
          </button>
        )}
      </div>
    </form>
  )
}
