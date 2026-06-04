'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import { useAuth } from '@/app/providers'
import { supabase, Order, OrderResponse, User } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import { FiMessageCircle, FiMapPin, FiClock, FiUser, FiChevronLeft, FiChevronRight, FiArrowLeft, FiCheckCircle, FiXCircle, FiBriefcase } from 'react-icons/fi'
import Link from 'next/link'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { formatRemaining, getCooldownRemainingMs, getMasterAccess } from '@/lib/masterAccess'
import OrderResponseCard from '@/components/orders/OrderResponseCard'
import { STATUS_CONFIG, formatOrderDate } from '@/components/orders/order-utils'

// Dynamic imports для модальных окон - загружаются только при открытии
const OrderResponseModal = dynamic(() => import('@/components/OrderResponseModal'), {
  ssr: false,
})

const AcceptResponseModal = dynamic(() => import('@/components/AcceptResponseModal'), {
  ssr: false,
})

const ProUpgradeModal = dynamic(() => import('@/components/ProUpgradeModal'), {
  ssr: false,
})

const StoreLocationMapModal = dynamic(() => import('@/components/StoreLocationMapModal'), { ssr: false })

const statusLabels: Record<string, string> = {
  open: 'Открыт',
  new: 'Новый',
  in_progress: 'В работе',
  completed: 'Выполнен',
  cancelled: 'Отменен',
}

const statusColors: Record<string, string> = {
  open: 'bg-green-100 text-green-700 border-green-300',
  new: 'bg-blue-100 text-blue-700 border-blue-300',
  in_progress: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  completed: 'bg-green-100 text-green-700 border-green-300',
  cancelled: 'bg-gray-100 text-gray-700 border-gray-300',
}

