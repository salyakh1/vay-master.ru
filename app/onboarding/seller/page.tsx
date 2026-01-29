'use client'

import { useEffect, useMemo, useState } from 'react'
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
  const [query, setQuery] = useState('')
  const [openSectionIds, setOpenSectionIds] = useState<string[]>(() =>
    PRODUCT_CATEGORY_SECTIONS.slice(0, 2).map((s) => s.id)
  )
  const [modalCategory, setModalCategory] = useState<ProductCategory | null>(null)
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

  const subcategoriesByCategoryId = useMemo(() => {
    const byCat = new Map<string, ProductSubcategory[]>()
    for (const sub of productSubcategories) {
      const arr = byCat.get(sub.category_id) || []
      arr.push(sub)
      byCat.set(sub.category_id, arr)
    }
    return byCat
  }, [productSubcategories])

  const effectiveCategoryIds = useMemo(() => {
    const fromSubs = selectedSubcategoryIds
      .map((id) => productSubcategories.find((s) => s.id === id)?.category_id)
      .filter(Boolean) as string[]
    return Array.from(new Set([...selectedCategoryIds, ...fromSubs]))
  }, [selectedCategoryIds, selectedSubcategoryIds, productSubcategories])

  const canSave = effectiveCategoryIds.length > 0 || selectedSubcategoryIds.length > 0

  const handleSave = async () => {
    if (!user) return

    if (!canSave) {
      setError('Выберите хотя бы один пункт в каталоге')
      return
    }

    setSaving(true)
    setError('')

    try {
      await supabase.from('profile_product_categories').delete().eq('profile_id', user.id)
      await supabase.from('profile_product_subcategories').delete().eq('profile_id', user.id)

      if (effectiveCategoryIds.length > 0) {
        const categoryPayload = effectiveCategoryIds.map((categoryId) => ({
          profile_id: user.id,
          category_id: categoryId,
        }))
        const { error: categoryError } = await supabase
          .from('profile_product_categories')
          .insert(categoryPayload)
        if (categoryError) throw categoryError
      }

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
        .filter((cat) => effectiveCategoryIds.includes(cat.id))
        .map((cat) => cat.name)
        .join(', ')

      await supabase
        .from('profiles')
        .update({ product_categories: selectedCategoryNames })
        .eq('id', user.id)

      router.push('/')
    } catch (error: any) {
      console.error('Error saving categories:', error)
      setError(error.message || 'Ошибка при сохранении')
    } finally {
      setSaving(false)
    }
  }

  const categoriesBySection = useMemo(
    () =>
      PRODUCT_CATEGORY_SECTIONS.map((section) => ({
        id: section.id,
        label: section.label,
        categories: productCategories.filter((cat) => cat.section === section.id),
      })),
    [productCategories]
  )

  const q = query.trim().toLowerCase()
  const filteredSections = useMemo(() => {
    if (!q) return categoriesBySection
    return categoriesBySection
      .map((sec) => {
        const categories = sec.categories.filter((cat) => {
          const catMatch = cat.name.toLowerCase().includes(q)
          const subs = subcategoriesByCategoryId.get(cat.id) || []
          const subMatch = subs.some((s) => s.name.toLowerCase().includes(q))
          return catMatch || subMatch
        })
        return { ...sec, categories }
      })
      .filter((sec) => sec.categories.length > 0)
  }, [categoriesBySection, q, subcategoriesByCategoryId])

  const selectedCategories = useMemo(() => {
    const map = new Map(productCategories.map((c) => [c.id, c]))
    return selectedCategoryIds.map((id) => map.get(id)).filter(Boolean) as ProductCategory[]
  }, [productCategories, selectedCategoryIds])

  const selectedSubcategories = useMemo(() => {
    const map = new Map(productSubcategories.map((s) => [s.id, s]))
    return selectedSubcategoryIds.map((id) => map.get(id)).filter(Boolean) as ProductSubcategory[]
  }, [productSubcategories, selectedSubcategoryIds])

  const toggleSectionOpen = (id: string) => {
    setOpenSectionIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const clearAll = () => {
    setSelectedCategoryIds([])
    setSelectedSubcategoryIds([])
  }

  const selectAllSubcategoriesInSection = (sectionId: string) => {
    const sec = categoriesBySection.find((s) => s.id === sectionId)
    if (!sec) return
    const ids = sec.categories.map((c) => c.id)
    setSelectedCategoryIds((prev) => Array.from(new Set([...prev, ...ids])))
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
    <div className="min-h-screen bg-white pb-8">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="card overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-border-light/60 bg-gradient-to-br from-white to-bg-secondary">
            <h1 className="text-xl sm:text-2xl font-bold text-black">
              Чем вы торгуете
            </h1>
            <p className="text-gray-600 mt-1">
              Нажмите на пункт из списка — откроется каталог для выбора.
            </p>

            {error && (
              <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}
          </div>

          <div className="p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center mb-5">
              <div className="flex-1">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="input w-full"
                  placeholder="Поиск по подкатегориям и каталогам"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setOpenSectionIds(filteredSections.map((s) => s.id))}
                  className="btn btn-secondary"
                >
                  Развернуть
                </button>
                <button
                  type="button"
                  onClick={() => setOpenSectionIds([])}
                  className="btn btn-secondary"
                >
                  Свернуть
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {filteredSections.length === 0 ? (
                <div className="text-sm text-gray-500">Ничего не найдено.</div>
              ) : (
                filteredSections.map((section) => {
                  if (section.categories.length === 0) return null
                  const isOpen = openSectionIds.includes(section.id)
                  return (
                    <div
                      key={section.id}
                      className="border border-gray-200 rounded-2xl overflow-hidden"
                    >
                      <button
                        type="button"
                        onClick={() => toggleSectionOpen(section.id)}
                        className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100"
                      >
                        <span className="text-sm font-bold text-black">{section.label}</span>
                        <span className="text-gray-400">{isOpen ? '▾' : '▸'}</span>
                      </button>

                      {isOpen && (
                        <div className="bg-white border-t border-gray-100">
                          {section.categories.map((cat) => {
                            const catMatch = !q || cat.name.toLowerCase().includes(q)
                            const subs = subcategoriesByCategoryId.get(cat.id) || []
                            const subMatch = !q || subs.some((s) => s.name.toLowerCase().includes(q))
                            if (q && !catMatch && !subMatch) return null

                            const hasSelected = subs.some((s) => selectedSubcategoryIds.includes(s.id))
                            return (
                              <button
                                key={cat.id}
                                type="button"
                                onClick={() => setModalCategory(cat)}
                                className={[
                                  'w-full px-4 py-3 text-left flex items-center justify-between border-b border-gray-50 last:border-0',
                                  'hover:bg-gray-50 transition-colors',
                                  hasSelected ? 'bg-indigo-50/50' : 'bg-white',
                                ].join(' ')}
                              >
                                <span className="text-sm text-gray-800 truncate">{cat.name}</span>
                                <span className="text-gray-400 shrink-0 ml-2">
                                  {subs.filter((s) => selectedSubcategoryIds.includes(s.id)).length}
                                  {subs.length > 0 ? ` / ${subs.length}` : ''} →
                                </span>
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Модальное окно каталога */}
      {modalCategory && (
        <div
          className="fixed inset-0 z-[9999] bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setModalCategory(null)}
          role="presentation"
        >
          <div
            className="bg-white w-full max-h-[85vh] flex flex-col rounded-t-2xl sm:rounded-2xl shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 shrink-0">
              <h2 className="text-lg font-bold text-black truncate pr-2">{modalCategory.name}</h2>
              <button
                type="button"
                onClick={() => setModalCategory(null)}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                aria-label="Закрыть"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <p className="text-sm text-gray-500 mb-3">Выберите пункты каталога:</p>
              <div className="flex flex-wrap gap-2">
                {(subcategoriesByCategoryId.get(modalCategory.id) || []).map((s) => {
                  const selected = selectedSubcategoryIds.includes(s.id)
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggleSubcategory(s.id)}
                      className={[
                        'px-3 py-2 rounded-full text-sm border transition-colors whitespace-nowrap overflow-hidden max-w-full',
                        selected
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : 'bg-white border-gray-200 text-gray-800 hover:bg-gray-50',
                      ].join(' ')}
                    >
                      <span className="block truncate">{s.name}</span>
                    </button>
                  )
                })}
              </div>
              {(subcategoriesByCategoryId.get(modalCategory.id) || []).length === 0 && (
                <p className="text-sm text-gray-500">В этом разделе пока нет пунктов каталога.</p>
              )}
            </div>
            <div className="p-4 border-t border-gray-200 shrink-0">
              <button
                type="button"
                onClick={() => setModalCategory(null)}
                className="btn btn-primary w-full"
              >
                Готово
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Список выбранного — в потоке страницы, прокручивается вместе с контентом */}
      <div className="max-w-4xl mx-auto px-4 mt-6">
        <div className="card p-4">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-sm font-semibold text-black">Выбранное</span>
            {selectedSubcategories.length > 0 && (
              <button
                type="button"
                onClick={clearAll}
                className="text-xs font-semibold text-red-600 hover:underline"
              >
                Сбросить всё
              </button>
            )}
          </div>
          <div className="min-h-[44px] flex flex-wrap gap-2 items-center">
            {selectedSubcategories.length === 0 ? (
              <span className="text-sm text-gray-500">Пока ничего не выбрано</span>
            ) : (
              selectedSubcategories.map((s) => (
                <button
                  key={`chip-sub-${s.id}`}
                  type="button"
                  onClick={() => toggleSubcategory(s.id)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200 hover:bg-gray-200 truncate max-w-[200px]"
                  title="Убрать"
                >
                  {s.name} ×
                </button>
              ))
            )}
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.push('/products')}
            className="btn btn-secondary"
          >
            Назад
          </button>
          <div className="flex-1" />
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !canSave}
            className="btn btn-primary"
          >
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  )
}
