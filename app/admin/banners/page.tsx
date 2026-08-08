'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '../../providers'
import { supabase, AdBanner } from '@/lib/supabase'
import { logAdminAction } from '@/lib/admin'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { FiPlus, FiEdit, FiTrash2, FiEye, FiEyeOff, FiCopy, FiImage } from 'react-icons/fi'

const BANNER_TYPES = [
  { value: 'image', label: 'Только изображение' },
  { value: 'image_text', label: 'Изображение + текст' },
  { value: 'image_button', label: 'Изображение + кнопка' },
  { value: 'master_promo', label: 'Промо мастера' },
  { value: 'product_promo', label: 'Промо товара' },
  { value: 'category_promo', label: 'Промо категории' },
]

const AD_TYPES = [
  { value: 'HERO_SPONSORED', label: 'Верхние промо-блоки (Hero)' },
  { value: 'INLINE_CONTEXT', label: 'Контекстная реклама (между карточками)' },
  { value: 'SPONSORED_CARD', label: 'Карточка-реклама (в списках)' },
  { value: 'PROFILE_RELATED', label: 'Реклама в профиле мастера' },
  { value: 'FOOTER_BRAND', label: 'Логотипы партнёров (футер)' },
]

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

export default function AdminBannersPage() {
  const { user: currentUser } = useAuth()
  const [banners, setBanners] = useState<AdBanner[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBanner, setSelectedBanner] = useState<AdBanner | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
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

  const handleCreateBanner = () => {
    setEditingBanner({
      title: '',
      description: '',
      image_url: '',
      type: 'image',
      ad_type: 'HERO_SPONSORED',
      hero_layout: 'split',
      target_type: null,
      pages: [],
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
    })
    setShowCreateModal(true)
  }

  const handleCreateBannerWithType = (adType: string) => {
    // Определяем формат баннера по умолчанию для каждого типа
    let defaultType = 'image'
    let defaultPages = ['home']
    
    switch (adType) {
      case 'HERO_SPONSORED':
        defaultType = 'image_text'
        defaultPages = ['home']
        break
      case 'INLINE_CONTEXT':
        defaultType = 'image'
        defaultPages = ['search', 'products']
        break
      case 'SPONSORED_CARD':
        defaultType = 'image_text'
        defaultPages = ['search', 'products']
        break
      case 'PROFILE_RELATED':
        defaultType = 'image_text'
        defaultPages = []
        break
      case 'FOOTER_BRAND':
        defaultType = 'image'
        defaultPages = ['home']
        break
    }

    setEditingBanner({
      title: '',
      description: '',
      image_url: '',
      type: defaultType as any,
      ad_type: adType as any,
      hero_layout: adType === 'HERO_SPONSORED' ? 'split' : undefined,
      target_type: null,
      pages: defaultPages,
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
    })
    setShowCreateModal(true)
  }

  const handleEditBanner = (banner: AdBanner) => {
    setEditingBanner(banner)
    setShowCreateModal(true)
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
      await supabase.from('ad_banners').delete().eq('id', bannerId)

      await logAdminAction(currentUser.id, 'delete_banner', 'banner', bannerId)
      alert('Баннер удален')
      fetchBanners()
      if (selectedBanner?.id === bannerId) {
        setSelectedBanner(null)
      }
    } catch (error) {
      console.error('Error deleting banner:', error)
      alert('Ошибка при удалении баннера')
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

  const handleSaveBanner = async () => {
    if (!currentUser || !editingBanner) return

    try {
      if (!editingBanner.title || !editingBanner.image_url || !editingBanner.pages || editingBanner.pages.length === 0) {
        alert('Заполните все обязательные поля')
        return
      }

      const isHero = editingBanner.ad_type === 'HERO_SPONSORED' || !editingBanner.ad_type
      const heroLayout = (editingBanner as any).hero_layout
      const bannerData: any = {
        ...editingBanner,
        priority: editingBanner.priority || 0,
        duration: editingBanner.duration || 5,
        is_active: editingBanner.is_active ?? true,
        ad_type: editingBanner.ad_type || 'HERO_SPONSORED',
        ...(isHero && { hero_layout: heroLayout === 'full_image' ? 'full_image' : 'split' }),
        category: editingBanner.category || [],
        keywords: editingBanner.keywords || [],
        regions: editingBanner.regions || ['ALL'],
        pricing_model: editingBanner.pricing_model || 'fixed',
        show_badge: editingBanner.show_badge ?? true,
        badge_text: editingBanner.badge_text || 'АКЦИЯ',
        show_title: editingBanner.show_title ?? true,
        show_description: editingBanner.show_description ?? true,
        created_by: currentUser.id,
      }

      // Удаляем undefined значения
      Object.keys(bannerData).forEach((key) => {
        if (bannerData[key] === undefined) {
          delete bannerData[key]
        }
      })

      if (editingBanner.id) {
        // Update
        await supabase
          .from('ad_banners')
          .update(bannerData)
          .eq('id', editingBanner.id)

        await logAdminAction(currentUser.id, 'update_banner', 'banner', editingBanner.id)
        alert('Баннер обновлен')
      } else {
        // Create
        const { data, error } = await supabase
          .from('ad_banners')
          .insert(bannerData)
          .select()
          .single()

        if (error) throw error

        await logAdminAction(currentUser.id, 'create_banner', 'banner', data.id)
        alert('Баннер создан')
      }

      setShowCreateModal(false)
      setEditingBanner(null)
      fetchBanners()
    } catch (error) {
      console.error('Error saving banner:', error)
      alert('Ошибка при сохранении баннера')
    }
  }

  const handleImageUpload = async (file: File) => {
    if (!currentUser) return

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `banners/${currentUser.id}/${Date.now()}.${fileExt}`

      // Пытаемся сразу загрузить файл
      const { error: uploadError } = await supabase.storage
        .from('banner-images')
        .upload(fileName, file, { upsert: false })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        if (uploadError.message.includes('Bucket not found') || uploadError.message.includes('not found')) {
          alert(
            'Bucket "banner-images" не найден или нет прав доступа.\n\n' +
            'Проверьте:\n' +
            '1. Bucket создан в Supabase Storage\n' +
            '2. Bucket имеет статус PUBLIC\n' +
            '3. RLS политики настроены для загрузки\n\n' +
            'Или используйте прямой URL изображения в поле ниже.'
          )
        } else if (uploadError.message.includes('new row violates row-level security policy')) {
          alert(
            'Нет прав для загрузки изображений.\n\n' +
            'Убедитесь, что у вас есть права администратора и RLS политики настроены правильно.'
          )
        } else {
          alert(`Ошибка при загрузке изображения: ${uploadError.message}`)
        }
        return
      }

      const { data: urlData } = supabase.storage.from('banner-images').getPublicUrl(fileName)

      if (editingBanner && urlData) {
        setEditingBanner({
          ...editingBanner,
          image_url: urlData.publicUrl,
        })
        alert('Изображение успешно загружено')
      }
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
          <button onClick={handleCreateBanner} className="btn btn-primary">
            <FiPlus className="mr-2" size={18} />
            Создать баннер
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={() => handleCreateBannerWithType('HERO_SPONSORED')} 
            className="btn btn-outline text-sm px-3 py-2"
          >
            <FiPlus className="mr-2" size={16} />
            Hero реклама
          </button>
          <button 
            onClick={() => handleCreateBannerWithType('INLINE_CONTEXT')} 
            className="btn btn-outline text-sm px-3 py-2"
          >
            <FiPlus className="mr-2" size={16} />
            Inline реклама
          </button>
          <button 
            onClick={() => handleCreateBannerWithType('SPONSORED_CARD')} 
            className="btn btn-outline text-sm px-3 py-2"
          >
            <FiPlus className="mr-2" size={16} />
            Sponsored Card
          </button>
          <button 
            onClick={() => handleCreateBannerWithType('PROFILE_RELATED')} 
            className="btn btn-outline text-sm px-3 py-2"
          >
            <FiPlus className="mr-2" size={16} />
            Profile Related
          </button>
          <button 
            onClick={() => handleCreateBannerWithType('FOOTER_BRAND')} 
            className="btn btn-outline text-sm px-3 py-2"
          >
            <FiPlus className="mr-2" size={16} />
            Footer Brand
          </button>
        </div>
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
                      <span className="font-medium">Тип рекламы:</span>{' '}
                      {AD_TYPES.find((t) => t.value === banner.ad_type)?.label || banner.ad_type || 'HERO_SPONSORED'}
                    </div>
                    <div>
                      <span className="font-medium">Формат:</span>{' '}
                      {BANNER_TYPES.find((t) => t.value === banner.type)?.label || banner.type}
                    </div>
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
                <div className="text-sm text-text-secondary mb-1">Тип рекламы</div>
                <div className="font-medium text-text-primary">
                  {AD_TYPES.find((t) => t.value === selectedBanner.ad_type)?.label || selectedBanner.ad_type || 'HERO_SPONSORED'}
                </div>
              </div>
              <div>
                <div className="text-sm text-text-secondary mb-1">Формат баннера</div>
                <div className="font-medium text-text-primary">
                  {BANNER_TYPES.find((t) => t.value === selectedBanner.type)?.label || selectedBanner.type}
                </div>
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
                      Фото на весь блок · слева тёмный градиент · сверху метка (АКЦИЯ) · заголовок · подзаголовок · белая кнопка снизу слева.
                      Размер на сайте как сейчас (компактный). Страницы: Поиск / Товары / Главная.
                    </p>
                  </div>
                  <div className="relative w-full rounded-[14px] overflow-hidden min-h-[88px] aspect-[2.8/1] bg-[#1c1c1e]">
                    {editingBanner.image_url ? (
                      <img
                        src={editingBanner.image_url}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-r from-[#1a1a2e] to-[#C7362F]" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/35 to-transparent" />
                    <div className="relative z-10 h-full flex flex-col justify-between px-3.5 py-2.5">
                      <div className="min-w-0 max-w-[68%]">
                        {editingBanner.show_badge !== false && (
                          <span className="inline-block bg-black/35 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-md mb-1 uppercase">
                            {editingBanner.badge_text || 'АКЦИЯ'}
                          </span>
                        )}
                        {editingBanner.show_title !== false && (
                          <p className="text-white text-xs font-extrabold leading-tight mb-0.5 line-clamp-2">
                            {editingBanner.title || 'Заголовок баннера'}
                          </p>
                        )}
                        {editingBanner.show_description !== false && (
                          <p className="text-white/80 text-[9px] leading-snug line-clamp-2">
                            {editingBanner.description || 'Короткое описание под заголовком'}
                          </p>
                        )}
                      </div>
                      <span className="self-start bg-white text-[#1c1c1e] text-[9px] font-extrabold px-2.5 py-1.5 rounded-lg">
                        {(editingBanner.brand_name || '').trim() || 'Смотреть'}
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] text-[#8e8e93]">↑ Превью обновляется при вводе полей ниже</p>
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
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    Фото баннера *
                  </label>
                  <p className="text-xs text-text-secondary mb-1.5">
                    Заполняет весь баннер. Важное — справа (инструменты, мастер): слева текст на градиенте.
                    Рекомендуемое соотношение ≈ 2.8∶1 (широкое).
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

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    Тип баннера *
                  </label>
                  <select
                    value={editingBanner.type || 'image'}
                    onChange={(e) => setEditingBanner({ ...editingBanner, type: e.target.value as any })}
                    className="input w-full"
                  >
                    {BANNER_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    Тип рекламы (Ad Type) *
                  </label>
                  <select
                    value={editingBanner.ad_type || 'HERO_SPONSORED'}
                    onChange={(e) => setEditingBanner({ ...editingBanner, ad_type: e.target.value as any })}
                    className="input w-full"
                  >
                    {AD_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-text-secondary mt-1">
                    Определяет, где и как будет показываться реклама
                  </p>
                </div>

                {(editingBanner.ad_type === 'HERO_SPONSORED' || !editingBanner.ad_type) && (
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1">
                      Режим Hero-баннера
                    </label>
                    <select
                      value={(editingBanner as any).hero_layout || 'split'}
                      onChange={(e) => setEditingBanner({ ...editingBanner, hero_layout: e.target.value as 'split' | 'full_image' })}
                      className="input w-full"
                    >
                      <option value="split">Текст слева + картинка справа</option>
                      <option value="full_image">Картинка на весь блок</option>
                    </select>
                    <p className="text-xs text-text-secondary mt-1">
                      full_image — картинка заполняет весь блок, заголовок поверх внизу
                    </p>
                  </div>
                )}

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

                {/* Бейдж */}
                <div className="border-t border-border-color pt-4 mt-4">
                  <h3 className="text-lg font-semibold text-text-primary mb-3">Метка на баннере</h3>
                  <p className="text-xs text-text-secondary mb-3">
                    Маленькая плашка сверху слева (как «АКЦИЯ» на макете).
                  </p>

                  <div className="mb-3">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={editingBanner.show_badge ?? true}
                        onChange={(e) =>
                          setEditingBanner({ ...editingBanner, show_badge: e.target.checked })
                        }
                        className="rounded"
                      />
                      <span className="text-sm text-text-primary">Показывать метку</span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1">
                      Текст метки
                    </label>
                    <input
                      type="text"
                      value={editingBanner.badge_text || 'АКЦИЯ'}
                      onChange={(e) =>
                        setEditingBanner({ ...editingBanner, badge_text: e.target.value })
                      }
                      className="input w-full"
                      placeholder="АКЦИЯ"
                    />
                    <p className="text-xs text-text-secondary mt-1">
                      Примеры: АКЦИЯ · РЕКОМЕНДУЕМ · PRO · РЕКЛАМА
                    </p>
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

