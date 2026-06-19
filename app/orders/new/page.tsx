'use client'

import { useState, useRef, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/app/providers'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import { FiArrowLeft, FiImage, FiX } from 'react-icons/fi'
import Link from 'next/link'
import OrderPaymentModal from '@/components/OrderPaymentModal'
import OrderLocationPicker from '@/components/OrderLocationPicker'

const MIN_DESCRIPTION_LENGTH = 30

const TITLE_EXAMPLES = [
  'Ремонт кухни под ключ',
  'Замена смесителя в ванной',
  'Установка розеток в комнате',
  'Поклейка обоев в спальне',
]

const DESCRIPTION_HINTS = [
  'Что нужно сделать и в каком объёме',
  'Адрес или район (если ещё не указали на карте)',
  'Желаемые сроки и примерный бюджет',
  'Есть ли материалы или нужна закупка',
]

type OrderPaymentSettings = {
  paymentOrderPublicationEnabled: boolean
  orderPublicationPriceRub: number
  tinkoffReady: boolean
}

function NewOrderForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading: authLoading } = useAuth()
  const masterId = searchParams.get('master')
  const prefilledTitle = searchParams.get('title') ?? ''

  const [title, setTitle] = useState(prefilledTitle)
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [location, setLocation] = useState<{ city: string; address: string } | null>(null)
  const [budget, setBudget] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [categories, setCategories] = useState<Array<{ id: string; name: string; slug: string }>>([])
  const [loadingCategories, setLoadingCategories] = useState(true)
  const [paymentSettings, setPaymentSettings] = useState<OrderPaymentSettings>({
    paymentOrderPublicationEnabled: true,
    orderPublicationPriceRub: 199,
    tinkoffReady: false,
  })

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoadingCategories(true)
        const { data, error } = await supabase
          .from('categories')
          .select('id, name, slug')
          .order('sort_order', { ascending: true })
          .order('name', { ascending: true })

        if (error) {
          console.error('Error fetching categories:', error)
          setCategories([])
        } else {
          setCategories((data || []) as Array<{ id: string; name: string; slug: string }>)
        }
      } catch (error) {
        console.error('Error fetching categories:', error)
        setCategories([])
      } finally {
        setLoadingCategories(false)
      }
    }

    if (user) {
      fetchCategories()
    }
  }, [user])

  useEffect(() => {
    fetch('/api/payment/order-settings')
      .then((r) => r.json())
      .then((data) => {
        setPaymentSettings({
          paymentOrderPublicationEnabled: data.paymentOrderPublicationEnabled !== false,
          orderPublicationPriceRub: typeof data.orderPublicationPriceRub === 'number' ? data.orderPublicationPriceRub : 199,
          tinkoffReady: data.tinkoffReady === true,
        })
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login')
    }
  }, [authLoading, user, router])

  const descriptionOk = description.trim().length >= MIN_DESCRIPTION_LENGTH
  const descriptionCharsLeft = MIN_DESCRIPTION_LENGTH - description.trim().length

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
        <div className="text-base text-text-secondary">Загрузка...</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).slice(0, 10)
      setFiles((prev) => [...prev, ...newFiles].slice(0, 10))
    }
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const uploadOrderImages = async (): Promise<string[]> => {
    if (!user || files.length === 0) return []
    const uploadResults = await Promise.allSettled(
      files.map(async (file, idx) => {
        const ext = file.name.split('.').pop()
        const path = `${user.id}/orders/${Date.now()}-${idx}.${ext || 'jpg'}`
        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(path, file, { cacheControl: '3600', upsert: false })
        if (uploadError) {
          console.warn(`Failed to upload image ${idx + 1}:`, uploadError.message)
          return null
        }
        const { data } = supabase.storage.from('product-images').getPublicUrl(path)
        return data.publicUrl
      })
    )
    return uploadResults
      .map((result) => (result.status === 'fulfilled' ? result.value : null))
      .filter((url): url is string => url !== null)
  }

  const parseBudgetNum = (): number | null => {
    if (!budget.trim()) return null
    const budgetNum = parseFloat(budget.replace(/\s/g, '').replace(',', '.'))
    if (!isNaN(budgetNum) && budgetNum > 0) return budgetNum
    return null
  }

  const buildDescription = (): string => {
    let text = description.trim()
    if (masterId) {
      text += `\n\n[Мастер из профиля: /profile/${masterId}]`
    }
    return text
  }

  const createOrder = async () => {
    if (!user) return

    setSaving(true)
    try {
      let imageUrls: string[] = []
      if (files.length > 0) {
        try {
          imageUrls = await uploadOrderImages()
        } catch (err: unknown) {
          console.warn('Image upload process failed:', err)
        }
      }

      const orderData: Record<string, unknown> = {
        client_id: user.id,
        title: title.trim(),
        description: buildDescription(),
        category,
        location: location?.address?.trim() || '',
        status: 'open',
        images: imageUrls,
      }

      if (location?.city?.trim()) {
        orderData.city = location.city.trim()
      }

      const b = parseBudgetNum()
      if (b != null) orderData.budget = b

      const { data: newOrder, error: orderError } = await supabase
        .from('orders')
        .insert(orderData)
        .select()
        .single()

      if (orderError) throw orderError

      router.push(`/orders/${newOrder.id}`)
    } catch (error: unknown) {
      console.error('Error creating order:', error)
      const message = error instanceof Error ? error.message : 'Ошибка при создании заказа'
      alert(message)
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    if (!title.trim() || !description.trim() || !category) {
      alert('Заполните все обязательные поля')
      return
    }

    if (description.trim().length < MIN_DESCRIPTION_LENGTH) {
      alert(`Описание слишком короткое. Минимум ${MIN_DESCRIPTION_LENGTH} символов — опишите задачу подробнее.`)
      return
    }

    if (!location?.city?.trim() || !location?.address?.trim()) {
      alert('Пожалуйста, укажите город и адрес')
      return
    }

    if (!paymentSettings.paymentOrderPublicationEnabled) {
      await createOrder()
      return
    }
    setShowPaymentModal(true)
  }

  const handleConfirmPayment = async () => {
    if (!user) return

    if (paymentSettings.tinkoffReady) {
      setSaving(true)
      try {
        const imageUrls = await uploadOrderImages()
        const { data: { session } } = await supabase.auth.getSession()
        const token = session?.access_token
        if (!token) {
          alert('Войдите в аккаунт')
          return
        }
        const budgetNum = parseBudgetNum()
        const res = await fetch('/api/payments/tinkoff/create-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: title.trim(),
            description: buildDescription(),
            category,
            location: { city: location!.city.trim(), address: location!.address.trim() },
            budget: budgetNum,
            imageUrls,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Не удалось создать сессию оплаты')

        const res2 = await fetch('/api/payments/tinkoff/init', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ sessionId: data.sessionId }),
        })
        const initData = await res2.json()
        if (!res2.ok || !initData.paymentUrl) {
          throw new Error(initData.error || 'Не удалось открыть оплату')
        }
        setShowPaymentModal(false)
        window.location.href = initData.paymentUrl
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Ошибка оплаты'
        alert(message)
      } finally {
        setSaving(false)
      }
      return
    }

    setShowPaymentModal(false)
    await createOrder()
  }

  return (
    <div className="min-h-screen bg-bg-primary pb-20">
      <Navbar />
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <Link
              href="/orders"
              className="p-2 hover:bg-bg-secondary rounded-md transition-colors"
            >
              <FiArrowLeft size={24} className="text-text-secondary" />
            </Link>
            <h1 className="text-2xl font-semibold text-graphite-secondary tracking-tight">
              Создать заказ
            </h1>
          </div>

          {masterId && (
            <div className="mb-4 rounded-xl bg-[#fff1f2] border border-[#fecdd3] px-4 py-3 text-sm text-[#1c1c1e]">
              Заказ для мастера из профиля. Опишите задачу — мастера категории получат уведомление.
            </div>
          )}

          <form onSubmit={handleSubmit} className="card space-y-6">
            <div>
              <label className="block text-sm font-semibold text-graphite-secondary mb-2">
                Название заказа *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                minLength={5}
                className="input"
                placeholder="Например: Ремонт кухни"
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {TITLE_EXAMPLES.map((example) => (
                  <button
                    key={example}
                    type="button"
                    onClick={() => setTitle(example)}
                    className="text-[11px] px-2.5 py-1 rounded-full bg-[#f2f2f7] text-[#555] border border-[#e5e5ea] hover:border-brand-accent hover:text-brand-accent transition-colors"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-graphite-secondary mb-2">
                Описание *
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                minLength={MIN_DESCRIPTION_LENGTH}
                className="textarea"
                rows={6}
                placeholder="Опишите задачу: что сделать, объём работ, материалы, сроки. Чем подробнее — тем точнее отклики мастеров."
              />
              <div className="flex items-center justify-between mt-1.5">
                <p className={`text-xs ${descriptionOk ? 'text-[#22a85e]' : 'text-text-muted'}`}>
                  {descriptionOk
                    ? 'Описание достаточно подробное'
                    : `Ещё ${descriptionCharsLeft} симв. — добавьте детали`}
                </p>
                <span className="text-xs text-text-muted">
                  {description.trim().length}/{MIN_DESCRIPTION_LENGTH}+
                </span>
              </div>
              <ul className="mt-2 space-y-1">
                {DESCRIPTION_HINTS.map((hint) => (
                  <li key={hint} className="text-xs text-text-muted flex items-start gap-1.5">
                    <span className="text-brand-accent mt-0.5">•</span>
                    {hint}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <label className="block text-sm font-semibold text-graphite-secondary mb-2">
                Категория заказа *
              </label>
              {loadingCategories ? (
                <div className="input text-text-secondary">Загрузка категорий...</div>
              ) : (
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  required
                  className="input"
                >
                  <option value="">Выберите категорию</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              )}
              <p className="text-xs text-text-muted mt-1">
                Выберите категорию заказа. Мастера этой категории получат уведомление.
              </p>
            </div>

            <OrderLocationPicker value={location} onChange={setLocation} />

            <div>
              <label className="block text-sm font-semibold text-graphite-secondary mb-2">
                Бюджет (₽)
              </label>
              <input
                type="text"
                value={budget}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^\d,.\s]/g, '')
                  setBudget(value)
                }}
                className="input"
                placeholder="Например: 50 000"
              />
              <p className="text-xs text-text-muted mt-1">
                Укажите примерный бюджет или оставьте пустым для обсуждения с мастером
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-graphite-secondary mb-2">
                Фотографии (до 10 шт.)
              </label>
              <div className="space-y-3">
                {files.length > 0 && (
                  <div className="grid grid-cols-3 gap-3">
                    {files.map((file, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-32 object-cover rounded-md border border-border-color"
                        />
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <FiX size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-4 border-2 border-dashed border-border-color rounded-md hover:border-brand-accent hover:text-brand-accent transition-colors flex items-center justify-center gap-2"
                >
                  <FiImage size={20} />
                  <span>Добавить фотографии</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <Link href="/orders" className="btn btn-outline flex-1">
                Отмена
              </Link>
              <button type="submit" disabled={saving || !descriptionOk} className="btn btn-primary flex-1">
                {saving ? 'Создание...' : 'Создать заказ'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <OrderPaymentModal
        isOpen={showPaymentModal}
        onClose={() => {
          if (saving) return
          setShowPaymentModal(false)
        }}
        priceRub={paymentSettings.orderPublicationPriceRub}
        loading={saving}
        tinkoffReady={paymentSettings.tinkoffReady}
        onConfirmPaid={handleConfirmPayment}
      />
    </div>
  )
}

export default function NewOrderPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-bg-primary">
          <div className="text-base text-text-secondary">Загрузка...</div>
        </div>
      }
    >
      <NewOrderForm />
    </Suspense>
  )
}
