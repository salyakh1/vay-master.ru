'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '../../providers'
import { supabase, AdBanner } from '@/lib/supabase'
import { logAdminAction } from '@/lib/admin'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { FiPlus, FiEdit, FiTrash2, FiEye, FiEyeOff, FiCopy, FiImage } from 'react-icons/fi'
import AdminBannerCreateWizard from '@/components/admin/AdminBannerCreateWizard'
import { UNIFIED_BANNER } from '@/components/CompactPageBanner'

const PRICING_MODELS = [
  { value: 'fixed', label: 'Фиксированная цена' },
  { value: 'cpc', label: 'За клик (CPC)' },
  { value: 'cpa', label: 'За действие (CPA)' },
]

const TARGET_TYPES = [
  { value: 'master', label: 'Мастер' },
  { value: 'product', label: 'Товар' },
  { value: 'category', label: 'Категория' },
  { value: 'order', label: 'Заказ' },
  { value: 'external_url', label: 'Внешний URL' },
  { value: null, label: 'Нет перехода' },
]

const PAGES = [
  { value: 'home', label: 'Главная' },
  { value: 'search', label: 'Поиск мастеров' },
  { value: 'orders', label: 'Заказы' },
  { value: 'products', label: 'Каталог товаров' },
  { value: 'feed', label: 'Лента' },
]

function bannerFormatLabel(banner: AdBanner): string {
  if (banner.ad_type && banner.ad_type !== 'HERO_SPONSORED') {
    return `Устаревший (${banner.ad_type})`
  }
  if (banner.show_title === false && banner.show_description === false) {
    return 'Картинка + ссылка'
  }
  return 'Конструктор (формат A)'
}

