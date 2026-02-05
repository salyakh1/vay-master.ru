'use client'

import { useEffect, useState, Suspense, useRef, useMemo, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { VariableSizeList as List } from 'react-window'
import { useAuth } from '../providers'
import { supabase, User } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import AdBannerSlider from '@/components/AdBannerSlider'
import Link from 'next/link'
import { FiSearch, FiUser, FiFilter, FiMapPin, FiBriefcase, FiStar, FiCheckCircle } from 'react-icons/fi'
import AuthRequiredModal from '@/components/AuthRequiredModal'
import AdSlot from '@/components/AdSlot'
import StoriesCircle from '@/components/StoriesCircle'
import dynamic from 'next/dynamic'

const RecommendationsCarousel = dynamic(() => import('@/components/RecommendationsCarousel'), {
  ssr: false,
  loading: () => <div className="h-[200px] bg-bg-secondary rounded-xl animate-pulse" aria-hidden />,
})
import { Story } from '@/lib/supabase'
import type { AdBanner } from '@/lib/supabase'
import { getProductCategoriesForSpecializations } from '@/lib/specialization-product-mapping'

const ROW_HEIGHT_CARDS = 420
const ROW_HEIGHT_AD = 100
const ROW_HEIGHT_CAROUSEL = 220
const MASTERS_LIST_HEIGHT = typeof window !== 'undefined' ? Math.min(800, window.innerHeight - 320) : 700

type MastersRow = 
  | { type: 'cards'; masters: [User | undefined, User | undefined] }
  | { type: 'ad'; rowIndex: number }
  | { type: 'carousel' }

function buildMastersRows(masters: User[], showCarousel: boolean): MastersRow[] {
  const rows: MastersRow[] = []
  let cardRowIndex = 0
  for (let i = 0; i < masters.length; i += 2) {
    if (cardRowIndex === 3) rows.push({ type: 'ad', rowIndex: rows.length })
    rows.push({ type: 'cards', masters: [masters[i], masters[i + 1]] })
    if (cardRowIndex === 4 && showCarousel) rows.push({ type: 'carousel' })
    cardRowIndex++
  }
  return rows
}

function getMastersRowHeight(row: MastersRow): number {
  if (row.type === 'cards') return ROW_HEIGHT_CARDS
  if (row.type === 'ad') return ROW_HEIGHT_AD
  return ROW_HEIGHT_CAROUSEL
}

function MasterCardContent({ master }: { master: User }) {
  return (
    <div className="card-glossy group h-[400px] flex flex-col !p-0 overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10 rounded-[12px]" />
      <div className="w-full h-[200px] bg-gradient-to-br from-graphite-primary to-graphite-tertiary flex items-center justify-center text-white text-2xl font-semibold rounded-t-[12px] flex-shrink-0 overflow-hidden relative group/image">
        {master.avatar_url ? (
          <>
            <Image
              src={master.avatar_url}
              alt={master.full_name}
              fill
              className="object-cover transition-all duration-500 group-hover/image:scale-110 group-hover/image:brightness-110"
              sizes="(max-width: 768px) 50vw, 400px"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-white/0 via-white/20 to-transparent opacity-0 group-hover/image:opacity-100 transition-opacity duration-500 pointer-events-none" />
          </>
        ) : (
          master.full_name[0]?.toUpperCase() || '?'
        )}
      </div>
      <div className="flex flex-col items-center text-center p-5 pb-4 relative z-20">
        <h3 className="font-semibold text-base bg-gradient-to-r from-graphite-secondary to-graphite-primary bg-clip-text text-transparent mb-1.5 line-clamp-2 leading-tight group-hover:from-brand-accent group-hover:to-brand-accent-hover transition-all">
          {master.full_name}
        </h3>
        {master.city && (
          <div className="flex items-center gap-1 text-xs text-text-secondary mb-2.5">
            <FiMapPin size={12} strokeWidth={2} className="text-brand-accent/60" />
            <span>{master.city}</span>
          </div>
        )}
        {master.master_reviews_count && master.master_reviews_count > 0 ? (
          <div className="flex items-center gap-1 text-xs text-text-secondary mb-3">
            {master.master_rating && master.master_rating > 0 ? (
              <>
                <FiStar size={12} className="fill-brand-accent text-brand-accent" strokeWidth={0} />
                <span className="font-medium">
                  {master.master_rating.toFixed(1)} ({master.master_reviews_count} {master.master_reviews_count === 1 ? 'отзыв' : master.master_reviews_count < 5 ? 'отзыва' : 'отзывов'})
                </span>
              </>
            ) : (
              <span className="font-medium">
                ({master.master_reviews_count} {master.master_reviews_count === 1 ? 'отзыв' : master.master_reviews_count < 5 ? 'отзыва' : 'отзывов'})
              </span>
            )}
          </div>
        ) : (
          <div className="text-xs text-text-secondary mb-3">Без отзывов</div>
        )}
        {Array.isArray((master as any).profile_subcategories) && (master as any).profile_subcategories.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-1.5 pt-3 border-t border-border-light/40 w-full px-2">
            {(master as any).profile_subcategories.slice(0, 2).map((item: any) => (
              <span
                key={item.subcategory?.id || item.subcategory_id}
                className="px-1.5 py-0.5 bg-gradient-to-br from-brand-accent/15 to-brand-accent/10 text-brand-accent text-[9px] font-medium rounded border border-brand-accent/30 backdrop-blur-sm shadow-sm transition-all group-hover:border-brand-accent/50 group-hover:shadow-md whitespace-nowrap"
              >
                {item.subcategory?.name ?? item.subcategory?.category?.name}
              </span>
            ))}
            {(master as any).profile_subcategories.length > 2 && (
              <span className="text-[9px] text-text-secondary font-medium">...</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export interface SearchContentProps {
  /** Баннеры с сервера для быстрого LCP (SSR). */
  initialBanners?: AdBanner[] | null
}

function SearchContent({ initialBanners = null }: SearchContentProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading: authLoading } = useAuth()
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [loading, setLoading] = useState(false)

  const [masters, setMasters] = useState<User[]>([])
  const [randomProfiles, setRandomProfiles] = useState<User[]>([])
  const [cityFilter, setCityFilter] = useState<string>('')
  const [userCity, setUserCity] = useState<string>('')
  const [tree, setTree] = useState<Array<{ id: string; name: string; slug: string; image_url?: string | null; sort_order: number; subcategories: Array<{ id: string; category_id: string; name: string; slug: string; image_url?: string | null; sort_order: number; services: Array<{ id: string; name: string; slug: string; sort_order: number }> }> }>>([])
  const [selectedCategory, setSelectedCategory] = useState<string>(() => searchParams.get('category') || '')
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>(() => searchParams.get('subcategory') || '')
  const [selectedService, setSelectedService] = useState<string>(() => searchParams.get('service') || '')
  const [showFiltersModal, setShowFiltersModal] = useState(false)
  const [filterStepMasters, setFilterStepMasters] = useState<'category' | 'subcategory' | 'service'>('category')
  const [categoriesForFilter, setCategoriesForFilter] = useState<Array<{ id: string; name: string; slug: string; image_url?: string | null; masters_count?: number }>>([])
  const [filterImageFailed, setFilterImageFailed] = useState<Set<string>>(new Set())
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [stories, setStories] = useState<Story[]>([])
  const [storiesLoading, setStoriesLoading] = useState(false)
  const [mastersPage, setMastersPage] = useState(1)
  const [randomPage, setRandomPage] = useState(1)
  const [loadingMoreMasters, setLoadingMoreMasters] = useState(false)
  const [loadingMoreRandom, setLoadingMoreRandom] = useState(false)
  const [hasMoreMasters, setHasMoreMasters] = useState(true)
  const [hasMoreRandom, setHasMoreRandom] = useState(true)
  const loadMoreRandomSentinelRef = useRef<HTMLDivElement>(null)
  const loadMoreMastersSentinelRef = useRef<HTMLDivElement>(null)
  const mastersListContainerRef = useRef<HTMLDivElement>(null)

  const ITEMS_PER_PAGE = 12

  const randomRows = useMemo(() => buildMastersRows(randomProfiles, true), [randomProfiles])
  const filteredRows = useMemo(() => buildMastersRows(masters, false), [masters])
  const [mastersListWidth, setMastersListWidth] = useState(400)

  useEffect(() => {
    const el = mastersListContainerRef.current
    if (!el) return
    const setW = () => setMastersListWidth(el.offsetWidth)
    setW()
    const ro = new ResizeObserver(setW)
    ro.observe(el)
    return () => ro.disconnect()
  }, [loading, randomProfiles.length, masters.length])

  // Загружаем подкатегории мастера и получаем категории товаров
  const [masterCategorySlugs, setMasterCategorySlugs] = useState<string[]>([])
  const [loadingMasterCategories, setLoadingMasterCategories] = useState(false)

  // Подкатегории мастера — отложенно, не конкурируем с первым экраном (для блока рекомендаций)
  useEffect(() => {
    if (user?.role !== 'master' || !user.id) {
      setMasterCategorySlugs([])
      setLoadingMasterCategories(false)
      return
    }
    let cancelled = false
    const run = () => {
      if (cancelled) return
      setLoadingMasterCategories(true)
      void Promise.resolve(
        supabase
          .from('profile_subcategories')
          .select('subcategory:subcategories(id, slug, category:categories(id, slug))')
          .eq('profile_id', user.id)
      )
        .then(({ data, error }) => {
          if (cancelled) return
          if (!error && data) {
            const slugs = (data as any[])
              .map((item: any) => item.subcategory?.category?.slug)
              .filter(Boolean) as string[]
            setMasterCategorySlugs(Array.from(new Set(slugs)))
          } else {
            setMasterCategorySlugs([])
          }
        })
        .catch(() => { if (!cancelled) setMasterCategorySlugs([]) })
        .finally(() => { if (!cancelled) setLoadingMasterCategories(false) })
    }
    const id = typeof requestIdleCallback !== 'undefined'
      ? requestIdleCallback(run, { timeout: 4000 })
      : setTimeout(run, 4000)
    return () => {
      cancelled = true
      if (typeof cancelIdleCallback !== 'undefined') cancelIdleCallback(id as number)
      else clearTimeout(id as ReturnType<typeof setTimeout>)
    }
  }, [user])

  const masterProductCategories = useMemo(() => {
    if (user?.role !== 'master' || masterCategorySlugs.length === 0) {
      return { categorySlugs: undefined, subcategorySlugs: undefined }
    }
    return getProductCategoriesForSpecializations(masterCategorySlugs)
  }, [user, masterCategorySlugs])

  const isMasterWithCategories = user?.role === 'master' &&
    !loadingMasterCategories &&
    masterProductCategories.categorySlugs &&
    masterProductCategories.categorySlugs.length > 0

  // Убираем редирект для неавторизованных - они могут видеть карточки мастеров

  // Загружаем дерево категорий и список категорий с количеством мастеров при открытии модалки
  useEffect(() => {
    if (!showFiltersModal) return
    const fetchReference = async () => {
      try {
        const [treeRes, countsRes] = await Promise.all([
          fetch('/api/master-categories/tree').then((r) => r.json().catch(() => ({}))),
          fetch('/api/master-categories/with-counts').then((r) => r.json().catch(() => ({}))),
        ])
        setTree((treeRes?.tree || []) as typeof tree)
        setCategoriesForFilter((countsRes?.categories || []) as Array<{ id: string; name: string; slug: string; image_url?: string | null; masters_count?: number }>)
      } catch (error) {
        console.error('Error fetching reference data:', error)
      }
    }
    fetchReference()
  }, [showFiltersModal])

  useEffect(() => {
    setMastersPage(1)
    setMasters([])
    setHasMoreMasters(true)
    performSearch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, cityFilter, selectedCategory, selectedSubcategory, selectedService])

  // Сначала только список мастеров; истории — с задержкой, чтобы не конкурировать за сеть
  useEffect(() => {
    fetchRandomProfiles(1, true)
    const t = setTimeout(() => fetchStories(), 800)
    return () => clearTimeout(t)
  }, [])

  const performSearch = async () => {
    const hasFilters =
      query.trim().length > 0 ||
      !!selectedCategory ||
      !!selectedSubcategory ||
      !!selectedService ||
      !!cityFilter

    // Если нет фильтров — показываем подборку по городу
    if (!hasFilters) {
      await fetchRandomProfiles(1, true)
      setMasters([])
      return
    }

    setLoading(true)

    try {
      await searchMastersViaApi(1, true)
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchRandomProfiles = async (pageNum: number = 1, reset: boolean = false) => {
    try {
      if (reset) {
        setRandomProfiles([])
        setRandomPage(1)
        setHasMoreRandom(true)
      } else {
        setLoadingMoreRandom(true)
      }

      const from = (pageNum - 1) * ITEMS_PER_PAGE
      const to = from + ITEMS_PER_PAGE - 1

      let query = supabase
        .from('profiles')
        .select(`
          *,
          profile_subcategories (
            subcategory:subcategories (id, name, slug, category:categories (id, name, slug))
          ),
          profile_services (
            service:services (id, name, slug, subcategory:subcategories (id, name, slug, category:categories (id, name, slug)))
          ),
          master_rating,
          master_reviews_count
        `, { count: 'exact' })
        .eq('role', 'master')
        .range(from, to)

      const { data, error, count } = await query

      if (error) throw error
      const list = (data as any[]) || []
      
      // Перемешиваем только первую страницу для случайного порядка
      if (reset && pageNum === 1) {
        for (let i = list.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1))
          ;[list[i], list[j]] = [list[j], list[i]]
        }
      }

      if (reset) {
        setRandomProfiles(list)
      } else {
        setRandomProfiles(prev => [...prev, ...list])
      }

      setHasMoreRandom(list.length === ITEMS_PER_PAGE && (count || 0) > pageNum * ITEMS_PER_PAGE)
    } catch (error) {
      console.error('Error fetching random profiles:', error)
      if (reset) {
        setRandomProfiles([])
      }
    } finally {
      setLoadingMoreRandom(false)
    }
  }

  const loadMoreRandom = () => {
    if (!loadingMoreRandom && hasMoreRandom) {
      const nextPage = randomPage + 1
      setRandomPage(nextPage)
      fetchRandomProfiles(nextPage, false)
    }
  }

  const fetchUserCity = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('city')
        .eq('id', user!.id)
        .maybeSingle()
      if (error) throw error
      setUserCity((data as any)?.city || '')
    } catch (error) {
      console.error('Error fetching user city:', error)
      setUserCity('')
    }
  }

  const fetchStories = async () => {
    try {
      console.log('fetchStories called')
      setStoriesLoading(true)
      const params = new URLSearchParams({
        page: 'search',
        ...(user?.id && { currentUserId: user.id }),
      })
      console.log('Fetching stories with params:', params.toString())
      const response = await fetch(`/api/stories?${params.toString()}`)
      console.log('Response status:', response.status)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('API error:', errorData)
        throw new Error(errorData.error || 'Failed to fetch stories')
      }
      const data = await response.json()
      console.log('Stories fetched:', data.stories?.length || 0, 'stories', data.stories)
      setStories(data.stories || [])
    } catch (error) {
      console.error('Error fetching stories:', error)
      setStories([])
    } finally {
      setStoriesLoading(false)
    }
  }

  // Единый API поиска мастеров (геокод + зона обслуживания + спец/услуги на сервере)
  const searchMastersViaApi = async (pageNum: number = 1, reset: boolean = false) => {
    try {
      if (reset) {
        setMasters([])
        setMastersPage(1)
        setHasMoreMasters(true)
      } else {
        setLoadingMoreMasters(true)
      }

      const params = new URLSearchParams()
      if (query.trim()) params.set('q', query.trim())
      if (cityFilter.trim()) params.set('city', cityFilter.trim())
      if (selectedCategory) params.set('category', selectedCategory)
      if (selectedSubcategory) params.set('subcategory', selectedSubcategory)
      if (selectedService) params.set('service', selectedService)
      params.set('page', String(pageNum))

      const res = await fetch(`/api/search/masters?${params.toString()}`)
      if (!res.ok) throw new Error('Ошибка поиска')
      const { masters: newMasters, hasMore } = await res.json()

      if (reset) {
        setMasters(newMasters || [])
      } else {
        setMasters((prev) => [...prev, ...(newMasters || [])])
        setMastersPage(pageNum)
      }
      setHasMoreMasters(!!hasMore)
    } catch (error) {
      console.error('Error searching masters:', error)
      if (reset) setMasters([])
    } finally {
      setLoadingMoreMasters(false)
    }
  }

  const loadMoreMasters = () => {
    if (!loadingMoreMasters && hasMoreMasters) {
      const nextPage = mastersPage + 1
      setMastersPage(nextPage)
      searchMastersViaApi(nextPage, false)
    }
  }

  // Бесконечный скролл: рандомные мастера
  useEffect(() => {
    const el = loadMoreRandomSentinelRef.current
    if (!el || !hasMoreRandom || loadingMoreRandom) return
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0]?.isIntersecting) loadMoreRandom() },
      { rootMargin: '300px', threshold: 0 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMoreRandom, loadingMoreRandom, randomPage, randomProfiles.length])

  // Бесконечный скролл: мастера по поиску
  useEffect(() => {
    const el = loadMoreMastersSentinelRef.current
    if (!el || !hasMoreMasters || loadingMoreMasters) return
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0]?.isIntersecting) loadMoreMasters() },
      { rootMargin: '300px', threshold: 0 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMoreMasters, loadingMoreMasters, mastersPage, masters.length])

  const fetchProfileIdsByFilters = async (): Promise<string[] | null> => {
    try {
      if (selectedService) {
        const { data, error } = await supabase
          .from('profile_services')
          .select('profile_id')
          .eq('service_id', selectedService)
        if (error) throw error
        return (data || []).map((row) => row.profile_id as string)
      }
      if (selectedSubcategory) {
        const { data, error } = await supabase
          .from('profile_subcategories')
          .select('profile_id')
          .eq('subcategory_id', selectedSubcategory)
        if (error) throw error
        return (data || []).map((row) => row.profile_id as string)
      }
      if (selectedCategory) {
        const subIds = tree.find((c) => c.id === selectedCategory)?.subcategories?.map((s) => s.id) || []
        if (subIds.length === 0) return null
        const { data, error } = await supabase
          .from('profile_subcategories')
          .select('profile_id')
          .in('subcategory_id', subIds)
        if (error) throw error
        return Array.from(new Set((data || []).map((row) => row.profile_id as string)))
      }
      return null
    } catch (error) {
      console.error('Error filtering masters by category/subcategory/service:', error)
      return null
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    performSearch()
  }

  // Убираем проверку авторизации - неавторизованные могут видеть карточки мастеров

  const roleLabels = {
    master: 'Мастер',
    seller: 'Продавец',
    client: 'Клиент',
  }

  const roleEmoji = {
    master: '🔨',
    seller: '🛒',
    client: '👤',
  }

  const selectedCategoryNode = tree.find((c) => c.id === selectedCategory)
  const subcategoriesForFilter = selectedCategoryNode?.subcategories || []
  const selectedSubcategoryNode = subcategoriesForFilter.find((s) => s.id === selectedSubcategory)
  const servicesForFilter = selectedSubcategoryNode?.services || []

  const hasFilters =
    query.trim().length > 0 ||
    !!selectedCategory ||
    !!selectedSubcategory ||
    !!selectedService ||
    !!cityFilter

  return (
    <div className="min-h-screen bg-bg-primary pb-20">
      {user && <Navbar />}
      {/* Баннеры без отступов по бокам */}
      <div className="w-full mb-6">
        <AdBannerSlider page="search" initialBanners={initialBanners ?? undefined} />
      </div>
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-semibold mb-6 text-text-primary">Мастера</h1>

          {/* Search Form */}
          <form onSubmit={handleSearch} className="mb-6">
            <div className="flex flex-col gap-3">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary" size={16} />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Поиск мастеров..."
                  className="input pl-10 pr-10 h-10 text-sm w-full"
                />
                <button
                  type="button"
                  onClick={() => setShowFiltersModal(true)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors"
                  title="Фильтры"
                >
                  <FiFilter size={16} />
                </button>
              </div>

              <button type="submit" className="btn btn-primary h-10 w-full text-sm">
                Найти
              </button>
            </div>
          </form>

          {/* Модалка фильтров: категория → подкатегория → услуга */}
          {showFiltersModal && (
            <div
              className="fixed inset-0 z-50 bg-black/40"
              onClick={() => setShowFiltersModal(false)}
            >
              <div
                className="absolute inset-0 bottom-16 bg-white flex flex-col rounded-t-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-border-light">
                  <button
                    onClick={() => setShowFiltersModal(false)}
                    className="text-text-secondary hover:text-graphite-secondary text-xl font-light w-8 h-8 flex items-center justify-center"
                    aria-label="Закрыть"
                  >
                    ×
                  </button>
                  <div className="text-base font-semibold text-graphite-secondary">
                    {filterStepMasters === 'category' && 'Выберите категорию'}
                    {filterStepMasters === 'subcategory' && 'Выберите подкатегорию'}
                    {filterStepMasters === 'service' && 'Выберите услугу'}
                  </div>
                  <button
                    onClick={() => {
                      setSelectedCategory('')
                      setSelectedSubcategory('')
                      setSelectedService('')
                      setCityFilter('')
                      setFilterStepMasters('category')
                    }}
                    className="text-xs text-text-secondary hover:text-graphite-secondary font-medium"
                  >
                    Сбросить
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-4">
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-graphite-secondary mb-2">Город</label>
                    <input
                      type="text"
                      value={cityFilter}
                      onChange={(e) => setCityFilter(e.target.value)}
                      placeholder="Введите город"
                      className="input w-full h-10 text-sm"
                    />
                  </div>

                  {filterStepMasters === 'category' && (
                    <div className="grid grid-cols-3 gap-1">
                      {categoriesForFilter.map((cat) => {
                        const showImage = !filterImageFailed.has(cat.id)
                        const imgSize = 88
                        const imageUrl = cat.image_url || `https://picsum.photos/seed/${encodeURIComponent(cat.slug)}/${imgSize * 2}/${imgSize * 2}`
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => {
                              setSelectedCategory(cat.id)
                              setSelectedSubcategory('')
                              setSelectedService('')
                              setFilterStepMasters('subcategory')
                            }}
                            className={`flex flex-col overflow-hidden rounded-xl border transition-all ${
                              selectedCategory === cat.id
                                ? 'border-brand-accent bg-brand-accent/5 text-brand-accent'
                                : 'border-border-light text-graphite-secondary hover:border-brand-accent/30 hover:bg-bg-secondary'
                            }`}
                          >
                            <div className="w-full aspect-square flex-shrink-0 bg-bg-secondary flex items-center justify-center">
                              {showImage ? (
                                <img
                                  src={imageUrl}
                                  alt=""
                                  width={imgSize * 2}
                                  height={imgSize * 2}
                                  loading="lazy"
                                  decoding="async"
                                  className="w-full h-full object-cover"
                                  onError={() => setFilterImageFailed((prev) => new Set(prev).add(cat.id))}
                                />
                              ) : (
                                <FiBriefcase size={32} className="text-text-muted" />
                              )}
                            </div>
                            <span className="text-sm font-medium text-center leading-tight line-clamp-2 px-1 py-2 block">
                              {cat.name}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {filterStepMasters === 'subcategory' && (
                    <>
                      <button
                        type="button"
                        onClick={() => { setFilterStepMasters('category'); setSelectedSubcategory(''); setSelectedService('') }}
                        className="flex items-center gap-2 text-sm text-text-secondary hover:text-graphite-secondary font-medium mb-4"
                      >
                        ← Назад к категориям
                      </button>
                      {selectedCategory && (
                        <div className="p-3 bg-bg-secondary rounded-lg mb-4">
                          <span className="text-sm font-semibold text-graphite-secondary">
                            {categoriesForFilter.find((c) => c.id === selectedCategory)?.name || selectedCategoryNode?.name}
                          </span>
                        </div>
                      )}
                      <div className="text-xs font-semibold text-text-secondary mb-2 uppercase tracking-wide">
                        Подкатегория
                      </div>
                      <div className="grid grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto pr-1">
                        {subcategoriesForFilter.map((sub) => (
                          <button
                            key={sub.id}
                            type="button"
                            onClick={() => {
                              setSelectedSubcategory(sub.id)
                              setSelectedService('')
                              setFilterStepMasters('service')
                            }}
                            className={`border rounded-xl p-3 text-left text-sm transition-all ${
                              selectedSubcategory === sub.id
                                ? 'border-brand-accent bg-brand-accent/5 text-brand-accent font-medium'
                                : 'border-border-light text-graphite-secondary hover:border-brand-accent/30 hover:bg-bg-secondary'
                            }`}
                          >
                            {sub.name}
                          </button>
                        ))}
                      </div>
                    </>
                  )}

                  {filterStepMasters === 'service' && (
                    <>
                      <button
                        type="button"
                        onClick={() => { setFilterStepMasters('subcategory'); setSelectedService('') }}
                        className="flex items-center gap-2 text-sm text-text-secondary hover:text-graphite-secondary font-medium mb-4"
                      >
                        ← Назад к подкатегориям
                      </button>
                      {(selectedCategory || selectedSubcategory) && (
                        <div className="p-3 bg-bg-secondary rounded-lg mb-4">
                          <span className="text-sm font-semibold text-graphite-secondary">
                            {selectedSubcategoryNode?.name || categoriesForFilter.find((c) => c.id === selectedCategory)?.name}
                          </span>
                        </div>
                      )}
                      <div className="text-xs font-semibold text-text-secondary mb-2 uppercase tracking-wide">
                        Услуга
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {servicesForFilter.map((svc) => (
                          <button
                            key={svc.id}
                            type="button"
                            onClick={() => {
                              setSelectedService(svc.id)
                              setShowFiltersModal(false)
                              performSearch()
                            }}
                            className={`border rounded-xl p-3 text-left text-sm transition-all ${
                              selectedService === svc.id
                                ? 'border-brand-accent bg-brand-accent/5 text-brand-accent font-medium'
                                : 'border-border-light text-graphite-secondary hover:border-brand-accent/30 hover:bg-bg-secondary'
                            }`}
                          >
                            {svc.name}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                <div className="p-4 border-t border-border-light bg-white">
                  {filterStepMasters === 'category' && selectedCategory ? (
                    <button
                      type="button"
                      onClick={() => { setSelectedSubcategory(''); setSelectedService(''); setShowFiltersModal(false); performSearch() }}
                      className="btn btn-primary w-full h-12 text-base font-semibold"
                    >
                      Применить по категории
                    </button>
                  ) : filterStepMasters === 'subcategory' && selectedSubcategory ? (
                    <button
                      type="button"
                      onClick={() => { setSelectedService(''); setShowFiltersModal(false); performSearch() }}
                      className="btn btn-primary w-full h-12 text-base font-semibold"
                    >
                      Применить по подкатегории
                    </button>
                  ) : filterStepMasters === 'service' || selectedService ? (
                    <button
                      type="button"
                      onClick={() => { setShowFiltersModal(false); performSearch() }}
                      className="btn btn-primary w-full h-12 text-base font-semibold"
                    >
                      Найти
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => { setShowFiltersModal(false); performSearch() }}
                      className="btn btn-primary w-full h-12 text-base font-semibold"
                    >
                      Найти
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Истории мастеров - под фильтром (видны всем) */}
          {storiesLoading ? (
            <div className="mb-6 text-center text-text-secondary text-sm">Загрузка историй...</div>
          ) : stories.length > 0 ? (
            <div className="mb-6">
              <StoriesCircle
                stories={stories}
                currentUser={user || null}
                isOwnProfile={false}
                onStoryCreated={fetchStories}
              />
            </div>
          ) : null}

          <RecommendationsCarousel
            title={
              isMasterWithCategories
                ? "Рекомендации под ваши услуги"
                : "Рекомендации Pro‑товаров"
            }
            query={query}
            categorySlugs={isMasterWithCategories ? masterProductCategories.categorySlugs : undefined}
            subcategorySlugs={isMasterWithCategories ? masterProductCategories.subcategorySlugs : undefined}
            role={user?.role || 'client'}
            limit={12}
          />

          {/* Results */}
          {loading ? (
            <div className="text-center py-12 text-text-secondary">Поиск...</div>
          ) : !hasFilters ? (
            <>
              {randomProfiles.length > 0 ? (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-text-primary mb-2">
                    Мастера вашего города
                  </h2>
                  <div ref={mastersListContainerRef} style={{ height: MASTERS_LIST_HEIGHT }} className="w-full overflow-hidden">
                    <List
                      width={mastersListWidth}
                      height={MASTERS_LIST_HEIGHT}
                      itemCount={randomRows.length}
                      itemSize={(i) => getMastersRowHeight(randomRows[i])}
                      itemData={{
                        rows: randomRows,
                        user,
                        setShowAuthModal,
                        query,
                        context: { page: 'search' as const, category: selectedCategory ? [selectedCategory] : undefined, city: cityFilter || userCity || undefined },
                        role: user?.role || 'client',
                      }}
                      onScroll={({ scrollOffset }) => {
                        let total = 0
                        for (let i = 0; i < randomRows.length; i++) total += getMastersRowHeight(randomRows[i])
                        if (total > 0 && scrollOffset + MASTERS_LIST_HEIGHT >= total - 400 && hasMoreRandom && !loadingMoreRandom) {
                          setRandomPage((p) => p + 1)
                        }
                      }}
                    >
                      {({ index, style, data }) => {
                        const row = data.rows[index]
                        if (!row) return <div style={style} />
                        if (row.type === 'cards') {
                          return (
                            <div style={{ ...style, paddingBottom: 8 }} className="box-border w-full">
                              <div className="grid grid-cols-2 gap-5">
                                {row.masters.map((master) =>
                                  master ? (
                                    user ? (
                                      <Link key={master.id} href={`/profile/${master.id}`}>
                                        <MasterCardContent master={master} />
                                      </Link>
                                    ) : (
                                      <div key={master.id} onClick={() => data.setShowAuthModal(true)} className="cursor-pointer">
                                        <MasterCardContent master={master} />
                                      </div>
                                    )
                                  ) : null
                                )}
                              </div>
                            </div>
                          )
                        }
                        if (row.type === 'ad') {
                          return (
                            <div style={style} className="flex items-center justify-center">
                              <AdSlot type="INLINE_CONTEXT" context={data.context} index={row.rowIndex} className="my-4" />
                            </div>
                          )
                        }
                        return (
                          <div style={style}>
                            <RecommendationsCarousel title="Рекомендации Pro‑товаров" query={data.query} role={data.role} limit={12} />
                          </div>
                        )
                      }}
                    </List>
                  </div>
                  {loadingMoreRandom && <div className="text-center text-sm text-text-secondary py-2">Загрузка…</div>}
                  {hasMoreRandom && <div ref={loadMoreRandomSentinelRef} className="h-4" aria-hidden />}
                </div>
              ) : (
                <div className="text-center py-12 text-text-secondary">
                  Введите запрос или выберите фильтры
                </div>
              )}
            </>
          ) : (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-text-primary flex items-center gap-2 mb-2">
                <FiUser />
                Мастера ({masters.length})
              </h2>
              {masters.length === 0 ? (
                <div className="card text-center text-text-secondary py-12">
                  Мастера не найдены
                </div>
              ) : (
                <>
                <div ref={mastersListContainerRef} style={{ height: MASTERS_LIST_HEIGHT }} className="w-full overflow-hidden">
                  <List
                    width={mastersListWidth}
                    height={MASTERS_LIST_HEIGHT}
                    itemCount={filteredRows.length}
                    itemSize={(i) => getMastersRowHeight(filteredRows[i])}
                    itemData={{
                      rows: filteredRows,
                      user,
                      setShowAuthModal,
                      query,
                      context: { page: 'search' as const, category: selectedCategory ? [selectedCategory] : undefined, keywords: query ? [query] : undefined, city: cityFilter || userCity || undefined },
                      role: user?.role || 'client',
                    }}
                    onScroll={({ scrollOffset }) => {
                      let total = 0
                      for (let i = 0; i < filteredRows.length; i++) total += getMastersRowHeight(filteredRows[i])
                      if (total > 0 && scrollOffset + MASTERS_LIST_HEIGHT >= total - 400 && hasMoreMasters && !loadingMoreMasters) {
                        setMastersPage((p) => p + 1)
                      }
                    }}
                  >
                    {({ index, style, data }) => {
                      const row = data.rows[index]
                      if (!row) return <div style={style} />
                      if (row.type === 'cards') {
                        return (
                          <div style={{ ...style, paddingBottom: 8 }} className="box-border w-full">
                            <div className="grid grid-cols-2 gap-5">
                              {row.masters.map((master) =>
                                master ? (
                                  user ? (
                                    <Link key={master.id} href={`/profile/${master.id}`}>
                                      <MasterCardContent master={master} />
                                    </Link>
                                  ) : (
                                    <div key={master.id} onClick={() => data.setShowAuthModal(true)} className="cursor-pointer">
                                      <MasterCardContent master={master} />
                                    </div>
                                  )
                                ) : null
                              )}
                            </div>
                          </div>
                        )
                      }
                      if (row.type === 'ad') {
                        return (
                          <div style={style} className="flex items-center justify-center">
                            <AdSlot type="INLINE_CONTEXT" context={data.context} index={row.rowIndex} className="my-4" />
                          </div>
                        )
                      }
                      return (
                        <div style={style}>
                          <RecommendationsCarousel title="Рекомендации Pro‑товаров" query={data.query} role={data.role} limit={12} />
                        </div>
                      )
                    }}
                  </List>
                </div>
                {loadingMoreMasters && <div className="text-center text-sm text-text-secondary py-2">Загрузка…</div>}
                {hasMoreMasters && <div ref={loadMoreMastersSentinelRef} className="h-4" aria-hidden />}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Auth Required Modal */}
      <AuthRequiredModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
        type="master"
      />
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Загрузка...</div>
      </div>
    }>
      <SearchContent />
    </Suspense>
  )
}

