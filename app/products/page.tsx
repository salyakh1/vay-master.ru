'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '')
  const [categorySection, setCategorySection] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [cityFilter, setCityFilter] = useState('')
  const [productCategories, setProductCategories] = useState<ProductCategory[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [stories, setStories] = useState<Story[]>([])
  const [storiesLoading, setStoriesLoading] = useState(false)

  // Убираем редирект для неавторизованных - они могут видеть карточки товаров

  // Загружаем категории и истории при загрузке страницы
  useEffect(() => {
    fetchCategories()
    fetchStories() // Загружаем истории продавцов для всех пользователей (включая неавторизованных)
  }, [])

  // Загружаем товары при изменении фильтров
  useEffect(() => {
    fetchProducts()
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

  const fetchProducts = async () => {
    try {
      let query = supabase
        .from('products')
        .select(`
          *,
          seller:profiles(id, full_name, avatar_url, city, phone),
          category_ref:product_categories(id, name, section, slug)
        `)
        .eq('in_stock', true)
        .order('created_at', { ascending: false })

      if (categorySection) {
        query = query.eq('category_ref.section', categorySection)
      }

      if (categoryId) {
        query = query.eq('category_id', categoryId)
      }

      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
      }

      const { data, error } = await query

      if (error) throw error

      // Filter by city on client side (since we can't filter joined tables directly in Supabase)
      let filteredData = (data || []) as Product[]
      if (cityFilter && cityFilter.trim()) {
        filteredData = filteredData.filter((product: any) => {
          const seller = product.seller
          return seller?.city && seller.city.toLowerCase().includes(cityFilter.toLowerCase())
        })
      }

      setProducts(filteredData)
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setLoading(false)
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

        {/* Products Grid */}
        {products.length === 0 ? (
          <div className="card text-center text-text-secondary py-12">
            Товары не найдены
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:gap-6">
            {products.map((product, index) => {
              const cardElement = (
                <ProductCard key={product.id} product={product} currentUser={user} />
              )

              // Показываем INLINE_CONTEXT или SPONSORED_CARD рекламу каждые 6 товаров
              const shouldShowAd = index > 0 && (index + 1) % 6 === 0

              if (shouldShowAd) {
                return (
                  <>
                    {cardElement}
                    <div key={`ad-products-${product.id}-${index}`} className="col-span-2">
                      <AdSlot 
                        type="INLINE_CONTEXT" 
                        context={{ 
                          page: 'products',
                          category: product.category_ref?.section ? [product.category_ref.section] : undefined,
                          keywords: searchQuery ? [searchQuery] : undefined,
                          city: cityFilter || undefined
                        }}
                        index={index}
                        className="my-4"
                      />
                    </div>
                  </>
                )
              }

              return cardElement
            })}
          </div>
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

