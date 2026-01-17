'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/app/providers'
import { supabase, Product, ProductCategory } from '@/lib/supabase'
import Navbar from '@/components/Navbar'

export default function EditProductPage() {
  const params = useParams()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [product, setProduct] = useState<Product | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [categorySection, setCategorySection] = useState('')
  const [productCategories, setProductCategories] = useState<ProductCategory[]>([])
  const [inStock, setInStock] = useState(true)
  const [stockCount, setStockCount] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/')
    }
  }, [user, authLoading, router])

  useEffect(() => {
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
    fetchCategories()
  }, [])

  useEffect(() => {
    if (params.id && user) {
      fetchProduct()
    }
  }, [params.id, user])

  const fetchProduct = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', params.id)
        .single()

      if (error) throw error

      if (data.seller_id !== user?.id) {
        router.push('/products')
        return
      }

      setProduct(data as Product)
      setName(data.name)
      setDescription(data.description)
      setPrice(data.price.toString())
      setCategoryId(data.category_id || '')
      setCategorySection((data as any).category_ref?.section || '')
      setInStock(data.in_stock)
      setStockCount(data.stock_count?.toString() || '')
    } catch (error) {
      console.error('Error fetching product:', error)
      router.push('/products')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !product) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('products')
        .update({
          name: name.trim(),
          description: description.trim(),
          price: parseFloat(price),
          category: productCategories.find((c) => c.id === categoryId)?.name || product?.category || '',
          category_id: categoryId || null,
          in_stock: inStock,
          stock_count: stockCount ? parseInt(stockCount) : null,
        })
        .eq('id', product.id)

      if (error) throw error

      router.push(`/products/${product.id}`)
    } catch (error) {
      console.error('Error updating product:', error)
      alert('Ошибка при обновлении товара')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!user || !product) return
    if (!confirm('Вы уверены, что хотите удалить этот товар?')) return

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', product.id)

      if (error) throw error

      router.push('/products')
    } catch (error) {
      console.error('Error deleting product:', error)
      alert('Ошибка при удалении товара')
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Загрузка...</div>
      </div>
    )
  }

  if (!user || !product) return null

  return (
    <div className="min-h-screen bg-white pb-20">
      <Navbar />
      <div className="container mx-auto px-4 py-4">
        <div className="max-w-2xl mx-auto">
          <div className="card">
            <h1 className="text-2xl font-bold mb-6">Редактировать товар</h1>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Название товара *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Описание *
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  className="textarea"
                  rows={5}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Цена (₽) *
                  </label>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    required
                    min="0"
                    step="0.01"
                    className="input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Категория *
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <select
                      value={categorySection}
                      onChange={(e) => {
                        const val = e.target.value
                        setCategorySection(val)
                        setCategoryId('')
                      }}
                      required
                      className="input"
                    >
                      <option value="">Выберите раздел</option>
                      <option value="instruments">Инструменты</option>
                      <option value="autoparts">Автозапчасти</option>
                      <option value="materials">Стройматериалы</option>
                      <option value="furniture">Мебель</option>
                    </select>
                    <select
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      required
                      className="input"
                      disabled={!categorySection}
                    >
                      <option value="">
                        {categorySection ? 'Выберите категорию' : 'Сначала выберите раздел'}
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

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={inStock}
                    onChange={(e) => setInStock(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span>В наличии</span>
                </label>
              </div>

              {inStock && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Количество на складе
                  </label>
                  <input
                    type="number"
                    value={stockCount}
                    onChange={(e) => setStockCount(e.target.value)}
                    min="0"
                    className="input"
                    placeholder="Оставьте пустым, если неограниченно"
                  />
                </div>
              )}

              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="btn btn-primary"
                >
                  {saving ? 'Сохранение...' : 'Сохранить'}
                </button>
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="btn btn-outline"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="btn btn-outline text-red-600 hover:bg-red-50"
                >
                  Удалить
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

