'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/providers'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import { FiArrowLeft, FiImage, FiX } from 'react-icons/fi'
import Link from 'next/link'

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
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [location, setLocation] = useState('')
  const [city, setCity] = useState('')
  const [budget, setBudget] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
        <div className="text-base text-text-secondary">Загрузка...</div>
      </div>
    )
  }

  if (!user) {
    router.push('/auth/login')
    return null
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).slice(0, 10) // Максимум 10 изображений
      setFiles((prev) => [...prev, ...newFiles].slice(0, 10))
    }
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    if (!title.trim() || !description.trim() || !category || !location.trim()) {
      alert('Заполните все обязательные поля')
      return
    }

    setSaving(true)
    try {
      // Загружаем изображения, если есть
      let imageUrls: string[] = []
      
      if (files.length > 0) {
        try {
          const uploadResults = await Promise.allSettled(
            files.map(async (file, idx) => {
              try {
                const ext = file.name.split('.').pop()
                const path = `${user.id}/orders/${Date.now()}-${idx}.${ext || 'jpg'}`
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
        } catch (err: any) {
          console.warn('Image upload process failed:', err)
        }
      }

      // Создаем заказ
      const orderData: any = {
        client_id: user.id,
        title: title.trim(),
        description: description.trim(),
        category,
        location: location.trim(),
        status: 'open',
        images: imageUrls,
      }

      if (city.trim()) {
        orderData.city = city.trim()
      }

      if (budget.trim()) {
        const budgetNum = parseFloat(budget.replace(/\s/g, '').replace(',', '.'))
        if (!isNaN(budgetNum) && budgetNum > 0) {
          orderData.budget = budgetNum
        }
      }

      const { data: newOrder, error: orderError } = await supabase
        .from('orders')
        .insert(orderData)
        .select()
        .single()

      if (orderError) throw orderError

      // Перенаправляем на страницу созданного заказа
      router.push(`/orders/${newOrder.id}`)
    } catch (error: any) {
      console.error('Error creating order:', error)
      alert(error?.message || 'Ошибка при создании заказа')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg-primary pb-20">
      <Navbar />
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <Link
              href="/orders"
              className="p-2 hover:bg-bg-secondary rounded-md transition-colors"
            >
              <FiArrowLeft size={24} className="text-text-secondary" />
            </Link>
            <h1 className="text-2xl font-semibold text-graphite-secondary tracking-tight">
              Создать заказ
            </h1>
          </div>

          <form onSubmit={handleSubmit} className="card space-y-6">
            {/* Название заказа */}
            <div>
              <label className="block text-sm font-semibold text-graphite-secondary mb-2">
                Название заказа *
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

            {/* Описание */}
            <div>
              <label className="block text-sm font-semibold text-graphite-secondary mb-2">
                Описание *
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                className="textarea"
                rows={6}
                placeholder="Подробно опишите задачу, что нужно сделать, какие материалы использовать и т.д."
              />
            </div>

            {/* Категория */}
            <div>
              <label className="block text-sm font-semibold text-graphite-secondary mb-2">
                Категория *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
                className="input"
              >
                <option value="">Выберите категорию</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Адрес/Место */}
            <div>
              <label className="block text-sm font-semibold text-graphite-secondary mb-2">
                Адрес выполнения работ *
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                required
                className="input"
                placeholder="Улица, дом, квартира"
              />
            </div>

            {/* Город */}
            <div>
              <label className="block text-sm font-semibold text-graphite-secondary mb-2">
                Город
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="input"
                placeholder="Например: Москва"
              />
            </div>

            {/* Бюджет */}
            <div>
              <label className="block text-sm font-semibold text-graphite-secondary mb-2">
                Бюджет (₽)
              </label>
              <input
                type="text"
                value={budget}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^\d,.\s]/g, '')
                  setBudget(value)
                }}
                className="input"
                placeholder="Например: 50000"
              />
              <p className="text-xs text-text-muted mt-1">
                Укажите примерный бюджет или оставьте пустым для обсуждения
              </p>
            </div>

            {/* Изображения */}
            <div>
              <label className="block text-sm font-semibold text-graphite-secondary mb-2">
                Фотографии (до 10 шт.)
              </label>
              <div className="space-y-3">
                {files.length > 0 && (
                  <div className="grid grid-cols-3 gap-3">
                    {files.map((file, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-32 object-cover rounded-md border border-border-color"
                        />
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <FiX size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-4 border-2 border-dashed border-border-color rounded-md hover:border-brand-accent hover:text-brand-accent transition-colors flex items-center justify-center gap-2"
                >
                  <FiImage size={20} />
                  <span>Добавить фотографии</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            </div>

            {/* Кнопки */}
            <div className="flex gap-4 pt-4">
              <Link
                href="/orders"
                className="btn btn-outline flex-1"
              >
                Отмена
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="btn btn-primary flex-1"
              >
                {saving ? 'Создание...' : 'Создать заказ'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

