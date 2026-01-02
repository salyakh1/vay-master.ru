'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/app/providers'
import { supabase, Order, OrderResponse, User } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import { FiMessageCircle, FiMapPin, FiClock, FiUser, FiChevronLeft, FiChevronRight, FiArrowLeft, FiCheckCircle, FiXCircle, FiBriefcase } from 'react-icons/fi'
import Link from 'next/link'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import OrderResponseModal from '@/components/OrderResponseModal'
import AcceptResponseModal from '@/components/AcceptResponseModal'

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
      <div className="min-h-screen bg-bg-primary pb-20 flex items-center justify-center">
        <div className="text-lg text-text-secondary">Загрузка...</div>
      </div>
    )
  }

  if (!order || !user) {
    return (
      <div className="min-h-screen bg-bg-primary pb-20 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium text-text-primary mb-2">Заказ не найден</p>
          <Link href="/orders" className="text-brand-accent hover:underline">
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

  return (
    <div className="min-h-screen bg-bg-primary pb-20">
      <Navbar />
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto">
          {/* Back Button */}
          <Link
            href="/orders"
            className="inline-flex items-center gap-2 text-text-secondary hover:text-text-primary mb-6 transition-colors"
          >
            <FiArrowLeft size={20} />
            <span>Назад к заказам</span>
          </Link>

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
              {order.location && (
                <div className="flex items-start gap-3">
                  <FiMapPin size={20} className="text-text-primary mt-1 flex-shrink-0" />
                  <div>
                    <div className="text-sm font-medium text-text-secondary mb-1">Адрес</div>
                    <div className="text-base text-text-primary">{order.location}</div>
                    {order.city && (
                      <div className="text-sm text-text-secondary mt-1">{order.city}</div>
                    )}
                  </div>
                </div>
              )}
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
                    onClick={() => setShowResponseModal(true)}
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
              <div className="flex items-start gap-4">
                {client.avatar_url ? (
                  <img
                    src={client.avatar_url}
                    alt={client.full_name}
                    className="w-16 h-16 object-cover border-2 border-border-color rounded-full flex-shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 bg-text-primary flex items-center justify-center text-white text-xl font-semibold border-2 border-border-color rounded-full flex-shrink-0">
                    {client.full_name?.[0]?.toUpperCase() || '?'}
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-text-primary mb-1">
                    {client.full_name || 'Клиент'}
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

          {/* Responses Section - Only for Order Owner */}
          {isOwnOrder && (
            <div className="card">
              <h2 className="text-xl font-semibold text-text-primary mb-4">
                Отклики мастеров ({responses.length})
                {order.status === 'open' || order.status === 'new' ? (
                  <span className="text-sm font-normal text-text-secondary ml-2">
                    (максимум 30)
                  </span>
                ) : null}
              </h2>
              {responses.length === 0 ? (
                <div className="text-center py-8 text-text-secondary">
                  <FiBriefcase size={48} className="mx-auto mb-4 opacity-50" />
                  <p>Пока нет откликов на этот заказ</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {responses.map((response) => {
                    const master = response.master as any
                    const isAccepted = response.status === 'accepted'
                    const isRejected = response.status === 'rejected'
                    const isPending = response.status === 'pending'
                    
                    return (
                      <div
                        key={response.id}
                        className={`border rounded-lg p-4 ${
                          isAccepted 
                            ? 'bg-green-50 border-green-300' 
                            : isRejected
                            ? 'bg-gray-50 border-gray-300 opacity-60'
                            : 'bg-bg-secondary border-border-color'
                        }`}
                      >
                        <div className="flex items-start gap-3 mb-3">
                          <Link href={`/profile/${master?.id}?returnTo=/orders/${params.id}`}>
                            {master?.avatar_url ? (
                              <img
                                src={master.avatar_url}
                                alt={master.full_name}
                                className="w-12 h-12 object-cover border border-border-color rounded-full flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                              />
                            ) : (
                              <div className="w-12 h-12 bg-text-primary flex items-center justify-center text-white text-sm font-semibold border border-border-color rounded-full flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity">
                                {master?.full_name?.[0]?.toUpperCase() || '?'}
                              </div>
                            )}
                          </Link>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <Link href={`/profile/${master?.id}?returnTo=/orders/${params.id}`} className="hover:text-brand-accent transition-colors">
                                <h4 className="font-semibold text-text-primary">
                                  {master?.full_name || 'Мастер'}
                                </h4>
                              </Link>
                              <div className="flex items-center gap-3">
                                {response.price && (
                                  <div className="text-lg font-semibold text-brand-accent">
                                    {response.price.toLocaleString('ru-RU')} ₽
                                  </div>
                                )}
                                {isAccepted && (
                                  <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 border border-green-300 rounded">
                                    Принят
                                  </span>
                                )}
                                {isRejected && (
                                  <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 border border-gray-300 rounded">
                                    Отклонен
                                  </span>
                                )}
                              </div>
                            </div>
                            {master?.city && (
                              <div className="text-sm text-text-secondary mb-2">{master.city}</div>
                            )}
                            <p className="text-sm text-text-primary leading-relaxed mb-2">
                              {response.message}
                            </p>
                            <div className="text-xs text-text-secondary">
                              {format(new Date(response.created_at), 'd MMMM в HH:mm', { locale: ru })}
                            </div>
                          </div>
                        </div>
                        
                        {/* Action Buttons - Only for pending responses when order is open */}
                        {isPending && (order.status === 'open' || order.status === 'new') && !order.selected_master_id && (
                          <div className="flex gap-3 pt-3 border-t border-border-color">
                            <button
                              onClick={() => {
                                setSelectedResponse(response)
                                setShowAcceptModal(true)
                              }}
                              className="flex-1 btn btn-primary flex items-center justify-center gap-2"
                            >
                              <FiCheckCircle size={18} />
                              <span>Принять</span>
                            </button>
                            <button
                              onClick={() => handleRejectResponse(response.id)}
                              className="flex-1 btn btn-secondary flex items-center justify-center gap-2"
                            >
                              <FiXCircle size={18} />
                              <span>Отклонить</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
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
    </div>
  )
}

