'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/providers'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import { FiX, FiImage, FiVideo } from 'react-icons/fi'

export default function NewPortfolioPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [videoFiles, setVideoFiles] = useState<File[]>([])
  const [videoPreviews, setVideoPreviews] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/')
    } else if (user && user.role !== 'master') {
      alert('Только мастера могут добавлять работы в портфолио')
      router.push(`/profile/${user.id}`)
    }
  }, [user, authLoading, router])

  const removeImage = (index: number) => {
    const newFiles = imageFiles.filter((_, i) => i !== index)
    const newPreviews = imagePreviews.filter((_, i) => i !== index)
    setImageFiles(newFiles)
    URL.revokeObjectURL(imagePreviews[index])
    setImagePreviews(newPreviews)
  }

  const removeVideo = (index: number) => {
    const newFiles = videoFiles.filter((_, i) => i !== index)
    const newPreviews = videoPreviews.filter((_, i) => i !== index)
    setVideoFiles(newFiles)
    URL.revokeObjectURL(videoPreviews[index])
    setVideoPreviews(newPreviews)
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    const remainingSlots = 10 - imageFiles.length
    const filesToAdd = selectedFiles.slice(0, remainingSlots)
    
    if (filesToAdd.length < selectedFiles.length) {
      alert(`Можно добавить максимум 10 фотографий. Добавлено ${filesToAdd.length} из ${selectedFiles.length}`)
    }
    
    const newFiles = [...imageFiles, ...filesToAdd]
    const newPreviews = [...imagePreviews, ...filesToAdd.map((f) => URL.createObjectURL(f))]
    
    setImageFiles(newFiles)
    setImagePreviews(newPreviews)
    e.target.value = ''
  }

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    const remainingSlots = 5 - videoFiles.length
    const filesToAdd = selectedFiles.slice(0, remainingSlots)
    
    if (filesToAdd.length < selectedFiles.length) {
      alert(`Можно добавить максимум 5 видео. Добавлено ${filesToAdd.length} из ${selectedFiles.length}`)
    }
    
    const newFiles = [...videoFiles, ...filesToAdd]
    const newPreviews = [...videoPreviews, ...filesToAdd.map((f) => URL.createObjectURL(f))]
    
    setVideoFiles(newFiles)
    setVideoPreviews(newPreviews)
    e.target.value = ''
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || user.role !== 'master') return
    if (!title.trim()) {
      alert('Введите название работы')
      return
    }

    setSaving(true)
    try {
      // Загружаем изображения
      let imageUrls: string[] = []
      let imageUploadWarning = ''
      
      if (imageFiles.length > 0) {
        try {
          const uploadResults = await Promise.allSettled(
            imageFiles.map(async (file, idx) => {
              try {
                const ext = file.name.split('.').pop()
                const path = `${user.id}/portfolio/${Date.now()}-${idx}.${ext || 'jpg'}`
                const { error: uploadError } = await supabase.storage
                  .from('product-images')
                  .upload(path, file, { cacheControl: '3600', upsert: false })
                
                if (uploadError) {
                  console.warn(`Failed to upload image ${idx + 1}:`, uploadError.message)
                  return null
                }
                
                const { data } = supabase.storage.from('product-images').getPublicUrl(path)
                return data.publicUrl
              } catch (err: any) {
                console.warn(`Error uploading image ${idx + 1}:`, err)
                return null
              }
            })
          )
          
          imageUrls = uploadResults
            .map((result) => result.status === 'fulfilled' ? result.value : null)
            .filter((url): url is string => url !== null)
          
          if (imageUrls.length < imageFiles.length) {
            const failedCount = imageFiles.length - imageUrls.length
            imageUploadWarning = `${failedCount} изображений не удалось загрузить. Работа будет создана без них.`
          }
        } catch (err: any) {
          console.warn('Image upload process failed:', err)
          imageUploadWarning = 'Не удалось загрузить изображения. Работа будет создана без них.'
        }
      }

      // Загружаем видео
      let videoUrls: string[] = []
      let videoUploadWarning = ''
      
      if (videoFiles.length > 0) {
        try {
          const uploadResults = await Promise.allSettled(
            videoFiles.map(async (file, idx) => {
              try {
                const ext = file.name.split('.').pop()
                const path = `${user.id}/portfolio/${Date.now()}-video-${idx}.${ext || 'mp4'}`
                const { error: uploadError } = await supabase.storage
                  .from('product-images')
                  .upload(path, file, { cacheControl: '3600', upsert: false })
                
                if (uploadError) {
                  console.warn(`Failed to upload video ${idx + 1}:`, uploadError.message)
                  return null
                }
                
                const { data } = supabase.storage.from('product-images').getPublicUrl(path)
                return data.publicUrl
              } catch (err: any) {
                console.warn(`Error uploading video ${idx + 1}:`, err)
                return null
              }
            })
          )
          
          videoUrls = uploadResults
            .map((result) => result.status === 'fulfilled' ? result.value : null)
            .filter((url): url is string => url !== null)
          
          if (videoUrls.length < videoFiles.length) {
            const failedCount = videoFiles.length - videoUrls.length
            videoUploadWarning = `${failedCount} видео не удалось загрузить. Работа будет создана без них.`
          }
        } catch (err: any) {
          console.warn('Video upload process failed:', err)
          videoUploadWarning = 'Не удалось загрузить видео. Работа будет создана без них.'
        }
      }

      // Создаем запись в портфолио
      const { error } = await supabase
        .from('portfolio_items')
        .insert({
          master_id: user.id,
          title: title.trim(),
          description: description.trim() || null,
          images: imageUrls,
          videos: videoUrls,
        })

      if (error) {
        console.error('Error creating portfolio item:', error)
        throw new Error(`Ошибка при создании работы: ${error.message}`)
      }

      // Показываем предупреждения, если есть
      const warnings = [imageUploadWarning, videoUploadWarning].filter(Boolean)
      if (warnings.length > 0) {
        alert(`Работа успешно добавлена!\n\n${warnings.join('\n')}`)
      } else {
        alert('Работа успешно добавлена!')
      }

      // Очищаем превью
      imagePreviews.forEach(url => URL.revokeObjectURL(url))
      videoPreviews.forEach(url => URL.revokeObjectURL(url))

      router.push(`/profile/${user.id}`)
    } catch (error: any) {
      console.error('Error creating portfolio item:', error)
      const errorMessage = error?.message || 'Неизвестная ошибка при создании работы'
      alert(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Загрузка...</div>
      </div>
    )
  }

  if (user.role !== 'master') {
    return null
  }

  return (
    <div className="min-h-screen bg-white pb-20">
      <Navbar />
      <div className="container mx-auto px-4 py-4">
        <div className="max-w-2xl mx-auto">
          <div className="card">
            <h1 className="text-2xl font-bold mb-6">Добавить работу в портфолио</h1>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Название работы *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="input"
                  placeholder="Например: Ремонт кухни"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Описание
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="textarea"
                  rows={5}
                  placeholder="Подробное описание работы..."
                />
              </div>

              {/* Фотографии */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Фотографии (до 10 штук)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                  disabled={imageFiles.length >= 10}
                  className="input"
                />
                {imageFiles.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mt-4">
                    {imagePreviews.map((preview, idx) => (
                      <div key={idx} className="relative">
                        <img
                          src={preview}
                          alt={`Preview ${idx + 1}`}
                          className="w-full h-32 object-cover rounded border border-gray-200"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(idx)}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          <FiX size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Добавлено: {imageFiles.length} / 10
                </p>
              </div>

              {/* Видео */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Видео (до 5 штук)
                </label>
                <input
                  type="file"
                  accept="video/*"
                  multiple
                  onChange={handleVideoChange}
                  disabled={videoFiles.length >= 5}
                  className="input"
                />
                {videoFiles.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mt-4">
                    {videoPreviews.map((preview, idx) => (
                      <div key={idx} className="relative">
                        <video
                          src={preview}
                          className="w-full h-32 object-cover rounded border border-gray-200"
                          controls={false}
                        />
                        <button
                          type="button"
                          onClick={() => removeVideo(idx)}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          <FiX size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Добавлено: {videoFiles.length} / 5
                </p>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="btn btn-secondary flex-1"
                  disabled={saving}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={saving || !title.trim()}
                  className="btn btn-primary flex-1"
                >
                  {saving ? 'Сохранение...' : 'Добавить работу'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

