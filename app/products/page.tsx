'use client'

import { useEffect, useState, Suspense, useMemo, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { VariableSizeList as List } from 'react-window'
import { useAuth } from '../providers'
import { supabase, Product, ProductCategory } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import ProductCard from '@/components/ProductCard'
import AdBannerSlider from '@/components/AdBannerSlider'
import AdSlot from '@/components/AdSlot'
import Link from 'next/link'
import { FiFilter } from 'react-icons/fi'
import AuthRequiredModal from '@/components/AuthRequiredModal'
import StoriesCircle from '@/components/StoriesCircle'
import { Story } from '@/lib/supabase'

function ProductsContent() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '')
  const [categorySection, setCategorySection] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [cityFilter, setCityFilter] = useState('')
  const [productCategories, setProductCategories] = useState<ProductCategory[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [stories, setStories] = useState<Story[]>([])
  const [storiesLoading, setStoriesLoading] = useState(false)
  
  const ITEMS_PER_PAGE = 20
  const GRID_COLUMN_COUNT = 2
  const ITEM_HEIGHT = 350 // Примерная высота карточки товара
  const AD_HEIGHT = 150 // Высота рекламного блока
  const listContainerRef = useRef<HTMLDivElement>(null)
  const [listDimensions, setListDimensions] = useState({ width: 0, height: 0 })

  // Убираем редирект для неавторизованных - они могут видеть карточки товаров

  // Загружаем категории и истории при загрузке страницы
  useEffect(() => {
    fetchCategories()
    fetchStories() // Загружаем истории продавцов для всех пользователей (включая неавторизованных)
  }, [])

  // Обновляем размеры list при изменении размера окна и после загрузки товаров
  useEffect(() => {
    const updateDimensions = () => {
      if (listContainerRef.current) {
        const width = listContainerRef.current.offsetWidth || window.innerWidth - 32 // Fallback на ширину окна
        setListDimensions({
          width,
          height: Math.min(window.innerHeight * 0.6, 600)
        })
      }
    }
    
    // Вызываем сразу
    updateDimensions()
    
    // Вызываем с задержкой на случай, если DOM еще не готов
    const timeoutId = setTimeout(updateDimensions, 100)
    
    window.addEventListener('resize', updateDimensions)
    return () => {
      clearTimeout(timeoutId)
      window.removeEventListener('resize', updateDimensions)
    }
  }, [])

  // Пересчитываем размеры после загрузки товаров
  useEffect(() => {
    if (products.length > 0 && listDimensions.width === 0) {
      const timeoutId = setTimeout(() => {
        if (listContainerRef.current) {
          const width = listContainerRef.current.offsetWidth || window.innerWidth - 32
          setListDimensions({
            width,
            height: Math.min(window.innerHeight * 0.6, 600)
          })
        }
      }, 200)
      return () => clearTimeout(timeoutId)
    }
  }, [products.length, listDimensions.width])

  // Создаем массив строк (каждая строка = 2 товара)
  const gridRows = useMemo(() => {
    const rows: Array<{ items: Product[], hasAd: boolean, adProductIndex?: number }> = []
    for (let i = 0; i < products.length; i += GRID_COLUMN_COUNT) {
      const rowItems = products.slice(i, i + GRID_COLUMN_COUNT)
      const productIndex = i + GRID_COLUMN_COUNT - 1 // индекс последнего товара в строке
      // Показываем рекламу каждые 6 товаров (после 5, 11, 17 и т.д.)
      const hasAd = productIndex > 0 && (productIndex + 1) % 6 === 0
      rows.push({ items: rowItems, hasAd, adProductIndex: hasAd ? productIndex : undefined })
    }
    return rows
  }, [products])

  // Функция для получения размера элемента
  const getItemSize = useCallback((index: number) => {
    const row = gridRows[index]
    return row?.hasAd ? ITEM_HEIGHT + AD_HEIGHT : ITEM_HEIGHT
  }, [gridRows])

  // Row renderer для react-window (каждая строка = 2 карточки)
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const row = gridRows[index]
    if (!row) return <div style={style} />

    return (
      <div style={style} className="w-full">
        <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:gap-6 px-0">
          {row.items.map((product) => (
            <ProductCard key={product.id} product={product} currentUser={user} />
          ))}
          {row.items.length < GRID_COLUMN_COUNT && <div />}
        </div>
        {/* Реклама после строки, если нужно */}
        {row.hasAd && row.adProductIndex !== undefined && (
          <div className="col-span-2 mt-4 px-0">
            <AdSlot 
              type="INLINE_CONTEXT" 
              context={{ 
                page: 'products',
                category: row.items[0]?.category_ref?.section ? [row.items[0].category_ref.section] : undefined,
                keywords: searchQuery ? [searchQuery] : undefined,
                city: cityFilter || undefined
              }}
              index={row.adProductIndex}
              className="my-4"
            />
          </div>
        )}
      </div>
    )
  }

  // Загружаем товары при изменении фильтров
  useEffect(() => {
    setPage(1)
    setProducts([])
    setHasMore(true)
    fetchProducts(1, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, categorySection, categoryId, cityFilter])

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('product_categories')
        .select('*')
        .order('section', { ascending: true })
        .order('name', { ascending: true })
      if (error) throw error
      console.log('Loaded product categories:', data?.length || 0)
      console.log('Furniture categories:', data?.filter(cat => cat.section === 'furniture') || [])
      setProductCategories((data as ProductCategory[]) || [])
    } catch (error) {
      console.error('Error fetching product categories:', error)
      setProductCategories([])
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

      let query = supabase
        .from('products')
        .select(`
          *,
          seller:profiles(id, full_name, avatar_url, city, phone),
          category_ref:product_categories(id, name, section, slug),
          rating,
          reviews_count
        `, { count: 'exact' })
        .eq('in_stock', true)
        .order('created_at', { ascending: false })
        .range(from, to)

      if (categorySection) {
        query = query.eq('category_ref.section', categorySection)
      }

      if (categoryId) {
        query = query.eq('category_id', categoryId)
      }

      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
      }

      const { data, error, count } = await query

      if (error) throw error

      // Filter by city on client side (since we can't filter joined tables directly in Supabase)
      let filteredData = (data || []) as Product[]
      if (cityFilter && cityFilter.trim()) {
        filteredData = filteredData.filter((product: any) => {
          const seller = product.seller
          return seller?.city && seller.city.toLowerCase().includes(cityFilter.toLowerCase())
        })
      }

      if (reset) {
        setProducts(filteredData)
      } else {
        setProducts(prev => [...prev, ...filteredData])
      }

      // Проверяем, есть ли ещё данные
      const totalFetched = reset ? filteredData.length : products.length + filteredData.length
      setHasMore(totalFetched < (count || 0) && filteredData.length === ITEMS_PER_PAGE)
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

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Загрузка...</div>
      </div>
    )
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
        <div className="mb-4 relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск товаров..."
            className="w-full input pr-10 h-10 text-sm"
          />
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors ${
              showFilters ? 'bg-brand-accent text-white' : 'text-text-secondary hover:text-graphite-secondary hover:bg-bg-secondary'
            }`}
            title="Фильтры"
          >
            <FiFilter size={16} />
          </button>
        </div>

        {/* Filters - Collapsible */}
        {showFilters && (
          <div className="card mb-6 animate-fade-in">
            <div className="flex flex-col gap-3">
              <input
                type="text"
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                placeholder="Город продавца"
                className="input w-full h-10 text-sm"
              />
              <div className={`relative select-wrapper w-full ${categorySection ? 'has-value' : ''}`} data-placeholder="Раздел">
                <select
                  value={categorySection || ''}
                  onChange={(e) => {
                    const val = e.target.value
                    setCategorySection(val)
                    setCategoryId('')
                  }}
                  className="input w-full h-10 text-sm appearance-none cursor-pointer"
                  style={{
                    color: !categorySection ? 'transparent' : 'var(--text-primary)',
                  }}
                >
                  <option value="" disabled style={{ color: 'var(--text-muted)', display: 'none' }}>
                    Раздел
                  </option>
                  <option value="instruments">Инструменты</option>
                  <option value="autoparts">Автозапчасти</option>
                  <option value="materials">Стройматериалы</option>
                  <option value="furniture">Мебель</option>
                </select>
              </div>

              <div className={`relative select-wrapper w-full ${categoryId ? 'has-value' : ''}`} data-placeholder={categorySection ? 'Категория' : 'Сначала выберите раздел'}>
                <select
                  value={categoryId || ''}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="input w-full h-10 text-sm appearance-none cursor-pointer"
                  style={{
                    color: !categoryId ? 'transparent' : 'var(--text-primary)',
                  }}
                  disabled={!categorySection}
                >
                  <option value="" disabled style={{ color: 'var(--text-muted)', display: 'none' }}>
                    {categorySection ? 'Категория' : 'Сначала выберите раздел'}
                  </option>
                  {(() => {
                    const filtered = productCategories.filter(
                      (cat) => !categorySection || cat.section === categorySection
                    )
                    if (categorySection === 'furniture') {
                      console.log('Filtering furniture categories:', filtered)
                      console.log('All categories:', productCategories)
                    }
                    return filtered.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))
                  })()}
                </select>
              </div>
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

        {/* Products Grid - Virtualized с fallback */}
        {products.length === 0 && !loading ? (
          <div className="card text-center text-text-secondary py-12">
            Товары не найдены
          </div>
        ) : (
          <>
            <div ref={listContainerRef} className="w-full" style={{ minHeight: 400 }}>
              {listDimensions.width > 0 && gridRows.length > 0 ? (
                <List
                  height={listDimensions.height}
                  itemCount={gridRows.length}
                  itemSize={getItemSize}
                  width={listDimensions.width}
                  overscanCount={2}
                >
                  {Row}
                </List>
              ) : gridRows.length > 0 ? (
                // Fallback: обычный grid, если размеры еще не вычислены
                <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:gap-6">
                  {products.map((product) => (
                    <ProductCard key={product.id} product={product} currentUser={user} />
                  ))}
                </div>
              ) : null}
            </div>
            
            {/* Load More Button */}
            {hasMore && (
              <div className="mt-8 text-center">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="btn btn-secondary"
                >
                  {loadingMore ? 'Загрузка...' : 'Загрузить ещё'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Auth Required Modal */}
      <AuthRequiredModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
        type="product"
      />
    </div>
  )
}

export default function ProductsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Загрузка...</div>
      </div>
    }>
      <ProductsContent />
    </Suspense>
  )
}

