'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useAuth } from '@/app/providers'
import { supabase, Order, OrderResponse } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import { FiMessageCircle, FiMapPin, FiCheckCircle } from 'react-icons/fi'
import Link from 'next/link'
import { formatRemaining, getCooldownRemainingMs, getMasterAccess } from '@/lib/masterAccess'
import OrderResponseCard from '@/components/orders/OrderResponseCard'
import { STATUS_CONFIG, formatOrderDate } from '@/components/orders/order-utils'

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
        setActiveImage((prev) => (prev + 1) % images.length)
      } else {
        setActiveImage((prev) => (prev - 1 + images.length) % images.length)
      }
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#F4F4F4] max-w-lg mx-auto w-full pb-24 flex items-center justify-center">
        <div className="grid grid-cols-2 gap-2 px-3.5 w-full">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="bg-white rounded-[14px] h-28 border border-[#F0F0F0] animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (!order || !user) {
    return (
      <div className="min-h-screen bg-[#F4F4F4] max-w-lg mx-auto w-full pb-24 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-[14px] font-medium text-[#111] mb-2">Заказ не найден</p>
          <Link href="/orders" className="text-brand-accent font-medium text-[13px]">
            Вернуться к списку заказов
          </Link>
        </div>
      </div>
    )
  }

  const images = order.images || []
  const isOwnOrder = user.id === order.client_id
  const access = getMasterAccess(user)
  const isRestrictedMaster = user.role === 'master' && !disableMasterRestrictions && !access.isPro && !access.isTrial
  const statusCfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.new
  const canActOnResponses =
    isOwnOrder &&
    (order.status === 'open' || order.status === 'new') &&
    !order.selected_master_id

  const locationLabel =
    (order as any).geocode_label ||
    [order.city, order.location].filter(Boolean).join(', ') ||
    'Адрес не указан'
  const hasCoords = typeof order.lat === 'number' && typeof order.lng === 'number'

  return (
    <div className="min-h-screen bg-[#F4F4F4] max-w-lg mx-auto w-full pb-24">
      <Navbar />

      <div className="bg-white px-3.5 pt-3 pb-3.5 border-b border-[#F0F0F0]">
        <div className="flex items-center gap-2 mb-2.5">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-[#111] text-lg leading-none"
            aria-label="Назад"
          >
            ←
          </button>
          <h1 className="text-[14px] font-medium text-[#111] flex-1 truncate">{order.title}</h1>
          <span className={`text-[9px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${statusCfg.pill}`}>
            {statusCfg.label}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          <div className="bg-[#F4F4F4] rounded-[10px] py-2 px-1 text-center">
            <p className="text-[12px] font-medium text-brand-accent leading-none">
              {order.budget ? `до ${order.budget.toLocaleString('ru-RU')} ₽` : '—'}
            </p>
            <p className="text-[8px] text-[#9ca3af] mt-1">бюджет</p>
          </div>
          <div className="bg-[#F4F4F4] rounded-[10px] py-2 px-1 text-center">
            <p className="text-[12px] font-medium text-[#111] leading-none">{responses.length}</p>
            <p className="text-[8px] text-[#9ca3af] mt-1">откликов</p>
          </div>
          <div className="bg-[#F4F4F4] rounded-[10px] py-2 px-1 text-center">
            <p className="text-[12px] font-medium text-[#111] leading-none">{formatOrderDate(order.created_at)}</p>
            <p className="text-[8px] text-[#9ca3af] mt-1">размещён</p>
          </div>
        </div>
      </div>

      <div className="px-3.5 py-3.5">
        {images.length > 0 && (
          <div
            ref={imageContainerRef}
            className="relative h-[160px] rounded-[14px] overflow-hidden bg-[#E8E8E8] mb-2.5"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <img
              src={images[activeImage]}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
            {images.length > 1 && (
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                {images.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveImage(idx)}
                    className={`h-1 rounded-full ${idx === activeImage ? 'w-3.5 bg-white' : 'w-1 bg-white/50'}`}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        <div className="bg-white rounded-[14px] p-3.5 mb-2.5">
          <p className="text-[11px] font-medium text-[#9ca3af] uppercase mb-1.5">Описание</p>
          <p className="text-[12px] text-[#374151] leading-relaxed mb-2.5 whitespace-pre-wrap">{order.description}</p>
          {order.category && (
            <span className="inline-block bg-[#F4F4F4] text-[#374151] text-[10px] px-2.5 py-1 rounded-full">
              {order.category}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => hasCoords && setShowOrderMapModal(true)}
          className="w-full bg-white rounded-[14px] p-3.5 mb-3.5 flex items-center gap-2.5 text-left"
        >
          <FiMapPin size={18} className="text-brand-accent flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-[11px] text-[#9ca3af] mb-0.5">Место выполнения</p>
            <p className="text-[12px] text-[#111] font-medium truncate">{locationLabel}</p>
          </div>
        </button>

        {!isOwnOrder && user.role === 'master' && (order.status === 'open' || order.status === 'new') && !order.selected_master_id && (
          <div className="bg-white rounded-[14px] p-3.5 mb-3.5">
            {userResponse ? (
              <div className="flex items-center gap-2">
                <FiCheckCircle size={18} className="text-[#22a85e]" />
                <div>
                  <p className="text-[12px] font-medium text-[#111]">Вы уже откликнулись</p>
                  <p className="text-[10px] text-[#9ca3af]">
                    {userResponse.status === 'pending'
                      ? 'Ожидает решения'
                      : userResponse.status === 'accepted'
                        ? 'Принят'
                        : 'Отклонён'}
                  </p>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={async () => {
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
                      console.error(e)
                    }
                  }
                  setShowResponseModal(true)
                }}
                className="w-full bg-brand-accent text-white text-[13px] font-medium py-2.5 rounded-[10px]"
              >
                Откликнуться
              </button>
            )}
          </div>
        )}

        {!isOwnOrder && user.role === 'master' && order.status !== 'open' && order.status !== 'new' && (
          <div className="bg-white rounded-[14px] p-3.5 mb-3.5 text-center text-[12px] text-[#9ca3af]">
            {order.status === 'in_progress'
              ? 'На этот заказ уже найден исполнитель'
              : 'Этот заказ больше не принимает отклики'}
          </div>
        )}

        {!isOwnOrder && order.status === 'in_progress' && order.selected_master_id === user.id && (
          <button
            type="button"
            onClick={handleContact}
            className="w-full mb-3.5 bg-brand-accent text-white text-[13px] font-medium py-2.5 rounded-[10px] flex items-center justify-center gap-1.5"
          >
            <FiMessageCircle size={16} />
            Чат с клиентом
          </button>
        )}

        {isOwnOrder && (
          <>
            <p className="text-[12px] font-medium text-[#111] mb-2">
              Отклики мастеров · {responses.length}
            </p>
            {responses.length === 0 ? (
              <div className="bg-white rounded-[14px] p-6 text-center text-[12px] text-[#9ca3af]">
                Пока нет откликов
              </div>
            ) : (
              responses.map((response) => (
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
              ))
            )}
          </>
        )}
      </div>

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
          address={locationLabel}
          title="Место выполнения работ"
        />
      )}
    </div>
  )
}