export default function AdminBannersPage() {
  const { user: currentUser } = useAuth()
  const [banners, setBanners] = useState<AdBanner[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBanner, setSelectedBanner] = useState<AdBanner | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showCreateWizard, setShowCreateWizard] = useState(false)
  const [editingBanner, setEditingBanner] = useState<Partial<AdBanner> | null>(null)

  useEffect(() => {
    fetchBanners()
    if (currentUser) {
      logAdminAction(currentUser.id, 'view_banners', 'banners')
    }
  }, [currentUser])

  const fetchBanners = async () => {
    try {
      setLoading(true)
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (token) {
        const res = await fetch('/api/admin/banners', {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        })
        if (res.ok) {
          const body = await res.json()
          setBanners((body.banners || []) as AdBanner[])
          return
        }
      }
      // Fallback: прямой select (может отличаться из‑за RLS)
      const { data, error } = await supabase
        .from('ad_banners')
        .select('*')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) throw error
      setBanners((data || []) as AdBanner[])
    } catch (error) {
      console.error('Error fetching banners:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeactivateAllActive = async () => {
    if (!currentUser) return
    if (
      !confirm(
        'Выключить ВСЕ активные баннеры в базе? Они пропадут у пользователей. Удалёнными не станут — только is_active=false.'
      )
    ) {
      return
    }
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) {
        alert('Сессия истекла')
        return
      }
      const res = await fetch('/api/admin/banners', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'deactivate_all_active' }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body?.error || 'Ошибка')
      alert(`Выключено баннеров: ${body.deactivated ?? 0}. Обновите сайт (Ctrl+F5).`)
      fetchBanners()
    } catch (e: any) {
      alert(e?.message || 'Ошибка')
    }
  }

  const handleCreateBanner = () => {
    setShowCreateWizard(true)
  }

  const openFullConstructor = (overrides?: Partial<AdBanner>) => {
    setShowCreateWizard(false)
    setEditingBanner({
      title: '',
      description: '',
      image_url: '',
      type: 'image_text',
      target_type: null,
      pages: ['home', 'search'],
      priority: 0,
      duration: 5,
      is_active: true,
      category: [],
      keywords: [],
      regions: ['ALL'],
      pricing_model: 'fixed',
      show_badge: true,
      badge_text: 'АКЦИЯ',
      brand_name: 'Смотреть',
      show_title: true,
      show_description: true,
      ...overrides,
      // Новый формат всегда поверх overrides
      ad_type: 'HERO_SPONSORED',
      hero_layout: 'full_image',
    })
    setShowCreateModal(true)
  }

  const handleEditBanner = (banner: AdBanner) => {
    setEditingBanner({
      ...banner,
      ad_type: 'HERO_SPONSORED',
      hero_layout: 'full_image',
    })
    setShowCreateModal(true)
  }

  const handleDeactivateLegacyFormats = async () => {
    if (!currentUser) return
    if (
      !confirm(
        'Выключить все баннеры старых типов (Inline / Sponsored Card / Profile / Footer)? Новые форматы не трогаем.'
      )
    ) {
      return
    }
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) {
        alert('Сессия истекла')
        return
      }
      const res = await fetch('/api/admin/banners', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'deactivate_legacy_formats' }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body?.error || 'Ошибка')
      alert(`Выключено устаревших баннеров: ${body.deactivated ?? 0}`)
      fetchBanners()
    } catch (e: any) {
      alert(e?.message || 'Ошибка')
    }
  }

  const handleDuplicateBanner = async (banner: AdBanner) => {
    if (!currentUser) return

    try {
      const { data, error } = await supabase
        .from('ad_banners')
        .insert({
          ...banner,
          id: undefined,
          title: `${banner.title} (копия)`,
          created_at: undefined,
          updated_at: undefined,
          created_by: currentUser.id,
        })
        .select()
        .single()

      if (error) throw error

      await logAdminAction(currentUser.id, 'duplicate_banner', 'banner', data.id)
      alert('Баннер скопирован')
      fetchBanners()
    } catch (error) {
      console.error('Error duplicating banner:', error)
      alert('Ошибка при копировании баннера')
    }
  }

  const handleDeleteBanner = async (bannerId: string) => {
    if (!currentUser) return
    if (!confirm('Вы уверены, что хотите удалить этот баннер?')) return

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) {
        alert('Сессия истекла — войдите снова')
        return
      }

      // Удаление через service_role API + revalidate страниц (прямой delete часто «тихо» не срабатывает из‑за RLS)
      const res = await fetch(`/api/admin/banners/${bannerId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(body?.error || `Ошибка удаления (${res.status})`)
      }

      await logAdminAction(currentUser.id, 'delete_banner', 'banner', bannerId)
      alert('Баннер удалён. Обновите сайт пользователя (лучше Ctrl+F5).')
      fetchBanners()
      if (selectedBanner?.id === bannerId) {
        setSelectedBanner(null)
      }
    } catch (error: any) {
      console.error('Error deleting banner:', error)
      alert(error?.message || 'Ошибка при удалении баннера')
    }
  }

  const handleToggleBanner = async (bannerId: string, isActive: boolean) => {
    if (!currentUser) return

    try {
      await supabase
        .from('ad_banners')
        .update({ is_active: !isActive })
        .eq('id', bannerId)

      await logAdminAction(currentUser.id, isActive ? 'disable_banner' : 'enable_banner', 'banner', bannerId)
      fetchBanners()
    } catch (error) {
      console.error('Error toggling banner:', error)
      alert('Ошибка при изменении статуса')
    }
  }

  const saveBannerData = async (source: Partial<AdBanner>) => {
    if (!currentUser) {
      alert('Сессия истекла — войдите снова')
      throw new Error('auth')
    }

    if (!source.image_url || !source.pages || source.pages.length === 0) {
      alert('Нужны картинка и хотя бы одна страница показа')
      throw new Error('validation')
    }

    // Создание (быстрый режим и конструктор) — через service_role, иначе RLS часто глотает insert
    if (!source.id) {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) {
        alert('Сессия истекла — войдите снова')
        throw new Error('auth')
      }

      const res = await fetch('/api/admin/banners', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'create',
          banner: {
            ...source,
            title: source.title || 'Баннер',
            // Явно: false для «картинка+ссылка», true для конструктора
            show_title: source.show_title === true,
            show_description: source.show_description === true,
          },
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(body?.error || `Ошибка создания (${res.status})`)
      }

      await logAdminAction(currentUser.id, 'create_banner', 'banner', body.banner?.id)
      alert(source.is_active === false ? 'Черновик сохранён' : 'Баннер опубликован')
      setShowCreateModal(false)
      setShowCreateWizard(false)
      setEditingBanner(null)
      fetchBanners()
      return
    }

      // Обновление — тоже нормализуем в новый формат
      const isConstructor = source.show_title === true || source.show_description === true
      const bannerData: any = {
      title: source.title || 'Баннер',
      description: source.description ?? '',
      image_url: source.image_url,
      type: isConstructor ? 'image_text' : 'image',
      ad_type: 'HERO_SPONSORED',
      target_type: source.target_type ?? null,
      target_id: source.target_id || null,
      external_url: source.external_url || null,
      pages: source.pages,
      priority: source.priority || 0,
      duration: source.duration || 5,
      is_active: source.is_active ?? true,
      hero_layout: 'full_image',
      category: source.category || [],
      keywords: source.keywords || [],
      regions: source.regions || ['ALL'],
      brand_name: source.brand_name ?? '',
      pricing_model: source.pricing_model || 'fixed',
      show_badge: source.show_badge ?? true,
      badge_text: (source.badge_text ?? '').trim() || (isConstructor ? 'АКЦИЯ' : 'Реклама'),
      show_title: source.show_title === true,
      show_description: source.show_description === true,
    }

    Object.keys(bannerData).forEach((key) => {
      if (bannerData[key] === undefined) delete bannerData[key]
    })

    const { error } = await supabase.from('ad_banners').update(bannerData).eq('id', source.id)
    if (error) throw error
    await logAdminAction(currentUser.id, 'update_banner', 'banner', source.id)
    alert('Баннер обновлен')

    setShowCreateModal(false)
    setShowCreateWizard(false)
    setEditingBanner(null)
    fetchBanners()
  }

  const handleSaveBanner = async () => {
    if (!editingBanner) return
    try {
      // В конструкторе по умолчанию показываем тексты, если галочки не сняты
      await saveBannerData({
        ...editingBanner,
        show_title: editingBanner.show_title !== false,
        show_description: editingBanner.show_description !== false,
      })
    } catch (error: any) {
      if (error?.message === 'validation' || error?.message === 'auth') return
      console.error('Error saving banner:', error)
      alert(error?.message || 'Ошибка при сохранении баннера')
    }
  }

  const uploadBannerImage = async (file: File): Promise<string> => {
    if (!currentUser) throw new Error('Не авторизован')

    const fileExt = file.name.split('.').pop()
    const fileName = `banners/${currentUser.id}/${Date.now()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('banner-images')
      .upload(fileName, file, { upsert: false })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      if (uploadError.message.includes('Bucket not found') || uploadError.message.includes('not found')) {
        throw new Error('Bucket "banner-images" не найден. Используйте URL или настройте Storage.')
      }
      if (uploadError.message.includes('new row violates row-level security policy')) {
        throw new Error('Нет прав для загрузки изображений (RLS).')
      }
      throw new Error(uploadError.message || 'Ошибка загрузки')
    }

    const { data: urlData } = supabase.storage.from('banner-images').getPublicUrl(fileName)
    if (!urlData?.publicUrl) throw new Error('Не удалось получить URL')
    return urlData.publicUrl
  }

  const handleImageUpload = async (file: File) => {
    if (!currentUser || !editingBanner) return
    try {
      const publicUrl = await uploadBannerImage(file)
      setEditingBanner({ ...editingBanner, image_url: publicUrl })
      alert('Изображение успешно загружено')
    } catch (error: any) {
      console.error('Error uploading image:', error)
      alert(`Ошибка при загрузке изображения: ${error.message || 'Неизвестная ошибка'}`)
    }
  }

  if (loading) {
    return <div className="text-text-secondary">Загрузка...</div>
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-text-primary mb-2">Баннеры</h1>
            <p className="text-text-secondary">Управление рекламными баннерами</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleDeactivateLegacyFormats}
              className="btn btn-outline text-sm text-orange-700 border-orange-300"
            >
              Выключить старые форматы
            </button>
            <button
              type="button"
              onClick={handleDeactivateAllActive}
              className="btn btn-outline text-sm text-orange-700 border-orange-300"
            >
              Выключить все активные
            </button>
            <button onClick={handleCreateBanner} className="btn btn-primary">
              <FiPlus className="mr-2" size={18} />
              Создать баннер
            </button>
          </div>
        </div>
        <p className="text-xs text-text-secondary">
          Только новые форматы: <strong>Картинка + ссылка</strong> и <strong>Конструктор (формат A)</strong>,
          размер {UNIFIED_BANNER.designWidth}×{UNIFIED_BANNER.designHeight}.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="text-sm text-text-secondary">Всего</div>
          <div className="text-2xl font-bold text-text-primary">{banners.length}</div>
        </div>
        <div className="card">
          <div className="text-sm text-text-secondary">Активных</div>
          <div className="text-2xl font-bold text-green-600">
            {banners.filter((b) => b.is_active).length}
          </div>
        </div>
        <div className="card">
          <div className="text-sm text-text-secondary">Просмотры</div>
          <div className="text-2xl font-bold text-text-primary">
            {banners.reduce((sum, b) => sum + b.views, 0)}
          </div>
        </div>
        <div className="card">
          <div className="text-sm text-text-secondary">Клики</div>
          <div className="text-2xl font-bold text-text-primary">
            {banners.reduce((sum, b) => sum + b.clicks, 0)}
          </div>
        </div>
      </div>

      {/* Banners List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          {banners.map((banner) => (
            <div
              key={banner.id}
              onClick={() => setSelectedBanner(banner)}
              className={`card cursor-pointer transition-colors ${
                selectedBanner?.id === banner.id ? 'border-brand-accent border-2' : 'hover:shadow-lg'
              }`}
            >
              <div className="flex gap-4">
                <div className="w-32 h-20 bg-bg-secondary rounded overflow-hidden flex-shrink-0">
                  <img src={banner.image_url} alt={banner.title} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-text-primary truncate">{banner.title}</h3>
                    {banner.is_active ? (
                      <FiEye className="text-green-500 flex-shrink-0" size={18} title="Активен" />
                    ) : (
                      <FiEyeOff className="text-gray-400 flex-shrink-0" size={18} title="Неактивен" />
                    )}
                  </div>
                  <div className="text-sm text-text-secondary mb-2">
                    <div className="mb-1">
                      <span className="font-medium">Формат:</span> {bannerFormatLabel(banner)}
                    </div>
                    {!banner.is_active && (
                      <div className="text-orange-600 text-xs">Черновик / выключен</div>
                    )}
                  </div>
                  {banner.brand_name && (
                    <div className="text-sm text-text-secondary mb-2">
                      <span className="font-medium">Кнопка:</span> {banner.brand_name}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-1 mb-2">
                    {banner.pages.map((page) => (
                      <span key={page} className="text-xs px-2 py-0.5 bg-bg-secondary rounded">
                        {PAGES.find((p) => p.value === page)?.label || page}
                      </span>
                    ))}
                  </div>
                  {(banner.category?.length || banner.keywords?.length || banner.regions?.length) && (
                    <div className="flex flex-wrap gap-1 mb-2 text-xs">
                      {banner.category && banner.category.length > 0 && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded">
                          Категории: {banner.category.join(', ')}
                        </span>
                      )}
                      {banner.keywords && banner.keywords.length > 0 && (
                        <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded">
                          Ключевые слова: {banner.keywords.join(', ')}
                        </span>
                      )}
                      {banner.regions && banner.regions.length > 0 && !banner.regions.includes('ALL') && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded">
                          Регионы: {banner.regions.join(', ')}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="flex items-center gap-4 text-xs text-text-secondary">
                    <span>Приоритет: {banner.priority}</span>
                    <span>Просмотры: {banner.views}</span>
                    <span>Клики: {banner.clicks}</span>
                    {banner.impression_limit && (
                      <span className="text-orange-600">
                        Лимит показов: {banner.current_impressions || 0}/{banner.impression_limit}
                      </span>
                    )}
                    {banner.click_limit && (
                      <span className="text-orange-600">
                        Лимит кликов: {banner.current_clicks || 0}/{banner.click_limit}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Banner Details */}
        {selectedBanner && (
          <div className="card">
            <h2 className="text-lg font-semibold text-text-primary mb-4">Детали баннера</h2>
            <div className="space-y-4">
              <div>
                <img src={selectedBanner.image_url} alt={selectedBanner.title} className="w-full rounded" />
              </div>
              <div>
                <div className="text-sm text-text-secondary mb-1">Название</div>
                <div className="font-medium text-text-primary">{selectedBanner.title}</div>
              </div>
              {selectedBanner.description && (
                <div>
                  <div className="text-sm text-text-secondary mb-1">Описание</div>
                  <div className="text-sm text-text-primary">{selectedBanner.description}</div>
                </div>
              )}
              <div>
                <div className="text-sm text-text-secondary mb-1">Формат</div>
                <div className="font-medium text-text-primary">{bannerFormatLabel(selectedBanner)}</div>
              </div>
              {selectedBanner.brand_name && (
                <div>
                  <div className="text-sm text-text-secondary mb-1">Текст кнопки</div>
                  <div className="font-medium text-text-primary">{selectedBanner.brand_name}</div>
                </div>
              )}
              <div>
                <div className="text-sm text-text-secondary mb-1">Страницы показа</div>
                <div className="flex flex-wrap gap-1">
                  {selectedBanner.pages.map((page) => (
                    <span key={page} className="text-xs px-2 py-1 bg-bg-secondary rounded">
                      {PAGES.find((p) => p.value === page)?.label || page}
                    </span>
                  ))}
                </div>
              </div>
              {(selectedBanner.category?.length || selectedBanner.keywords?.length || selectedBanner.regions?.length) && (
                <div>
                  <div className="text-sm text-text-secondary mb-1">Контекстная реклама</div>
                  <div className="space-y-2">
                    {selectedBanner.category && selectedBanner.category.length > 0 && (
                      <div>
                        <span className="text-xs text-text-secondary">Категории: </span>
                        <span className="text-xs text-text-primary">{selectedBanner.category.join(', ')}</span>
                      </div>
                    )}
                    {selectedBanner.keywords && selectedBanner.keywords.length > 0 && (
                      <div>
                        <span className="text-xs text-text-secondary">Ключевые слова: </span>
                        <span className="text-xs text-text-primary">{selectedBanner.keywords.join(', ')}</span>
                      </div>
                    )}
                    {selectedBanner.regions && selectedBanner.regions.length > 0 && (
                      <div>
                        <span className="text-xs text-text-secondary">Регионы: </span>
                        <span className="text-xs text-text-primary">
                          {selectedBanner.regions.includes('ALL') ? 'Все регионы' : selectedBanner.regions.join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {selectedBanner.pricing_model && (
                <div>
                  <div className="text-sm text-text-secondary mb-1">Монетизация</div>
                  <div className="text-sm text-text-primary">
                    Модель: {PRICING_MODELS.find((m) => m.value === selectedBanner.pricing_model)?.label || selectedBanner.pricing_model}
                    {selectedBanner.pricing_model === 'cpc' && selectedBanner.price_per_click && (
                      <div>Цена за клик: {selectedBanner.price_per_click} ₽</div>
                    )}
                    {selectedBanner.pricing_model === 'cpa' && selectedBanner.price_per_action && (
                      <div>Цена за действие: {selectedBanner.price_per_action} ₽</div>
                    )}
                    {selectedBanner.pricing_model === 'fixed' && selectedBanner.fixed_price && (
                      <div>Фиксированная цена: {selectedBanner.fixed_price} ₽</div>
                    )}
                  </div>
                </div>
              )}
              <div>
                <div className="text-sm text-text-secondary mb-1">Статистика</div>
                <div className="text-sm text-text-primary space-y-1">
                  <div>Просмотры: {selectedBanner.views}</div>
                  <div>Клики: {selectedBanner.clicks}</div>
                  {selectedBanner.clicks > 0 && selectedBanner.views > 0 && (
                    <div>
                      CTR: {((selectedBanner.clicks / selectedBanner.views) * 100).toFixed(2)}%
                    </div>
                  )}
                  {selectedBanner.impression_limit && (
                    <div className="text-orange-600">
                      Лимит показов: {selectedBanner.current_impressions || 0} / {selectedBanner.impression_limit}
                    </div>
                  )}
                  {selectedBanner.click_limit && (
                    <div className="text-orange-600">
                      Лимит кликов: {selectedBanner.current_clicks || 0} / {selectedBanner.click_limit}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-border-color space-y-2">
                <button
                  onClick={() => handleEditBanner(selectedBanner)}
                  className="w-full btn btn-outline text-sm"
                >
                  <FiEdit className="inline mr-2" size={16} />
                  Редактировать
                </button>
                <button
                  onClick={() => handleDuplicateBanner(selectedBanner)}
                  className="w-full btn btn-outline text-sm"
                >
                  <FiCopy className="inline mr-2" size={16} />
                  Дублировать
                </button>
                <button
                  onClick={() => handleToggleBanner(selectedBanner.id, selectedBanner.is_active)}
                  className={`w-full btn btn-outline text-sm ${
                    selectedBanner.is_active ? 'text-yellow-600' : 'text-green-600'
                  }`}
                >
                  {selectedBanner.is_active ? (
                    <>
                      <FiEyeOff className="inline mr-2" size={16} />
                      Отключить
                    </>
                  ) : (
                    <>
                      <FiEye className="inline mr-2" size={16} />
                      Включить
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleDeleteBanner(selectedBanner.id)}
                  className="w-full btn btn-outline text-sm text-red-600 border-red-600 hover:bg-red-600 hover:text-white"
                >
                  <FiTrash2 className="inline mr-2" size={16} />
                  Удалить
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Wizard: быстрый / конструктор */}
      {showCreateWizard && (
        <AdminBannerCreateWizard
          onClose={() => setShowCreateWizard(false)}
          onOpenFullConstructor={() => openFullConstructor()}
          uploadImage={uploadBannerImage}
          onPublish={async (banner) => {
            try {
              await saveBannerData(banner)
            } catch (e: any) {
              if (e?.message === 'validation' || e?.message === 'auth') return
              alert(e?.message || 'Не удалось опубликовать баннер')
              throw e
            }
          }}
        />
      )}

      {/* Create/Edit Modal */}
      {showCreateModal && editingBanner && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-bg-primary rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-text-primary mb-4">
                {editingBanner.id ? 'Редактировать баннер' : 'Создать баннер'}
              </h2>

              <div className="space-y-4">
                {/* Подсказка формата A + живое превью */}
                <div className="rounded-xl border border-[#e5e5ea] bg-[#f2f2f7] p-4 space-y-3">
                  <div>
                    <p className="text-sm font-semibold text-[#1c1c1e]">Общий баннер — формат A</p>
                    <p className="text-xs text-[#8e8e93] mt-1 leading-relaxed">
                      Фото на весь блок · без затемнения · метка, заголовок и кнопка справа. Размер:{' '}
                      <strong>
                        {UNIFIED_BANNER.designWidth}×{UNIFIED_BANNER.designHeight} px (
                        {UNIFIED_BANNER.aspectLabel})
                      </strong>
                      .
                    </p>
                  </div>
                  <div className="relative w-full rounded-[14px] overflow-hidden min-h-[100px] aspect-[2.5/1] bg-[#1c1c1e]">
                    {editingBanner.image_url ? (
                      <img
                        src={editingBanner.image_url}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-r from-[#1a1a2e] to-[#C7362F]" />
                    )}
                    <div className="relative z-10 h-full flex flex-col justify-between items-end text-right px-3.5 py-2.5">
                      <div className="min-w-0 max-w-[55%] flex flex-col items-end">
                        {editingBanner.show_badge !== false && (
                          <span className="inline-block bg-white/90 text-[#1c1c1e] text-[8px] font-bold px-1.5 py-0.5 rounded-md mb-1 uppercase">
                            {editingBanner.badge_text || 'АКЦИЯ'}
                          </span>
                        )}
                        {editingBanner.show_title !== false && (
                          <p className="text-white text-xs font-extrabold leading-tight mb-0.5 line-clamp-2 drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)]">
                            {editingBanner.title || 'Заголовок баннера'}
                          </p>
                        )}
                        {editingBanner.show_description !== false && (
                          <p className="text-white/95 text-[9px] leading-snug line-clamp-2 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                            {editingBanner.description || 'Короткое описание под заголовком'}
                          </p>
                        )}
                      </div>
                      <span className="self-end bg-white text-[#1c1c1e] text-[9px] font-extrabold px-2.5 py-1.5 rounded-lg">
                        {(editingBanner.brand_name || '').trim() || 'Смотреть'}
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] text-[#8e8e93]">↑ Превью обновляется при вводе полей ниже</p>
                </div>

                <div className="rounded-lg border border-brand-accent/30 bg-red-50/40 p-4">
                  <label className="block text-sm font-semibold text-text-primary mb-1">
                    Текст метки (вместо «АКЦИЯ»)
                  </label>
                  <p className="text-xs text-text-secondary mb-2">
                    Плашка сверху слева на баннере. Можно написать любое слово: АКЦИЯ, РЕКОМЕНДУЕМ, PRO, НОВИНКА, СКИДКА…
                  </p>
                  <input
                    type="text"
                    value={editingBanner.badge_text ?? ''}
                    onChange={(e) => setEditingBanner({ ...editingBanner, badge_text: e.target.value })}
                    className="input w-full"
                    placeholder="АКЦИЯ"
                    maxLength={24}
                  />
                  <label className="mt-3 flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingBanner.show_badge !== false}
                      onChange={(e) => setEditingBanner({ ...editingBanner, show_badge: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm text-text-primary">Показывать эту метку на баннере</span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    Заголовок на баннере *
                  </label>
                  <p className="text-xs text-text-secondary mb-1.5">
                    Крупный белый текст слева. Пример: «Мастера рядом с вами». До ~40 символов.
                  </p>
                  <input
                    type="text"
                    value={editingBanner.title || ''}
                    onChange={(e) => setEditingBanner({ ...editingBanner, title: e.target.value })}
                    className="input w-full"
                    placeholder="Мастера рядом с вами"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    Подзаголовок (описание)
                  </label>
                  <p className="text-xs text-text-secondary mb-1.5">
                    Серый/белый мелкий текст под заголовком. Пример: «Найдем проверенного специалиста…»
                  </p>
                  <textarea
                    value={editingBanner.description || ''}
                    onChange={(e) => setEditingBanner({ ...editingBanner, description: e.target.value })}
                    className="textarea w-full"
                    rows={2}
                    placeholder="Найдем проверенного специалиста для вашего дома"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    Текст белой кнопки
                  </label>
                  <p className="text-xs text-text-secondary mb-1.5">
                    Кнопка внизу слева на баннере. Пример: «Смотреть», «Подробнее», «Открыть».
                  </p>
                  <input
                    type="text"
                    value={editingBanner.brand_name || ''}
                    onChange={(e) => setEditingBanner({ ...editingBanner, brand_name: e.target.value })}
                    className="input w-full"
                    placeholder="Смотреть"
                  />
                </div>

                <div className="border border-border-light rounded-lg p-4 bg-bg-secondary/50">
                  <p className="text-sm font-medium text-text-primary mb-3">
                    Что показывать на баннере
                  </p>
                  <p className="text-xs text-text-secondary mb-3">
                    Снимите галочку, если элемент не нужен на картинке (в админке название всё равно останется для списка).
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingBanner.show_title !== false}
                        onChange={(e) => setEditingBanner({ ...editingBanner, show_title: e.target.checked })}
                        className="rounded"
                      />
                      <span className="text-sm text-text-primary">Показывать заголовок</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingBanner.show_description !== false}
                        onChange={(e) => setEditingBanner({ ...editingBanner, show_description: e.target.checked })}
                        className="rounded"
                      />
                      <span className="text-sm text-text-primary">Показывать подзаголовок</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingBanner.show_badge !== false}
                        onChange={(e) => setEditingBanner({ ...editingBanner, show_badge: e.target.checked })}
                        className="rounded"
                      />
                      <span className="text-sm text-text-primary">Показывать метку</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    Фото баннера *
                  </label>
                  <p className="text-xs text-text-secondary mb-1.5">
                    Единый размер везде: соотношение <strong>{UNIFIED_BANNER.aspectLabel}</strong>, файл{' '}
                    <strong>
                      {UNIFIED_BANNER.designWidth}×{UNIFIED_BANNER.designHeight} px
                    </strong>
                    . Важное — справа; слева место под текст.
                  </p>
                  <div className="space-y-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleImageUpload(file)
                      }}
                      className="input w-full"
                    />
                    <div className="text-xs text-text-secondary">
                      Или вставьте прямой URL изображения ниже
                    </div>
                    <input
                      type="url"
                      value={editingBanner.image_url || ''}
                      onChange={(e) => setEditingBanner({ ...editingBanner, image_url: e.target.value })}
                      className="input w-full"
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>
                </div>

                <div className="rounded-lg border border-[#e5e5ea] bg-[#f9f9fb] px-3 py-2 text-xs text-[#8e8e93]">
                  Формат: <strong className="text-[#1c1c1e]">Конструктор A</strong> · тип всегда Hero ·
                  размер {UNIFIED_BANNER.designWidth}×{UNIFIED_BANNER.designHeight}. Старые типы (Inline / Card / Footer) больше не создаются.
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    Тип перехода
                  </label>
                  <p className="text-xs text-text-secondary mb-1.5">
                    Куда ведёт весь баннер (и кнопка) при нажатии.
                  </p>
                  <select
                    value={editingBanner.target_type || ''}
                    onChange={(e) =>
                      setEditingBanner({
                        ...editingBanner,
                        target_type: (e.target.value || null) as 'master' | 'product' | 'category' | 'order' | 'external_url' | null,
                        target_id: e.target.value ? editingBanner.target_id : undefined,
                        external_url: e.target.value === 'external_url' ? editingBanner.external_url : undefined,
                      })
                    }
                    className="input w-full"
                  >
                    {TARGET_TYPES.map((type) => (
                      <option key={type.value || 'none'} value={type.value || ''}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                {editingBanner.target_type === 'external_url' && (
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1">
                      Внешний URL *
                    </label>
                    <input
                      type="url"
                      value={editingBanner.external_url || ''}
                      onChange={(e) => setEditingBanner({ ...editingBanner, external_url: e.target.value })}
                      className="input w-full"
                      placeholder="https://example.com"
                    />
                  </div>
                )}

                {editingBanner.target_type &&
                  editingBanner.target_type !== 'external_url' &&
                  editingBanner.target_type !== null && (
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-1">
                        ID ({editingBanner.target_type})
                      </label>
                      <input
                        type="text"
                        value={editingBanner.target_id || ''}
                        onChange={(e) => setEditingBanner({ ...editingBanner, target_id: e.target.value })}
                        className="input w-full"
                        placeholder="UUID"
                      />
                    </div>
                  )}

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    Страницы показа *
                  </label>
                  <p className="text-xs text-text-secondary mb-2">
                    Для общего баннера формата A обычно: Поиск мастеров, Каталог товаров, Главная.
                  </p>
                  <div className="space-y-2">
                    {PAGES.map((page) => (
                      <label key={page.value} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={editingBanner.pages?.includes(page.value) || false}
                          onChange={(e) => {
                            const pages = editingBanner.pages || []
                            if (e.target.checked) {
                              setEditingBanner({ ...editingBanner, pages: [...pages, page.value] })
                            } else {
                              setEditingBanner({
                                ...editingBanner,
                                pages: pages.filter((p) => p !== page.value),
                              })
                            }
                          }}
                          className="rounded"
                        />
                        <span className="text-sm text-text-primary">{page.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    Приоритет
                  </label>
                  <input
                    type="number"
                    value={editingBanner.priority || 0}
                    onChange={(e) =>
                      setEditingBanner({ ...editingBanner, priority: parseInt(e.target.value) || 0 })
                    }
                    className="input w-full"
                    placeholder="0"
                  />
                  <p className="text-xs text-text-secondary mt-1">Больше = выше в списке</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    Длительность показа (секунды)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={editingBanner.duration || 5}
                    onChange={(e) =>
                      setEditingBanner({ ...editingBanner, duration: parseInt(e.target.value) || 5 })
                    }
                    className="input w-full"
                    placeholder="5"
                  />
                  <p className="text-xs text-text-secondary mt-1">
                    Время показа баннера в секундах перед автоматическим переходом к следующему (1-60 сек)
                  </p>
                </div>

                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editingBanner.is_active ?? true}
                      onChange={(e) => setEditingBanner({ ...editingBanner, is_active: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm text-text-primary">Активен</span>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1">
                      Начало показа
                    </label>
                    <input
                      type="datetime-local"
                      value={
                        editingBanner.start_date
                          ? new Date(editingBanner.start_date).toISOString().slice(0, 16)
                          : ''
                      }
                      onChange={(e) =>
                        setEditingBanner({
                          ...editingBanner,
                          start_date: e.target.value ? new Date(e.target.value).toISOString() : undefined,
                        })
                      }
                      className="input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1">
                      Конец показа
                    </label>
                    <input
                      type="datetime-local"
                      value={
                        editingBanner.end_date
                          ? new Date(editingBanner.end_date).toISOString().slice(0, 16)
                          : ''
                      }
                      onChange={(e) =>
                        setEditingBanner({
                          ...editingBanner,
                          end_date: e.target.value ? new Date(e.target.value).toISOString() : undefined,
                        })
                      }
                      className="input w-full"
                    />
                  </div>
                </div>

                {/* Контекстная реклама */}
                <div className="border-t border-border-color pt-4 mt-4">
                  <h3 className="text-lg font-semibold text-text-primary mb-3">Контекстная реклама</h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1">
                      Категории (через запятую)
                    </label>
                    <input
                      type="text"
                      value={editingBanner.category?.join(', ') || ''}
                      onChange={(e) =>
                        setEditingBanner({
                          ...editingBanner,
                          category: e.target.value
                            .split(',')
                            .map((c) => c.trim())
                            .filter((c) => c.length > 0),
                        })
                      }
                      className="input w-full"
                      placeholder="roofing, electric, tiles"
                    />
                    <p className="text-xs text-text-secondary mt-1">
                      Категории товаров/услуг для контекстного показа
                    </p>
                  </div>

                  <div className="mt-3">
                    <label className="block text-sm font-medium text-text-primary mb-1">
                      Ключевые слова (через запятую)
                    </label>
                    <input
                      type="text"
                      value={editingBanner.keywords?.join(', ') || ''}
                      onChange={(e) =>
                        setEditingBanner({
                          ...editingBanner,
                          keywords: e.target.value
                            .split(',')
                            .map((k) => k.trim())
                            .filter((k) => k.length > 0),
                        })
                      }
                      className="input w-full"
                      placeholder="кровля, ремонт, электрика"
                    />
                  </div>

                  <div className="mt-3">
                    <label className="block text-sm font-medium text-text-primary mb-1">
                      Регионы (через запятую, или «ALL» для всех)
                    </label>
                    <input
                      type="text"
                      value={editingBanner.regions?.join(', ') || 'ALL'}
                      onChange={(e) =>
                        setEditingBanner({
                          ...editingBanner,
                          regions: e.target.value
                            .split(',')
                            .map((r) => r.trim())
                            .filter((r) => r.length > 0),
                        })
                      }
                      className="input w-full"
                      placeholder="ALL или Grozny, Moscow"
                    />
                  </div>
                </div>

                {/* Монетизация */}
                <div className="border-t border-border-color pt-4 mt-4">
                  <h3 className="text-lg font-semibold text-text-primary mb-3">Монетизация</h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1">
                      Модель оплаты
                    </label>
                    <select
                      value={editingBanner.pricing_model || 'fixed'}
                      onChange={(e) =>
                        setEditingBanner({ ...editingBanner, pricing_model: e.target.value as any })
                      }
                      className="input w-full"
                    >
                      {PRICING_MODELS.map((model) => (
                        <option key={model.value} value={model.value}>
                          {model.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {editingBanner.pricing_model === 'cpc' && (
                    <div className="mt-3">
                      <label className="block text-sm font-medium text-text-primary mb-1">
                        Цена за клик (₽)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={editingBanner.price_per_click || ''}
                        onChange={(e) =>
                          setEditingBanner({
                            ...editingBanner,
                            price_per_click: parseFloat(e.target.value) || undefined,
                          })
                        }
                        className="input w-full"
                        placeholder="0.00"
                      />
                    </div>
                  )}

                  {editingBanner.pricing_model === 'cpa' && (
                    <>
                      <div className="mt-3">
                        <label className="block text-sm font-medium text-text-primary mb-1">
                          Цена за действие (₽)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={editingBanner.price_per_action || ''}
                          onChange={(e) =>
                            setEditingBanner({
                              ...editingBanner,
                              price_per_action: parseFloat(e.target.value) || undefined,
                            })
                          }
                          className="input w-full"
                          placeholder="0.00"
                        />
                      </div>
                      <div className="mt-3">
                        <label className="block text-sm font-medium text-text-primary mb-1">
                          Аффилиатная ссылка
                        </label>
                        <input
                          type="url"
                          value={editingBanner.affiliate_url || ''}
                          onChange={(e) =>
                            setEditingBanner({ ...editingBanner, affiliate_url: e.target.value })
                          }
                          className="input w-full"
                          placeholder="https://..."
                        />
                      </div>
                    </>
                  )}

                  {editingBanner.pricing_model === 'fixed' && (
                    <div className="mt-3">
                      <label className="block text-sm font-medium text-text-primary mb-1">
                        Фиксированная цена (₽)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={editingBanner.fixed_price || ''}
                        onChange={(e) =>
                          setEditingBanner({
                            ...editingBanner,
                            fixed_price: parseFloat(e.target.value) || undefined,
                          })
                        }
                        className="input w-full"
                        placeholder="0.00"
                      />
                    </div>
                  )}
                </div>

                {/* Лимиты */}
                <div className="border-t border-border-color pt-4 mt-4">
                  <h3 className="text-lg font-semibold text-text-primary mb-3">Лимиты</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-1">
                        Лимит показов
                      </label>
                      <input
                        type="number"
                        value={editingBanner.impression_limit || ''}
                        onChange={(e) =>
                          setEditingBanner({
                            ...editingBanner,
                            impression_limit: e.target.value ? parseInt(e.target.value) : undefined,
                          })
                        }
                        className="input w-full"
                        placeholder="Без лимита"
                      />
                      <p className="text-xs text-text-secondary mt-1">
                        Текущие: {editingBanner.current_impressions || 0}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-1">
                        Лимит кликов
                      </label>
                      <input
                        type="number"
                        value={editingBanner.click_limit || ''}
                        onChange={(e) =>
                          setEditingBanner({
                            ...editingBanner,
                            click_limit: e.target.value ? parseInt(e.target.value) : undefined,
                          })
                        }
                        className="input w-full"
                        placeholder="Без лимита"
                      />
                      <p className="text-xs text-text-secondary mt-1">
                        Текущие: {editingBanner.current_clicks || 0}
                      </p>
                    </div>
                  </div>
                </div>

              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={handleSaveBanner} className="btn btn-primary flex-1">
                  Сохранить
                </button>
                <button
                  onClick={() => {
                    setShowCreateModal(false)
                    setEditingBanner(null)
                  }}
                  className="btn btn-outline flex-1"
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

