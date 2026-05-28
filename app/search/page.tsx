'use client'

import { useEffect, useState, Suspense, useRef, useMemo, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { useAuth } from '../providers'
import { supabase, User } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import AdBannerSlider from '@/components/AdBannerSlider'
import Link from 'next/link'
import { FiSearch, FiUser, FiSliders, FiMapPin, FiBriefcase, FiStar, FiCheckCircle } from 'react-icons/fi'
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
import { getProductCategoriesForSpecializations, getProductCategoriesForMasterSubcategorySlugs, getProductCategoriesForCategorySlugs } from '@/lib/specialization-product-mapping'

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

function MasterCardContent({ master }: { master: User }) {
  const specs = Array.isArray((master as any).profile_subcategories) ? (master as any).profile_subcategories : []
  return (
    <div className="card-glossy group h-[320px] flex flex-col !p-0 overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10 rounded-[12px]" />
      <div className="w-full h-[160px] bg-gradient-to-br from-graphite-primary to-graphite-tertiary flex items-center justify-center text-white text-2xl font-semibold rounded-t-[12px] flex-shrink-0 overflow-hidden relative group/image">
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
      <div className="flex flex-col items-start text-left p-2.5 pb-1.5 relative z-20 min-h-0 flex-1 overflow-hidden">
        <h3 className="font-bold text-graphite-secondary text-[15px] leading-tight line-clamp-2 mb-0.5 w-full group-hover:text-brand-accent transition-colors">
          {master.full_name}
        </h3>
        {master.city && (
          <div className="flex items-center gap-1 text-[9px] text-text-muted mb-0.5 min-w-0">
            <FiMapPin size={8} strokeWidth={2} className="text-brand-accent/60 flex-shrink-0" />
            <span className="truncate">{master.city}</span>
          </div>
        )}
        {master.master_reviews_count != null && master.master_reviews_count > 0 ? (
          <div className="flex items-center gap-1 text-[9px] text-text-muted mb-0.5">
            {master.master_rating && master.master_rating > 0 ? (
              <>
                <FiStar size={8} className="fill-brand-accent text-brand-accent flex-shrink-0" strokeWidth={0} />
                <span>{master.master_rating.toFixed(1)} · {master.master_reviews_count} {master.master_reviews_count === 1 ? 'отзыв' : master.master_reviews_count < 5 ? 'отзыва' : 'отзывов'}</span>
              </>
            ) : (
              <span>{master.master_reviews_count} {master.master_reviews_count === 1 ? 'отзыв' : 'отзывов'}</span>
            )}
          </div>
        ) : (
          <div className="text-[9px] text-text-muted mb-0.5">Без отзывов</div>
        )}
        {specs.length > 0 && (
          <div className="flex flex-wrap items-center gap-1 pt-1 border-t border-border-light/50 w-full min-h-0 overflow-hidden">
            {specs.slice(0, 2).map((item: any) => (
              <span
                key={item.subcategory?.id || item.subcategory_id}
                className="min-w-0 max-w-full px-1.5 py-0.5 text-[9px] text-text-secondary bg-bg-secondary rounded border border-border-light truncate inline-block"
                title={item.subcategory?.name ?? item.subcategory?.category?.name}
              >
                {item.subcategory?.name ?? item.subcategory?.category?.name}
              </span>
            ))}
            {specs.length > 2 && (
              <span className="text-[9px] text-text-muted flex-shrink-0">…</span>
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
  const [searchSuggestions, setSearchSuggestions] = useState<Array<{ id: string; name: string; type: string; category_name?: string | null }>>([])
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false)
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const searchInputWrapperRef = useRef<HTMLDivElement>(null)
  const autocompleteAbortRef = useRef<AbortController | null>(null)

  const [masters, setMasters] = useState<User[]>([])
  const [randomProfiles, setRandomProfiles] = useState<User[]>([])
  const [cityFilter, setCityFilter] = useState<string>('')
  const [userCity, setUserCity] = useState<string>('')
  const [tree, setTree] = useState<Array<{ id: string; name: string; slug: string; image_url?: string | null; sort_order: number; subcategories: Array<{ id: string; category_id: string; name: string; slug: string; image_url?: string | null; sort_order: number; services: Array<{ id: string; name: string; slug: string; sort_order: number }> }> }>>([])
  const [selectedCategory, setSelectedCategory] = useState<string>(() => searchParams.get('category') || '')
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>(() => searchParams.get('subcategory') || '')
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(() => {
    const s = searchParams.get('service') || ''
    return s ? s.split(',').map((id) => id.trim()).filter(Boolean) : []
  })
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

  const ITEMS_PER_PAGE = 12

  // Синхронизация фильтров с URL (шаринг и перезагрузка страницы)
  useEffect(() => {
    const params = new URLSearchParams()
    if (query.trim()) params.set('q', query.trim())
    if (selectedCategory) params.set('category', selectedCategory)
    if (selectedSubcategory) params.set('subcategory', selectedSubcategory)
    if (selectedServiceIds.length > 0) params.set('service', selectedServiceIds.join(','))
    if (cityFilter.trim()) params.set('city', cityFilter.trim())
    const qs = params.toString()
    router.replace(qs ? `/search?${qs}` : '/search', { scroll: false })
  }, [query, selectedCategory, selectedSubcategory, selectedServiceIds, cityFilter, router])

  // Подсказки при вводе: 1 категория/подкатегория + 3 услуги (кровел → Кровельные работы + услуги)
  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setSearchSuggestions([])
      setShowSearchSuggestions(false)
      return
    }
    if (autocompleteAbortRef.current) autocompleteAbortRef.current.abort()
    const ctrl = new AbortController()
    autocompleteAbortRef.current = ctrl
    setLoadingSuggestions(true)
    const t = setTimeout(() => {
      fetch(`/api/autocomplete?q=${encodeURIComponent(q)}&for=search`, { signal: ctrl.signal })
        .then((r) => (r.ok ? r.json() : { suggestions: [] }))
        .then((data) => {
          if (ctrl.signal.aborted) return
          setSearchSuggestions(data.suggestions || [])
          setShowSearchSuggestions((data.suggestions?.length || 0) > 0)
        })
        .catch(() => {
          if (!ctrl.signal.aborted) setSearchSuggestions([])
        })
        .finally(() => {
          if (!ctrl.signal.aborted) setLoadingSuggestions(false)
        })
    }, 300)
    return () => {
      clearTimeout(t)
      ctrl.abort()
    }
  }, [query])

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (searchInputWrapperRef.current && !searchInputWrapperRef.current.contains(e.target as Node)) {
        setShowSearchSuggestions(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  const randomRows = useMemo(() => buildMastersRows(randomProfiles, true), [randomProfiles])
  const filteredRows = useMemo(() => buildMastersRows(masters, false), [masters])

  // Загружаем подкатегории мастера и получаем категории товаров для рекомендаций
  const [masterSubcategorySlugs, setMasterSubcategorySlugs] = useState<string[]>([])
  const [masterCategorySlugs, setMasterCategorySlugs] = useState<string[]>([])
  const [loadingMasterCategories, setLoadingMasterCategories] = useState(false)

  // Подкатегории мастера — отложенно (для блока «Рекомендации под ваши услуги»)
  useEffect(() => {
    if (user?.role !== 'master' || !user.id) {
      setMasterSubcategorySlugs([])
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
            const subSlugs = (data as any[])
              .map((item: any) => item.subcategory?.slug)
              .filter(Boolean) as string[]
            const catSlugs = (data as any[])
              .map((item: any) => item.subcategory?.category?.slug)
              .filter(Boolean) as string[]
            setMasterSubcategorySlugs(Array.from(new Set(subSlugs)))
            setMasterCategorySlugs(Array.from(new Set(catSlugs)))
          } else {
            setMasterSubcategorySlugs([])
            setMasterCategorySlugs([])
          }
        })
        .catch(() => {
          if (!cancelled) {
            setMasterSubcategorySlugs([])
            setMasterCategorySlugs([])
          }
        })
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
    if (user?.role !== 'master' || (masterSubcategorySlugs.length === 0 && masterCategorySlugs.length === 0)) {
      return { categorySlugs: undefined, subcategorySlugs: undefined }
    }
    if (masterSubcategorySlugs.length > 0) {
      return getProductCategoriesForMasterSubcategorySlugs(masterSubcategorySlugs, masterCategorySlugs)
    }
    return getProductCategoriesForSpecializations(masterCategorySlugs)
  }, [user, masterSubcategorySlugs, masterCategorySlugs])

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

  // Поиск мастеров только когда модалка фильтра закрыта (выбор категории/подкатегории/услуги без обновления страницы)
  useEffect(() => {
    if (showFiltersModal) return
    setMastersPage(1)
    setMasters([])
    setHasMoreMasters(true)
    performSearch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, cityFilter, selectedCategory, selectedSubcategory, selectedServiceIds, showFiltersModal])

  // Сначала загружаем список мастеров «вашего города»; истории — с задержкой
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
      selectedServiceIds.length > 0 ||
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
      if (selectedServiceIds.length > 0) params.set('service', selectedServiceIds.join(','))
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
      if (selectedServiceIds.length > 0) {
        const allIds: string[] = []
        for (const sid of selectedServiceIds) {
          const { data, error } = await supabase
            .from('profile_services')
            .select('profile_id')
            .eq('service_id', sid)
          if (error) throw error
          allIds.push(...(data || []).map((row) => row.profile_id as string))
        }
        return Array.from(new Set(allIds))
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
    setShowSearchSuggestions(false)
    performSearch()
  }

  const applySuggestion = (name: string) => {
    setQuery(name)
    setShowSearchSuggestions(false)
    setSearchSuggestions([])
    // Поиск запустится из useEffect по изменению query
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

  // Категории/подкатегории товаров по выбранному фильтру (категория или подкатегория мастеров)
  const filterProductCategories = useMemo(() => {
    const categorySlug = selectedCategoryNode?.slug
    const subcategorySlug = selectedSubcategoryNode?.slug
    if (subcategorySlug && categorySlug) {
      return getProductCategoriesForMasterSubcategorySlugs([subcategorySlug], [categorySlug])
    }
    if (categorySlug) {
      return getProductCategoriesForCategorySlugs([categorySlug])
    }
    return null
  }, [selectedCategoryNode?.slug, selectedSubcategoryNode?.slug])

  const hasFilters =
    query.trim().length > 0 ||
    !!selectedCategory ||
    !!selectedSubcategory ||
    selectedServiceIds.length > 0 ||
    !!cityFilter

  return (
    <div className="min-h-screen bg-bg-primary pb-20">
      {user && <Navbar />}
      {/* Баннеры без отступов по бокам */}
      <div className="w-full mb-6">
        <AdBannerSlider page="search" initialBanners={initialBanners ?? undefined} />
      </div>
      <div className="container mx-auto px-3 py-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-semibold mb-4 text-text-primary">Мастера</h1>

          {/* Search Form */}
          <form onSubmit={handleSearch} className="mb-6">
            <div className="flex flex-col gap-3">
              <div className="relative" ref={searchInputWrapperRef}>
                <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" size={16} />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => query.trim().length >= 2 && searchSuggestions.length > 0 && setShowSearchSuggestions(true)}
                  placeholder="Например: кровел, кирпич..."
                  className="input pl-12 pr-11 h-10 text-sm w-full"
                  autoComplete="off"
                  aria-autocomplete="list"
                  aria-expanded={showSearchSuggestions && searchSuggestions.length > 0}
                />
                <button
                  type="button"
                  onClick={() => setShowFiltersModal(true)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors p-1"
                  title="Фильтры"
                >
                  <FiSliders size={18} />
                </button>
                {showSearchSuggestions && searchSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white rounded-lg border border-border-light shadow-md overflow-hidden">
                    {loadingSuggestions ? (
                      <div className="px-3 py-2 text-xs text-text-muted">Загрузка…</div>
                    ) : (
                      <ul className="py-0.5 max-h-[220px] overflow-y-auto">
                        {searchSuggestions.map((item) => {
                          const isCategory = item.type === 'category' || item.type === 'subcategory'
                          return (
                            <li key={`${item.type}-${item.id}`}>
                              <button
                                type="button"
                                onClick={() => applySuggestion(item.name)}
                                className="w-full text-left px-3 py-1.5 hover:bg-bg-secondary transition-colors flex flex-col gap-0.5"
                              >
                                <span className="flex items-center gap-1.5 min-w-0">
                                  <span className="text-xs text-graphite-secondary truncate">{item.name}</span>
                                  {isCategory && (
                                    <span className="flex-shrink-0 text-[10px] text-brand-accent font-medium">Категория</span>
                                  )}
                                </span>
                                {!isCategory && item.category_name && (
                                  <span className="text-[10px] text-text-muted truncate">{item.category_name}</span>
                                )}
                              </button>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </div>
                )}
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
                      setSelectedServiceIds([])
                      setCityFilter('')
                      setFilterStepMasters('category')
                    }}
                    className="text-xs text-text-secondary hover:text-graphite-secondary font-medium"
                  >
                    Сбросить
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-4">
                  {/* Город показываем только после выбора категории, подкатегории или услуги */}
                  {(selectedCategory || selectedSubcategory || selectedServiceIds.length > 0) && (
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
                  )}

                  {filterStepMasters === 'category' && (
                    <div className="grid grid-cols-3 gap-1">
                      {categoriesForFilter.map((cat) => {
                        const showImage = cat.image_url && !filterImageFailed.has(cat.id)
                        const imgSize = 88
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => {
                              setSelectedCategory(cat.id)
                              setSelectedSubcategory('')
                              setSelectedServiceIds([])
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
                                  src={cat.image_url!}
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
                        onClick={() => { setFilterStepMasters('category'); setSelectedSubcategory(''); setSelectedServiceIds([]) }}
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
                              setSelectedServiceIds([])
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
                        onClick={() => { setFilterStepMasters('subcategory'); setSelectedServiceIds([]) }}
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
                              setSelectedServiceIds((prev) =>
                                prev.includes(svc.id) ? prev.filter((id) => id !== svc.id) : [...prev, svc.id]
                              )
                            }}
                            className={`border rounded-xl p-3 text-left text-sm transition-all ${
                              selectedServiceIds.includes(svc.id)
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

                {/* Кнопка «Найти» только после выбора категории (не показываем на шаге «Выберите категорию» без выбора) */}
                {selectedCategory && (
                  <div className="p-4 border-t border-border-light bg-white">
                    {filterStepMasters === 'category' ? (
                      <button
                        type="button"
                        onClick={() => { setSelectedSubcategory(''); setSelectedServiceIds([]); setShowFiltersModal(false) }}
                        className="btn btn-primary w-full h-12 text-base font-semibold"
                      >
                        Применить по категории
                      </button>
                    ) : filterStepMasters === 'subcategory' && selectedSubcategory ? (
                      <button
                        type="button"
                        onClick={() => { setSelectedServiceIds([]); setShowFiltersModal(false) }}
                        className="btn btn-primary w-full h-12 text-base font-semibold"
                      >
                        Применить по подкатегории
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowFiltersModal(false)}
                        className="btn btn-primary w-full h-12 text-base font-semibold"
                      >
                        Найти
                      </button>
                    )}
                  </div>
                )}
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
              isMasterWithCategories && !filterProductCategories
                ? "Рекомендации под ваши услуги"
                : "Рекомендуемые товары"
            }
            query={query}
            categorySlugs={
              filterProductCategories?.categorySlugs?.length
                ? filterProductCategories.categorySlugs
                : isMasterWithCategories
                  ? masterProductCategories.categorySlugs
                  : undefined
            }
            subcategorySlugs={
              filterProductCategories?.subcategorySlugs?.length
                ? filterProductCategories.subcategorySlugs
                : isMasterWithCategories
                  ? masterProductCategories.subcategorySlugs
                  : undefined
            }
            role={user?.role || 'client'}
            limit={20}
          />

          {/* Results */}
          {loading ? (
            <div className="text-center py-12 text-text-secondary">Поиск...</div>
          ) : !hasFilters ? (
            <>
              {randomProfiles.length > 0 ? (
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold text-text-primary mb-1">
                    Мастера вашего города
                  </h2>
                  <div className="w-full space-y-1">
                    {randomRows.map((row, index) => {
                      if (row.type === 'cards') {
                        return (
                          <div key={index} className="w-full pb-1">
                            <div className="grid grid-cols-2 gap-2">
                              {row.masters.map((master) =>
                                master ? (
                                  user ? (
                                    <Link key={master.id} href={`/profile/${master.id}`}>
                                      <MasterCardContent master={master} />
                                    </Link>
                                  ) : (
                                    <div key={master.id} onClick={() => setShowAuthModal(true)} className="cursor-pointer">
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
                          <div key={index} className="flex items-center justify-center py-2">
                            <AdSlot type="INLINE_CONTEXT" context={{ page: 'search' as const, category: selectedCategory ? [selectedCategory] : undefined, city: cityFilter || userCity || undefined }} index={row.rowIndex} className="my-4" />
                          </div>
                        )
                      }
                      return (
                        <div key={index}>
                          <RecommendationsCarousel
                            title="Рекомендуемые товары"
                            query={query}
                            categorySlugs={filterProductCategories?.categorySlugs?.length ? filterProductCategories.categorySlugs : undefined}
                            subcategorySlugs={filterProductCategories?.subcategorySlugs?.length ? filterProductCategories.subcategorySlugs : undefined}
                            role={user?.role || 'client'}
                            limit={20}
                          />
                        </div>
                      )
                    })}
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
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-text-primary flex items-center gap-2 mb-1">
                <FiUser />
                Мастера ({masters.length})
              </h2>
              {masters.length === 0 ? (
                <div className="card text-center text-text-secondary py-12">
                  Мастера не найдены
                </div>
              ) : (
                <>
                <div className="w-full space-y-1">
                  {filteredRows.map((row, index) => {
                    if (row.type === 'cards') {
                      return (
                        <div key={index} className="w-full pb-1">
                          <div className="grid grid-cols-2 gap-2">
                            {row.masters.map((master) =>
                              master ? (
                                user ? (
                                  <Link key={master.id} href={`/profile/${master.id}`}>
                                    <MasterCardContent master={master} />
                                  </Link>
                                ) : (
                                  <div key={master.id} onClick={() => setShowAuthModal(true)} className="cursor-pointer">
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
                        <div key={index} className="flex items-center justify-center py-2">
                          <AdSlot type="INLINE_CONTEXT" context={{ page: 'search' as const, category: selectedCategory ? [selectedCategory] : undefined, keywords: query ? [query] : undefined, city: cityFilter || userCity || undefined }} index={row.rowIndex} className="my-4" />
                        </div>
                      )
                    }
                    return (
                      <div key={index}>
                        <RecommendationsCarousel
                          title="Рекомендуемые товары"
                          query={query}
                          categorySlugs={filterProductCategories?.categorySlugs?.length ? filterProductCategories.categorySlugs : undefined}
                          subcategorySlugs={filterProductCategories?.subcategorySlugs?.length ? filterProductCategories.subcategorySlugs : undefined}
                          role={user?.role || 'client'}
                          limit={20}
                        />
                      </div>
                    )
                  })}
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

