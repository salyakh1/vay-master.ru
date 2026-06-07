'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from './providers'
import { supabase, User, Product, Story } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import GuestAwareProfileLink from '@/components/GuestAwareProfileLink'
import { sanitizeProductsForGuest, profileLoginUrl } from '@/lib/guest-access'
import type { AdBanner } from '@/lib/supabase'
import type { MasterCategoryWithCount } from '@/lib/server-data'
import { FiSearch, FiStar, FiArrowRight } from 'react-icons/fi'

interface HomeClientProps {
  initialBanners?: AdBanner[] | null
  initialCategories?: MasterCategoryWithCount[] | null
  initialTotalMasters?: number | null
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
  { title: 'Оставьте отзыв', desc: 'Помогите другим выбрать' },
]

const TRUST = [
  { icon: '✓', title: 'Модерация', desc: 'Профили проверяются до публикации' },
  { icon: '⭐', title: 'Реальные отзывы', desc: 'Только после выполненных заказов' },
  { icon: '🛡', title: 'Жалобы', desc: 'Ответ за 24 часа' },
  { icon: '💬', title: 'Поддержка', desc: 'Администрация на связи' },
]

const ROLES = [
  { icon: '🔨', title: 'Мастерам', desc: 'Заказы без комиссий, портфолио, PRO', href: '/auth/register?role=master', active: true },
  { icon: '🛒', title: 'Продавцам', desc: 'Продавайте инструменты и материалы', href: '/auth/register?role=seller' },
  { icon: '👤', title: 'Клиентам', desc: 'Проверенные мастера с отзывами', href: '/auth/register?role=client' },
  { icon: '🆓', title: 'Бесплатно', desc: 'Регистрация без скрытых платежей', href: '/auth/register' },
]

function catEmoji(slug: string, name: string): string {
  const s = `${slug} ${name}`.toLowerCase()
  if (s.includes('электр')) return '⚡'
  if (s.includes('сантех') || s.includes('вод')) return '🚿'
  if (s.includes('строй') || s.includes('фундам')) return '🏗️'
  if (s.includes('отдел') || s.includes('плит')) return '🎨'
  return '🔧'
}

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
  const specs =
    master.specialization ||
    (master as User & { profile_subcategories?: Array<{ subcategory?: { name?: string } }> })
      .profile_subcategories?.[0]?.subcategory?.name ||
    'Мастер'

  return (
    <GuestAwareProfileLink profileId={master.id} className="block w-[140px] flex-shrink-0">
      <div className="bg-white rounded-[18px] p-3 border border-[#f0f0f0]">
        <div className="flex items-start justify-between mb-2">
          <div className="w-11 h-11 rounded-full bg-brand-accent text-white text-sm font-bold flex items-center justify-center overflow-hidden">
            {master.avatar_url ? (
              <Image src={master.avatar_url} alt="" width={44} height={44} className="object-cover w-full h-full" />
            ) : (
              initials
            )}
          </div>
          {master.is_pro && (
            <span className="bg-brand-accent text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-md">PRO</span>
          )}
        </div>
        <p className="text-[13px] font-bold text-[#111] truncate">{master.full_name}</p>
        <p className="text-[11px] text-[#888] truncate mb-1.5">{specs}</p>
        <div className="flex items-center gap-1 text-[11px]">
          <FiStar className="text-amber-400 fill-amber-400" size={10} />
          <span className="font-semibold text-[#111]">{rating > 0 ? rating.toFixed(1) : '—'}</span>
          <span className="text-[#aaa]">({reviews})</span>
        </div>
      </div>
    </GuestAwareProfileLink>
  )
}

