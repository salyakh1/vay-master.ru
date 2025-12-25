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
      target_type: null,
      pages: [],
      priority: 0,
      duration: 5,
      is_active: true,
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

      const bannerData = {
        ...editingBanner,
        priority: editingBanner.priority || 0,
        duration: editingBanner.duration || 5,
        is_active: editingBanner.is_active ?? true,
        created_by: currentUser.id,
      }

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
                    Тип: {BANNER_TYPES.find((t) => t.value === banner.type)?.label || banner.type}
                  </div>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {banner.pages.map((page) => (
                      <span key={page} className="text-xs px-2 py-0.5 bg-bg-secondary rounded">
                        {PAGES.find((p) => p.value === page)?.label || page}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-text-secondary">
                    <span>Приоритет: {banner.priority}</span>
                    <span>Просмотры: {banner.views}</span>
                    <span>Клики: {banner.clicks}</span>
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
                <div className="text-sm text-text-secondary mb-1">Тип</div>
                <div className="font-medium text-text-primary">
                  {BANNER_TYPES.find((t) => t.value === selectedBanner.type)?.label || selectedBanner.type}
                </div>
              </div>
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
              <div>
                <div className="text-sm text-text-secondary mb-1">Статистика</div>
                <div className="text-sm text-text-primary">
                  Просмотры: {selectedBanner.views} | Клики: {selectedBanner.clicks}
                  {selectedBanner.clicks > 0 && (
                    <span className="ml-2">
                      CTR: {((selectedBanner.clicks / selectedBanner.views) * 100).toFixed(2)}%
                    </span>
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
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    Название *
                  </label>
                  <input
                    type="text"
                    value={editingBanner.title || ''}
                    onChange={(e) => setEditingBanner({ ...editingBanner, title: e.target.value })}
                    className="input w-full"
                    placeholder="Название баннера"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    Описание
                  </label>
                  <textarea
                    value={editingBanner.description || ''}
                    onChange={(e) => setEditingBanner({ ...editingBanner, description: e.target.value })}
                    className="textarea w-full"
                    rows={3}
                    placeholder="Описание (для типов с текстом)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    Изображение *
                  </label>
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
                  {editingBanner.image_url && (
                    <div className="mt-2">
                      <img
                        src={editingBanner.image_url}
                        alt="Preview"
                        className="w-full h-40 object-cover rounded border border-border-color"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                          const errorDiv = document.createElement('div')
                          errorDiv.className = 'text-sm text-red-600 p-2 bg-red-50 rounded'
                          errorDiv.textContent = 'Не удалось загрузить изображение. Проверьте URL.'
                          e.currentTarget.parentElement?.appendChild(errorDiv)
                        }}
                      />
                    </div>
                  )}
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
                    Тип перехода
                  </label>
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

