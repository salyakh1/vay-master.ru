'use client'

import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from './providers'
import { supabase, User, Product, Story } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import GuestAwareProfileLink from '@/components/GuestAwareProfileLink'
import { sanitizeProductsForGuest } from '@/lib/guest-access'
import type { AdBanner } from '@/lib/supabase'
import type { MasterCategoryWithCount } from '@/lib/server-data'
import { FiSearch, FiStar, FiArrowRight, FiUser, FiShoppingBag, FiTag, FiX } from 'react-icons/fi'
import { getCategoryEmoji } from '@/lib/categoryEmoji'
import { isProActive } from '@/lib/masterAccess'
import StoriesCircle from '@/components/StoriesCircle'
import CompactPageBanner from '@/components/CompactPageBanner'

type HomeSuggestion = {
  id: string
  name: string
  type:
    | 'master'
    | 'product'
    | 'service'
    | 'category'
    | 'subcategory'
    | 'product_category'
    | 'product_subcategory'
}

const SUGGESTION_ICON: Record<HomeSuggestion['type'], React.ReactNode> = {
  master: <FiUser size={13} />,
  product: <FiShoppingBag size={13} />,
  service: <FiTag size={13} />,
  category: <FiTag size={13} />,
  subcategory: <FiTag size={13} />,
  product_category: <FiShoppingBag size={13} />,
  product_subcategory: <FiShoppingBag size={13} />,
}

const SUGGESTION_LABEL: Record<HomeSuggestion['type'], string> = {
  master: 'Мастер',
  product: 'Товар',
  service: 'Услуга',
  category: 'Категория мастеров',
  subcategory: 'Подкатегория мастеров',
  product_category: 'Категория товаров',
  product_subcategory: 'Каталог товаров',
}

interface HomeClientProps {
  initialBanners?: AdBanner[] | null
  initialCategories?: MasterCategoryWithCount[] | null
  initialTotalMasters?: number | null
  initialMasters?: User[] | null
}

const DIVIDER = <div className="h-2 bg-[#f5f5f7]" aria-hidden />

type HeroCat = { label: string; emoji: string; slug: string; id?: string }

const FALLBACK_CATS: HeroCat[] = [
  { label: 'Ремонт', emoji: '🔧', slug: '' },
  { label: 'Электрика', emoji: '⚡', slug: '' },
  { label: 'Сантехника', emoji: '🚿', slug: '' },
  { label: 'Стройка', emoji: '🏗️', slug: '' },
]

const STEPS = [
  { title: 'Опишите задачу', desc: 'Ремонт, стройка, демонтаж — кратко' },
  { title: 'Выберите мастера', desc: 'Профили, рейтинги, портфолио' },
  { title: 'Договоритесь в чате', desc: 'Цена и сроки напрямую' },
  { title: 'Оцените работу', desc: 'После выполнения заказа' },
]

const TRUST = [
  { icon: '✓', title: 'Модерация', desc: 'Жалобы разбирает администрация' },
  { icon: '⭐', title: 'Отзывы', desc: 'После выполненного заказа' },
  { icon: '🛡', title: 'Жалобы', desc: 'Пишите в чат администрации' },
  { icon: '💬', title: 'Поддержка', desc: 'Администрация на связи' },
]

const ROLES = [
  { icon: '🔨', title: 'Мастерам', desc: 'Заказы без комиссий, портфолио, PRO', href: '/auth/register?role=master', active: true },
  { icon: '🛒', title: 'Продавцам', desc: 'Продавайте инструменты и материалы', href: '/auth/register?role=seller' },
  { icon: '👤', title: 'Клиентам', desc: 'Мастера и материалы рядом', href: '/auth/register?role=client' },
  { icon: '🆓', title: 'Бесплатно', desc: 'Регистрация без скрытых платежей', href: '/auth/register' },
]

function SectionHeader({ title, linkLabel, href }: { title: string; linkLabel?: string; href?: string }) {
  return (
    <div className="flex items-center justify-between px-4 pt-4 pb-2.5">
      <h2 className="text-[15px] font-bold text-[#111]">{title}</h2>
      {linkLabel && href && (
        <Link href={href} className="text-xs font-semibold text-brand-accent">
          {linkLabel}
        </Link>
      )}
    </div>
  )
}

