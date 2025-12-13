'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/providers'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import { FiUpload, FiX, FiImage, FiVideo } from 'react-icons/fi'

export default function NewPortfolioItemPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [videos, setVideos] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)

  if (authLoading || !user || user.role !== 'master') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Загрузка...</div>
      </div>
    )
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    const newImages: string[] = []

    for (let i = 0; i < files.length && images.length + newImages.length < 10; i++) {
      const file = files[i]
      if (!file.type.startsWith('image/')) continue

      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        newImages.push(result)
        if (newImages.length === Math.min(files.length, 10 - images.length)) {
          setImages([...images, ...newImages])
          setUploading(false)
        }
      }
      reader.readAsDataURL(file)
    }
  }

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    const newVideos: string[] = []

    for (let i = 0; i < files.length && videos.length + newVideos.length < 5; i++) {
      const file = files[i]
      if (!file.type.startsWith('video/')) continue

      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        newVideos.push(result)
        if (newVideos.length === Math.min(files.length, 5 - videos.length)) {
          setVideos([...videos, ...newVideos])
          setUploading(false)
        }
      }
      reader.readAsDataURL(file)
    }
  }

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index))
  }

  const removeVideo = (index: number) => {
    setVideos(videos.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !title.trim()) {
      alert('Заполните название работы')
      return
    }

    if (images.length === 0 && videos.length === 0) {
      alert('Добавьте хотя бы одно фото или видео')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase
        .from('portfolio_items')
        .insert({
          master_id: user.id,
          title: title.trim(),
          description: description.trim() || null,
          images: images,
          videos: videos,
        })

      if (error) throw error

      router.push(`/profile/${user.id}`)
    } catch (error) {
      console.error('Error creating portfolio item:', error)
      alert('Ошибка при создании работы')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white pb-20">
      <Navbar />
      <div className="container mx-auto px-4 py-4">
        <div className="max-w-2xl mx-auto">
          <div className="card">
            <h1 className="text-2xl font-bold mb-6 text-black">Добавить работу в портфолио</h1>

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
                  placeholder="Например: Ремонт ванной комнаты"
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
                  rows={4}
                  placeholder="Опишите выполненную работу..."
                />
              </div>

              {/* Images Upload */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Фото ({images.length}/10)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  disabled={uploading || images.length >= 10}
                  className="input"
                />
                {images.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mt-4">
                    {images.map((img, index) => (
                      <div key={index} className="relative aspect-square">
                        <img
                          src={img}
                          alt={`Image ${index + 1}`}
                          className="w-full h-full object-cover border border-gray-200"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute top-1 right-1 p-1 bg-red-500 text-white"
                        >
                          <FiX size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Videos Upload */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Видео ({videos.length}/5)
                </label>
                <input
                  type="file"
                  accept="video/*"
                  multiple
                  onChange={handleVideoUpload}
                  disabled={uploading || videos.length >= 5}
                  className="input"
                />
                {videos.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    {videos.map((video, index) => (
                      <div key={index} className="relative aspect-video">
                        <video
                          src={video}
                          className="w-full h-full object-cover border border-gray-200"
                          muted
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                          <FiVideo size={24} className="text-white" />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeVideo(index)}
                          className="absolute top-1 right-1 p-1 bg-red-500 text-white"
                        >
                          <FiX size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-4 pt-4 border-t border-gray-200">
                <button
                  type="submit"
                  disabled={loading || uploading}
                  className="btn btn-primary flex-1"
                >
                  {loading ? 'Сохранение...' : 'Добавить работу'}
                </button>
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="btn btn-outline"
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

