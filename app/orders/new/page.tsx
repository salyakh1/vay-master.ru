'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../providers'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import { FiUpload, FiX } from 'react-icons/fi'

const categories = [
  'Строительство',
  'Ремонт',
  'Сантехника',
  'Электрика',
  'Отделка',
  'Кровля',
  'Окна и двери',
  'Ландшафт',
  'Другое',
]

export default function NewOrderPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('Строительство')
  const [location, setLocation] = useState('')
  const [city, setCity] = useState('')
  const [budget, setBudget] = useState('')
  const [images, setImages] = useState<string[]>([])

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    // В реальном приложении здесь должна быть загрузка в Supabase Storage
    // Для примера используем base64 или URL
    const newImages: string[] = []
    for (let i = 0; i < files.length && images.length + newImages.length < 5; i++) {
      const file = files[i]
      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        newImages.push(result)
        if (newImages.length === Math.min(files.length, 5 - images.length)) {
          setImages([...images, ...newImages])
        }
      }
      reader.readAsDataURL(file)
    }
  }

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !title.trim() || !description.trim() || !location.trim()) {
      alert('Заполните все обязательные поля')
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('orders')
        .insert({
          client_id: user.id,
          title: title.trim(),
          description: description.trim(),
          category,
          location: location.trim(),
          city: city.trim() || null,
          budget: budget ? parseFloat(budget) : null,
          images: images.length > 0 ? images : [],
          status: 'new',
        })
        .select()
        .single()

      if (error) throw error

      router.push(`/orders/${data.id}`)
    } catch (error) {
      console.error('Error creating order:', error)
      alert('Ошибка при создании заказа')
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-white pb-20">
      <Navbar />
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">Создать заказ</h1>

          <form onSubmit={handleSubmit} className="card animate-fade-in">
            <div className="space-y-6">
              {/* Title */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Название заказа *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Например: Монтаж водостоков для крыши"
                  className="input"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Описание *
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Опишите детали заказа: площадь, высота, особенности и т.д."
                  className="textarea"
                  rows={6}
                  required
                />
              </div>

              {/* Category and Location */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Категория *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="input"
                    required
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Город
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Москва"
                    className="input"
                  />
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Адрес или местоположение *
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Например: городской округ Солнечногорск, деревня Новый Стан"
                  className="input"
                  required
                />
              </div>

              {/* Budget */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Бюджет (₽)
                </label>
                <input
                  type="number"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="Оставьте пустым для договорной"
                  className="input"
                  min="0"
                  step="100"
                />
              </div>

              {/* Images */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Фотографии (до 5 шт)
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {images.map((img, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={img}
                        alt={`Upload ${index + 1}`}
                        className="w-full h-32 object-cover rounded-xl"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <FiX size={16} />
                      </button>
                    </div>
                  ))}
                  {images.length < 5 && (
                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl h-32 cursor-pointer hover:border-indigo-500 transition-colors">
                      <FiUpload size={24} className="text-gray-400 mb-2" />
                      <span className="text-sm text-gray-500">Загрузить</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Submit */}
              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary flex-1"
                >
                  {loading ? 'Создание...' : 'Создать заказ'}
                </button>
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="btn btn-outline"
                >
                  Отмена
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

