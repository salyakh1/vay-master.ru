'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../providers'
import { supabase, Product, ProductCategory } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import ProductCard from '@/components/ProductCard'
import AdBannerSlider from '@/components/AdBannerSlider'
import Link from 'next/link'
import { FiFilter } from 'react-icons/fi'

export default function ProductsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [categorySection, setCategorySection] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [cityFilter, setCityFilter] = useState('')
  const [productCategories, setProductCategories] = useState<ProductCategory[]>([])
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/')
    }
  }, [user, authLoading, router])

  // Загружаем категории только один раз
  useEffect(() => {
    if (user) {
      fetchCategories()
    }
  }, [user])

  // Загружаем товары при изменении фильтров
  useEffect(() => {
    if (user) {
      fetchProducts()
    }
  }, [user, searchQuery, categorySection, categoryId, cityFilter])

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('product_categories')
        .select('*')
        .order('name', { ascending: true })
      if (error) throw error
      setProductCategories((data as ProductCategory[]) || [])
    } catch (error) {
      console.error('Error fetching product categories:', error)
      setProductCategories([])
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

  if (!user) return null

  return (
    <div className="min-h-screen bg-bg-primary pb-20">
      <Navbar />
      <div className="container mx-auto px-4 py-6">
        {/* Баннеры */}
        <div className="mb-6">
          <AdBannerSlider page="products" />
        </div>

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
            <div className="flex flex-col gap-4">
              <div className="flex flex-col md:flex-row gap-4">
                <input
                  type="text"
                  value={cityFilter}
                  onChange={(e) => setCityFilter(e.target.value)}
                  placeholder="Город продавца"
                  className="input md:w-48"
                />
                <select
                  value={categorySection}
                  onChange={(e) => {
                    const val = e.target.value
                    setCategorySection(val)
                    setCategoryId('')
                  }}
                  className="input md:w-56"
                >
                  <option value="">Все разделы</option>
                  <option value="instruments">Инструменты</option>
                  <option value="autoparts">Автозапчасти</option>
                  <option value="materials">Стройматериалы</option>
                </select>

                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="input md:w-64"
                  disabled={!categorySection}
                >
                  <option value="">
                    {categorySection ? 'Все категории' : 'Сначала выберите раздел'}
                  </option>
                  {productCategories
                    .filter((cat) => !categorySection || cat.section === categorySection)
                    .map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Products Grid */}
        {products.length === 0 ? (
          <div className="card text-center text-text-secondary py-12">
            Товары не найдены
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 lg:gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} currentUser={user} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

