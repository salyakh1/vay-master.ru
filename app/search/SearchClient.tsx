'use client'

import { useEffect, useState, Suspense, useRef, useMemo, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/app/providers'
import SearchLoading from './loading'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import CompactPageBanner from '@/components/CompactPageBanner'
import { FiSearch, FiSliders, FiBriefcase, FiArrowLeft } from 'react-icons/fi'
import { MastersScrollerSection } from '@/components/scrollers/MastersScrollerSection'
import { ProductsScrollerSection } from '@/components/scrollers/ProductsScrollerSection'
import { MasterListCard, MasterListCardSkeleton } from '@/components/search/MasterListCard'
import { fetchMastersPage, LIST_PAGE_SIZE, type MasterScrollerItem } from '@/lib/scrollerApi'
import { useUserLocation } from '@/hooks/useUserLocation'
import { Story } from '@/lib/supabase'
import type { AdBanner } from '@/lib/supabase'
import { getProductCategoriesForSpecializations, getProductCategoriesForMasterSubcategorySlugs, getProductCategoriesForCategorySlugs } from '@/lib/specialization-product-mapping'
import { getCategoryEmoji } from '@/lib/categoryEmoji'

export interface SearchContentProps {
  /** Баннеры с сервера для быстрого LCP (SSR). */
  initialBanners?: AdBanner[] | null
}

function SearchContent({ initialBanners = null }: SearchContentProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [searchSuggestions, setSearchSuggestions] = useState<Array<{ id: string; name: string; type: string; category_name?: string | null }>>([])
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false)
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const searchInputWrapperRef = useRef<HTMLDivElement>(null)
  const autocompleteAbortRef = useRef<AbortController | null>(null)

  const { lat, lng, radiusKm, city: userLocCity } = useUserLocation()
  const [listMasters, setListMasters] = useState<MasterScrollerItem[]>([])
  const [listPage, setListPage] = useState(1)
  const [listTotal, setListTotal] = useState(0)
  const [listLoading, setListLoading] = useState(true)
  const [listLoadingMore, setListLoadingMore] = useState(false)
  const [cityFilter, setCityFilter] = useState<string>('')
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

  // Синхронизация фильтров с URL (только если параметры реально изменились)
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

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (searchInputWrapperRef.current && !searchInputWrapperRef.current.contains(e.target as Node)) {
        setShowSearchSuggestions(false)
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
      if (reset) setListLoading(true)
      else setListLoadingMore(true)
      try {
        const result = await fetchMastersPage({
          page: pageNum,
          limit: LIST_PAGE_SIZE,
          q: query,
          city: cityFilter || userLocCity || undefined,
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
        }
      } finally {
        setListLoading(false)
        setListLoadingMore(false)
      }
    },
    [
      query,
      cityFilter,
      userLocCity,
      selectedCategory,
      selectedSubcategory,
      selectedServiceIds,
      lat,
      lng,
      radiusKm,
    ]
  )

  useEffect(() => {
    if (showFiltersModal) return
    void loadList(1, true)
  }, [showFiltersModal, loadList])

  useEffect(() => {
    const t = setTimeout(() => fetchStories(), 800)
    return () => clearTimeout(t)
  }, [])

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

  const productScrollerSlugs = useMemo(() => {
    if (filterProductCategories?.categorySlugs?.length) return filterProductCategories
    if (isMasterWithCategories) return masterProductCategories
    return undefined
  }, [filterProductCategories, isMasterWithCategories, masterProductCategories])

  const chipCategories = categoriesForFilter.slice(0, 6)

  const scrollerFilters = {
    q: query || undefined,
    city: cityFilter || userLocCity || undefined,
    category: selectedCategory || undefined,
    subcategory: selectedSubcategory || undefined,
    service: selectedServiceIds.length > 0 ? selectedServiceIds.join(',') : undefined,
    lat,
    lng,
    radiusKm,
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
            className="flex-shrink-0 bg-[#f5f5f7] border border-[#ececec] rounded-[10px] px-2.5 py-2 text-[11px] text-[#555] font-semibold"
          >
            <FiSliders size={14} className="inline mr-0.5" />
            Фильтр
          </button>
        </form>

        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('')
              setSelectedSubcategory('')
              setSelectedServiceIds([])
            }}
            className={`flex-shrink-0 rounded-full px-3 py-1.5 text-[10px] font-medium border ${
              !selectedCategory
                ? 'bg-[#fff1f2] border-brand-accent text-brand-accent font-bold'
                : 'bg-[#f5f5f7] border-[#eee] text-[#555]'
            }`}
          >
            Все
          </button>
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

      {/* Stat bar */}
      <div className="flex items-center gap-2 px-3.5 py-2">
        <div className="flex items-center gap-1 bg-white border border-[#e5e5ea] rounded-full px-2.5 py-1 text-[10px] text-[#8e8e93] font-medium">
          <span aria-hidden>📍</span>
          <strong className="text-[#1c1c1e] font-bold">{radiusKm} км</strong>
        </div>
        <div className="flex items-center gap-1 bg-white border border-[#e5e5ea] rounded-full px-2.5 py-1 text-[10px] text-[#8e8e93] font-medium">
          Найдено: <strong className="text-[#1c1c1e] font-bold">{listTotal}</strong>
        </div>
        <span className="ml-auto text-[10px] text-brand-accent font-bold">По рейтингу ↓</span>
      </div>

      {/* Скроллер: топ мастера рядом */}
      <MastersScrollerSection
        title="Топ мастера рядом"
        label="Рекомендуем"
        labelVariant="red"
        {...scrollerFilters}
      />

      {/* Блок «Все мастера» — 6 карточек списком */}
      <div className="bg-white">
        <p className="text-[11px] font-bold text-[#1c1c1e] px-3.5 pt-3 pb-1.5">
          Все мастера · {listTotal}
        </p>

        {listLoading && listMasters.length === 0 ? (
          <div className="flex flex-col gap-2 px-3.5 pb-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <MasterListCardSkeleton key={i} />
            ))}
          </div>
        ) : listMasters.length === 0 ? (
          <div className="text-center py-12 text-[#888] text-sm px-4">Мастера не найдены</div>
        ) : (
          <div className="flex flex-col gap-2 px-3.5 pb-2">
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

    </div>
  )
}

export default function SearchClient() {
  return (
    <Suspense fallback={<SearchLoading />}>
      <SearchContent />
    </Suspense>
  )
}

