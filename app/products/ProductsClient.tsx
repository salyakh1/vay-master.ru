'use client'

import { useEffect, useState, Suspense, useMemo, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/app/providers'
import ProductsLoading from './loading'
import { supabase, Product, ProductCategory, ProductSubcategory, PRODUCT_CATEGORY_SECTIONS, Order } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import CompactPageBanner from '@/components/CompactPageBanner'
import ProductGridCardCompact from '@/components/ProductGridCardCompact'
import Link from 'next/link'
import { FiSearch, FiSliders, FiX, FiPackage } from 'react-icons/fi'
import AuthRequiredModal from '@/components/AuthRequiredModal'
import { sanitizeProductsForGuest } from '@/lib/guest-access'
import { Story } from '@/lib/supabase'
import dynamic from 'next/dynamic'
import { getProductCategoriesForSpecializations, getProductCategoriesForMasterSubcategorySlugs } from '@/lib/specialization-product-mapping'

const StoresMap = dynamic(() => import('@/components/StoresMap'), { ssr: false })
const NearbyProductsCarousel = dynamic(() => import('@/components/NearbyProductsCarousel'), { ssr: false })
const RecommendationsCarousel = dynamic(() => import('@/components/RecommendationsCarousel'), { ssr: false })
const MastersNearbyScroller = dynamic(() => import('@/components/scrollers/MastersNearbyScroller'), { ssr: false })

function ProductsContent() {
  const { user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '')
  const [productSuggestions, setProductSuggestions] = useState<Array<{ id: string; name: string; type: string; category_name?: string | null }>>([])
  const [showProductSuggestions, setShowProductSuggestions] = useState(false)
  const [loadingProductSuggestions, setLoadingProductSuggestions] = useState(false)
  const productSearchWrapperRef = useRef<HTMLDivElement>(null)
  const productAutocompleteAbortRef = useRef<AbortController | null>(null)
  const [categoryId, setCategoryId] = useState('')
  const [subcategoryIds, setSubcategoryIds] = useState<string[]>([])
  const [cityFilter, setCityFilter] = useState('')
  const [cityFilterInput, setCityFilterInput] = useState('')
  const [productCategories, setProductCategories] = useState<ProductCategory[]>([])
  const [productSubcategories, setProductSubcategories] = useState<ProductSubcategory[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [filterStep, setFilterStep] = useState<'categories' | 'subcategories'>('categories')
  const [sortPriceAsc, setSortPriceAsc] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [categoryImageFailed, setCategoryImageFailed] = useState<Set<string>>(new Set())
  const [showAuthModal, setShowAuthModal] = useState(false)

  const markCategoryImageFailed = (id: string) => {
    setCategoryImageFailed((prev) => new Set(prev).add(id))
  }
  const [stories, setStories] = useState<Story[]>([])
  const [storiesLoading, setStoriesLoading] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid')
  const [showStoresMap, setShowStoresMap] = useState(false)
  // Локация для блока «Товары рядом» у пользователей без зоны (не мастер или мастер без радиуса)
  const [nearbyViewLocation, setNearbyViewLocation] = useState<{ lat: number; lng: number } | null>(() => {
    if (typeof window === 'undefined') return null
    try {
      const s = localStorage.getItem('vay_nearby_view')
      if (!s) return null
      const { lat, lng } = JSON.parse(s) as { lat?: number; lng?: number }
      if (typeof lat === 'number' && typeof lng === 'number') return { lat, lng }
    } catch {}
    return null
  })
  const [nearbyGeoloading, setNearbyGeoloading] = useState(false)
  const DEFAULT_NEARBY_RADIUS_KM = 10

  const hasMasterZone =
    user?.role === 'master' &&
    user.master_lat != null &&
    user.master_lng != null &&
    user.service_radius_km != null

  const nearbyCenter = hasMasterZone
    ? { lat: user!.master_lat!, lng: user!.master_lng!, radiusKm: user!.service_radius_km! }
    : nearbyViewLocation
      ? { lat: nearbyViewLocation.lat, lng: nearbyViewLocation.lng, radiusKm: DEFAULT_NEARBY_RADIUS_KM }
      : null

  const requestNearbyGeolocation = () => {
    if (!navigator.geolocation) return
    setNearbyGeoloading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        setNearbyViewLocation({ lat, lng })
        try {
          localStorage.setItem('vay_nearby_view', JSON.stringify({ lat, lng }))
        } catch {}
        setNearbyGeoloading(false)
      },
      () => setNearbyGeoloading(false),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    )
  }
  
  // Порция «по экрану»: ~1–1.5 экрана (2 колонки × 4–6 рядов)
  const ITEMS_PER_PAGE = 12
  const GRID_COLUMN_COUNT = 2
  const ROW_BASE_HEIGHT = 320
  const productsLoadMoreRef = useRef<HTMLDivElement>(null)

  // Загружаем подкатегории мастера для рекомендаций «под ваши услуги»
  const [masterSubcategorySlugs, setMasterSubcategorySlugs] = useState<string[]>([])
  const [masterCategorySlugs, setMasterCategorySlugs] = useState<string[]>([])
  const [loadingSpecializations, setLoadingSpecializations] = useState(false)
  
  useEffect(() => {
    const loadMasterCategories = async () => {
      if (user?.role === 'master' && user.id) {
        setLoadingSpecializations(true)
        try {
          const { data, error } = await supabase
            .from('profile_subcategories')
            .select('subcategory:subcategories(id, slug, category:categories(id, slug))')
            .eq('profile_id', user.id)
          if (!error && data) {
            const subSlugs = (data as any[])
              .map((item) => item.subcategory?.slug)
              .filter(Boolean) as string[]
            const catSlugs = (data as any[])
              .map((item) => item.subcategory?.category?.slug)
              .filter(Boolean) as string[]
            setMasterSubcategorySlugs(Array.from(new Set(subSlugs)))
            setMasterCategorySlugs(Array.from(new Set(catSlugs)))
          } else {
            setMasterSubcategorySlugs([])
            setMasterCategorySlugs([])
          }
        } catch (error) {
          console.error('Error loading master categories:', error)
          setMasterSubcategorySlugs([])
          setMasterCategorySlugs([])
        } finally {
          setLoadingSpecializations(false)
        }
      } else {
        setMasterSubcategorySlugs([])
        setMasterCategorySlugs([])
        setLoadingSpecializations(false)
      }
    }
    loadMasterCategories()
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
    !loadingSpecializations &&
    masterProductCategories.categorySlugs &&
    masterProductCategories.categorySlugs.length > 0

  // Загружаем заказы из города мастера
  const [cityOrders, setCityOrders] = useState<Order[]>([])
  const [loadingOrders, setLoadingOrders] = useState(false)

  useEffect(() => {
    const loadCityOrders = async () => {
      if (user?.role === 'master' && user.city) {
        setLoadingOrders(true)
        try {
          const { data, error } = await supabase
            .from('orders')
            .select(`
              id,
              client_id,
              title,
              description,
              category,
              location,
              city,
              budget,
              images,
              status,
              selected_master_id,
              created_at,
              updated_at,
              client:profiles!orders_client_id_fkey(id, full_name, avatar_url)
            `)
            .in('status', ['new', 'open'])
            .ilike('city', `%${user.city}%`)
            .order('created_at', { ascending: false })
            .limit(50)

          if (!error && data) {
            // Преобразуем client из массива в объект и перемешиваем заказы случайно
            const orders = (data as any[]).map((order: any) => {
              const client = Array.isArray(order.client) ? order.client[0] : order.client
              return {
                ...order,
                client: client || null,
              }
            })
            const shuffled = [...orders].sort(() => Math.random() - 0.5)
            console.log('[Orders] Loaded', shuffled.length, 'orders for city:', user.city)
            setCityOrders(shuffled as unknown as Order[])
          } else {
            console.log('[Orders] Error or no data:', error)
            setCityOrders([])
          }
        } catch (error) {
          console.error('Error loading city orders:', error)
          setCityOrders([])
        } finally {
          setLoadingOrders(false)
        }
      } else {
        setCityOrders([])
      }
    }
    loadCityOrders()
  }, [user])

  // Убираем редирект для неавторизованных - они могут видеть карточки товаров

  // Приоритет: категории для фильтра и список товаров (в другом useEffect). Истории — с задержкой.
  useEffect(() => {
    fetchCategories()
    const id = typeof requestIdleCallback !== 'undefined'
      ? requestIdleCallback(() => fetchStories(), { timeout: 1500 })
      : setTimeout(fetchStories, 1500)
    return () => {
      if (typeof cancelIdleCallback !== 'undefined') cancelIdleCallback(id as number)
      else clearTimeout(id as ReturnType<typeof setTimeout>)
    }
  }, [])

  // Создаем массив строк (каждая строка = 2 товара или товар+заказ)
  const gridRows = useMemo(() => {
    const rows: Array<{ 
      items: Product[], 
      hasAd: boolean, 
      adProductIndex?: number,
      orderAfter?: Order | null,
      orderWithNextProduct?: boolean, // Флаг: заказ вставляется вместе со следующим товаром
      skipFirstItem?: boolean // Пропустить первый товар (уже использован с заказом)
    }> = []
    
    let orderIndex = 0 // Индекс текущего заказа из cityOrders
    let skipNextProduct = false // Пропустить следующий товар (он уже использован с заказом)
    
    for (let i = 0; i < products.length; i += GRID_COLUMN_COUNT) {
      // Пропускаем товары, которые уже использованы с заказом
      if (skipNextProduct) {
        skipNextProduct = false
        continue
      }
      
      const rowItems = products.slice(i, i + GRID_COLUMN_COUNT)
      const productIndex = i + GRID_COLUMN_COUNT - 1 // индекс последнего товара в строке
      // Показываем рекламу каждые 6 товаров (после 5, 11, 17 и т.д.)
      const hasAd = productIndex > 0 && (productIndex + 1) % 6 === 0
      
      // Вставляем заказ каждые 7 товаров (после 6-го товара, на 7-й позиции)
      // productIndex + 1 = количество товаров до этого момента (включая текущую строку)
      // Строка 0: товары 0-1 (productIndex = 1, totalProducts = 2)
      // Строка 1: товары 2-3 (productIndex = 3, totalProducts = 4)
      // Строка 2: товары 4-5 (productIndex = 5, totalProducts = 6) <- после этой строки вставляем заказ
      // Строка 3: товары 6-7 (productIndex = 7, totalProducts = 8)
      const totalProducts = productIndex + 1
      // Вставляем заказ после строк где totalProducts = 6, 13, 20... (т.е. totalProducts % 7 === 6)
      const shouldInsertOrder = user?.role === 'master' && 
        cityOrders.length > 0 && 
        totalProducts % 7 === 6 && 
        orderIndex < cityOrders.length
      
      const orderToInsert = shouldInsertOrder ? cityOrders[orderIndex] : null
      if (shouldInsertOrder && orderToInsert) {
        console.log('[GridRows] Inserting order at position', totalProducts, 'orderId:', orderToInsert.id)
        orderIndex++
      }
      
      rows.push({ 
        items: rowItems, 
        hasAd, 
        adProductIndex: hasAd ? productIndex : undefined,
        orderAfter: orderToInsert || undefined
      })
    }
    
    return rows
  }, [products, user, cityOrders])

  // Подгрузка при прокрутке до конца списка
  useEffect(() => {
    const el = productsLoadMoreRef.current
    if (!el || !hasMore || loadingMore) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore()
      },
      { rootMargin: '200px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMore, loadingMore, products.length])

  // Город применяется только при закрытии модалки — во время ввода запросы не уходят
  const applyCityAndCloseFilters = () => {
    setCityFilter(cityFilterInput)
    setShowFilters(false)
  }

  // При открытии модалки синхронизируем инпут и всегда показываем шаг «Выберите категорию»
  useEffect(() => {
    if (showFilters) {
      setCityFilterInput(cityFilter)
      setFilterStep('categories')
    }
  }, [showFilters]) // eslint-disable-line react-hooks/exhaustive-deps

  // Подсказки при вводе в поиске товаров: 1 категория/подкатегория + 3 товара (с категорией)
  useEffect(() => {
    const q = searchQuery.trim()
    if (q.length < 2) {
      setProductSuggestions([])
      setShowProductSuggestions(false)
      return
    }
    if (productAutocompleteAbortRef.current) productAutocompleteAbortRef.current.abort()
    const ctrl = new AbortController()
    productAutocompleteAbortRef.current = ctrl
    setLoadingProductSuggestions(true)
    const t = setTimeout(() => {
      fetch(`/api/autocomplete?q=${encodeURIComponent(q)}&for=products`, { signal: ctrl.signal })
        .then((r) => (r.ok ? r.json() : { suggestions: [] }))
        .then((data) => {
          if (ctrl.signal.aborted) return
          setProductSuggestions(data.suggestions || [])
          setShowProductSuggestions((data.suggestions?.length || 0) > 0)
        })
        .catch(() => {
          if (!ctrl.signal.aborted) setProductSuggestions([])
        })
        .finally(() => {
          if (!ctrl.signal.aborted) setLoadingProductSuggestions(false)
        })
    }, 300)
    return () => {
      clearTimeout(t)
      ctrl.abort()
    }
  }, [searchQuery])

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (productSearchWrapperRef.current && !productSearchWrapperRef.current.contains(e.target as Node)) {
        setShowProductSuggestions(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  // Загружаем товары только когда модалка фильтра закрыта (чтобы выбор каталогов не обновлял страницу)
  useEffect(() => {
    if (showFilters) return
    setPage(1)
    setProducts([])
    setHasMore(true)
    fetchProducts(1, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, categoryId, subcategoryIds, cityFilter, showFilters, sortPriceAsc])

  const fetchCategories = async () => {
    try {
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('product_categories')
        .select('*')
        .order('section', { ascending: true })
        .order('name', { ascending: true })
      if (categoriesError) throw categoriesError

      const { data: subcategoriesData, error: subcategoriesError } = await supabase
        .from('product_subcategories')
        .select('*')
        .order('name', { ascending: true })
      if (subcategoriesError) throw subcategoriesError

      console.log('Loaded product categories:', categoriesData?.length || 0)
      setProductCategories((categoriesData as ProductCategory[]) || [])
      setProductSubcategories((subcategoriesData as ProductSubcategory[]) || [])
    } catch (error) {
      console.error('Error fetching product categories:', error)
      setProductCategories([])
      setProductSubcategories([])
    }
  }

  const fetchStories = async () => {
    try {
      console.log('fetchStories called for products page')
      setStoriesLoading(true)
      const params = new URLSearchParams({
        page: 'products',
        ...(user?.id && { currentUserId: user.id }),
      })
      console.log('Fetching stories with params:', params.toString())
      const response = await fetch(`/api/stories?${params.toString()}`)
      console.log('Response status:', response.status)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to fetch stories')
      }
      const data = await response.json()
      console.log('Stories fetched:', data.stories?.length || 0, 'stories')
      setStories(data.stories || [])
    } catch (error) {
      console.error('Error fetching stories:', error)
      setStories([])
    } finally {
      setStoriesLoading(false)
    }
  }

  const fetchProducts = async (pageNum: number = 1, reset: boolean = false) => {
    try {
      if (reset) {
        setLoading(true)
      } else {
        setLoadingMore(true)
      }

      const from = (pageNum - 1) * ITEMS_PER_PAGE
      const to = from + ITEMS_PER_PAGE - 1

      // Фильтр по городу в БД: сначала id продавцов по city/store_address
      let sellerIds: string[] | null = null
      if (cityFilter && cityFilter.trim()) {
        const q = cityFilter.trim()
        const { data: sellerRows } = await supabase
          .from('profiles')
          .select('id')
          .eq('role', 'seller')
          .or(`city.ilike.%${q}%,store_address.ilike.%${q}%`)
        sellerIds = (sellerRows || []).map((r: { id: string }) => r.id)
        if (sellerIds.length === 0) {
          if (reset) setProducts([])
          setHasMore(false)
          setLoading(false)
          setLoadingMore(false)
          return
        }
      }

      let query = supabase
        .from('products')
        .select(`
          *,
          seller:profiles(id, full_name, avatar_url, city, phone),
          category_ref:product_categories(id, name, section, slug),
          subcategory_ref:product_subcategories(id, name, slug, category_id),
          rating,
          reviews_count
        `, { count: 'exact' })
        .eq('in_stock', true)
        .order('price', { ascending: sortPriceAsc })
        .range(from, to)

      if (sellerIds && sellerIds.length > 0) {
        query = query.in('seller_id', sellerIds)
      }

      if (subcategoryIds.length > 0) {
        query = query.in('subcategory_id', subcategoryIds)
      } else if (categoryId) {
        query = query.eq('category_id', categoryId)
      }

      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
      }

      const { data, error, count } = await query

      if (error) throw error

      const list = sanitizeProductsForGuest((data || []) as Product[], !!user)

      if (reset) {
        setProducts(list)
        setTotalCount(count ?? list.length)
      } else {
        setProducts((prev) => [...prev, ...list])
      }

      setHasMore(list.length === ITEMS_PER_PAGE && (count || 0) > pageNum * ITEMS_PER_PAGE)
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      const nextPage = page + 1
      setPage(nextPage)
      fetchProducts(nextPage, false)
    }
  }

  const chipCategories = productCategories.slice(0, 8)

  if (loading) {
    return <ProductsLoading />
  }

  return (
    <div className="min-h-screen bg-[#f2f2f7] max-w-lg mx-auto w-full pb-24">
      <Navbar />

      {/* Шапка каталога */}
      <div className="bg-white px-3.5 pt-2.5 pb-2.5 border-b border-[#f0f0f0]">
        <div className="flex gap-2 mb-2.5">
          <div className="relative flex-1 min-w-0" ref={productSearchWrapperRef}>
            <div className="flex items-center gap-1.5 bg-[#f5f5f7] rounded-xl px-3 py-2 border border-[#ececec]">
              <FiSearch className="text-brand-accent flex-shrink-0" size={14} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() =>
                  searchQuery.trim().length >= 2 &&
                  productSuggestions.length > 0 &&
                  setShowProductSuggestions(true)
                }
                placeholder="Поиск товаров..."
                className="flex-1 bg-transparent text-xs text-[#111] placeholder:text-[#bbb] outline-none min-w-0"
                autoComplete="off"
              />
            </div>
            {showProductSuggestions && productSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white rounded-lg border border-[#f0f0f0] shadow-md overflow-hidden">
                {loadingProductSuggestions ? (
                  <div className="px-3 py-2 text-xs text-[#888]">Загрузка…</div>
                ) : (
                  <ul className="py-0.5 max-h-[220px] overflow-y-auto">
                    {productSuggestions.map((item) => (
                      <li key={`${item.type}-${item.id}`}>
                        <button
                          type="button"
                          onClick={() => {
                            setSearchQuery(item.name)
                            setShowProductSuggestions(false)
                            setProductSuggestions([])
                          }}
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
            onClick={() => {
              const next = !showFilters
              setShowFilters(next)
              if (next) setFilterStep('categories')
            }}
            className="flex-shrink-0 bg-[#f5f5f7] border border-[#ececec] rounded-[10px] px-2.5 py-2 text-[#555]"
            aria-label="Фильтры"
          >
            <FiSliders size={16} />
          </button>
        </div>

        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
          <button
            type="button"
            onClick={() => {
              setCategoryId('')
              setSubcategoryIds([])
            }}
            className={`flex-shrink-0 rounded-full px-3 py-1.5 text-[10px] font-medium border whitespace-nowrap ${
              !categoryId
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
                setCategoryId(cat.id)
                setSubcategoryIds([])
              }}
              className={`flex-shrink-0 rounded-full px-3 py-1.5 text-[10px] font-medium border whitespace-nowrap ${
                categoryId === cat.id
                  ? 'bg-[#fff1f2] border-brand-accent text-brand-accent font-bold'
                  : 'bg-[#f5f5f7] border-[#eee] text-[#555]'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      <CompactPageBanner page="products" buttonLabel="Разместить" />

      <div className="flex items-center gap-2 px-3.5 py-2">
        {nearbyCenter && (
          <div className="flex items-center gap-1 bg-white border border-[#e5e5ea] rounded-full px-2.5 py-1 text-[10px] text-[#8e8e93] font-medium">
            <span aria-hidden>📍</span>
            <strong className="text-[#1c1c1e] font-bold">{nearbyCenter.radiusKm} км</strong>
          </div>
        )}
        <div className="flex items-center gap-1 bg-white border border-[#e5e5ea] rounded-full px-2.5 py-1 text-[10px] text-[#8e8e93] font-medium">
          Найдено: <strong className="text-[#1c1c1e] font-bold">{totalCount || products.length}</strong>
        </div>
        <button
          type="button"
          onClick={() => setSortPriceAsc((v) => !v)}
          className="ml-auto text-[10px] text-brand-accent font-bold"
        >
          По цене {sortPriceAsc ? '↑' : '↓'}
        </button>
      </div>

      {nearbyCenter ? (
        <NearbyProductsCarousel
          masterLat={nearbyCenter.lat}
          masterLng={nearbyCenter.lng}
          radiusKm={nearbyCenter.radiusKm}
          city={user?.city || cityFilter || undefined}
        />
      ) : isMasterWithCategories ? (
        <RecommendationsCarousel
          title="Товары под ваши услуги"
          tag="Рекомендуем"
          categorySlugs={masterProductCategories.categorySlugs}
          subcategorySlugs={masterProductCategories.subcategorySlugs}
          role={user?.role}
        />
      ) : null}

      {products.length === 0 ? (
        <div className="text-center py-12 text-[#888] text-sm px-4">Товары не найдены</div>
      ) : (
        <>
          <div className="text-[11px] font-bold text-[#1c1c1e] px-3.5 pt-2.5 pb-1.5 bg-white">
            Все товары · {totalCount || products.length}
          </div>
          <div className="grid grid-cols-2 gap-2 px-3.5 py-2.5">
            {products.map((product) => (
              <ProductGridCardCompact key={product.id} product={product} />
            ))}
          </div>
          {hasMore && (
            <div className="px-3.5 pb-3">
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="w-full border-[1.5px] border-brand-accent rounded-xl py-2.5 text-center text-[13px] font-bold text-brand-accent disabled:opacity-50"
              >
                {loadingMore
                  ? 'Загрузка…'
                  : `Показать ещё товары (${Math.max(0, (totalCount || products.length) - products.length)} осталось)`}
              </button>
            </div>
          )}
          {loadingMore && <div className="text-center text-xs text-[#888] py-2">Загрузка…</div>}
          <div ref={productsLoadMoreRef} className="h-2" aria-hidden />
        </>
      )}

      {nearbyCenter && (
        <MastersNearbyScroller
          lat={nearbyCenter.lat}
          lng={nearbyCenter.lng}
          radiusKm={nearbyCenter.radiusKm}
          city={user?.city || cityFilter || undefined}
        />
      )}

      {/* Модалка фильтров */}
        {showFilters && (
          <div 
            className="fixed inset-0 z-50 bg-black/40"
            onClick={() => setShowFilters(false)}
          >
            <div 
              className="absolute inset-0 bottom-16 bg-white flex flex-col rounded-t-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-border-light">
                <button
                  onClick={() => setShowFilters(false)}
                  className="text-text-secondary hover:text-graphite-secondary text-xl font-light w-8 h-8 flex items-center justify-center"
                  aria-label="Закрыть"
                >
                  ×
                </button>
                <div className="text-base font-semibold text-graphite-secondary">
                  {filterStep === 'categories' ? 'Выберите категорию' : 'Выберите каталог'}
                </div>
                <button
                  onClick={() => {
                    setCategoryId('')
                    setSubcategoryIds([])
                    setCityFilter('')
                    setCityFilterInput('')
                    setFilterStep('categories')
                  }}
                  className="text-xs text-text-secondary hover:text-graphite-secondary font-medium"
                >
                  Сбросить
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-4">
                {/* Город продавца — внутри модалки */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-graphite-secondary mb-2">Город продавца</label>
                  <input
                    type="text"
                    value={cityFilterInput}
                    onChange={(e) => setCityFilterInput(e.target.value)}
                    placeholder="Введите город"
                    className="input w-full h-10 text-sm"
                  />
                </div>

                {filterStep === 'categories' && (
                  <div className="space-y-4">
                      {PRODUCT_CATEGORY_SECTIONS.map((section) => {
                        const categories = productCategories.filter((cat) => cat.section === section.id)
                        if (categories.length === 0) return null
                        return (
                          <div key={section.id} className="mb-6">
                            <div className="text-sm font-bold text-graphite-secondary mb-3 uppercase tracking-wide">
                              {section.label}
                            </div>
                            <div className="grid grid-cols-3 gap-1">
                              {categories.map((cat) => {
                                const Icon = FiPackage
                                const showImage = !categoryImageFailed.has(cat.id)
                                const hasImage = cat.image_url && showImage
                                const imgSize = 88
                                return (
                                  <button
                                    key={cat.id}
                                    type="button"
                                    onClick={() => {
                                      setCategoryId(cat.id)
                                      setSubcategoryIds([])
                                      setFilterStep('subcategories')
                                    }}
                                    className={`flex flex-col overflow-hidden rounded-xl border transition-all ${
                                      categoryId === cat.id
                                        ? 'border-brand-accent bg-brand-accent/5 text-brand-accent'
                                        : 'border-border-light text-graphite-secondary hover:border-brand-accent/30 hover:bg-bg-secondary'
                                    }`}
                                  >
                                    <div className="w-full aspect-square flex-shrink-0 bg-bg-secondary flex items-center justify-center">
                                      {hasImage ? (
                                        <img
                                          src={cat.image_url!}
                                          alt=""
                                          width={imgSize * 2}
                                          height={imgSize * 2}
                                          loading="lazy"
                                          decoding="async"
                                          className="w-full h-full object-cover"
                                          onError={() => markCategoryImageFailed(cat.id)}
                                        />
                                      ) : (
                                        <Icon size={32} className="text-text-muted" />
                                      )}
                                    </div>
                                    <span className="text-sm font-medium text-center leading-tight line-clamp-2 px-1 py-2 block">
                                      {cat.name}
                                    </span>
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                )}

                {filterStep === 'subcategories' && (
                  <div className="space-y-4">
                    <button
                      type="button"
                      onClick={() => setFilterStep('categories')}
                      className="flex items-center gap-2 text-sm text-text-secondary hover:text-graphite-secondary font-medium mb-2"
                    >
                      ← Назад к категориям
                    </button>
                    {categoryId && (() => {
                      const selectedCat = productCategories.find((c) => c.id === categoryId)
                      if (!selectedCat) return null
                      return (
                        <div className="p-3 bg-bg-secondary rounded-lg mb-4">
                          <span className="text-sm font-semibold text-graphite-secondary">{selectedCat.name}</span>
                        </div>
                      )
                    })()}
                    <div className="text-xs font-semibold text-text-secondary mb-2 uppercase tracking-wide">
                      Каталоги
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {productSubcategories
                        .filter((sub) => sub.category_id === categoryId)
                        .map((sub) => (
                          <button
                            key={sub.id}
                            type="button"
                            onClick={() => {
                              setSubcategoryIds((prev) =>
                                prev.includes(sub.id) ? prev.filter((id) => id !== sub.id) : [...prev, sub.id]
                              )
                            }}
                            className={`border rounded-xl p-3 text-left text-sm transition-all ${
                              subcategoryIds.includes(sub.id)
                                ? 'border-brand-accent bg-brand-accent/5 text-brand-accent font-medium'
                                : 'border-border-light text-graphite-secondary hover:border-brand-accent/30 hover:bg-bg-secondary'
                            }`}
                          >
                            {sub.name}
                          </button>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Кнопка «Применить фильтр» только после перехода в категорию и шага выбора каталога */}
              {filterStep === 'subcategories' && (
                <div className="p-4 border-t border-border-light bg-white flex-shrink-0">
                  <button
                    type="button"
                    onClick={applyCityAndCloseFilters}
                    className="btn btn-primary w-full h-12 text-base font-semibold"
                  >
                    Применить фильтр
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

      {/* Stores Map Modal */}
      {showStoresMap && (
        <div className="fixed inset-0 z-[9999] bg-bg-primary flex flex-col">
          <div className="h-14 px-4 flex items-center justify-between border-b border-border-light/70 bg-bg-card">
            <h2 className="text-lg font-semibold">Карта магазинов</h2>
            <button
              onClick={() => setShowStoresMap(false)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Закрыть"
            >
              <FiX className="w-6 h-6" />
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            <StoresMap
              masterLocation={
                nearbyCenter
                  ? {
                      lat: nearbyCenter.lat,
                      lng: nearbyCenter.lng,
                      radiusKm: 10,
                    }
                  : null
              }
              className="h-full"
            />
          </div>
        </div>
      )}

      {/* Auth Required Modal */}
      <AuthRequiredModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
        type="product"
      />
    </div>
  )
}

export default function ProductsClient() {
  const { loading: authLoading } = useAuth()

  if (authLoading) {
    return <ProductsLoading />
  }

  return (
    <Suspense fallback={<ProductsLoading />}>
      <ProductsContent />
    </Suspense>
  )
}

