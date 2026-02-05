'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/app/providers'
import { supabase } from '@/lib/supabase'
import { logAdminAction } from '@/lib/admin'
import { FiImage, FiSave, FiUpload } from 'react-icons/fi'

interface MasterCategoryRow {
  id: string
  name: string
  slug: string
  image_url?: string | null
}

interface SubcategoryRow {
  id: string
  name: string
  slug: string
  category_id: string
  image_url?: string | null
}

interface CategoryRow {
  id: string
  name: string
  slug: string
  section: string
  image_url?: string | null
}

export default function AdminImagesPage() {
  const { user: currentUser } = useAuth()
  const [masterCategories, setMasterCategories] = useState<MasterCategoryRow[]>([])
  const [subcategories, setSubcategories] = useState<SubcategoryRow[]>([])
  const [categories, setCategories] = useState<CategoryRow[]>([])
  const [loadingMasterCats, setLoadingMasterCats] = useState(true)
  const [loadingSubs, setLoadingSubs] = useState(true)
  const [loadingCats, setLoadingCats] = useState(true)
  const [masterCatError, setMasterCatError] = useState<string | null>(null)
  const [subError, setSubError] = useState<string | null>(null)
  const [catError, setCatError] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const [editMasterCatUrl, setEditMasterCatUrl] = useState<Record<string, string>>({})
  const [editSubUrl, setEditSubUrl] = useState<Record<string, string>>({})
  const [editCatUrl, setEditCatUrl] = useState<Record<string, string>>({})

  useEffect(() => {
    if (currentUser) logAdminAction(currentUser.id, 'view_images', 'images')
  }, [currentUser])

  useEffect(() => {
    const load = async () => {
      setLoadingMasterCats(true)
      setMasterCatError(null)
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('id, name, slug, image_url')
          .order('sort_order', { ascending: true })
          .order('name', { ascending: true })
        if (error) throw error
        setMasterCategories((data || []) as MasterCategoryRow[])
        const urls: Record<string, string> = {}
        ;(data || []).forEach((r: any) => { if (r.image_url) urls[r.id] = r.image_url })
        setEditMasterCatUrl(urls)
      } catch (e: any) {
        setMasterCatError(e?.message || 'Ошибка загрузки')
        setMasterCategories([])
      } finally {
        setLoadingMasterCats(false)
      }
    }
    load()
  }, [])

  useEffect(() => {
    const load = async () => {
      setLoadingSubs(true)
      setSubError(null)
      try {
        const { data, error } = await supabase
          .from('subcategories')
          .select('id, name, slug, category_id, image_url')
          .order('sort_order', { ascending: true })
          .order('name', { ascending: true })
        if (error) throw error
        setSubcategories((data || []) as SubcategoryRow[])
        const urls: Record<string, string> = {}
        ;(data || []).forEach((r: any) => { if (r.image_url) urls[r.id] = r.image_url })
        setEditSubUrl(urls)
      } catch (e: any) {
        setSubError(e?.message || 'Ошибка загрузки')
        setSubcategories([])
      } finally {
        setLoadingSubs(false)
      }
    }
    load()
  }, [])

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    setLoadingCats(true)
    setCatError(null)
    try {
      const { data, error } = await supabase
        .from('product_categories')
        .select('id, name, slug, section, image_url')
        .order('section', { ascending: true })
        .order('name', { ascending: true })
      if (error) throw error
      setCategories((data || []) as CategoryRow[])
      const urls: Record<string, string> = {}
      ;(data || []).forEach((r: any) => {
        urls[r.id] = r.image_url || ''
      })
      setEditCatUrl(urls)
    } catch (e: any) {
      if (e?.code === '42703') {
        setCatError('Колонка image_url отсутствует. Выполните миграцию supabase/add_product_category_image_url.sql в Supabase SQL Editor.')
        const { data: fallback } = await supabase
          .from('product_categories')
          .select('id, name, slug, section')
          .order('section', { ascending: true })
          .order('name', { ascending: true })
        setCategories((fallback || []) as CategoryRow[])
        setEditCatUrl({})
      } else {
        setCatError(e?.message || 'Ошибка загрузки')
        setCategories([])
      }
    } finally {
      setLoadingCats(false)
    }
  }

  const getSessionToken = async () => {
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token ?? null
  }

  const saveMasterCategoryImage = async (id: string, urlOverride?: string) => {
    const token = await getSessionToken()
    if (!token) { alert('Сессия не найдена. Войдите снова.'); return }
    const image_url = urlOverride ?? editMasterCatUrl[id] ?? null
    setSavingId(id)
    try {
      const res = await fetch(`/api/admin/master-categories/${id}/image`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ image_url: image_url || null }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Ошибка')
      setMasterCategories((prev) => prev.map((c) => (c.id === id ? { ...c, image_url: data.image_url ?? null } : c)))
      if (urlOverride) setEditMasterCatUrl((prev) => ({ ...prev, [id]: urlOverride }))
    } catch (e: any) {
      alert(e?.message || 'Не удалось сохранить')
    } finally {
      setSavingId(null)
    }
  }

  const saveSubcategoryImage = async (id: string, urlOverride?: string) => {
    const token = await getSessionToken()
    if (!token) { alert('Сессия не найдена. Войдите снова.'); return }
    const image_url = urlOverride ?? editSubUrl[id] ?? null
    setSavingId(id)
    try {
      const res = await fetch(`/api/admin/subcategories/${id}/image`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ image_url: image_url || null }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Ошибка')
      setSubcategories((prev) => prev.map((s) => (s.id === id ? { ...s, image_url: (data as { image_url?: string }).image_url ?? null } : s)))
      if (urlOverride) setEditSubUrl((prev) => ({ ...prev, [id]: urlOverride }))
    } catch (e: any) {
      alert(e?.message || 'Не удалось сохранить')
    } finally {
      setSavingId(null)
    }
  }

  const uploadFile = async (file: File, type: 'master_category' | 'subcategory' | 'category'): Promise<string> => {
    const token = await getSessionToken()
    if (!token) throw new Error('Сессия не найдена')
    const form = new FormData()
    form.append('file', file)
    form.append('type', type)
    const res = await fetch('/api/admin/upload-image', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data?.error || 'Ошибка загрузки')
    if (!data?.url) throw new Error('Нет URL в ответе')
    return data.url
  }

  const handleMasterCatFile = async (id: string, file: File | null) => {
    if (!file) return
    setUploadingId(id)
    try {
      const url = await uploadFile(file, 'master_category')
      await saveMasterCategoryImage(id, url)
    } catch (e: any) {
      alert(e?.message || 'Не удалось загрузить')
    } finally {
      setUploadingId(null)
    }
  }

  const handleSubFile = async (id: string, file: File | null) => {
    if (!file) return
    setUploadingId(id)
    try {
      const url = await uploadFile(file, 'subcategory')
      await saveSubcategoryImage(id, url)
    } catch (e: any) {
      alert(e?.message || 'Не удалось загрузить')
    } finally {
      setUploadingId(null)
    }
  }

  const handleCatFile = async (id: string, file: File | null) => {
    if (!file) return
    setUploadingId(id)
    try {
      const url = await uploadFile(file, 'category')
      await saveCategoryImage(id, url)
    } catch (e: any) {
      alert(e?.message || 'Не удалось загрузить')
    } finally {
      setUploadingId(null)
    }
  }

  const saveCategoryImage = async (id: string, urlOverride?: string) => {
    const token = await getSessionToken()
    if (!token) {
      alert('Сессия не найдена. Войдите снова.')
      return
    }
    const image_url = urlOverride ?? editCatUrl[id] ?? null
    setSavingId(id)
    try {
      const res = await fetch(`/api/admin/categories/${id}/image`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ image_url: image_url || null }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Ошибка')
      setCategories((prev) =>
        prev.map((c) => (c.id === id ? { ...c, image_url: (data as { image_url?: string }).image_url ?? null } : c))
      )
      if (urlOverride) setEditCatUrl((prev) => ({ ...prev, [id]: urlOverride }))
    } catch (e: any) {
      alert(e?.message || 'Не удалось сохранить')
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-semibold text-graphite-secondary mb-2">Картинки для скролла и фильтра</h1>
      <p className="text-sm text-text-secondary mb-6">
        Картинки для категорий и подкатегорий мастеров (блок «Готовы помочь», фильтр поиска мастеров) и для категорий товаров (фильтр на странице «Товары»). Рекомендуемый размер: 140×140 для категорий мастеров, 96×96 для подкатегорий и категорий товаров.
      </p>
      <div className="mb-6 p-4 bg-bg-secondary rounded-lg text-sm text-text-secondary">
        <strong className="text-graphite-secondary">Как добавить картинку:</strong>
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li><strong>Проще всего:</strong> нажмите «Загрузить файл» у нужной строки и выберите картинку с компьютера (JPG, PNG, WebP или GIF, до 2 МБ). Она загрузится в Supabase и сохранится автоматически.</li>
          <li>Либо вставьте готовый URL в поле и нажмите «Сохранить».</li>
        </ul>
        <p className="mt-2 text-xs text-text-muted">Если кнопка загрузки выдаёт ошибку, создайте в Supabase Storage публичный bucket «admin-images» (см. supabase/admin_images_storage_setup.sql).</p>
      </div>

      {/* Категории мастеров */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-graphite-secondary mb-4 flex items-center gap-2">
          <FiImage size={20} />
          Категории мастеров (скролл «Готовы помочь»)
        </h2>
        {masterCatError && (
          <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
            {masterCatError}
          </div>
        )}
        {loadingMasterCats ? (
          <div className="text-text-secondary">Загрузка...</div>
        ) : (
          <div className="space-y-3">
            {masterCategories.map((c) => (
              <div
                key={c.id}
                className="flex flex-wrap items-center gap-4 p-4 border border-border-light rounded-lg bg-bg-card"
              >
                <div className="w-[72px] h-[72px] rounded-lg overflow-hidden bg-bg-secondary flex-shrink-0">
                  {editMasterCatUrl[c.id] || c.image_url ? (
                    <img
                      src={editMasterCatUrl[c.id] || c.image_url || ''}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-text-muted text-xs">Нет</div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-graphite-secondary truncate">{c.name}</div>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={editMasterCatUrl[c.id] ?? ''}
                    onChange={(e) => setEditMasterCatUrl((prev) => ({ ...prev, [c.id]: e.target.value }))}
                    className="input mt-1 w-full text-sm h-9"
                  />
                </div>
                <label className="btn btn-outline text-sm flex items-center gap-2 cursor-pointer">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="sr-only"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) handleMasterCatFile(c.id, f)
                      e.target.value = ''
                    }}
                    disabled={!!uploadingId}
                  />
                  <FiUpload size={14} />
                  {uploadingId === c.id ? 'Загрузка...' : 'Загрузить файл'}
                </label>
                <button
                  type="button"
                  onClick={() => saveMasterCategoryImage(c.id)}
                  disabled={savingId === c.id}
                  className="btn btn-primary text-sm flex items-center gap-2"
                >
                  <FiSave size={14} />
                  {savingId === c.id ? 'Сохранение...' : 'Сохранить'}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Подкатегории мастеров */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-graphite-secondary mb-4 flex items-center gap-2">
          <FiImage size={20} />
          Подкатегории мастеров (фильтр поиска)
        </h2>
        {subError && (
          <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
            {subError}
          </div>
        )}
        {loadingSubs ? (
          <div className="text-text-secondary">Загрузка...</div>
        ) : (
          <div className="space-y-3">
            {subcategories.map((s) => (
              <div
                key={s.id}
                className="flex flex-wrap items-center gap-4 p-4 border border-border-light rounded-lg bg-bg-card"
              >
                <div className="w-[56px] h-[56px] rounded-lg overflow-hidden bg-bg-secondary flex-shrink-0">
                  {editSubUrl[s.id] || s.image_url ? (
                    <img
                      src={editSubUrl[s.id] || s.image_url || ''}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-text-muted text-xs">Нет</div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-graphite-secondary truncate">{s.name}</div>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={editSubUrl[s.id] ?? ''}
                    onChange={(e) => setEditSubUrl((prev) => ({ ...prev, [s.id]: e.target.value }))}
                    className="input mt-1 w-full text-sm h-9"
                  />
                </div>
                <label className="btn btn-outline text-sm flex items-center gap-2 cursor-pointer">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="sr-only"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) handleSubFile(s.id, f)
                      e.target.value = ''
                    }}
                    disabled={!!uploadingId}
                  />
                  <FiUpload size={14} />
                  {uploadingId === s.id ? 'Загрузка...' : 'Загрузить файл'}
                </label>
                <button
                  type="button"
                  onClick={() => saveSubcategoryImage(s.id)}
                  disabled={savingId === s.id}
                  className="btn btn-primary text-sm flex items-center gap-2"
                >
                  <FiSave size={14} />
                  {savingId === s.id ? 'Сохранение...' : 'Сохранить'}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Категории товаров */}
      <section>
        <h2 className="text-lg font-semibold text-graphite-secondary mb-4 flex items-center gap-2">
          <FiImage size={20} />
          Категории товаров (фильтр)
        </h2>
        {catError && (
          <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
            {catError}
          </div>
        )}
        {loadingCats ? (
          <div className="text-text-secondary">Загрузка...</div>
        ) : (
          <div className="space-y-3">
            {categories.map((c) => (
              <div
                key={c.id}
                className="flex flex-wrap items-center gap-4 p-4 border border-border-light rounded-lg bg-bg-card"
              >
                <div className="w-[56px] h-[56px] rounded-lg overflow-hidden bg-bg-secondary flex-shrink-0">
                  {editCatUrl[c.id] || c.image_url ? (
                    <img
                      src={editCatUrl[c.id] || c.image_url || ''}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none'
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-text-muted text-xs">Нет</div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-graphite-secondary truncate">{c.name}</div>
                  <div className="text-xs text-text-muted">{c.section}</div>
                  <input
                    type="url"
                    placeholder="https://... или загрузите файл"
                    value={editCatUrl[c.id] ?? ''}
                    onChange={(e) => setEditCatUrl((prev) => ({ ...prev, [c.id]: e.target.value }))}
                    className="input mt-1 w-full text-sm h-9"
                  />
                </div>
                <label className="btn btn-outline text-sm flex items-center gap-2 cursor-pointer">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="sr-only"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) handleCatFile(c.id, f)
                      e.target.value = ''
                    }}
                    disabled={!!uploadingId}
                  />
                  <FiUpload size={14} />
                  {uploadingId === c.id ? 'Загрузка...' : 'Загрузить файл'}
                </label>
                <button
                  type="button"
                  onClick={() => saveCategoryImage(c.id)}
                  disabled={savingId === c.id}
                  className="btn btn-primary text-sm flex items-center gap-2"
                >
                  <FiSave size={14} />
                  {savingId === c.id ? 'Сохранение...' : 'Сохранить'}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
