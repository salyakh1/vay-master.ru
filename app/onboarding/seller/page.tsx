'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/providers'
import { supabase, ProductCategory, ProductSubcategory, PRODUCT_CATEGORY_SECTIONS } from '@/lib/supabase'
import Navbar from '@/components/Navbar'

export default function SellerOnboardingPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [productCategories, setProductCategories] = useState<ProductCategory[]>([])
  const [productSubcategories, setProductSubcategories] = useState<ProductSubcategory[]>([])
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([])
  const [selectedSubcategoryIds, setSelectedSubcategoryIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const fetchCategories = async () => {
    try {
      setLoading(true)
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('product_categories')
        .select('*')
        .order('section', { ascending: true })
        .order('name', { ascending: true })

      if (categoriesError) throw categoriesError

      const { data: subcategoriesData, error: subcategoriesError } = await supabase
        .from('product_subcategories')
        .select('*')
        .order('name', { ascending: true })

      if (subcategoriesError) throw subcategoriesError
      setProductCategories((categoriesData as ProductCategory[]) || [])
      setProductSubcategories((subcategoriesData as ProductSubcategory[]) || [])
    } catch (error) {
      console.error('Error fetching product categories:', error)
      setError('Ошибка при загрузке категорий')
      setProductSubcategories([])
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
    setSelectedCategoryIds((prev) => {
      const exists = prev.includes(id)
      const next = exists ? prev.filter((x) => x !== id) : [...prev, id]
      // Удаляем подкаталоги, которые больше не принадлежат выбранным категориям
      setSelectedSubcategoryIds((prevSubs) =>
        prevSubs.filter((subId) => {
          const sub = productSubcategories.find((s) => s.id === subId)
          return sub ? next.includes(sub.category_id) : false
        })
      )
      return next
    })
  }

  const toggleSubcategory = (id: string) => {
    const sub = productSubcategories.find((s) => s.id === id)
    if (sub && !selectedCategoryIds.includes(sub.category_id)) {
      setSelectedCategoryIds((prev) => [...prev, sub.category_id])
    }
    setSelectedSubcategoryIds((prev) =>
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
      // Очищаем старые записи
      await supabase.from('profile_product_categories').delete().eq('profile_id', user.id)
      await supabase.from('profile_product_subcategories').delete().eq('profile_id', user.id)

      // Сохраняем категории
      if (selectedCategoryIds.length > 0) {
        const categoryPayload = selectedCategoryIds.map((categoryId) => ({
          profile_id: user.id,
          category_id: categoryId,
        }))
        const { error: categoryError } = await supabase
          .from('profile_product_categories')
          .insert(categoryPayload)
        if (categoryError) throw categoryError
      }

      // Сохраняем подкаталоги
      if (selectedSubcategoryIds.length > 0) {
        const subcategoryPayload = selectedSubcategoryIds.map((subcategoryId) => ({
          profile_id: user.id,
          subcategory_id: subcategoryId,
        }))
        const { error: subcategoryError } = await supabase
          .from('profile_product_subcategories')
          .insert(subcategoryPayload)
        if (subcategoryError) throw subcategoryError
      }

      const selectedCategoryNames = productCategories
        .filter((cat) => selectedCategoryIds.includes(cat.id))
        .map((cat) => cat.name)
        .join(', ')

      await supabase
        .from('profiles')
        .update({ product_categories: selectedCategoryNames })
        .eq('id', user.id)

      // Редирект на главную страницу после выбора категорий
      router.push('/')
    } catch (error: any) {
      console.error('Error saving categories:', error)
      setError(error.message || 'Ошибка при сохранении')
    } finally {
      setSaving(false)
    }
  }

  const categoriesBySection = PRODUCT_CATEGORY_SECTIONS.map((section) => ({
    id: section.id,
    label: section.label,
    categories: productCategories.filter((cat) => cat.section === section.id),
  }))

  const filteredSubcategories = productSubcategories.filter((sub) =>
    selectedCategoryIds.includes(sub.category_id)
  )

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

          {categoriesBySection.map((section) => {
            if (section.categories.length === 0) return null

            return (
              <div key={section.id} className="mb-6">
                <h2 className="text-lg font-semibold mb-3 text-black">
                  {section.label}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-64 overflow-y-auto border border-gray-200 p-4 rounded">
                  {section.categories.map((category) => (
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

          {selectedCategoryIds.length > 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-3 text-black">
                Каталоги (подкатегории)
              </h2>
              <p className="text-sm text-gray-500 mb-2">
                Выберите каталоги внутри выбранных категорий
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-64 overflow-y-auto border border-gray-200 p-4 rounded">
                {filteredSubcategories.length === 0 ? (
                  <p className="text-sm text-gray-500">Нет каталогов для выбранных категорий</p>
                ) : (
                  filteredSubcategories.map((subcategory) => (
                    <label
                      key={subcategory.id}
                      className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50 p-2 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={selectedSubcategoryIds.includes(subcategory.id)}
                        onChange={() => toggleSubcategory(subcategory.id)}
                        className="w-4 h-4"
                      />
                      <span>{subcategory.name}</span>
                    </label>
                  ))
                )}
              </div>
              {selectedSubcategoryIds.length > 0 && (
                <p className="text-sm text-gray-500 mt-2">
                  Выбрано каталогов: {selectedSubcategoryIds.length}
                </p>
              )}
            </div>
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