function HomePageBanner({ initialBanners = null }: { initialBanners?: AdBanner[] | null }) {
  const router = useRouter()
  const { user } = useAuth()
  const [banners, setBanners] = useState<AdBanner[]>(initialBanners ?? [])
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (initialBanners?.length) setBanners(initialBanners)
    let cancelled = false
    fetch('/api/banners?page=home&limit=10')
      .then((r) => (cancelled || !r.ok ? null : r.json()))
      .then((data) => {
        if (cancelled) return
        if (data?.banners?.length) {
          setBanners((prev) => (data.banners.length >= prev.length ? data.banners : prev))
        } else if (!initialBanners?.length) setBanners([])
      })
      .catch(() => {
        if (!initialBanners?.length) setBanners([])
      })
    return () => {
      cancelled = true
    }
  }, [initialBanners?.length])

  useEffect(() => {
    if (banners.length <= 1) return
    const t = setInterval(() => setIndex((i) => (i + 1) % banners.length), 5000)
    return () => clearInterval(t)
  }, [banners.length])

  const handleClick = (banner: AdBanner) => {
    fetch(`/api/banners/${banner.id}/click`, { method: 'POST' }).catch(() => {})
    if (banner.target_type === 'external_url' && banner.external_url) {
      window.open(banner.external_url, '_blank', 'noopener,noreferrer')
      return
    }
    if (banner.target_type === 'master' && banner.target_id) {
      router.push(user ? `/profile/${banner.target_id}` : profileLoginUrl(banner.target_id))
      return
    }
    if (banner.target_type === 'product' && banner.target_id) router.push(`/products/${banner.target_id}`)
    else if (banner.target_type === 'category' && banner.target_id) router.push(`/products?category=${banner.target_id}`)
    else if (banner.target_type === 'order' && banner.target_id) router.push(`/orders/${banner.target_id}`)
  }

  if (banners.length === 0) return null

  const banner = banners[index]
  const hasImage = !!banner.image_url

  const dots =
    banners.length > 1 ? (
      <div className="flex gap-1 justify-center py-1.5 pb-0.5">
        {banners.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setIndex(i)}
            className={`h-[5px] rounded-full transition-all ${
              i === index ? 'bg-brand-accent w-3.5 rounded-[3px]' : 'bg-[#ddd] w-[5px]'
            }`}
            aria-label={`Баннер ${i + 1}`}
          />
        ))}
      </div>
    ) : null

  return (
    <div className="pt-1 pb-0.5 px-3.5">
      <button
        type="button"
        onClick={() => handleClick(banner)}
        className="relative block w-full rounded-[20px] overflow-hidden text-left aspect-[2/1] min-h-[150px] max-h-[180px]"
      >
        {hasImage ? (
          <img
            src={banner.image_url}
            alt={banner.title || 'Реклама'}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(110deg, #1a1a2e 0%, #C7362F 100%)' }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/20 to-transparent" />
        <div
          className="absolute -right-2.5 -top-2.5 w-[70px] h-[70px] rounded-full bg-white/[0.07] pointer-events-none"
          aria-hidden
        />
        <div className="relative z-10 h-full flex flex-col justify-between p-3.5">
          <div className="min-w-0 max-w-[65%]">
            <span className="inline-block bg-white/20 text-white text-[9px] font-bold px-[7px] py-0.5 rounded-[10px] mb-1.5 tracking-wide uppercase">
              {banner.badge_text || 'РЕКЛАМА'}
            </span>
            {banner.show_title !== false && banner.title && (
              <p className="text-white text-[13px] font-extrabold leading-tight mb-1">{banner.title}</p>
            )}
            {banner.show_description !== false && banner.description && (
              <p className="text-white/75 text-[10px] leading-snug line-clamp-2">{banner.description}</p>
            )}
          </div>
          <span className="self-start bg-white text-brand-accent text-[10px] font-extrabold px-3 py-1.5 rounded-[10px] whitespace-nowrap">
            Подробнее
          </span>
        </div>
      </button>
      {dots}
    </div>
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
}: HomeClientProps) {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [searchQ, setSearchQ] = useState('')
  const [masters, setMasters] = useState<User[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [stories, setStories] = useState<Story[]>([])

  const heroCats = useMemo((): HeroCat[] => {
    const fromDb = (initialCategories ?? []).slice(0, 4).map((c) => ({
      label: c.name,
      emoji: catEmoji(c.slug, c.name),
      slug: c.slug,
      id: c.id,
    }))
    return fromDb.length > 0 ? fromDb : FALLBACK_CATS
  }, [initialCategories])

  useEffect(() => {
    fetch('/api/search/masters?page=1')
      .then((r) => (r.ok ? r.json() : { masters: [] }))
      .then((d) => setMasters((d.masters || []).slice(0, 8)))
      .catch(() => setMasters([]))

    supabase
      .from('products')
      .select('id, name, price, images, in_stock')
      .eq('in_stock', true)
      .order('created_at', { ascending: false })
      .limit(8)
      .then(({ data }) => {
        const list = sanitizeProductsForGuest((data || []) as Product[], !!user)
        setProducts(list)
      })

    const storiesUrl = user
      ? `/api/stories?page=home&currentUserId=${user.id}`
      : '/api/stories?page=home'
    fetch(storiesUrl)
      .then((r) => (r.ok ? r.json() : { stories: [] }))
      .then((d) => setStories((d.stories || []).slice(0, 6)))
      .catch(() => setStories([]))
  }, [user])

  const onSearch = () => {
    const q = searchQ.trim()
    router.push(q ? `/search?q=${encodeURIComponent(q)}` : '/search')
  }

  const storiesByUser = useMemo(() => {
    const map = new Map<string, { user: User; story: Story }>()
    stories.forEach((s) => {
      if (s.user && !map.has(s.user.id)) map.set(s.user.id, { user: s.user, story: s })
    })
    return Array.from(map.values())
  }, [stories])

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

        <form
          onSubmit={(e) => {
            e.preventDefault()
            onSearch()
          }}
          className="flex items-center gap-2.5 bg-[#f5f5f7] rounded-2xl px-3.5 py-3 mb-3.5 border border-[#f0f0f0]"
        >
          <FiSearch className="text-brand-accent flex-shrink-0" size={18} />
          <input
            type="text"
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            placeholder="Что нужно сделать?"
            className="flex-1 bg-transparent text-[13px] text-[#111] placeholder:text-[#aaa] outline-none min-w-0"
          />
          <button
            type="submit"
            className="bg-brand-accent text-white text-xs font-bold px-3.5 py-1.5 rounded-xl flex-shrink-0"
          >
            Найти
          </button>
        </form>

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
      {storiesByUser.length > 0 && (
        <>
          <div className="flex gap-3 overflow-x-auto px-4 py-2.5 scrollbar-hide bg-white">
            {user && (
              <button
                type="button"
                onClick={() => router.push('/feed')}
                className="flex flex-col items-center gap-1 flex-shrink-0"
              >
                <div className="w-[52px] h-[52px] rounded-full border-2 border-brand-accent p-0.5 flex items-center justify-center">
                  <div className="w-full h-full rounded-full bg-brand-accent text-white text-xl flex items-center justify-center">
                    +
                  </div>
                </div>
                <span className="text-[9px] text-[#888]">Моё</span>
              </button>
            )}
            {storiesByUser.map(({ user: u, story }) => {
              const initials = u.full_name
                ?.split(' ')
                .map((w) => w[0])
                .join('')
                .slice(0, 2) || '?'
              const seen = story.viewed_by_user
              return (
                <GuestAwareProfileLink
                  key={u.id}
                  profileId={u.id}
                  className="flex flex-col items-center gap-1 flex-shrink-0"
                >
                  <div
                    className={`w-[52px] h-[52px] rounded-full p-0.5 border-2 ${
                      seen ? 'border-[#ddd]' : 'border-brand-accent'
                    }`}
                  >
                    <div className="w-full h-full rounded-full bg-[#f0f0f0] overflow-hidden flex items-center justify-center text-[11px] font-bold text-[#999]">
                      {u.avatar_url ? (
                        <Image src={u.avatar_url} alt="" width={48} height={48} className="object-cover w-full h-full" />
                      ) : (
                        initials
                      )}
                    </div>
                  </div>
                  <span className="text-[9px] text-[#888] max-w-[52px] truncate">
                    {u.full_name?.split(' ')[0]}
                  </span>
                </GuestAwareProfileLink>
              )
            })}
          </div>
        </>
      )}

      <HomePageBanner initialBanners={initialBanners} />

      {DIVIDER}

      {/* Masters */}
      <SectionHeader title="Мастера рядом" linkLabel="Все →" href="/search" />
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

      {DIVIDER}

      {/* Products */}
      <SectionHeader title="Материалы и инструменты" linkLabel="Каталог →" href="/products" />
      <div className="flex gap-2.5 overflow-x-auto px-4 pb-3.5 scrollbar-hide">
        {products.map((p) => (
          <ProductCardHome key={p.id} product={p} />
        ))}
      </div>

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
          Регистрация за 1 минуту.
          <br />
          Клиентам всегда бесплатно.
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