function MasterCard({ master }: { master: User }) {
  const initials = master.full_name
    ?.split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?'
  const rating = master.master_rating ?? 0
  const reviews = master.master_reviews_count ?? 0
  const withRelations = master as User & {
    profile_services?: Array<{ service?: { name?: string | null } | null }>
    profile_subcategories?: Array<{ subcategory?: { name?: string | null } | null }>
  }
  const serviceNames = (withRelations.profile_services || [])
    .map((row) => row.service?.name?.trim())
    .filter((name): name is string => Boolean(name))
    .slice(0, 3)
  const subcategoryNames = (withRelations.profile_subcategories || [])
    .map((row) => row.subcategory?.name?.trim())
    .filter((name): name is string => Boolean(name))
    .slice(0, 3)
  const servicesLabel =
    (serviceNames.length > 0 ? serviceNames : subcategoryNames).join(' · ') ||
    master.specialization?.trim() ||
    ''

  return (
    <GuestAwareProfileLink profileId={master.id} className="block w-[140px] flex-shrink-0">
      <div className="bg-white rounded-[18px] p-3 border border-[#f0f0f0]">
        <div className="flex items-start justify-between gap-1.5 mb-2">
          <div className="relative flex-shrink-0">
            <div className="w-11 h-11 rounded-full bg-brand-accent text-white text-sm font-bold flex items-center justify-center overflow-hidden">
              {master.avatar_url ? (
                <Image src={master.avatar_url} alt="" width={44} height={44} className="object-cover w-full h-full" />
              ) : (
                initials
              )}
            </div>
            {master.is_pro && isProActive(master) && (
              <span className="absolute -bottom-0.5 -right-0.5 bg-brand-accent text-white text-[8px] font-extrabold px-1 py-0.5 rounded-[3px] border-2 border-white">
                PRO
              </span>
            )}
          </div>
          <div className="inline-flex items-center gap-0.5 bg-[#fff8e6] px-1.5 py-0.5 rounded-md text-[11px] flex-shrink-0">
            <FiStar className="text-[#f4a228] fill-[#f4a228]" size={11} />
            <span className="font-bold text-[#1c1c1e]">{rating > 0 ? rating.toFixed(1) : '—'}</span>
            {reviews > 0 && <span className="text-[#8e8e93] font-medium">({reviews})</span>}
          </div>
        </div>
        <p className="text-[13px] font-bold text-[#111] truncate">{master.full_name}</p>
        {servicesLabel ? (
          <p className="text-[11px] text-[#888] leading-snug line-clamp-2 min-h-[28px]">{servicesLabel}</p>
        ) : (
          <div className="min-h-[28px]" aria-hidden />
        )}
      </div>
    </GuestAwareProfileLink>
  )
}

function ProductCardHome({ product }: { product: Product }) {
  const img = product.images?.[0]
  return (
    <Link href={`/products/${product.id}`} className="block w-[110px] flex-shrink-0">
      <div className="bg-white rounded-2xl overflow-hidden border border-[#f0f0f0]">
        <div className="h-[78px] bg-[#f5f5f7] flex items-center justify-center overflow-hidden relative">
          {img ? (
            <Image src={img} alt="" fill className="object-cover" sizes="110px" />
          ) : (
            <span className="text-2xl">📦</span>
          )}
        </div>
        <div className="p-2">
          <p className="text-[11px] text-[#555] font-medium line-clamp-2 mb-1 leading-tight">{product.name}</p>
          <p className="text-[13px] text-brand-accent font-extrabold">
            {product.price.toLocaleString('ru-RU')} ₽
          </p>
        </div>
      </div>
    </Link>
  )
}

