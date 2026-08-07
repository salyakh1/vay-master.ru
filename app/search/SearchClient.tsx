'use client'

import { useEffect, useState, Suspense, useRef, useMemo, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/app/providers'
import SearchLoading from './loading'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import CompactPageBanner from '@/components/CompactPageBanner'
import { FiSearch, FiSliders, FiBriefcase, FiArrowLeft, FiMapPin } from 'react-icons/fi'
import { MastersScrollerSection } from '@/components/scrollers/MastersScrollerSection'
import { ProductsScrollerSection } from '@/components/scrollers/ProductsScrollerSection'
import { MasterListCard, MasterListCardSkeleton } from '@/components/MasterListCard'
import dynamic from 'next/dynamic'
import { fetchMastersPage, LIST_PAGE_SIZE, type MasterScrollerItem } from '@/lib/scrollerApi'
import { useUserLocation } from '@/hooks/useUserLocation'
import { Story } from '@/lib/supabase'
import type { AdBanner } from '@/lib/supabase'
import StoriesCircle from '@/components/StoriesCircle'
import { getProductCategoriesForSpecializations, getProductCategoriesForMasterSubcategorySlugs, getProductCategoriesForCategorySlugs } from '@/lib/specialization-product-mapping'
import { getCategoryEmoji } from '@/lib/categoryEmoji'

const RadiusPickerModal = dynamic(() => import('@/components/RadiusPickerModal'), { ssr: false })

type CitySuggestion = {
  display_name: string
  lat: number
  lng: number
  address?: Record<string, string>
}

function pickCityLabel(result: CitySuggestion): string {
  const a = result.address || {}
  return (
    a.city ||
    a.town ||
    a.village ||
    a.municipality ||
    a.county ||
    result.display_name.split(',')[0]?.trim() ||
    result.display_name
  )
}

export interface SearchContentProps {
  /** Баннеры с сервера для быстрого LCP (SSR). */
  initialBanners?: AdBanner[] | null
  /** Первая страница мастеров с сервера — чтобы HTML не был пустым. */
  initialMasters?: MasterScrollerItem[] | null
  initialTotal?: number
}

function SearchContent({
  initialBanners = null,
  initialMasters = null,
  initialTotal = 0,
}: SearchContentProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [searchSuggestions, setSearchSuggestions] = useState<Array<{ id: string; name: string; type: string; category_name?: string | null }>>([])
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false)
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const searchInputWrapperRef = useRef<HTMLDivElement>(null)
  const cityInputWrapperRef = useRef<HTMLDivElement>(null)
  const autocompleteAbortRef = useRef<AbortController | null>(null)
  const cityAutocompleteAbortRef = useRef<AbortController | null>(null)

  const { lat, lng, radiusKm, city: userLocCity, locationReady, setRadiusKm } = useUserLocation()
  const [showRadiusModal, setShowRadiusModal] = useState(false)
  const [listMasters, setListMasters] = useState<MasterScrollerItem[]>(() => initialMasters || [])
  const [listPage, setListPage] = useState(1)
  const [listTotal, setListTotal] = useState(() => initialTotal || initialMasters?.length || 0)
  const [listLoading, setListLoading] = useState(() => !(initialMasters && initialMasters.length > 0))
  const [listLoadingMore, setListLoadingMore] = useState(false)
  const [listError, setListError] = useState<string | null>(null)
  const [readyToSearch, setReadyToSearch] = useState(() => !!(initialMasters && initialMasters.length > 0))
  const ssrHydratedRef = useRef(!!(initialMasters && initialMasters.length > 0))
  const [cityFilter, setCityFilter] = useState<string>('')
  const [citySuggestions, setCitySuggestions] = useState<CitySuggestion[]>([])
  const [showCitySuggestions, setShowCitySuggestions] = useState(false)
  const [loadingCitySuggestions, setLoadingCitySuggestions] = useState(false)
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
  const [stories, setStories] = useState<Story[]>([])
  const [storiesLoading, setStoriesLoading] = useState(false)

  const searchParamsKey = searchParams.toString()
  const hasCoords = lat != null && lng != null
  const activeCity = cityFilter.trim()
  const hasActiveFilters =
    !!activeCity || !!selectedCategory || !!selectedSubcategory || selectedServiceIds.length > 0

  // Восстановление фильтров из URL (кнопка «назад» / прямой переход)
  useEffect(() => {
    setQuery(searchParams.get('q') || '')
    setSelectedCategory(searchParams.get('category') || '')
    setSelectedSubcategory(searchParams.get('subcategory') || '')
    const svc = searchParams.get('service') || ''
    setSelectedServiceIds(svc ? svc.split(',').map((id) => id.trim()).filter(Boolean) : [])
    setCityFilter(searchParams.get('city') || '')
  }, [searchParamsKey, searchParams])

  // Коротко ждём геолокацию, чтобы сразу отсортировать по расстоянию (без двойной загрузки)
  useEffect(() => {
    if (locationReady) {
      setReadyToSearch(true)
      return
    }
    // Если уже есть SSR-данные — не блокируем экран ожиданием гео
    if (ssrHydratedRef.current) {
      setReadyToSearch(true)
      return
    }
    const t = setTimeout(() => setReadyToSearch(true), 800)
    return () => clearTimeout(t)
  }, [locationReady])
  // Синхронизация фильтров в URL
  useEffect(() => {
    const params = new URLSearchParams()
    if (query.trim()) params.set('q', query.trim())
    if (selectedCategory) params.set('category', selectedCategory)
    if (selectedSubcategory) params.set('subcategory', selectedSubcategory)
    if (selectedServiceIds.length > 0) params.set('service', selectedServiceIds.join(','))
    if (cityFilter.trim()) params.set('city', cityFilter.trim())
    const next = params.toString()
    const current = searchParams.toString()
    if (next !== current) {
      router.replace(next ? `/search?${next}` : '/search', { scroll: false })
    }
  }, [query, selectedCategory, selectedSubcategory, selectedServiceIds, cityFilter, router, searchParams])

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

  // Подсказки городов при вводе в фильтре
  useEffect(() => {
    const q = cityFilter.trim()
    if (q.length < 2) {
      setCitySuggestions([])
      setShowCitySuggestions(false)
      return
    }
    if (cityAutocompleteAbortRef.current) cityAutocompleteAbortRef.current.abort()
    const ctrl = new AbortController()
    cityAutocompleteAbortRef.current = ctrl
    setLoadingCitySuggestions(true)
    const t = setTimeout(() => {
      fetch(`/api/geocode/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal })
        .then((r) => (r.ok ? r.json() : { results: [] }))
        .then((data) => {
          if (ctrl.signal.aborted) return
          const results = (data.results || []) as CitySuggestion[]
          setCitySuggestions(results)
          setShowCitySuggestions(results.length > 0)
        })
        .catch(() => {
          if (!ctrl.signal.aborted) setCitySuggestions([])
        })
        .finally(() => {
          if (!ctrl.signal.aborted) setLoadingCitySuggestions(false)
        })
    }, 350)
    return () => {
      clearTimeout(t)
      ctrl.abort()
    }
  }, [cityFilter])

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (searchInputWrapperRef.current && !searchInputWrapperRef.current.contains(t)) {
        setShowSearchSuggestions(false)
      }
      if (cityInputWrapperRef.current && !cityInputWrapperRef.current.contains(t)) {
        setShowCitySuggestions(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

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

  useEffect(() => {
    fetch('/api/master-categories/with-counts')
      .then((r) => r.json())
      .then((data) => setCategoriesForFilter(data?.categories || []))
      .catch(() => {})
  }, [])

  const loadList = useCallback(
    async (pageNum: number, reset: boolean) => {
      if (reset) {
        setListLoading(true)
        setListError(null)
      } else setListLoadingMore(true)
      try {
        const result = await fetchMastersPage({
          page: pageNum,
          limit: LIST_PAGE_SIZE,
          q: query,
          city: cityFilter.trim() || undefined,
          category: selectedCategory || undefined,
          subcategory: selectedSubcategory || undefined,
          service: selectedServiceIds.length > 0 ? selectedServiceIds.join(',') : undefined,
          lat,
          lng,
          radiusKm,
        })
        if (reset) setListMasters(result.items)
        else setListMasters((prev) => [...prev, ...result.items])
        setListTotal(result.total)
        setListPage(pageNum)
      } catch (error) {
        console.error('Error loading masters list:', error)
        if (reset) {
          setListMasters([])
          setListTotal(0)
          setListError('Не удалось загрузить мастеров. Проверьте соединение и попробуйте снова.')
        }
      } finally {
        setListLoading(false)
        setListLoadingMore(false)
      }
    },
    [
      query,
      cityFilter,
      selectedCategory,
      selectedSubcategory,
      selectedServiceIds,
      lat,
      lng,
      radiusKm,
    ]
  )

  useEffect(() => {
    if (showFiltersModal || !readyToSearch) return
    // Первая отрисовка уже с SSR — не дёргаем API, пока нет координат/смены фильтров
    if (ssrHydratedRef.current && !hasCoords) {
      ssrHydratedRef.current = false
      return
    }
    void loadList(1, true)
  }, [showFiltersModal, readyToSearch, loadList, hasCoords])

  useEffect(() => {
    const t = setTimeout(() => fetchStories(), 800)
    return () => clearTimeout(t)
  }, [user?.id])

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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setShowSearchSuggestions(false)
    void loadList(1, true)
  }

  const applySuggestion = (name: string) => {
    setQuery(name)
    setShowSearchSuggestions(false)
    setSearchSuggestions([])
    // Поиск запустится из useEffect по изменению query
  }

  // Убираем проверку авторизации - неавторизованные могут видеть карточки мастеров

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

  const listRemaining = Math.max(0, listTotal - listMasters.length)
  const showListSkeleton = listLoading || (!readyToSearch && listMasters.length === 0)

  const productScrollerSlugs = useMemo(() => {
    if (filterProductCategories?.categorySlugs?.length) return filterProductCategories
    if (isMasterWithCategories) return masterProductCategories
    return undefined
  }, [filterProductCategories, isMasterWithCategories, masterProductCategories])

  const chipCategories = categoriesForFilter.slice(0, 6)

  const scrollerFilters = {
    q: query || undefined,
    city: cityFilter.trim() || undefined,
    category: selectedCategory || undefined,
    subcategory: selectedSubcategory || undefined,
    service: selectedServiceIds.length > 0 ? selectedServiceIds.join(',') : undefined,
    lat,
    lng,
    radiusKm,
    showRadius: false,
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] max-w-lg mx-auto w-full pb-24">
      <Navbar />

      {/* Шапка поиска */}
      <div className="bg-white px-3.5 pt-2.5 pb-2.5 border-b border-[#f0f0f0]">
        <form onSubmit={handleSearch} className="flex items-center gap-2 mb-2.5">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="text-brand-accent flex-shrink-0 p-0.5"
            aria-label="Назад"
          >
            <FiArrowLeft size={20} />
          </button>
          <div className="relative flex-1 min-w-0" ref={searchInputWrapperRef}>
            <div className="flex items-center gap-1.5 bg-[#f5f5f7] rounded-xl px-3 py-2 border border-[#ececec]">
              <FiSearch className="text-brand-accent flex-shrink-0" size={14} />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => query.trim().length >= 2 && searchSuggestions.length > 0 && setShowSearchSuggestions(true)}
                placeholder="Электрик, сантехник..."
                className="flex-1 bg-transparent text-xs text-[#111] placeholder:text-[#bbb] outline-none min-w-0"
                autoComplete="off"
              />
            </div>
            {showSearchSuggestions && searchSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white rounded-lg border border-[#f0f0f0] shadow-md overflow-hidden">
                {loadingSuggestions ? (
                  <div className="px-3 py-2 text-xs text-[#888]">Загрузка…</div>
                ) : (
                  <ul className="py-0.5 max-h-[220px] overflow-y-auto">
                    {searchSuggestions.map((item) => (
                      <li key={`${item.type}-${item.id}`}>
                        <button
                          type="button"
                          onClick={() => applySuggestion(item.name)}
                          className="w-full text-left px-3 py-1.5 hover:bg-[#f5f5f7] text-xs text-[#111]"
                        >
                          {item.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowFiltersModal(true)}
            className={`flex-shrink-0 rounded-[10px] px-2.5 py-2 text-[11px] font-semibold border ${
              hasActiveFilters
                ? 'bg-[#fff1f2] border-brand-accent text-brand-accent'
                : 'bg-[#f5f5f7] border-[#ececec] text-[#555]'
            }`}
          >
            <FiSliders size={14} className="inline mr-0.5" />
            Фильтр{hasActiveFilters ? ' •' : ''}
          </button>
        </form>

        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('')
              setSelectedSubcategory('')
              setSelectedServiceIds([])
              setCityFilter('')
            }}
            className={`flex-shrink-0 rounded-full px-3 py-1.5 text-[10px] font-medium border ${
              !selectedCategory && !activeCity
                ? 'bg-[#fff1f2] border-brand-accent text-brand-accent font-bold'
                : 'bg-[#f5f5f7] border-[#eee] text-[#555]'
            }`}
          >
            Все
          </button>
          {activeCity && (
            <button
              type="button"
              onClick={() => setShowFiltersModal(true)}
              className="flex-shrink-0 rounded-full px-3 py-1.5 text-[10px] font-medium border whitespace-nowrap bg-[#fff1f2] border-brand-accent text-brand-accent font-bold"
            >
              <FiMapPin size={10} className="inline mr-0.5" />
              {activeCity}
            </button>
          )}
          {chipCategories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setSelectedCategory(cat.id)
                setSelectedSubcategory('')
                setSelectedServiceIds([])
              }}
              className={`flex-shrink-0 rounded-full px-3 py-1.5 text-[10px] font-medium border whitespace-nowrap ${
                selectedCategory === cat.id
                  ? 'bg-[#fff1f2] border-brand-accent text-brand-accent font-bold'
                  : 'bg-[#f5f5f7] border-[#eee] text-[#555]'
              }`}
            >
              {getCategoryEmoji(cat.slug, cat.name)} {cat.name}
            </button>
          ))}
        </div>
      </div>

      <CompactPageBanner page="search" initialBanners={initialBanners} />

      {(stories.length > 0 ||
        (!!user && (user.role === 'master' || user.role === 'seller'))) && (
        <div className="bg-white border-b border-[#efefef] px-3 py-2.5">
          <StoriesCircle
            stories={stories}
            currentUser={user}
            showCreateButton
            onStoryCreated={fetchStories}
          />
        </div>
      )}

      {/* Stat bar */}
      <div className="flex items-center gap-2 px-3.5 py-2">
        {activeCity ? (
          <div className="flex items-center gap-1 bg-white border border-[#e5e5ea] rounded-full px-2.5 py-1 text-[10px] text-[#8e8e93] font-medium max-w-[45%]">
            <FiMapPin size={10} className="shrink-0 text-brand-accent" />
            <strong className="text-[#1c1c1e] font-bold truncate">{activeCity}</strong>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowRadiusModal(true)}
            className="flex items-center gap-1 bg-white border border-[#e5e5ea] rounded-full px-2.5 py-1 text-[10px] text-[#8e8e93] font-medium active:scale-95 transition-transform"
          >
            <span aria-hidden>📍</span>
            <strong className="text-[#1c1c1e] font-bold">{radiusKm} км</strong>
            <span aria-hidden className="text-[8px] text-[#8e8e93]">▾</span>
          </button>
        )}
        <div className="flex items-center gap-1 bg-white border border-[#e5e5ea] rounded-full px-2.5 py-1 text-[10px] text-[#8e8e93] font-medium">
          Найдено: <strong className="text-[#1c1c1e] font-bold">{showListSkeleton ? '…' : listTotal}</strong>
        </div>
        <span className="ml-auto text-[10px] text-brand-accent font-bold">
          {hasCoords ? 'По расстоянию ↑' : 'По рейтингу ↓'}
        </span>
      </div>

      {/* Скроллер: топ мастера рядом */}
      <MastersScrollerSection
        title="Топ мастера рядом"
        label="Рекомендуем"
        labelVariant="red"
        {...scrollerFilters}
      />

      {/* Блок «Все мастера» — сетка 2×2 */}
      <div className="bg-white">
        <p className="text-[11px] font-bold text-[#1c1c1e] px-3.5 pt-3 pb-1.5">
          Все мастера · {listTotal}
        </p>

        {!readyToSearch && (
          <p className="text-[11px] text-[#8e8e93] px-3.5 pb-2">Определяем местоположение для сортировки…</p>
        )}

        {listError && (
          <div className="mx-3.5 mb-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {listError}
          </div>
        )}

        {showListSkeleton ? (
          <div className="grid grid-cols-2 gap-2 px-3.5 pb-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <MasterListCardSkeleton key={i} />
            ))}
          </div>
        ) : listMasters.length === 0 ? (
          <div className="text-center py-12 text-[#888] text-sm px-4">
            {query.trim() ? `По запросу «${query.trim()}» ничего не найдено` : 'Мастера не найдены'}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 px-3.5 pb-2">
            {listMasters.map((master, i) => (
              <MasterListCard key={master.id} master={master} colorIndex={i} />
            ))}
          </div>
        )}

        {listRemaining > 0 && (
          <div className="px-3.5 pb-4">
            <button
              type="button"
              onClick={() => void loadList(listPage + 1, false)}
              disabled={listLoading || listLoadingMore}
              className="w-full border-[1.5px] border-brand-accent rounded-xl py-3 text-[13px] font-bold text-brand-accent active:scale-[0.98] transition-transform disabled:opacity-50"
            >
              {listLoadingMore
                ? 'Загрузка…'
                : `Показать ещё мастеров (${listRemaining} осталось)`}
            </button>
          </div>
        )}
      </div>

      <div className="h-2 bg-[#f2f2f7]" aria-hidden />

      {/* Скроллер: товары для задачи */}
      <ProductsScrollerSection
        title="Товары для вашей задачи"
        label="Вам понадобится"
        labelVariant="blue"
        href="/products"
        linkLabel="Каталог →"
        categorySlugs={productScrollerSlugs?.categorySlugs}
        subcategorySlugs={productScrollerSlugs?.subcategorySlugs}
        lat={lat}
        lng={lng}
        radiusKm={radiusKm}
        showRadius={false}
      />

      <div className="h-2 bg-[#f2f2f7]" aria-hidden />

      {/* Модалка фильтров */}
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
                    {filterStepMasters === 'category' && 'Фильтры'}
                    {filterStepMasters === 'subcategory' && 'Подкатегория'}
                    {filterStepMasters === 'service' && 'Услуга'}
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
                  <div className="mb-5" ref={cityInputWrapperRef}>
                    <label className="block text-sm font-semibold text-graphite-secondary mb-2">
                      <FiMapPin className="inline mr-1 text-brand-accent" size={14} />
                      Город
                    </label>
                    <p className="text-xs text-text-secondary mb-2">
                      Можно искать только по городу — категория не обязательна
                    </p>
                    <div className="relative">
                      <input
                        type="text"
                        value={cityFilter}
                        onChange={(e) => setCityFilter(e.target.value)}
                        onFocus={() => citySuggestions.length > 0 && setShowCitySuggestions(true)}
                        placeholder="Москва, Грозный, Санкт-Петербург…"
                        className="input w-full h-11 text-sm pr-9"
                        autoComplete="off"
                      />
                      {cityFilter.trim() && (
                        <button
                          type="button"
                          onClick={() => {
                            setCityFilter('')
                            setCitySuggestions([])
                            setShowCitySuggestions(false)
                          }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary hover:text-graphite-secondary w-7 h-7 flex items-center justify-center"
                          aria-label="Очистить город"
                        >
                          ×
                        </button>
                      )}
                      {showCitySuggestions && citySuggestions.length > 0 && (
                        <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white rounded-xl border border-border-light shadow-lg overflow-hidden max-h-[220px] overflow-y-auto">
                          {loadingCitySuggestions ? (
                            <div className="px-3 py-2 text-xs text-text-secondary">Загрузка…</div>
                          ) : (
                            <ul className="py-1">
                              {citySuggestions.map((item, i) => (
                                <li key={`${item.lat}-${item.lng}-${i}`}>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setCityFilter(pickCityLabel(item))
                                      setShowCitySuggestions(false)
                                      setCitySuggestions([])
                                    }}
                                    className="w-full text-left px-3 py-2.5 hover:bg-bg-secondary text-sm text-graphite-secondary"
                                  >
                                    {pickCityLabel(item)}
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-xs font-semibold text-text-secondary mb-2 uppercase tracking-wide">
                    Категория мастера
                  </div>

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

                {(activeCity || selectedCategory || selectedSubcategory || selectedServiceIds.length > 0) && (
                  <div className="p-4 border-t border-border-light bg-white">
                    {filterStepMasters === 'category' && selectedCategory ? (
                      <button
                        type="button"
                        onClick={() => { setSelectedSubcategory(''); setSelectedServiceIds([]); setShowFiltersModal(false) }}
                        className="btn btn-primary w-full h-12 text-base font-semibold"
                      >
                        {activeCity ? `Найти в ${activeCity}` : 'Применить по категории'}
                      </button>
                    ) : filterStepMasters === 'subcategory' && selectedSubcategory ? (
                      <button
                        type="button"
                        onClick={() => { setSelectedServiceIds([]); setShowFiltersModal(false) }}
                        className="btn btn-primary w-full h-12 text-base font-semibold"
                      >
                        {activeCity ? `Найти в ${activeCity}` : 'Применить по подкатегории'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowFiltersModal(false)}
                        className="btn btn-primary w-full h-12 text-base font-semibold"
                      >
                        {activeCity && !selectedCategory
                          ? `Найти в ${activeCity}`
                          : 'Применить фильтры'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

      <RadiusPickerModal
        isOpen={showRadiusModal}
        currentRadiusKm={radiusKm}
        lat={lat}
        lng={lng}
        city={userLocCity}
        resultsCount={listTotal}
        resultsUnit="мастеров"
        onSelect={setRadiusKm}
        onClose={() => setShowRadiusModal(false)}
      />

    </div>
  )
}

export default function SearchClient({
  initialBanners = null,
  initialMasters = null,
  initialTotal = 0,
}: SearchContentProps) {
  return (
    <Suspense fallback={<SearchLoading />}>
      <SearchContent
        initialBanners={initialBanners}
        initialMasters={initialMasters}
        initialTotal={initialTotal}
      />
    </Suspense>
  )
}

