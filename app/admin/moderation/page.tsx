'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '../../providers'
import { supabase } from '@/lib/supabase'
import { logAdminAction, getAdminRole, type ContentModeration, type ContentModerationStatus, type AdminRole } from '@/lib/admin'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { FiSearch, FiEye, FiEyeOff, FiCheck, FiX, FiAlertCircle, FiImage, FiShoppingBag, FiFileText, FiTrash2 } from 'react-icons/fi'

type ContentType = 'portfolio_item' | 'product' | 'order' | 'message' | 'avatar' | 'description'

interface ContentItem {
  id: string
  type: ContentType
  title?: string
  description?: string
  images?: string[]
  user_id: string
  user?: any
  moderation?: ContentModeration
  created_at: string
}

export default function AdminModerationPage() {
  const { user: currentUser } = useAuth()
  const [content, setContent] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [contentType, setContentType] = useState<ContentType>('portfolio_item')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null)
  const [adminRole, setAdminRole] = useState<AdminRole | null>(null)

  useEffect(() => {
    fetchContent()
    if (currentUser) {
      logAdminAction(currentUser.id, 'view_moderation', 'moderation')
      getAdminRole(currentUser.id).then(setAdminRole)
    }
  }, [currentUser, contentType, statusFilter])

  const fetchContent = async () => {
    try {
      setLoading(true)
      let contentItems: ContentItem[] = []

      if (contentType === 'portfolio_item') {
        const { data, error } = await supabase
          .from('portfolio_items')
          .select(`
            id,
            master_id,
            title,
            description,
            images,
            created_at,
            master:profiles!master_id(id, full_name, email, avatar_url)
          `)
          .order('created_at', { ascending: false })
          .limit(100)

        if (error) throw error
        contentItems = (data || []).map((item: any) => ({
          id: item.id,
          type: 'portfolio_item' as ContentType,
          title: item.title,
          description: item.description,
          images: item.images || [],
          user_id: item.master_id,
          user: item.master,
          created_at: item.created_at,
        }))
      } else if (contentType === 'product') {
        const { data, error } = await supabase
          .from('products')
          .select(`
            id,
            seller_id,
            name,
            description,
            images,
            created_at,
            seller:profiles!seller_id(id, full_name, email, avatar_url)
          `)
          .order('created_at', { ascending: false })
          .limit(100)

        if (error) throw error
        contentItems = (data || []).map((item: any) => ({
          id: item.id,
          type: 'product' as ContentType,
          title: item.name,
          description: item.description,
          images: item.images || [],
          user_id: item.seller_id,
          user: item.seller,
          created_at: item.created_at,
        }))
      } else if (contentType === 'order') {
        const { data, error } = await supabase
          .from('orders')
          .select(`
            id,
            client_id,
            title,
            description,
            images,
            created_at,
            client:profiles!client_id(id, full_name, email, avatar_url)
          `)
          .order('created_at', { ascending: false })
          .limit(100)

        if (error) throw error
        contentItems = (data || []).map((item: any) => ({
          id: item.id,
          type: 'order' as ContentType,
          title: item.title,
          description: item.description,
          images: item.images || [],
          user_id: item.client_id,
          user: item.client,
          created_at: item.created_at,
        }))
      }

      // Fetch moderation status for each item
      const contentIds = contentItems.map((item) => item.id)
      const { data: moderationData } = await supabase
        .from('content_moderation')
        .select('*')
        .eq('content_type', contentType)
        .in('content_id', contentIds)

      const moderationMap = new Map<string, ContentModeration>()
      moderationData?.forEach((mod) => {
        moderationMap.set(mod.content_id, mod)
      })

      // Combine with moderation status
      contentItems = contentItems.map((item) => ({
        ...item,
        moderation: moderationMap.get(item.id),
      }))

      // Filter by status
      if (statusFilter) {
        contentItems = contentItems.filter((item) => {
          if (statusFilter === 'pending') {
            return !item.moderation
          }
          return item.moderation?.status === statusFilter
        })
      }

      // Filter by search query
      if (searchQuery) {
        contentItems = contentItems.filter(
          (item) =>
            item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.description?.toLowerCase().includes(searchQuery.toLowerCase())
        )
      }

      setContent(contentItems)
    } catch (error) {
      console.error('Error fetching content:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleModerateContent = async (
    contentId: string,
    status: ContentModerationStatus,
    reason?: string
  ) => {
    if (!currentUser) return

    try {
      // Check if moderation record exists
      const { data: existing } = await supabase
        .from('content_moderation')
        .select('id')
        .eq('content_type', contentType)
        .eq('content_id', contentId)
        .maybeSingle()

      if (existing) {
        // Update existing
        await supabase
          .from('content_moderation')
          .update({
            status,
            moderation_reason: reason || null,
            moderated_by: currentUser.id,
            moderated_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
      } else {
        // Get user_id for the content
        const selectedItem = content.find((item) => item.id === contentId)
        if (!selectedItem) return

        // Create new
        await supabase.from('content_moderation').insert({
          content_type: contentType,
          content_id: contentId,
          user_id: selectedItem.user_id,
          status,
          moderation_reason: reason || null,
          moderated_by: currentUser.id,
          moderated_at: new Date().toISOString(),
        })
      }

      await logAdminAction(currentUser.id, 'moderate_content', contentType, contentId, {
        status,
        reason,
      })

      alert(`Контент ${status === 'approved' ? 'одобрен' : status === 'rejected' ? 'отклонен' : 'скрыт'}`)
      fetchContent()
      if (selectedContent?.id === contentId) {
        const updated = content.find((item) => item.id === contentId)
        if (updated) setSelectedContent(updated)
      }
    } catch (error) {
      console.error('Error moderating content:', error)
      alert('Ошибка при модерации')
    }
  }

  const handleDeleteContent = async (contentId: string) => {
    if (!currentUser || adminRole !== 'super_admin') {
      alert('Только супер-администратор может удалять контент')
      return
    }

    const confirmDelete = window.confirm('Вы уверены, что хотите навсегда удалить этот контент? Это действие нельзя отменить.')
    if (!confirmDelete) return

    try {
      const selectedItem = content.find((item) => item.id === contentId)
      if (!selectedItem) {
        alert('Контент не найден')
        return
      }

      let deleteError: any = null

      // Delete based on content type
      if (contentType === 'portfolio_item') {
        // Delete portfolio item and related data
        const { error: likesError } = await supabase.from('portfolio_likes').delete().eq('item_id', contentId)
        if (likesError) console.warn('Error deleting likes:', likesError)
        
        const { error: commentsError } = await supabase.from('portfolio_comments').delete().eq('item_id', contentId)
        if (commentsError) console.warn('Error deleting comments:', commentsError)
        
        const { error: itemError } = await supabase.from('portfolio_items').delete().eq('id', contentId)
        if (itemError) {
          deleteError = itemError
          throw new Error(`Ошибка удаления работы мастера: ${itemError.message}`)
        }
      } else if (contentType === 'product') {
        // Delete product
        const { error: productError } = await supabase.from('products').delete().eq('id', contentId)
        if (productError) {
          deleteError = productError
          throw new Error(`Ошибка удаления товара: ${productError.message}`)
        }
      } else if (contentType === 'order') {
        // Delete order and related data
        const { error: responsesError } = await supabase.from('order_responses').delete().eq('order_id', contentId)
        if (responsesError) console.warn('Error deleting order responses:', responsesError)
        
        const { error: orderError } = await supabase.from('orders').delete().eq('id', contentId)
        if (orderError) {
          deleteError = orderError
          throw new Error(`Ошибка удаления заказа: ${orderError.message}`)
        }
      } else {
        throw new Error(`Неподдерживаемый тип контента: ${contentType}`)
      }

      // Delete moderation records (ignore errors here, as main content is already deleted)
      const { error: moderationError } = await supabase
        .from('content_moderation')
        .delete()
        .eq('content_type', contentType)
        .eq('content_id', contentId)
      
      if (moderationError) {
        console.warn('Error deleting moderation record:', moderationError)
      }

      await logAdminAction(currentUser.id, 'delete_content', contentType, contentId, {
        deleted_by: currentUser.id,
      })

      alert('Контент успешно удален')
      fetchContent()
      if (selectedContent?.id === contentId) {
        setSelectedContent(null)
      }
    } catch (error: any) {
      console.error('Error deleting content:', error)
      const errorMessage = error?.message || error?.error?.message || 'Неизвестная ошибка при удалении контента'
      alert(`Ошибка при удалении контента: ${errorMessage}\n\nВозможные причины:\n- Нет прав доступа (RLS политики)\n- Контент уже удален\n- Ошибка базы данных`)
    }
  }

  const getContentTypeLabel = (type: ContentType) => {
    switch (type) {
      case 'portfolio_item':
        return 'Работы мастеров'
      case 'product':
        return 'Товары'
      case 'order':
        return 'Заказы'
      case 'message':
        return 'Сообщения'
      case 'avatar':
        return 'Аватары'
      case 'description':
        return 'Описания'
      default:
        return type
    }
  }

  if (loading) {
    return <div className="text-text-secondary">Загрузка...</div>
  }

  const stats = {
    total: content.length,
    pending: content.filter((item) => !item.moderation).length,
    approved: content.filter((item) => item.moderation?.status === 'approved').length,
    rejected: content.filter((item) => item.moderation?.status === 'rejected').length,
    hidden: content.filter((item) => item.moderation?.status === 'hidden').length,
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary mb-2">Модерация контента</h1>
        <p className="text-text-secondary">Модерация работ мастеров, товаров, описаний и другого контента</p>
      </div>

      {/* Content Type Tabs */}
      <div className="card">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setContentType('portfolio_item')}
            className={`px-4 py-2 rounded-md transition-colors ${
              contentType === 'portfolio_item'
                ? 'bg-brand-accent text-white'
                : 'bg-bg-secondary text-text-secondary hover:bg-bg-secondary/80'
            }`}
          >
            <FiImage className="inline mr-2" size={16} />
            Работы мастеров
          </button>
          <button
            onClick={() => setContentType('product')}
            className={`px-4 py-2 rounded-md transition-colors ${
              contentType === 'product'
                ? 'bg-brand-accent text-white'
                : 'bg-bg-secondary text-text-secondary hover:bg-bg-secondary/80'
            }`}
          >
            <FiShoppingBag className="inline mr-2" size={16} />
            Товары
          </button>
          <button
            onClick={() => setContentType('order')}
            className={`px-4 py-2 rounded-md transition-colors ${
              contentType === 'order'
                ? 'bg-brand-accent text-white'
                : 'bg-bg-secondary text-text-secondary hover:bg-bg-secondary/80'
            }`}
          >
            <FiFileText className="inline mr-2" size={16} />
            Заказы
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="card">
          <div className="text-sm text-text-secondary">Всего</div>
          <div className="text-2xl font-bold text-text-primary">{stats.total}</div>
        </div>
        <div className="card border-yellow-400">
          <div className="text-sm text-text-secondary">На проверке</div>
          <div className="text-2xl font-bold text-text-primary">{stats.pending}</div>
        </div>
        <div className="card border-green-400">
          <div className="text-sm text-text-secondary">Одобрено</div>
          <div className="text-2xl font-bold text-text-primary">{stats.approved}</div>
        </div>
        <div className="card border-red-400">
          <div className="text-sm text-text-secondary">Отклонено</div>
          <div className="text-2xl font-bold text-text-primary">{stats.rejected}</div>
        </div>
        <div className="card">
          <div className="text-sm text-text-secondary">Скрыто</div>
          <div className="text-2xl font-bold text-text-primary">{stats.hidden}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary" size={20} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchContent()}
                placeholder="Поиск по названию, описанию..."
                className="input pl-10"
              />
            </div>
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input md:w-48">
            <option value="">Все статусы</option>
            <option value="pending">На проверке</option>
            <option value="approved">Одобрено</option>
            <option value="rejected">Отклонено</option>
            <option value="hidden">Скрыто</option>
          </select>
          <button onClick={fetchContent} className="btn btn-primary">
            Найти
          </button>
        </div>
      </div>

      {/* Content List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          {content.map((item) => (
            <div
              key={item.id}
              onClick={() => setSelectedContent(item)}
              className={`card cursor-pointer transition-colors ${
                selectedContent?.id === item.id ? 'border-brand-accent border-2' : 'hover:shadow-lg'
              }`}
            >
              <div className="flex gap-4">
                {item.images && item.images.length > 0 && (
                  <div className="w-24 h-24 bg-bg-secondary rounded overflow-hidden flex-shrink-0">
                    <img src={item.images[0]} alt={item.title} className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-text-primary truncate">{item.title || 'Без названия'}</h3>
                    {item.moderation?.status === 'approved' && (
                      <FiCheck className="text-green-500 flex-shrink-0" size={18} title="Одобрено" />
                    )}
                    {item.moderation?.status === 'rejected' && (
                      <FiX className="text-red-500 flex-shrink-0" size={18} title="Отклонено" />
                    )}
                    {item.moderation?.status === 'hidden' && (
                      <FiEyeOff className="text-gray-500 flex-shrink-0" size={18} title="Скрыто" />
                    )}
                    {!item.moderation && (
                      <FiAlertCircle className="text-yellow-500 flex-shrink-0" size={18} title="На проверке" />
                    )}
                  </div>
                  {item.description && (
                    <p className="text-sm text-text-secondary mb-2 line-clamp-2">{item.description}</p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-text-secondary">
                    {item.user && (
                      <span>
                        {item.user.full_name} ({item.user.email})
                      </span>
                    )}
                    <span>{format(new Date(item.created_at), 'd MMM yyyy', { locale: ru })}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Content Details */}
        {selectedContent && (
          <div className="card">
            <h2 className="text-lg font-semibold text-text-primary mb-4">Детали контента</h2>
            <div className="space-y-4">
              <div>
                <div className="text-sm text-text-secondary mb-1">Тип</div>
                <div className="font-medium text-text-primary">{getContentTypeLabel(selectedContent.type)}</div>
              </div>
              <div>
                <div className="text-sm text-text-secondary mb-1">Название</div>
                <div className="font-medium text-text-primary">{selectedContent.title || 'Без названия'}</div>
              </div>
              {selectedContent.description && (
                <div>
                  <div className="text-sm text-text-secondary mb-1">Описание</div>
                  <div className="text-sm text-text-primary">{selectedContent.description}</div>
                </div>
              )}

              {/* Images */}
              {selectedContent.images && selectedContent.images.length > 0 && (
                <div>
                  <div className="text-sm text-text-secondary mb-2">Изображения</div>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedContent.images.slice(0, 4).map((img, idx) => (
                      <img key={idx} src={img} alt={`${selectedContent.title} ${idx + 1}`} className="rounded" />
                    ))}
                  </div>
                </div>
              )}

              {/* Moderation Status */}
              <div className="pt-4 border-t border-border-color">
                <div className="text-sm font-semibold text-text-primary mb-2">Статус модерации</div>
                <div className="text-sm text-text-secondary mb-3">
                  {selectedContent.moderation?.status ? (
                    <span>
                      {selectedContent.moderation.status === 'approved'
                        ? 'Одобрено'
                        : selectedContent.moderation.status === 'rejected'
                        ? 'Отклонено'
                        : 'Скрыто'}
                    </span>
                  ) : (
                    <span className="text-yellow-600">На проверке</span>
                  )}
                </div>
                {selectedContent.moderation?.moderation_reason && (
                  <div className="text-xs text-text-secondary mb-2">
                    Причина: {selectedContent.moderation.moderation_reason}
                  </div>
                )}
                {selectedContent.moderation?.moderated_at && (
                  <div className="text-xs text-text-secondary">
                    {format(new Date(selectedContent.moderation.moderated_at), 'd MMM yyyy, HH:mm', { locale: ru })}
                  </div>
                )}
              </div>

              {/* User */}
              {selectedContent.user && (
                <div className="pt-4 border-t border-border-color">
                  <div className="text-sm font-semibold text-text-primary mb-2">Автор</div>
                  <div className="text-sm text-text-secondary">
                    <div>{selectedContent.user.full_name}</div>
                    <div>{selectedContent.user.email}</div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="pt-4 border-t border-border-color space-y-2">
                {!selectedContent.moderation || selectedContent.moderation.status !== 'approved' ? (
                  <button
                    onClick={() => handleModerateContent(selectedContent.id, 'approved')}
                    className="w-full btn btn-primary text-sm"
                  >
                    <FiCheck className="inline mr-2" size={16} />
                    Одобрить
                  </button>
                ) : null}
                {!selectedContent.moderation || selectedContent.moderation.status !== 'rejected' ? (
                  <button
                    onClick={() => {
                      const reason = prompt('Причина отклонения:')
                      if (reason !== null) {
                        handleModerateContent(selectedContent.id, 'rejected', reason)
                      }
                    }}
                    className="w-full btn btn-outline text-sm"
                  >
                    <FiX className="inline mr-2" size={16} />
                    Отклонить
                  </button>
                ) : null}
                {!selectedContent.moderation || selectedContent.moderation.status !== 'hidden' ? (
                  <button
                    onClick={() => {
                      const reason = prompt('Причина скрытия:')
                      if (reason !== null) {
                        handleModerateContent(selectedContent.id, 'hidden', reason)
                      }
                    }}
                    className="w-full btn btn-outline text-sm"
                  >
                    <FiEyeOff className="inline mr-2" size={16} />
                    Скрыть
                  </button>
                ) : null}
                {adminRole === 'super_admin' && (
                  <button
                    onClick={() => handleDeleteContent(selectedContent.id)}
                    className="w-full btn btn-outline text-sm text-red-600 border-red-600 hover:bg-red-600 hover:text-white"
                  >
                    <FiTrash2 className="inline mr-2" size={16} />
                    Удалить навсегда
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}