export default function OrderPage() {
  const params = useParams()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [order, setOrder] = useState<Order | null>(null)
  const [responses, setResponses] = useState<OrderResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [activeImage, setActiveImage] = useState<number>(0)
  const imageContainerRef = useRef<HTMLDivElement>(null)
  const touchStartX = useRef<number>(0)
  const touchEndX = useRef<number>(0)
  const [showResponseModal, setShowResponseModal] = useState(false)
  const [showAcceptModal, setShowAcceptModal] = useState(false)
  const [selectedResponse, setSelectedResponse] = useState<OrderResponse | null>(null)
  const [userResponse, setUserResponse] = useState<OrderResponse | null>(null)
  const [showProModal, setShowProModal] = useState(false)
  const [proCountdownText, setProCountdownText] = useState<string | undefined>(undefined)
  const [disableMasterRestrictions, setDisableMasterRestrictions] = useState(false)
  const [showOrderMapModal, setShowOrderMapModal] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (params.id && user) {
      fetchOrder()
      fetchResponses()
      checkUserResponse()
    }
  }, [params.id, user])

  useEffect(() => {
    fetch('/api/pro/settings')
      .then((r) => r.json())
      .then((d) => setDisableMasterRestrictions(!!d?.disableMasterRestrictions))
      .catch(() => {})
  }, [])

  // Keyboard navigation for images
  useEffect(() => {
    if (!order) return
    
    const images = order.images || []
    if (images.length <= 1) return

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        setActiveImage((prev) => (prev - 1 + images.length) % images.length)
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        setActiveImage((prev) => (prev + 1) % images.length)
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [order])

  const fetchOrder = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          client:profiles!client_id(id, full_name, avatar_url, city, phone, description, email)
        `)
        .eq('id', params.id)
        .single()

      if (error) throw error
      setOrder(data as Order)
    } catch (error) {
      console.error('Error fetching order:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchResponses = async () => {
    if (!params.id) return
    try {
      const { data, error } = await supabase
        .from('order_responses')
        .select(`
          *,
          master:profiles!master_id(id, full_name, avatar_url, city, phone)
        `)
        .eq('order_id', params.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setResponses((data || []) as OrderResponse[])
    } catch (error) {
      console.error('Error fetching responses:', error)
    }
  }

  const checkUserResponse = async () => {
    if (!user || !params.id || user.role !== 'master') return
    try {
      const { data } = await supabase
        .from('order_responses')
        .select('*')
        .eq('order_id', params.id)
        .eq('master_id', user.id)
        .maybeSingle()
      
      if (data) {
        setUserResponse(data as OrderResponse)
      }
    } catch (error) {
      console.error('Error checking user response:', error)
    }
  }

  const handleRespond = async (price: string, message: string) => {
    if (!user || !order) return

    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    if (!token) {
      throw new Error('Не авторизован')
    }

    const response = await fetch(`/api/orders/${order.id}/respond`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ price, message })
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Ошибка при отправке отклика')
    }

    // Обновляем список откликов и проверяем свой отклик
    await fetchResponses()
    await checkUserResponse()
  }

  const handleAcceptResponse = async () => {
    if (!selectedResponse || !user) return

    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    if (!token) {
      throw new Error('Не авторизован')
    }

    const response = await fetch(`/api/orders/responses/${selectedResponse.id}/accept`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Ошибка при принятии отклика')
    }

    // Обновляем заказ и отклики
    await fetchOrder()
    await fetchResponses()
    setShowAcceptModal(false)
    setSelectedResponse(null)
  }

  const handleRejectResponse = async (responseId: string) => {
    if (!user) return

    // Отклонение отклика (пока просто обновляем статус через Supabase)
    // В будущем можно добавить отдельный endpoint
    try {
      const { error } = await supabase
        .from('order_responses')
        .update({ status: 'rejected' })
        .eq('id', responseId)

      if (error) throw error

      await fetchResponses()
    } catch (error) {
      console.error('Error rejecting response:', error)
      alert('Ошибка при отклонении отклика')
    }
  }

  const handleContact = async () => {
    if (!user || !order) return

    const client = order.client as any
    if (!client) return

    try {
      // Check if chat already exists
      let chatId: string
      const { data: existingChat } = await supabase
        .from('chats')
        .select('id')
        .or(`and(user1_id.eq.${user.id},user2_id.eq.${client.id}),and(user1_id.eq.${client.id},user2_id.eq.${user.id})`)
        .maybeSingle()

      if (existingChat) {
        chatId = existingChat.id
      } else {
        // Create new chat
        const { data, error } = await supabase
          .from('chats')
          .insert({
            user1_id: user.id,
            user2_id: client.id,
          })
          .select()
          .single()

        if (error) throw error
        if (!data) throw new Error('Failed to create chat')
        chatId = data.id
      }

      // Формируем карточку заказа
      const images = order.images || []
      const firstImage = images.length > 0 ? images[0] : null
      
      // Формируем структурированное сообщение с карточкой заказа
      let orderCardMessage = `📋 **${order.title}**\n\n`
      orderCardMessage += `${order.description}\n\n`
      
      if (order.category) {
        orderCardMessage += `🏷️ Категория: ${order.category}\n`
      }
      
      if (order.budget) {
        orderCardMessage += `💰 Бюджет: ${order.budget.toLocaleString('ru-RU')} ₽\n`
      }
      
      if (order.location) {
        orderCardMessage += `📍 Адрес: ${order.location}`
        if (order.city) {
          orderCardMessage += `, ${order.city}`
        }
        orderCardMessage += `\n`
      }
      
      orderCardMessage += `\n🔗 Ссылка: ${typeof window !== 'undefined' ? window.location.origin : ''}/orders/${order.id}`

      // Отправляем сообщение с карточкой заказа
      const messageData: any = {
        chat_id: chatId,
        sender_id: user.id,
        content: orderCardMessage,
        read: false,
      }

      // Если есть изображение, добавляем его
      if (firstImage) {
        messageData.image_url = firstImage
      }

      const { error: messageError } = await supabase
        .from('messages')
        .insert(messageData)

      if (messageError) {
        console.error('Error sending message:', messageError)
        // Все равно переходим в чат, даже если сообщение не отправилось
      }

      // Переходим в чат
      router.push(`/chats/${chatId}`)
    } catch (error) {
      console.error('Error starting chat:', error)
      alert('Ошибка при создании чата. Попробуйте еще раз.')
    }
  }

  // Touch handlers for image swiping
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches && e.touches.length > 0) {
      touchStartX.current = e.touches[0].clientX
    }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!order) return
    // В touchEnd используем changedTouches, так как touches уже пуст
    if (e.changedTouches && e.changedTouches.length > 0) {
      touchEndX.current = e.changedTouches[0].clientX
      handleSwipe()
    }
  }

  const handleSwipe = () => {
    if (!order) return
    const images = order.images || []
    if (images.length <= 1) return

    const diff = touchStartX.current - touchEndX.current
    const threshold = 50

    if (Math.abs(diff) > threshold) {
      if (diff > 0) {
        // Swipe left - next image
        setActiveImage((prev) => (prev + 1) % images.length)
      } else {
        // Swipe right - previous image
        setActiveImage((prev) => (prev - 1 + images.length) % images.length)
      }
    }
  }

  const nextImage = () => {
    if (!order) return
    const images = order.images || []
    if (images.length <= 1) return
    setActiveImage((prev) => (prev + 1) % images.length)
  }

  const prevImage = () => {
    if (!order) return
    const images = order.images || []
    if (images.length <= 1) return
    setActiveImage((prev) => (prev - 1 + images.length) % images.length)
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] max-w-lg mx-auto w-full pb-24 flex items-center justify-center">
        <div className="grid grid-cols-2 gap-3 px-4 w-full">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl h-32 border border-[#f0f0f0] animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (!order || !user) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] max-w-lg mx-auto w-full pb-24 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-lg font-medium text-[#111] mb-2">Заказ не найден</p>
          <Link href="/orders" className="text-[#e63946] font-semibold text-sm">
            Вернуться к списку заказов
          </Link>
        </div>
      </div>
    )
  }

  const client = order.client as any
  const images = order.images || []
  const timeAgo = format(new Date(order.created_at), 'd MMMM в HH:mm', { locale: ru })
  const isToday = new Date(order.created_at).toDateString() === new Date().toDateString()
  const isYesterday = new Date(order.created_at).toDateString() === new Date(Date.now() - 86400000).toDateString()
  
  let timeDisplay = timeAgo
  if (isToday) {
    timeDisplay = `Сегодня в ${format(new Date(order.created_at), 'HH:mm', { locale: ru })}`
  } else if (isYesterday) {
    timeDisplay = `Вчера в ${format(new Date(order.created_at), 'HH:mm', { locale: ru })}`
  }

  const isOwnOrder = user.id === order.client_id
  const access = getMasterAccess(user)
  const isRestrictedMaster = user.role === 'master' && !disableMasterRestrictions && !access.isPro && !access.isTrial
  const statusCfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.new
  const canActOnResponses =
    isOwnOrder &&
    (order.status === 'open' || order.status === 'new') &&
    !order.selected_master_id

  return (
    <div className="min-h-screen bg-[#f5f5f7] max-w-lg mx-auto w-full pb-24">
      <Navbar />

      <div className="bg-white border-b border-[#f0f0f0] px-4 pt-3 pb-4">
        <div className="flex items-center gap-2 mb-3">
          <Link href="/orders" className="text-[#e63946] text-xl leading-none" aria-label="Назад">
            ←
          </Link>
          <h1 className="text-[15px] font-extrabold text-[#111] flex-1 truncate">{order.title}</h1>
          <span className={`text-[8px] font-bold px-2 py-1 rounded-full flex-shrink-0 ${statusCfg.pill}`}>
            {statusCfg.label}
          </span>
        </div>
        <div className="bg-[#f5f5f7] rounded-xl px-3 py-2.5 flex items-center justify-between gap-2">
          <div>
            <p className="text-[9px] text-[#aaa] mb-0.5">Бюджет</p>
            <p className="text-[13px] font-bold text-[#e63946]">
              {order.budget ? `до ${order.budget.toLocaleString('ru-RU')} ₽` : 'Не указан'}
            </p>
          </div>
          {isOwnOrder && (
            <div className="text-right">
              <p className="text-[9px] text-[#aaa] mb-0.5">Откликов</p>
              <p className="text-[13px] font-bold text-[#111]">{responses.length}</p>
            </div>
          )}
          <div className="text-right">
            <p className="text-[9px] text-[#aaa] mb-0.5">Размещён</p>
            <p className="text-[11px] font-semibold text-[#111]">{formatOrderDate(order.created_at)}</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4">

          {/* Images Gallery */}
          {images.length > 0 && (
            <div className="card mb-6 p-0 overflow-hidden">
              <div
                ref={imageContainerRef}
                className="relative w-full bg-bg-secondary"
                style={{ aspectRatio: '16/9' }}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
              >
                {images.map((img, idx) => (
                  <img
                    key={idx}
                    src={img}
                    alt={`Order image ${idx + 1}`}
                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
                      idx === activeImage ? 'opacity-100' : 'opacity-0'
                    }`}
                  />
                ))}

                {/* Navigation Arrows */}
                {images.length > 1 && (
                  <>
                    <button
                      onClick={prevImage}
                      className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
                      aria-label="Previous image"
                    >
                      <FiChevronLeft size={24} />
                    </button>
                    <button
                      onClick={nextImage}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
                      aria-label="Next image"
                    >
                      <FiChevronRight size={24} />
                    </button>

                    {/* Image Indicators */}
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                      {images.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setActiveImage(idx)}
                          className={`w-2 h-2 rounded-full transition-all ${
                            idx === activeImage ? 'bg-white w-6' : 'bg-white/50'
                          }`}
                          aria-label={`Go to image ${idx + 1}`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Order Info */}
          <div className="card mb-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h1 className="text-3xl font-semibold text-text-primary mb-3">
                  {order.title}
                </h1>
                <div className="flex items-center gap-4 text-sm text-text-secondary mb-4">
                  <div className="flex items-center gap-1">
                    <FiClock size={16} />
                    <span>{timeDisplay}</span>
                  </div>
                  <span className={`px-3 py-1 text-xs font-medium border rounded-lg ${statusColors[order.status]}`}>
                    {statusLabels[order.status]}
                  </span>
                  <span className="px-3 py-1 border border-border-color text-xs font-normal rounded-lg bg-bg-secondary">
                    {order.category}
                  </span>
                </div>
              </div>
            </div>

            <p className="text-text-primary mb-6 leading-relaxed text-base whitespace-pre-wrap">
              {order.description}
            </p>

            {/* Order Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6 border-t border-border-color">
              {(typeof (order as any)?.lat === 'number' && typeof (order as any)?.lng === 'number') ? (
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <FiMapPin size={20} className="text-text-primary mt-1 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-text-secondary mb-1">Место выполнения работ</div>
                      {(order as any)?.geocode_label ? (
                        <div className="text-base text-text-primary font-medium mb-2">
                          {(order as any).geocode_label}
                        </div>
                      ) : null}
                      <div className="text-xs text-text-secondary mb-3">
                        Координаты: {(order as any).lat.toFixed(6)}, {(order as any).lng.toFixed(6)}
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowOrderMapModal(true)}
                        className="inline-flex items-center gap-2 text-sm font-semibold text-brand-accent hover:underline"
                        title="Открыть этот заказ на карте"
                      >
                        <FiMapPin size={16} />
                        Открыть на карте
                      </button>
                    </div>
                  </div>
                  {/* Мини-карта */}
                  <div className="h-48 w-full rounded-lg overflow-hidden border border-border-light/60">
                    <iframe
                      width="100%"
                      height="100%"
                      frameBorder="0"
                      scrolling="no"
                      marginHeight={0}
                      marginWidth={0}
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${(order as any).lng - 0.01},${(order as any).lat - 0.01},${(order as any).lng + 0.01},${(order as any).lat + 0.01}&layer=mapnik&marker=${(order as any).lat},${(order as any).lng}`}
                      className="w-full h-full"
                    />
                  </div>
                </div>
              ) : null}
              {order.budget && (
                <div className="flex items-start gap-3">
                  <div>
                    <div className="text-sm font-medium text-text-secondary mb-1">Бюджет</div>
                    <div className="text-2xl font-semibold text-brand-accent">
                      {order.budget.toLocaleString('ru-RU')} ₽
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Response Button for Masters */}
          {!isOwnOrder && user.role === 'master' && (order.status === 'open' || order.status === 'new') && !order.selected_master_id && (
            <div className="card mb-6">
              {userResponse ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FiCheckCircle size={24} className="text-green-600" />
                    <div>
                      <div className="font-semibold text-text-primary">Вы откликнулись на этот заказ</div>
                      <div className="text-sm text-text-secondary">
                        Статус: {userResponse.status === 'pending' ? 'Ожидает решения' : userResponse.status === 'accepted' ? 'Принят' : 'Отклонен'}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-text-primary mb-1">Готовы взяться за этот заказ?</div>
                    <div className="text-sm text-text-secondary">Откликнитесь с вашей ценой и описанием подхода</div>
                  </div>
                  <button
                    onClick={async () => {
                      // Ограничение: 1 отклик в 3 дня для не-PRO после пробной недели
                      if (isRestrictedMaster) {
                        try {
                          const { data: lastResp } = await supabase
                            .from('order_responses')
                            .select('created_at')
                            .eq('master_id', user.id)
                            .order('created_at', { ascending: false })
                            .limit(1)
                            .maybeSingle()

                          const remainingMs = getCooldownRemainingMs(lastResp?.created_at || null, 3)
                          if (remainingMs > 0) {
                            const r = formatRemaining(remainingMs)
                            setProCountdownText(`Осталось до следующего отклика: ${r.days}д ${r.hours}ч ${r.minutes}м`)
                            setShowProModal(true)
                            return
                          }
                        } catch (e) {
                          console.error('Cooldown check failed:', e)
                        }
                      }
                      setShowResponseModal(true)
                    }}
                    className="btn btn-primary flex items-center gap-2"
                  >
                    <FiBriefcase size={18} />
                    <span>Откликнуться</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Status Message for Closed Orders */}
          {!isOwnOrder && user.role === 'master' && order.status !== 'open' && order.status !== 'new' && (
            <div className="card mb-6 bg-bg-secondary border border-border-color">
              <div className="text-text-secondary text-center py-4">
                {order.status === 'in_progress' 
                  ? 'На данный заказ уже найден исполнитель'
                  : 'Этот заказ больше не принимает отклики'}
              </div>
            </div>
          )}

          {/* Client Info */}
          {client && (
            <div className="card mb-6">
              <h2 className="text-xl font-semibold text-text-primary mb-4">Клиент</h2>
              {isRestrictedMaster && !isOwnOrder && (
                <div className="mb-4 text-sm text-text-secondary bg-bg-secondary/60 border border-border-light/60 rounded-lg p-3">
                  ФИО клиента скрыто по вашему тарифу. Оформите <span className="font-semibold text-brand-accent">PRO</span>, чтобы видеть данные клиента.
                </div>
              )}
              <div className="flex items-start gap-4">
                {!isRestrictedMaster && client.avatar_url ? (
                  <img
                    src={client.avatar_url}
                    alt={client.full_name}
                    className="w-16 h-16 object-cover border-2 border-border-color rounded-full flex-shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 bg-text-primary flex items-center justify-center text-white text-xl font-semibold border-2 border-border-color rounded-full flex-shrink-0">
                    {isRestrictedMaster ? '•' : (client.full_name?.[0]?.toUpperCase() || '?')}
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-text-primary mb-1">
                    {isRestrictedMaster && !isOwnOrder ? 'Клиент (скрыто)' : (client.full_name || 'Клиент')}
                  </h3>
                  {client.city && (
                    <div className="flex items-center gap-1 text-sm text-text-secondary mb-2">
                      <FiMapPin size={14} />
                      <span>{client.city}</span>
                    </div>
                  )}
                  {client.description && (
                    <p className="text-sm text-text-secondary leading-relaxed">
                      {client.description}
                    </p>
                  )}
                </div>
                {!isOwnOrder && order.status === 'in_progress' && order.selected_master_id === user.id && (
                  <button
                    onClick={handleContact}
                    className="btn btn-primary flex items-center gap-2 flex-shrink-0"
                  >
                    <FiMessageCircle size={18} />
                    <span>Чат</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {isOwnOrder && (
            <>
              <p className="text-[12px] font-bold text-[#111] mb-3">Отклики мастеров</p>
              {responses.length === 0 ? (
                <div className="text-center py-10 text-[#888] text-sm">
                  <FiBriefcase size={40} className="mx-auto mb-3 opacity-40" />
                  <p>Пока нет откликов на этот заказ</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3 mb-6">
                  {responses.map((response) => (
                    <OrderResponseCard
                      key={response.id}
                      response={response}
                      orderId={order.id}
                      canAct={canActOnResponses}
                      onAccept={() => {
                        setSelectedResponse(response)
                        setShowAcceptModal(true)
                      }}
                      onReject={() => handleRejectResponse(response.id)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
      </div>

      {/* Modals */}
      <OrderResponseModal
        isOpen={showResponseModal}
        onClose={() => setShowResponseModal(false)}
        onSubmit={handleRespond}
        orderTitle={order.title}
      />

      <AcceptResponseModal
        isOpen={showAcceptModal}
        onClose={() => {
          setShowAcceptModal(false)
          setSelectedResponse(null)
        }}
        onConfirm={handleAcceptResponse}
        masterName={(selectedResponse?.master as any)?.full_name || 'Мастер'}
        price={selectedResponse?.price}
      />

      <ProUpgradeModal
        isOpen={showProModal}
        onClose={() => setShowProModal(false)}
        title="Ограничения тарифа"
        description="После пробной недели без PRO вы можете оставлять отклик не чаще 1 раза в 3 дня. Оформите PRO, чтобы снять ограничение."
        countdownText={proCountdownText}
        ctaText="Купить PRO мастер"
      />

      {showOrderMapModal && order?.lat != null && order?.lng != null && (
        <StoreLocationMapModal
          isOpen={true}
          onClose={() => setShowOrderMapModal(false)}
          lat={order.lat}
          lng={order.lng}
          address={(order as any).geocode_label || `Координаты: ${order.lat.toFixed(6)}, ${order.lng.toFixed(6)}`}
          title="Место выполнения работ"
        />
      )}
    </div>
  )
}

