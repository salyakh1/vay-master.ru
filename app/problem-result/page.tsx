'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuth } from '../providers'
import { supabase, User, Service, Product } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import Link from 'next/link'
import { FiUser, FiShoppingBag, FiCheck, FiX, FiMessageCircle, FiEdit2, FiSearch } from 'react-icons/fi'
import AutocompleteInput from '@/components/AutocompleteInput'

interface ProblemResult {
  problemText: string
  services: (Service & { specialization?: { id: string; name: string; slug: string } })[]
  masters: User[]
  products: Product[]
  stats: {
    servicesCount: number
    mastersCount: number
    productsCount: number
  }
}

export default function ProblemResultPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [result, setResult] = useState<ProblemResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set())
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState('')

  useEffect(() => {
    // Загружаем результат из sessionStorage или делаем новый запрос
    const problemText = searchParams.get('text') || ''
    const storedResult = sessionStorage.getItem('problem_result')
    const storedText = sessionStorage.getItem('problem_text')

    if (storedResult && storedText === problemText) {
      // Используем сохраненный результат
      try {
        const data = JSON.parse(storedResult)
        setResult(data)
        // Автоматически выбираем все услуги
        setSelectedServices(new Set(data.services.map((s: Service) => s.id)))
        setLoading(false)
      } catch (error) {
        console.error('Error parsing stored result:', error)
        fetchResult(problemText)
      }
    } else if (problemText) {
      // Делаем новый запрос
      fetchResult(problemText)
    } else {
      // Нет текста проблемы - редирект на главную
      router.push('/')
    }
  }, [searchParams, router])

  const fetchResult = async (problemText: string) => {
    try {
      setLoading(true)
      const response = await fetch('/api/problem-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ problemText }),
      })

      if (!response.ok) {
        throw new Error('Ошибка при поиске решения')
      }

      const data = await response.json()
      setResult(data.data)
      // Автоматически выбираем все услуги
      setSelectedServices(new Set(data.data.services.map((s: Service) => s.id)))
      
      // Сохраняем результат
      sessionStorage.setItem('problem_result', JSON.stringify(data.data))
      sessionStorage.setItem('problem_text', problemText)
      
      // Обновляем URL
      router.replace(`/problem-result?text=${encodeURIComponent(problemText)}`, { scroll: false })
    } catch (error) {
      console.error('Error fetching result:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleService = (serviceId: string) => {
    const newSelected = new Set(selectedServices)
    if (newSelected.has(serviceId)) {
      newSelected.delete(serviceId)
    } else {
      newSelected.add(serviceId)
    }
    setSelectedServices(newSelected)
  }

  const handleEditClick = () => {
    setIsEditing(true)
    setEditText(result?.problemText || '')
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditText('')
  }

  const handleSearchAgain = async () => {
    if (!editText.trim()) return
    
    setIsEditing(false)
    await fetchResult(editText.trim())
  }

  const handleCreateOrder = () => {
    if (!user) {
      router.push('/auth/login')
      return
    }
    // Переходим на создание заказа с предзаполненным текстом
    router.push(`/orders/new?problem=${encodeURIComponent(result?.problemText || '')}`)
  }

  const handleStartChat = async (masterId: string) => {
    if (!user) {
      router.push('/auth/login')
      return
    }

    try {
      // Проверяем, есть ли уже чат между этими двумя пользователями
      const { data: existingChats } = await supabase
        .from('chats')
        .select('id')
        .or(`and(user1_id.eq.${user.id},user2_id.eq.${masterId}),and(user1_id.eq.${masterId},user2_id.eq.${user.id})`)
        .maybeSingle()

      if (existingChats) {
        router.push(`/chats/${existingChats.id}`)
        return
      }

      // Создаем новый чат
      const { data: newChat, error } = await supabase
        .from('chats')
        .insert({
          user1_id: user.id,
          user2_id: masterId,
        })
        .select()
        .single()

      if (error) throw error

      router.push(`/chats/${newChat.id}`)
    } catch (error) {
      console.error('Error creating chat:', error)
      alert('Ошибка при создании чата')
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-white pb-20 flex items-center justify-center">
        <div className="text-sm text-gray-600">Поиск решения...</div>
      </div>
    )
  }

  if (!result) {
    return (
      <div className="min-h-screen bg-white pb-20">
        <Navbar />
        <div className="container mx-auto px-4 py-6">
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-gray-600 mb-4">Не удалось найти решение</p>
            <Link href="/" className="btn btn-primary">
              Вернуться на главную
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Фильтруем мастеров по выбранным услугам
  const filteredMasters = result.masters.filter(master => {
    if (selectedServices.size === 0) return true
    
    const masterData = master as any
    const masterServiceIds = (masterData.profile_services as any[])?.map(
      (ps: any) => ps.service?.id || ps.service_id
    ) || []
    
    return masterServiceIds.some(id => selectedServices.has(id))
  })

  return (
    <div className="min-h-screen bg-white pb-20">
      <Navbar />
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <Link
              href="/"
              className="text-black hover:text-gray-600 mb-4 inline-block font-medium text-sm"
            >
              ← Назад
            </Link>
            <h1 className="text-2xl font-bold text-black mb-2">
              Решение для вашей проблемы
            </h1>
            
            {/* Problem Text - Editable */}
            {!isEditing ? (
              <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 p-3 rounded-sm">
                <div className="flex-1">
                  <span className="text-sm text-gray-600">
                    <strong>Вы ищете:</strong> {result.problemText}
                  </span>
                </div>
                <button
                  onClick={handleEditClick}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-black transition-colors px-3 py-1 border border-gray-200 hover:border-gray-300"
                >
                  <FiEdit2 size={14} />
                  Изменить
                </button>
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 p-3 rounded-sm space-y-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-2 font-medium">
                    Изменить запрос:
                  </label>
                  <AutocompleteInput
                    value={editText}
                    onChange={setEditText}
                    onSubmit={handleSearchAgain}
                    placeholder="Введите новый запрос..."
                    type="all"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSearchAgain}
                    disabled={!editText.trim()}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
                      !editText.trim()
                        ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                        : 'bg-black text-white border border-black hover:bg-gray-900'
                    }`}
                  >
                    <FiSearch size={14} />
                    Найти снова
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="px-4 py-2 text-sm font-medium bg-white text-gray-600 border border-gray-200 hover:border-gray-300 hover:text-black transition-colors"
                  >
                    Отмена
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="card text-center">
              <div className="text-2xl font-bold text-black mb-1">
                {result.stats.servicesCount}
              </div>
              <div className="text-xs text-text-muted font-medium">Услуг найдено</div>
            </div>
            <div className="card text-center">
              <div className="text-2xl font-bold text-black mb-1">
                {result.stats.mastersCount}
              </div>
              <div className="text-xs text-text-muted font-medium">Мастеров</div>
            </div>
            <div className="card text-center">
              <div className="text-2xl font-bold text-black mb-1">
                {result.stats.productsCount}
              </div>
              <div className="text-xs text-text-muted font-medium">Товаров</div>
            </div>
          </div>

          {/* Services Selection */}
          {result.services.length > 0 && (
            <div className="card mb-6">
              <h2 className="text-lg font-bold text-black mb-4">
                Подходящие услуги ({result.services.length})
              </h2>
              <p className="text-xs text-gray-600 mb-4">
                Выберите услуги, которые вам нужны (можно выбрать несколько)
              </p>
              <div className="space-y-2">
                {result.services.map((service) => {
                  const isSelected = selectedServices.has(service.id)
                  return (
                    <label
                      key={service.id}
                      className={`flex items-center gap-3 p-3 border cursor-pointer transition-colors ${
                        isSelected
                          ? 'border-black bg-gray-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleService(service.id)}
                        className="w-4 h-4"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-sm text-black">
                          {service.name}
                        </div>
                        {service.specialization && (
                          <div className="text-xs text-gray-500 mt-1">
                            {service.specialization.name}
                          </div>
                        )}
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>
          )}

          {/* Masters */}
          {filteredMasters.length > 0 ? (
            <div className="card mb-6">
              <h2 className="text-lg font-bold text-black mb-4 flex items-center gap-2">
                <FiUser />
                Мастера ({filteredMasters.length})
              </h2>
              <div className="space-y-3">
                {filteredMasters.map((master) => (
                  <div
                    key={master.id}
                    className="flex items-center gap-4 p-4 border border-gray-200 hover:border-gray-300 transition-colors"
                  >
                    <Link
                      href={`/profile/${master.id}`}
                      className="flex items-center gap-4 flex-1"
                    >
                      <div className="w-16 h-16 bg-black border border-gray-200 flex items-center justify-center text-white text-lg font-bold">
                        {master.avatar_url ? (
                          <img
                            src={master.avatar_url}
                            alt={master.full_name}
                            className="w-full h-full object-cover border border-gray-200"
                          />
                        ) : (
                          master.full_name[0]?.toUpperCase() || '?'
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-black">{master.full_name}</div>
                        {master.city && (
                          <div className="text-sm text-gray-500">{master.city}</div>
                        )}
                        {master.description && (
                          <div className="text-sm text-gray-600 mt-1 line-clamp-2">
                            {master.description}
                          </div>
                        )}
                      </div>
                    </Link>
                    {user && (
                      <button
                        onClick={() => handleStartChat(master.id)}
                        className="btn btn-outline text-sm px-4 py-2 flex items-center gap-2"
                      >
                        <FiMessageCircle size={16} />
                        Написать
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="card mb-6 text-center text-gray-500 py-8">
              Мастера не найдены. Попробуйте изменить выбранные услуги.
            </div>
          )}

          {/* Products */}
          {result.products.length > 0 ? (
            <div className="card mb-6">
              <h2 className="text-lg font-bold text-black mb-4 flex items-center gap-2">
                <FiShoppingBag />
                Подходящие товары ({result.products.length})
              </h2>
              <div className="overflow-x-auto">
                <div className="flex gap-4 pb-4" style={{ minWidth: 'max-content' }}>
                  {result.products.map((product) => (
                    <Link
                      key={product.id}
                      href={`/products/${product.id}`}
                      className="flex-shrink-0 w-64 border border-gray-200 hover:border-gray-300 transition-colors"
                    >
                      <div className="w-full h-48 bg-gray-100 flex items-center justify-center">
                        {product.images && product.images.length > 0 ? (
                          <img
                            src={product.images[0]}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-4xl">🛒</span>
                        )}
                      </div>
                      <div className="p-4">
                        <div className="font-semibold text-sm text-black mb-2 line-clamp-2">
                          {product.name}
                        </div>
                        <div className="text-lg font-bold text-black mb-2">
                          {product.price.toLocaleString('ru-RU')} ₽
                        </div>
                        {product.category_ref && (
                          <div className="text-xs text-gray-500 mb-2">
                            {product.category_ref.name}
                          </div>
                        )}
                        {product.seller && (
                          <div className="text-xs text-gray-500">
                            {product.seller.store_address || product.seller.city || 'Адрес не указан'}
                          </div>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="card mb-6 text-center text-gray-500 py-8">
              Товары не найдены
            </div>
          )}

          {/* CTA Buttons */}
          <div className="flex flex-col gap-3">
            {user && (
              <button
                onClick={handleCreateOrder}
                className="btn btn-primary w-full"
              >
                Создать заказ
              </button>
            )}
            {!user && (
              <div className="card text-center">
                <p className="text-sm text-gray-600 mb-4">
                  Войдите, чтобы создать заказ или написать мастеру
                </p>
                <Link href="/auth/login" className="btn btn-primary">
                  Войти
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