export default function HomeClient({
  initialBanners = null,
  initialCategories = null,
  initialMasters = null,
}: HomeClientProps) {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [searchQ, setSearchQ] = useState('')
  const [masters, setMasters] = useState<User[]>(() => (initialMasters || []) as User[])
  const [products, setProducts] = useState<Product[]>([])
  const [homeFeedLoading, setHomeFeedLoading] = useState(() => !(initialMasters && initialMasters.length > 0))
  const [stories, setStories] = useState<Story[]>([])

  // Автодополнение поиска: мастера + товары + услуги + категории в одном списке
  const [suggestions, setSuggestions] = useState<HomeSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const searchWrapperRef = useRef<HTMLDivElement>(null)
  const suggestAbortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const q = searchQ.trim()
    if (q.length < 2) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }
    if (suggestAbortRef.current) suggestAbortRef.current.abort()
    const ctrl = new AbortController()
    suggestAbortRef.current = ctrl
    setLoadingSuggestions(true)
    setShowSuggestions(true)
    const t = setTimeout(() => {
      fetch(`/api/autocomplete?q=${encodeURIComponent(q)}&type=all`, { signal: ctrl.signal })
        .then((r) => (r.ok ? r.json() : { suggestions: [] }))
        .then((data) => {
          if (ctrl.signal.aborted) return
          setSuggestions(data.suggestions || [])
          setShowSuggestions(true)
        })
        .catch(() => {
          if (!ctrl.signal.aborted) setSuggestions([])
        })
        .finally(() => {
          if (!ctrl.signal.aborted) setLoadingSuggestions(false)
        })
    }, 300)
    return () => {
      clearTimeout(t)
      ctrl.abort()
    }
  }, [searchQ])

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  const goToSuggestion = useCallback(
    (item: HomeSuggestion) => {
      setShowSuggestions(false)
      if (item.type === 'master') {
        router.push(`/profile/${item.id}`)
      } else if (item.type === 'product') {
        router.push(`/products/${item.id}`)
      } else if (item.type === 'product_category') {
        router.push(`/products?category=${item.id}`)
      } else if (item.type === 'product_subcategory') {
        router.push(`/products?subcategory=${item.id}`)
      } else if (item.type === 'category') {
        router.push(`/search?category=${item.id}`)
      } else if (item.type === 'subcategory') {
        router.push(`/search?subcategory=${item.id}`)
      } else {
        setSearchQ(item.name)
        router.push(`/search?q=${encodeURIComponent(item.name)}`)
      }
    },
    [router]
  )

  const heroCats = useMemo((): HeroCat[] => {
    const fromDb = (initialCategories ?? []).slice(0, 4).map((c) => ({
      label: c.name,
      emoji: getCategoryEmoji(c.slug, c.name),
      slug: c.slug,
      id: c.id,
    }))
    return fromDb.length > 0 ? fromDb : FALLBACK_CATS
  }, [initialCategories])

  useEffect(() => {
    let cancelled = false
    const hasSsrMasters = (initialMasters?.length ?? 0) > 0
    if (!hasSsrMasters) setHomeFeedLoading(true)
    Promise.all([
      fetch('/api/search/masters?page=1')
        .then((r) => (r.ok ? r.json() : { masters: [] }))
        .then((d) => {
          if (!cancelled) setMasters((d.masters || []).slice(0, 8))
        })
        .catch(() => {
          if (!cancelled && !hasSsrMasters) setMasters([])
        }),
      supabase
        .from('products')
        .select('id, name, price, images, in_stock')
        .eq('in_stock', true)
        .order('created_at', { ascending: false })
        .limit(8)
        .then(({ data }) => {
          if (cancelled) return
          const list = sanitizeProductsForGuest((data || []) as Product[], !!user)
          setProducts(list)
        }),
    ]).finally(() => {
      if (!cancelled) setHomeFeedLoading(false)
    })

    const storiesUrl = user
      ? `/api/stories?page=home&currentUserId=${user.id}`
      : '/api/stories?page=home'
    fetch(storiesUrl)
      .then((r) => (r.ok ? r.json() : { stories: [] }))
      .then((d) => {
        if (!cancelled) setStories((d.stories || []).slice(0, 6))
      })
      .catch(() => {
        if (!cancelled) setStories([])
      })

    return () => {
      cancelled = true
    }
  }, [user, initialMasters])

  const onSearch = () => {
    const q = searchQ.trim()
    router.push(q ? `/search?q=${encodeURIComponent(q)}` : '/search')
  }

  const canCreateStory =
    !!user && (user.role === 'master' || user.role === 'seller')

  return (
    <div className="min-h-screen bg-[#f5f5f7] max-w-lg mx-auto w-full shadow-sm pb-24">
      <Navbar />

      {/* Hero */}
      <section className="bg-white px-4 pt-5 pb-4">
        <div className="inline-flex items-center gap-1.5 bg-[#fff1f2] rounded-full px-3 py-1 mb-3.5">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-accent" />
          <span className="text-[11px] font-bold text-brand-accent uppercase tracking-wide">
            Платформа профессионалов
          </span>
        </div>
        <h1 className="text-[28px] font-extrabold text-[#111] leading-[1.15] mb-2">
          Найдите <span className="text-brand-accent">мастера</span>
          <br />
          или заработайте
        </h1>
        <p className="text-[13px] text-[#888] leading-relaxed mb-4">
          Строители, сантехники, электрики
          <br />
          и продавцы — в одном месте
        </p>

        <div className="relative mb-3.5" ref={searchWrapperRef}>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              setShowSuggestions(false)
              onSearch()
            }}
            className="flex items-center gap-2.5 bg-[#f5f5f7] rounded-2xl px-3.5 py-3 border border-[#f0f0f0]"
          >
            <FiSearch className="text-brand-accent flex-shrink-0" size={18} />
            <input
              type="text"
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              onFocus={() => searchQ.trim().length >= 2 && setShowSuggestions(true)}
              placeholder="Мастер, услуга или товар..."
              autoComplete="off"
              className="flex-1 bg-transparent text-[13px] text-[#111] placeholder:text-[#aaa] outline-none min-w-0"
            />
            {searchQ && (
              <button
                type="button"
                onClick={() => {
                  setSearchQ('')
                  setSuggestions([])
                  setShowSuggestions(false)
                }}
                aria-label="Очистить"
                className="text-[#bbb] flex-shrink-0 p-0.5"
              >
                <FiX size={15} />
              </button>
            )}
            <button
              type="submit"
              className="bg-brand-accent text-white text-xs font-bold px-3.5 py-1.5 rounded-xl flex-shrink-0"
            >
              Найти
            </button>
          </form>

          {showSuggestions && (
            <div className="absolute left-0 right-0 top-full mt-1.5 z-50 w-full max-w-full bg-white rounded-2xl border border-[#f0f0f0] shadow-card-hover overflow-hidden">
              {loadingSuggestions ? (
                <div className="px-4 py-3 text-xs text-[#888]">Ищем…</div>
              ) : suggestions.length === 0 ? (
                <div className="px-4 py-3 text-xs text-[#888]">Ничего не найдено</div>
              ) : (
                <ul className="py-1 max-h-[280px] overflow-y-auto">
                  {suggestions.map((item) => (
                    <li key={`${item.type}-${item.id}`}>
                      <button
                        type="button"
                        onClick={() => goToSuggestion(item)}
                        className="w-full flex items-center gap-2.5 text-left px-4 py-2.5 hover:bg-[#f5f5f7] transition-colors"
                      >
                        <span
                          className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${
                            item.type === 'master'
                              ? 'bg-brand-accent/10 text-brand-accent'
                              : item.type === 'product' ||
                                  item.type === 'product_category' ||
                                  item.type === 'product_subcategory'
                                ? 'bg-[#eef6ff] text-[#2563eb]'
                                : 'bg-[#f5f5f7] text-[#888]'
                          }`}
                        >
                          {SUGGESTION_ICON[item.type]}
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-[13px] text-[#111] font-medium truncate">{item.name}</span>
                          <span className="block text-[10px] text-[#999]">{SUGGESTION_LABEL[item.type]}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {heroCats.map((cat) => (
            <Link
              key={cat.label}
              href={cat.id ? `/search?category=${cat.id}` : '/search'}
              className="flex items-center gap-1.5 bg-[#f5f5f7] border border-[#eee] rounded-full px-3.5 py-1.5 flex-shrink-0"
            >
              <span className="text-sm">{cat.emoji}</span>
              <span className="text-xs text-[#444] font-medium">{cat.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {DIVIDER}

      {/* Stories */}
      {(stories.length > 0 || canCreateStory) && (
        <div className="bg-white px-3 py-2.5 border-b border-[#efefef]">
          <StoriesCircle
            stories={stories}
            currentUser={user}
            showCreateButton
            onStoryCreated={() => {
              const storiesUrl = user
                ? `/api/stories?page=home&currentUserId=${user.id}`
                : '/api/stories?page=home'
              fetch(storiesUrl)
                .then((r) => (r.ok ? r.json() : { stories: [] }))
                .then((d) => setStories((d.stories || []).slice(0, 12)))
                .catch(() => {})
            }}
          />
        </div>
      )}

      <CompactPageBanner page="home" initialBanners={initialBanners} />

      {DIVIDER}

      {/* Masters */}
      <SectionHeader title="Мастера рядом" linkLabel="Все →" href="/search" />
      {homeFeedLoading ? (
        <div className="flex gap-3 overflow-x-auto px-4 pb-3.5 scrollbar-hide">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="w-[140px] flex-shrink-0 h-[120px] rounded-[18px] bg-[#f0f0f0] animate-pulse" />
          ))}
        </div>
      ) : masters.length === 0 ? (
        <div className="mx-4 mb-3.5 rounded-[18px] border border-dashed border-[#e0e0e0] bg-white px-4 py-6 text-center">
          <p className="text-sm text-[#888] mb-2">Пока нет мастеров в выдаче — попробуйте поиск по категории</p>
          <Link href="/search" className="text-brand-accent text-sm font-bold">
            Открыть поиск →
          </Link>
        </div>
      ) : (
        <div className="flex gap-2.5 overflow-x-auto px-4 pb-3.5 scrollbar-hide">
          {masters.map((m) => (
            <MasterCard key={m.id} master={m} />
          ))}
          <Link
            href="/search"
            className="w-[100px] flex-shrink-0 rounded-[18px] border border-dashed border-[#e0e0e0] bg-[#f5f5f7] flex flex-col items-center justify-center gap-1.5 p-3"
          >
            <FiArrowRight className="text-brand-accent" size={20} />
            <span className="text-[11px] text-[#888] text-center">Все мастера</span>
          </Link>
        </div>
      )}

      {DIVIDER}

      {/* Products */}
      <SectionHeader title="Материалы и инструменты" linkLabel="Каталог →" href="/products" />
      {homeFeedLoading ? (
        <div className="flex gap-2.5 overflow-x-auto px-4 pb-3.5 scrollbar-hide">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="w-[120px] flex-shrink-0 h-[140px] rounded-[18px] bg-[#f0f0f0] animate-pulse" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="mx-4 mb-3.5 rounded-[18px] border border-dashed border-[#e0e0e0] bg-white px-4 py-6 text-center">
          <p className="text-sm text-[#888] mb-2">Каталог материалов обновляется — загляните позже</p>
          <Link href="/products" className="text-brand-accent text-sm font-bold">
            Открыть каталог →
          </Link>
        </div>
      ) : (
        <div className="flex gap-2.5 overflow-x-auto px-4 pb-3.5 scrollbar-hide">
          {products.map((p) => (
            <ProductCardHome key={p.id} product={p} />
          ))}
        </div>
      )}

      {DIVIDER}

      {/* Roles */}
      <SectionHeader title="Для кого платформа" />
      <div className="grid grid-cols-2 gap-2.5 px-4 pb-4">
        {ROLES.map((r) => (
          <Link
            key={r.title}
            href={r.href}
            className={`rounded-[18px] p-3.5 border bg-white ${
              r.active ? 'border-brand-accent bg-[#fff8f8]' : 'border-[#f0f0f0]'
            }`}
          >
            <div className="text-[22px] mb-2">{r.icon}</div>
            <p className="text-[13px] font-bold text-[#111] mb-0.5">{r.title}</p>
            <p className="text-[11px] text-[#888] leading-snug">{r.desc}</p>
          </Link>
        ))}
      </div>

      {DIVIDER}

      {/* Steps */}
      <SectionHeader title="Как это работает" />
      <div className="px-4 pb-4 relative">
        <div className="absolute left-[13px] top-7 bottom-4 w-0.5 bg-[#f0f0f0]" aria-hidden />
        {STEPS.map((step, i) => (
          <div key={step.title} className={`flex gap-3 relative ${i < STEPS.length - 1 ? 'mb-3.5' : ''}`}>
            <div className="w-7 h-7 rounded-full bg-brand-accent text-white text-xs font-extrabold flex items-center justify-center flex-shrink-0 z-10">
              {i + 1}
            </div>
            <div className="pt-0.5">
              <p className="text-[13px] font-bold text-[#111]">{step.title}</p>
              <p className="text-[11px] text-[#888] leading-snug">{step.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {DIVIDER}

      {/* Trust */}
      <SectionHeader title="Безопасность" />
      <div className="grid grid-cols-2 gap-2.5 px-4 pb-4">
        {TRUST.map((t) => (
          <div key={t.title} className="bg-white rounded-2xl p-3 border border-[#f0f0f0]">
            <div className="text-lg text-brand-accent mb-1.5">{t.icon}</div>
            <p className="text-xs font-bold text-[#111] mb-0.5">{t.title}</p>
            <p className="text-[10px] text-[#888] leading-snug">{t.desc}</p>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="mx-4 mb-3 bg-brand-accent rounded-3xl px-5 py-5 text-center">
        <p className="text-white text-xl font-extrabold mb-1.5">Начните бесплатно</p>
        <p className="text-white/80 text-[13px] mb-4 leading-relaxed">
          Регистрация бесплатна.
          <br />
          Публикация заказа — 200 ₽.
        </p>
        <Link
          href="/search"
          className="block bg-white text-brand-accent text-sm font-extrabold py-3 rounded-xl mb-2.5"
        >
          Найти мастера →
        </Link>
        <Link
          href="/auth/register?role=master"
          className="block text-white text-[13px] font-semibold py-3 rounded-xl border-2 border-white/40"
        >
          Зарегистрироваться как мастер
        </Link>
      </div>

      <div className={user ? 'h-24 bg-[#f5f5f7]' : 'h-3 bg-[#f5f5f7]'} />

    </div>
  )
}
