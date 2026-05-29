'use client'

import { useEffect, useState, Suspense, useMemo, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/app/providers'
import ProductsLoading from './loading'
import { supabase, Product, ProductCategory, ProductSubcategory, PRODUCT_CATEGORY_SECTIONS, Order } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import ProductCard from '@/components/ProductCard'
import OrderCard from '@/components/OrderCard'
import AdBannerSlider from '@/components/AdBannerSlider'
import AdSlot from '@/components/AdSlot'
import Link from 'next/link'
import { 
  FiSearch,
  FiSliders,
  FiHome, 
  FiTool, 
  FiDroplet, 
  FiZap, 
  FiLayers, 
  FiBox, 
  FiPackage, 
  FiGrid, 
  FiSettings, 
  FiHardDrive,
  FiMonitor,
  FiThermometer,
  FiWind,
  FiSun,
  FiWifi,
  FiLock,
  FiShoppingBag,
  FiTruck,
  FiBattery,
  FiActivity,
  FiAward,
  FiShield,
  FiCompass,
  FiMinus,
  FiPlus,
  FiX
} from 'react-icons/fi'
import AuthRequiredModal from '@/components/AuthRequiredModal'
import StoriesCircle from '@/components/StoriesCircle'
import NearbyProductsCarousel from '@/components/NearbyProductsCarousel'
import { Story } from '@/lib/supabase'
import dynamic from 'next/dynamic'

const RecommendationsCarousel = dynamic(() => import('@/components/RecommendationsCarousel'), {
  ssr: false,
  loading: () => <div className="h-[200px] bg-bg-secondary rounded-xl animate-pulse" aria-hidden />,
})
const StoresMap = dynamic(() => import('@/components/StoresMap'), { ssr: false })
import { getProductCategoriesForSpecializations, getProductCategoriesForMasterSubcategorySlugs } from '@/lib/specialization-product-mapping'

// Кастомная иконка гвоздя для крепежа
const NailIcon = ({ size = 24, className = '' }: { size?: number; className?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {/* Шляпка гвоздя (круглая) */}
    <circle cx="12" cy="5" r="3.5" />
    {/* Стержень гвоздя (вертикальная линия) */}
    <line x1="12" y1="8.5" x2="12" y2="19" />
    {/* Острие гвоздя (маленькая горизонтальная линия) */}
    <line x1="11" y1="19" x2="13" y2="19" />
  </svg>
)

// Кастомная иконка ванны для сантехники
const BathtubIcon = ({ size = 24, className = '' }: { size?: number; className?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {/* Ванна (овальная форма) */}
    <path d="M4 10c0-1.1.9-2 2-2h12c1.1 0 2 .9 2 2v8H4v-8z" />
    {/* Верхний край ванны */}
    <path d="M4 10h16" />
    {/* Ножки ванны */}
    <circle cx="7" cy="18" r="1.5" />
    <circle cx="17" cy="18" r="1.5" />
    {/* Кран/смеситель */}
    <path d="M12 4v6" />
    <path d="M10 4h4" />
  </svg>
)

// Маппинг категорий к иконкам
const getCategoryIcon = (slug: string): React.ComponentType<{ size?: number; className?: string }> => {
  const iconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
    'roofing-gutters': FiHome,
    'facades-cladding': FiLayers,
    'insulation': FiShield,
    'waterproofing-sealants': FiDroplet,
    'fences-gates': FiLock,
    'landscaping-outdoor': FiCompass,
    'building-mixes': FiPackage,
    'bulk-materials': FiBox,
    'masonry-blocks-jbi': FiGrid,
    'lumber-panels': FiLayers,
    'metalworks-welding-materials': FiTool,
    'fasteners-hardware': NailIcon,
    'power-tools': FiZap,
    'hand-tools': FiTool,
    'consumables-accessories': FiHardDrive,
    'plumbing-water-supply': BathtubIcon,
    'sewer-septic': FiDroplet,
    'heating-boilers': FiThermometer,
    'ventilation-ac': FiWind,
    'electrical-lighting': FiZap,
    'low-voltage-smart-home': FiWifi,
    'windows-doors-hardware': FiHome,
    'finishing-materials': FiLayers,
    'flooring': FiGrid,
    'tile-stone': FiGrid,
    'furniture-kitchen-hardware': FiHome,
    'auto-parts-engine-gearbox': FiActivity,
    'auto-parts-suspension-brakes': FiActivity,
    'auto-electronics': FiMonitor,
    'auto-chemicals-detailing': FiDroplet,
  }
  return iconMap[slug] || FiPackage
}

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
  }, [hasMore, loadingMore, gridRows.length])

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
  }, [searchQuery, categoryId, subcategoryIds, cityFilter, showFilters])

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
        .order('created_at', { ascending: false })
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

      const list = (data || []) as Product[]

      if (reset) {
        setProducts(list)
      } else {
        setProducts(prev => [...prev, ...list])
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

  if (loading) {
    return <ProductsLoading />
  }

  return (
    <div className="min-h-screen bg-bg-primary pb-20">
      {user && <Navbar />}
      {/* Баннеры без отступов по бокам */}
      <div className="w-full mb-6">
        <AdBannerSlider page="products" />
      </div>
      <div className="container mx-auto px-4 py-6">

        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold text-graphite-secondary tracking-tight">Каталог товаров</h1>
          {user && (
            <Link 
              href="/products/new" 
              className="btn btn-primary"
            >
              Добавить товар
            </Link>
          )}
        </div>

        {/* Search */}
        <div className="mb-4 relative" ref={productSearchWrapperRef}>
          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" size={16} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => searchQuery.trim().length >= 2 && productSuggestions.length > 0 && setShowProductSuggestions(true)}
            placeholder="Например: перфоратор, кирпич..."
            className="w-full input pl-12 pr-11 h-10 text-sm"
            autoComplete="off"
            aria-autocomplete="list"
            aria-expanded={showProductSuggestions && productSuggestions.length > 0}
          />
          <button
            type="button"
            onClick={() => {
              const next = !showFilters
              setShowFilters(next)
              if (next) setFilterStep('categories')
            }}
            className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg transition-colors ${
              showFilters ? 'bg-brand-accent text-white' : 'text-text-secondary hover:text-graphite-secondary hover:bg-bg-secondary'
            }`}
            title="Фильтры"
          >
            <FiSliders size={18} />
          </button>
          {showProductSuggestions && productSuggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white rounded-lg border border-border-light shadow-md overflow-hidden">
              {loadingProductSuggestions ? (
                <div className="px-3 py-2 text-xs text-text-muted">Загрузка…</div>
              ) : (
                <ul className="py-0.5 max-h-[220px] overflow-y-auto">
                  {productSuggestions.map((item) => {
                    const isCategory = item.type === 'category' || item.type === 'subcategory'
                    return (
                      <li key={`${item.type}-${item.id}`}>
                        <button
                          type="button"
                          onClick={() => {
                            setSearchQuery(item.name)
                            setShowProductSuggestions(false)
                            setProductSuggestions([])
                          }}
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

        {/* Полноэкранная модалка фильтров: город + категория/каталог */}
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
                                const Icon = getCategoryIcon(cat.slug)
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

        {/* Истории продавцов - под фильтром (видны всем) */}
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

        {/* Товары рядом: для всех — зона мастера или геолокация пользователя */}
        {nearbyCenter ? (
          <NearbyProductsCarousel
            masterLat={nearbyCenter.lat}
            masterLng={nearbyCenter.lng}
            radiusKm={10}
            limit={12}
            onShowMap={() => setShowStoresMap(true)}
          />
        ) : (
          <div className="mb-6 card p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <p className="text-text-secondary text-sm sm:text-base">
              Товары и магазины рядом с вами — укажите местоположение, чтобы видеть предложения в радиусе.
            </p>
            <button
              type="button"
              onClick={requestNearbyGeolocation}
              disabled={nearbyGeoloading}
              className="btn btn-primary whitespace-nowrap"
            >
              {nearbyGeoloading ? 'Определяем…' : 'Использовать моё местоположение'}
            </button>
          </div>
        )}

        <RecommendationsCarousel
          title={
            isMasterWithCategories
              ? "Рекомендации под ваши услуги"
              : "Рекомендуемые товары"
          }
          query={searchQuery}
          categoryId={isMasterWithCategories ? undefined : categoryId}
          subcategoryId={isMasterWithCategories ? undefined : subcategoryIds[0]}
          categorySlugs={isMasterWithCategories ? masterProductCategories.categorySlugs : undefined}
          subcategorySlugs={isMasterWithCategories ? masterProductCategories.subcategorySlugs : undefined}
          role={user?.role || 'client'}
          limit={20}
        />

        {/* Products Grid */}
        {products.length === 0 && !loading ? (
          <div className="card text-center text-text-secondary py-12">
            Товары не найдены
          </div>
        ) : (
          <>
            <div className="w-full space-y-2">
              {gridRows.map((row, rowIndex) => (
                <div key={rowIndex} className="w-full pb-2">
                  <div className="grid grid-cols-2 gap-2 px-0">
                    {row.items.map((product, itemIndex) => {
                      if (row.skipFirstItem && itemIndex === 0) return null
                      return <ProductCard key={product.id} product={product} currentUser={user} />
                    })}
                    {row.orderAfter ? (
                      <OrderCard key={`order-${row.orderAfter.id}`} order={row.orderAfter} variant="product-grid" />
                    ) : row.items.length < GRID_COLUMN_COUNT && !row.skipFirstItem ? (
                      <div />
                    ) : null}
                  </div>
                  {row.hasAd && row.adProductIndex !== undefined && (
                    <div className="col-span-2 mt-4 px-0">
                      <AdSlot
                        type="INLINE_CONTEXT"
                        context={{
                          page: 'products',
                          category: row.items[0]?.category_ref?.section ? [row.items[0].category_ref.section] : undefined,
                          keywords: searchQuery ? [searchQuery] : undefined,
                          city: cityFilter || undefined,
                        }}
                        index={row.adProductIndex}
                        className="my-4"
                      />
                    </div>
                  )}
                  {rowIndex === 3 && (
                    <RecommendationsCarousel
                      title={
                        isMasterWithCategories ? "Рекомендации под ваши услуги" : "Рекомендуемые товары"
                      }
                      query={searchQuery}
                      categoryId={isMasterWithCategories ? undefined : categoryId}
                      subcategoryId={isMasterWithCategories ? undefined : subcategoryIds[0]}
                      categorySlugs={isMasterWithCategories ? masterProductCategories.categorySlugs : undefined}
                      subcategorySlugs={isMasterWithCategories ? masterProductCategories.subcategorySlugs : undefined}
                      role={user?.role || 'client'}
                      limit={20}
                    />
                  )}
                </div>
              ))}
              <div ref={productsLoadMoreRef} className="h-4" aria-hidden />
            </div>
            {loadingMore && <div className="text-center text-sm text-text-secondary py-2">Загрузка…</div>}
          </>
        )}
      </div>

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

function ProductsGuestPrompt({ onBrowse }: { onBrowse: () => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-bg-primary">
      <div className="max-w-md w-full text-center">
        <h1 className="text-2xl font-semibold mb-2 text-graphite-secondary">Каталог товаров</h1>
        <p className="text-text-secondary mb-6">
          Войдите, чтобы видеть товары рядом с вами и добавлять свои предложения
        </p>
        <Link
          href="/auth/login"
          className="block w-full bg-brand-accent text-white px-6 py-3 rounded-xl font-medium mb-3"
        >
          Войти
        </Link>
        <Link
          href="/auth/register"
          className="block text-text-secondary underline text-sm mb-6"
        >
          Зарегистрироваться бесплатно
        </Link>
        <button
          type="button"
          onClick={onBrowse}
          className="text-sm text-text-muted hover:text-text-secondary transition-colors"
        >
          Продолжить просмотр без входа
        </button>
      </div>
    </div>
  )
}

export default function ProductsClient() {
  const { user, loading: authLoading } = useAuth()
  const [browseAsGuest, setBrowseAsGuest] = useState(false)

  if (authLoading) {
    return <ProductsLoading />
  }

  if (!user && !browseAsGuest) {
    return <ProductsGuestPrompt onBrowse={() => setBrowseAsGuest(true)} />
  }

  return (
    <Suspense fallback={<ProductsLoading />}>
      <ProductsContent />
    </Suspense>
  )
}

