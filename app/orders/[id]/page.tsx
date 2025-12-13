'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '../../providers'
import { supabase, Order, OrderResponse } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import Link from 'next/link'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { FiMapPin, FiClock, FiDollarSign, FiUser, FiMessageCircle, FiCheck, FiX } from 'react-icons/fi'

export default function OrderDetailPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const orderId = params.id as string

  const [order, setOrder] = useState<Order | null>(null)
  const [responses, setResponses] = useState<OrderResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [responseLoading, setResponseLoading] = useState(false)
  const [showResponseForm, setShowResponseForm] = useState(false)
  const [responsePrice, setResponsePrice] = useState('')
  const [responseMessage, setResponseMessage] = useState('')

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user && orderId) {
      fetchOrder()
      fetchResponses()
    }
  }, [user, orderId])

  const fetchOrder = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`*, client:profiles!client_id(id, full_name, avatar_url, city, phone, role)`)
        .eq('id', orderId)
        .single()

      if (error) throw error
      setOrder(data)
    } catch (error) {
      console.error('Error fetching order:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchResponses = async () => {
    try {
      const { data, error } = await supabase
        .from('order_responses')
        .select(`*, master:profiles(id, full_name, avatar_url, city, phone, role, description)`)
        .eq('order_id', orderId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setResponses(data || [])
    } catch (error) {
      console.error('Error fetching responses:', error)
    }
  }

  const handleSubmitResponse = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || user.role !== 'master' || !responseMessage.trim()) {
      alert('Только мастера могут откликаться на заказы')
      return
    }

    // Проверяем, не откликался ли уже мастер
    const existingResponse = responses.find((r) => r.master_id === user.id)
    if (existingResponse) {
      alert('Вы уже откликнулись на этот заказ')
      return
    }

    setResponseLoading(true)
    try {
      const { error } = await supabase
        .from('order_responses')
        .insert({
          order_id: orderId,
          master_id: user.id,
          price: responsePrice ? parseFloat(responsePrice) : null,
          message: responseMessage.trim(),
          status: 'pending',
        })

      if (error) throw error

      setResponsePrice('')
      setResponseMessage('')
      setShowResponseForm(false)
      fetchResponses()
    } catch (error) {
      console.error('Error submitting response:', error)
      alert('Ошибка при отправке отклика')
    } finally {
      setResponseLoading(false)
    }
  }

  const handleAcceptResponse = async (responseId: string) => {
    if (!user || !order || order.client_id !== user.id) {
      return
    }

    try {
      // Обновляем статус отклика
      const { error: responseError } = await supabase
        .from('order_responses')
        .update({ status: 'accepted' })
        .eq('id', responseId)

      if (responseError) throw responseError

      // Отклоняем остальные отклики
      const { error: rejectError } = await supabase
        .from('order_responses')
        .update({ status: 'rejected' })
        .eq('order_id', orderId)
        .neq('id', responseId)

      if (rejectError) throw rejectError

      // Обновляем заказ
      const response = responses.find((r) => r.id === responseId)
      if (response) {
        const { error: orderError } = await supabase
          .from('orders')
          .update({
            status: 'in_progress',
            selected_master_id: response.master_id,
          })
          .eq('id', orderId)

        if (orderError) throw orderError
      }

      fetchOrder()
      fetchResponses()
    } catch (error) {
      console.error('Error accepting response:', error)
      alert('Ошибка при принятии отклика')
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-white pb-20 flex items-center justify-center">
        <div className="text-sm text-gray-600">Загрузка...</div>
      </div>
    )
  }

  if (!user || !order) {
    return null
  }

  const isOwner = order.client_id === user.id
  const isMaster = user.role === 'master'
  const hasResponded = responses.some((r) => r.master_id === user.id)
  const canRespond = isMaster && !isOwner && !hasResponded && order.status === 'new'

  return (
    <div className="min-h-screen bg-white pb-20">
      <Navbar />
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto">
          <Link
            href="/orders"
            className="text-black hover:text-gray-600 mb-4 inline-block font-medium text-sm"
          >
            ← Назад к заказам
          </Link>

          {/* Order Details */}
          <div className="card mb-6 animate-fade-in">
            <div className="flex items-start justify-between mb-4">
              <h1 className="text-2xl font-bold text-black">{order.title}</h1>
              <span className={`px-3 py-1 text-xs font-medium uppercase tracking-wide border ${
                order.status === 'new' ? 'bg-white text-black border-black' :
                order.status === 'in_progress' ? 'bg-black text-white border-black' :
                order.status === 'completed' ? 'bg-white text-gray-500 border-gray-300' :
                'bg-white text-gray-400 border-gray-300'
              }`}>
                {order.status === 'new' ? 'Новый' :
                 order.status === 'in_progress' ? 'В работе' :
                 order.status === 'completed' ? 'Выполнен' : 'Отменен'}
              </span>
            </div>

            <p className="text-black mb-6 leading-relaxed whitespace-pre-wrap text-sm">
              {order.description}
            </p>

            {order.images && order.images.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                {order.images.map((img, idx) => (
                  <img
                    key={idx}
                    src={img}
                    alt={`Order image ${idx + 1}`}
                    className="w-full h-48 object-cover border border-gray-200"
                  />
                ))}
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div className="flex items-center gap-2 text-gray-600">
                <FiMapPin className="text-black" size={18} />
                <span className="font-medium">{order.location}</span>
              </div>
              {order.budget && (
                <div className="flex items-center gap-2 text-gray-600">
                  <FiDollarSign className="text-black" size={18} />
                  <span className="font-semibold text-black">
                    {order.budget.toLocaleString('ru-RU')} ₽
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2 text-gray-600">
                <FiClock size={20} />
                <span>
                  {format(new Date(order.created_at), 'd MMMM yyyy в HH:mm', { locale: ru })}
                </span>
              </div>
              <div className="px-2 py-1 border border-gray-200 text-xs font-medium uppercase tracking-wide w-fit">
                {order.category}
              </div>
            </div>

            <div className="flex items-center gap-3 pt-4 border-t border-gray-200/50">
              {order.client?.avatar_url ? (
                <img
                  src={order.client.avatar_url}
                  alt={order.client.full_name}
                  className="w-12 h-12 object-cover border border-gray-200"
                />
              ) : (
                <div className="w-12 h-12 bg-black border border-gray-200 flex items-center justify-center text-white text-sm font-bold">
                  {order.client?.full_name?.[0]?.toUpperCase() || '?'}
                </div>
              )}
              <div>
                <div className="font-semibold text-black">{order.client?.full_name}</div>
                {order.client?.city && (
                  <div className="text-sm text-gray-500">{order.client.city}</div>
                )}
              </div>
            </div>
          </div>

          {/* Response Form for Masters */}
          {canRespond && (
            <div className="card mb-6 animate-fade-in">
              {!showResponseForm ? (
                <button
                  onClick={() => setShowResponseForm(true)}
                  className="btn btn-primary w-full"
                >
                  Откликнуться на заказ
                </button>
              ) : (
                <form onSubmit={handleSubmitResponse} className="space-y-4">
                  <h3 className="text-lg font-bold text-black mb-4">Ваш отклик</h3>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Предложенная цена (₽)
                    </label>
                    <input
                      type="number"
                      value={responsePrice}
                      onChange={(e) => setResponsePrice(e.target.value)}
                      placeholder="Оставьте пустым для договорной"
                      className="input"
                      min="0"
                      step="100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Сообщение *
                    </label>
                    <textarea
                      value={responseMessage}
                      onChange={(e) => setResponseMessage(e.target.value)}
                      placeholder="Расскажите о своем опыте и как вы будете выполнять заказ"
                      className="textarea"
                      rows={4}
                      required
                    />
                  </div>
                  <div className="flex gap-4">
                    <button
                      type="submit"
                      disabled={responseLoading}
                      className="btn btn-primary flex-1"
                    >
                      {responseLoading ? 'Отправка...' : 'Отправить отклик'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowResponseForm(false)
                        setResponsePrice('')
                        setResponseMessage('')
                      }}
                      className="btn btn-outline"
                    >
                      Отмена
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Responses List */}
          <div className="card">
            <h2 className="text-lg font-bold text-black mb-6">
              Отклики ({responses.length})
            </h2>

            {responses.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Пока нет откликов
              </div>
            ) : (
              <div className="space-y-4">
                {responses.map((response) => (
                  <div
                    key={response.id}
                    className={`p-4 border transition-colors ${
                      response.status === 'accepted'
                        ? 'border-black bg-white'
                        : response.status === 'rejected'
                        ? 'border-gray-300 bg-gray-50 opacity-60'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {response.master?.avatar_url ? (
                          <img
                            src={response.master.avatar_url}
                            alt={response.master.full_name}
                            className="w-12 h-12 object-cover border border-gray-200"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-black border border-gray-200 flex items-center justify-center text-white text-sm font-bold">
                            {response.master?.full_name?.[0]?.toUpperCase() || '?'}
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-black">
                            {response.master?.full_name}
                          </div>
                          {response.master?.city && (
                            <div className="text-sm text-gray-500">{response.master.city}</div>
                          )}
                        </div>
                      </div>
                      {response.status === 'accepted' && (
                        <span className="px-2 py-1 bg-black text-white text-xs font-medium uppercase tracking-wide border border-black">
                          Выбран
                        </span>
                      )}
                    </div>

                    {response.price && (
                      <div className="mb-3 flex items-center gap-2">
                        <FiDollarSign className="text-black" size={18} />
                        <span className="font-bold text-black text-base">
                          {response.price.toLocaleString('ru-RU')} ₽
                        </span>
                      </div>
                    )}

                    <p className="text-black mb-4 leading-relaxed text-sm">{response.message}</p>

                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>
                        {format(new Date(response.created_at), 'd MMMM в HH:mm', { locale: ru })}
                      </span>
                      {isOwner && response.status === 'pending' && order.status === 'new' && (
                        <button
                          onClick={() => handleAcceptResponse(response.id)}
                          className="btn btn-primary text-sm px-4 py-2"
                        >
                          <FiCheck size={16} className="mr-1" />
                          Выбрать мастера
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

