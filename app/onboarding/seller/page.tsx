'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/providers'
import { supabase, ProductCategory } from '@/lib/supabase'
import Navbar from '@/components/Navbar'

export default function SellerOnboardingPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [productCategories, setProductCategories] = useState<ProductCategory[]>([])
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const fetchCategories = async () => {
    try {
      setLoading(true)
      const { data, error: fetchError } = await supabase
        .from('product_categories')
        .select('*')
        .order('section', { ascending: true })
        .order('name', { ascending: true })

      if (fetchError) throw fetchError
      setProductCategories((data as ProductCategory[]) || [])
    } catch (error) {
      console.error('Error fetching product categories:', error)
      setError('Ошибка при загрузке категорий')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login')
      return
    }

    if (user && user.role !== 'seller') {
      router.push('/feed')
      return
    }

    if (user) {
      fetchCategories()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, router])

  const toggleCategory = (id: string) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const handleSave = async () => {
    if (!user) return

    if (selectedCategoryIds.length === 0) {
      setError('Пожалуйста, выберите хотя бы одну категорию товаров')
      return
    }

    setSaving(true)
    setError('')

    try {
      // Получаем названия выбранных категорий
      const selectedCategoryNames = productCategories
        .filter((cat) => selectedCategoryIds.includes(cat.id))
        .map((cat) => cat.name)
        .join(', ')

      // Сохраняем в профиль
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          product_categories: selectedCategoryNames,
        })
        .eq('id', user.id)

      if (updateError) throw updateError

      // Редирект на главную страницу после выбора категорий
      router.push('/')
    } catch (error: any) {
      console.error('Error saving categories:', error)
      setError(error.message || 'Ошибка при сохранении')
    } finally {
      setSaving(false)
    }
  }

  // Группируем категории по секциям
  const categoriesBySection = {
    instruments: productCategories.filter((cat) => cat.section === 'instruments'),
    autoparts: productCategories.filter((cat) => cat.section === 'autoparts'),
    materials: productCategories.filter((cat) => cat.section === 'materials'),
  }

  const sectionNames = {
    instruments: 'Инструменты',
    autoparts: 'Автозапчасти',
    materials: 'Стройматериалы',
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-lg">Загрузка...</div>
      </div>
    )
  }

  if (!user || user.role !== 'seller') {
    return null
  }

  return (
    <div className="min-h-screen bg-white pb-20">
      <Navbar />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="card">
          <h1 className="text-2xl font-bold mb-2 text-black">Выберите категории товаров</h1>
          <p className="text-gray-600 mb-6">
            Выберите категории товаров, с которыми вы работаете. Это поможет клиентам найти ваши товары.
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {Object.entries(categoriesBySection).map(([section, categories]) => {
            if (categories.length === 0) return null

            return (
              <div key={section} className="mb-6">
                <h2 className="text-lg font-semibold mb-3 text-black">
                  {sectionNames[section as keyof typeof sectionNames]}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-64 overflow-y-auto border border-gray-200 p-4 rounded">
                  {categories.map((category) => (
                    <label
                      key={category.id}
                      className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50 p-2 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={selectedCategoryIds.includes(category.id)}
                        onChange={() => toggleCategory(category.id)}
                        className="w-4 h-4"
                      />
                      <span>{category.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )
          })}

          {selectedCategoryIds.length > 0 && (
            <p className="text-sm text-gray-500 mb-4">
              Выбрано категорий: {selectedCategoryIds.length}
            </p>
          )}

          <div className="flex gap-4">
            <button
              onClick={handleSave}
              disabled={saving || selectedCategoryIds.length === 0}
              className="btn btn-primary flex-1"
            >
              {saving ? 'Сохранение...' : 'Сохранить и продолжить'}
            </button>
            <button
              onClick={() => router.push('/products')}
              className="btn btn-secondary"
            >
              Пропустить
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

