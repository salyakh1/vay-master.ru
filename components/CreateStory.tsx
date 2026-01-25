'use client'

import { useState, useRef } from 'react'
import dynamic from 'next/dynamic'
import { supabase } from '@/lib/supabase'
import { FiX, FiUpload, FiVideo, FiImage, FiPlus } from 'react-icons/fi'
import { getMasterAccess } from '@/lib/masterAccess'
import { getProFeatureFlags, restrictionsDisabledForRole } from '@/lib/proSettings'

// Dynamic import для модального окна - загружается только при открытии
const ProUpgradeModal = dynamic(() => import('@/components/ProUpgradeModal'), {
  ssr: false,
})

interface CreateStoryProps {
  userId: string
  onClose: () => void
  onSuccess: () => void
}

export default function CreateStory({ userId, onClose, onSuccess }: CreateStoryProps) {
  const [mediaType, setMediaType] = useState<'photos' | 'video' | null>(null)
  const [photos, setPhotos] = useState<File[]>([])
  const [video, setVideo] = useState<File | null>(null)
  const [description, setDescription] = useState('')
  const [uploading, setUploading] = useState(false)
  const [previews, setPreviews] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const [showProModal, setShowProModal] = useState(false)

  const ensureStoriesAllowed = async () => {
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
    const role = (profile as any)?.role
    if (role !== 'master' && role !== 'seller') return true

    // Если админ отключил ограничения — разрешаем всем
    const flags = await getProFeatureFlags()
    if (restrictionsDisabledForRole(role, flags)) return true

    const access = getMasterAccess(profile)
    if (access.isPro || access.isTrial) return true

    setShowProModal(true)
    return false
  }

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    // Максимум 4 фото
    const selectedFiles = files.slice(0, 4)
    setPhotos(selectedFiles)
    setMediaType('photos')

    // Создаем превью
    const previewUrls = selectedFiles.map(file => URL.createObjectURL(file))
    setPreviews(previewUrls)
  }

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Проверяем длительность видео (максимум 30 секунд)
    const videoElement = document.createElement('video')
    videoElement.preload = 'metadata'
    videoElement.onloadedmetadata = () => {
      window.URL.revokeObjectURL(videoElement.src)
      const duration = videoElement.duration
      if (duration > 30) {
        alert('Видео должно быть не более 30 секунд')
        return
      }
      setVideo(file)
      setMediaType('video')
      setPreviews([URL.createObjectURL(file)])
    }
    videoElement.src = URL.createObjectURL(file)
  }

  const handleUpload = async () => {
    const allowed = await ensureStoriesAllowed()
    if (!allowed) return

    if (!mediaType) return
    if (mediaType === 'photos' && photos.length === 0) return
    if (mediaType === 'video' && !video) return

    setUploading(true)

    try {
      const mediaUrls: string[] = []

      if (mediaType === 'photos') {
        // Загружаем фото
        for (const photo of photos) {
          const fileExt = photo.name.split('.').pop()
          const fileName = `${userId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`

          const { error: uploadError } = await supabase.storage
            .from('stories')
            .upload(fileName, photo)

          if (uploadError) throw uploadError

          const { data: { publicUrl } } = supabase.storage
            .from('stories')
            .getPublicUrl(fileName)

          mediaUrls.push(publicUrl)
        }
      } else if (mediaType === 'video' && video) {
        // Загружаем видео
        const fileExt = video.name.split('.').pop()
        const fileName = `${userId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`

        const { error: uploadError } = await supabase.storage
          .from('stories')
          .upload(fileName, video)

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('stories')
          .getPublicUrl(fileName)

        mediaUrls.push(publicUrl)
      }

      // Создаем историю через API
      const response = await fetch('/api/stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          media: mediaUrls,
          mediaType,
          description: description.trim() || null,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Ошибка при создании истории')
      }

      // Очищаем превью
      previews.forEach(url => URL.revokeObjectURL(url))
      setPreviews([])
      setPhotos([])
      setVideo(null)
      setMediaType(null)

      onSuccess()
    } catch (error: any) {
      console.error('Error creating story:', error)
      alert(`Ошибка: ${error.message || 'Не удалось создать историю'}`)
    } finally {
      setUploading(false)
    }
  }

  const handleRemovePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index)
    setPhotos(newPhotos)
    const newPreviews = previews.filter((_, i) => i !== index)
    newPreviews.forEach(url => URL.revokeObjectURL(url))
    setPreviews(newPreviews)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-bg-primary rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-bg-primary border-b border-border-color px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-graphite-secondary">Создать историю</h2>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary transition-colors"
          >
            <FiX size={24} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {!mediaType ? (
            // Выбор типа медиа
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-border-light rounded-lg hover:border-brand-accent transition-colors"
              >
                <FiImage size={48} className="text-text-secondary" />
                <span className="text-graphite-secondary font-medium">Фото (до 4 шт)</span>
              </button>
              <button
                onClick={() => videoInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-border-light rounded-lg hover:border-brand-accent transition-colors"
              >
                <FiVideo size={48} className="text-text-secondary" />
                <span className="text-graphite-secondary font-medium">Видео (до 30 сек)</span>
              </button>
            </div>
          ) : (
            // Превью и загрузка
            <div className="space-y-4">
              {mediaType === 'photos' && (
                <div className="grid grid-cols-2 gap-4">
                  {previews.map((preview, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-48 object-cover rounded-lg"
                      />
                      <button
                        onClick={() => handleRemovePhoto(index)}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <FiX size={16} />
                      </button>
                    </div>
                  ))}
                  {photos.length < 4 && (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center justify-center h-48 border-2 border-dashed border-border-light rounded-lg hover:border-brand-accent transition-colors"
                    >
                      <FiPlus size={32} className="text-text-secondary" />
                    </button>
                  )}
                </div>
              )}

              {mediaType === 'video' && previews[0] && (
                <div className="relative">
                  <video
                    src={previews[0]}
                    controls
                    className="w-full rounded-lg"
                  />
                </div>
              )}

              {/* Поле для описания */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-graphite-secondary">
                  Описание (необязательно)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Добавьте описание к истории..."
                  className="w-full input min-h-[80px] resize-none"
                  maxLength={200}
                />
                <div className="text-xs text-text-secondary text-right">
                  {description.length}/200
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleUpload}
                  disabled={uploading || (mediaType === 'photos' && photos.length === 0) || (mediaType === 'video' && !video)}
                  className="flex-1 btn bg-brand-accent text-white hover:bg-brand-accent-hover disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? 'Загрузка...' : 'Опубликовать'}
                </button>
                <button
                  onClick={() => {
                    setMediaType(null)
                    setPhotos([])
                    setVideo(null)
                    setDescription('')
                    previews.forEach(url => URL.revokeObjectURL(url))
                    setPreviews([])
                  }}
                  className="btn border border-border-color hover:bg-bg-secondary"
                >
                  Отмена
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Скрытые input'ы */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handlePhotoSelect}
        className="hidden"
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        onChange={handleVideoSelect}
        className="hidden"
      />

      <ProUpgradeModal
        isOpen={showProModal}
        onClose={() => setShowProModal(false)}
        title="Истории доступны только в PRO"
        description="После пробной недели добавление историй доступно только в статусе PRO мастер/продавец."
        ctaText="Купить PRO"
      />
    </div>
  )
}
