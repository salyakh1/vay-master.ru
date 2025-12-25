'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/app/providers'
import { supabase, Order, OrderResponse, User } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import { FiMessageCircle, FiMapPin, FiDollarSign, FiClock, FiUser, FiChevronLeft, FiChevronRight, FiArrowLeft } from 'react-icons/fi'
import Link from 'next/link'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

const statusLabels: Record<string, string> = {
  new: 'Новый',
  in_progress: 'В работе',
  completed: 'Выполнен',
  cancelled: 'Отменен',
}

const statusColors: Record<string, string> = {
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

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (params.id) {
      fetchOrder()
      fetchResponses()
    }
  }, [params.id])

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

  const handleContact = async () => {
    if (!user || !order) return

    const client = order.client as any
    if (!client) return

    try {
      // Check if chat already exists
      const { data: existingChat } = await supabase
        .from('chats')
        .select('id')
        .or(`and(user1_id.eq.${user.id},user2_id.eq.${client.id}),and(user1_id.eq.${client.id},user2_id.eq.${user.id})`)
        .maybeSingle()

      if (existingChat) {
        router.push(`/chats/${existingChat.id}`)
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
        if (data) {
          router.push(`/chats/${data.id}`)
        }
      }
    } catch (error) {
      console.error('Error starting chat:', error)
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
          <div className="text-4xl mb-4">📋</div>
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
                  <FiDollarSign size={20} className="text-text-primary mt-1 flex-shrink-0" />
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
                {!isOwnOrder && (
                  <button
                    onClick={handleContact}
                    className="btn btn-primary flex items-center gap-2 flex-shrink-0"
                  >
                    <FiMessageCircle size={18} />
                    <span>Написать</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Responses Section */}
          {responses.length > 0 && (
            <div className="card">
              <h2 className="text-xl font-semibold text-text-primary mb-4">
                Отклики мастеров ({responses.length})
              </h2>
              <div className="space-y-4">
                {responses.map((response) => {
                  const master = response.master as any
                  return (
                    <div
                      key={response.id}
                      className="border border-border-color rounded-lg p-4 bg-bg-secondary"
                    >
                      <div className="flex items-start gap-3 mb-3">
                        {master?.avatar_url ? (
                          <img
                            src={master.avatar_url}
                            alt={master.full_name}
                            className="w-12 h-12 object-cover border border-border-color rounded-full flex-shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-text-primary flex items-center justify-center text-white text-sm font-semibold border border-border-color rounded-full flex-shrink-0">
                            {master?.full_name?.[0]?.toUpperCase() || '?'}
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-semibold text-text-primary">
                              {master?.full_name || 'Мастер'}
                            </h4>
                            {response.price && (
                              <div className="text-lg font-semibold text-brand-accent">
                                {response.price.toLocaleString('ru-RU')} ₽
                              </div>
                            )}
                          </div>
                          {master?.city && (
                            <div className="text-sm text-text-secondary mb-2">{master.city}</div>
                          )}
                          <p className="text-sm text-text-primary leading-relaxed">
                            {response.message}
                          </p>
                          <div className="text-xs text-text-secondary mt-2">
                            {format(new Date(response.created_at), 'd MMMM в HH:mm', { locale: ru })}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

