'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/providers'
import { supabase, ProductCategory, ProductSubcategory, PRODUCT_CATEGORY_SECTIONS } from '@/lib/supabase'
import Navbar from '@/components/Navbar'

export default function NewProductPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [subcategoryId, setSubcategoryId] = useState('')
  const [productCategories, setProductCategories] = useState<ProductCategory[]>([])
  const [productSubcategories, setProductSubcategories] = useState<ProductSubcategory[]>([])
  const [inStock, setInStock] = useState(true)
  const [stockCount, setStockCount] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  const removeImage = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index)
    const newPreviews = previews.filter((_, i) => i !== index)
    setFiles(newFiles)
    // Revoke old preview URLs to free memory
    URL.revokeObjectURL(previews[index])
    setPreviews(newPreviews)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    const remainingSlots = 10 - files.length
    const filesToAdd = selectedFiles.slice(0, remainingSlots)
    
    if (filesToAdd.length < selectedFiles.length) {
      alert(`Можно добавить максимум 10 фотографий. Добавлено ${filesToAdd.length} из ${selectedFiles.length}`)
    }
    
    const newFiles = [...files, ...filesToAdd]
    const newPreviews = [...previews, ...filesToAdd.map((f) => URL.createObjectURL(f))]
    
    setFiles(newFiles)
    setPreviews(newPreviews)
    
    // Reset input to allow selecting same files again
    e.target.value = ''
  }

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/products')
    }
  }, [user, authLoading, router])

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      previews.forEach(url => URL.revokeObjectURL(url))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data: categoriesData, error: categoriesError } = await supabase
          .from('product_categories')
          .select('*')
          .order('name', { ascending: true })
        if (categoriesError) throw categoriesError

        const { data: subcategoriesData, error: subcategoriesError } = await supabase
          .from('product_subcategories')
          .select('*')
          .order('name', { ascending: true })
        if (subcategoriesError) throw subcategoriesError

        setProductCategories((categoriesData as ProductCategory[]) || [])
        setProductSubcategories((subcategoriesData as ProductSubcategory[]) || [])
      } catch (error) {
        console.error('Error fetching product categories:', error)
        setProductCategories([])
        setProductSubcategories([])
      }
    }
    fetchCategories()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    if (!categoryId || !subcategoryId) {
      alert('Выберите категорию и каталог')
      return
    }
    const priceNum = parseFloat(price)
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      alert('Укажите цену больше 0 ₽')
      return
    }

    setSaving(true)
    try {
      // upload images if any (with error handling - don't block product creation)
      let imageUrls: string[] = []
      let imageUploadWarning = ''
      
      if (files.length > 0) {
        try {
          const uploadResults = await Promise.allSettled(
            files.map(async (file, idx) => {
              try {
                const ext = file.name.split('.').pop()
                const path = `${user.id}/${Date.now()}-${idx}.${ext || 'jpg'}`
                const { error: uploadError } = await supabase.storage
                  .from('product-images')
                  .upload(path, file, { cacheControl: '3600', upsert: false })
                
                if (uploadError) {
                  console.warn(`Failed to upload image ${idx + 1}:`, uploadError.message)
                  // Don't throw - just return null to continue with product creation
                  return null
                }
                
                const { data } = supabase.storage.from('product-images').getPublicUrl(path)
                return data.publicUrl
              } catch (err: any) {
                console.warn(`Error uploading image ${idx + 1}:`, err)
                return null
              }
            })
          )
          
          imageUrls = uploadResults
            .map((result) => result.status === 'fulfilled' ? result.value : null)
            .filter((url): url is string => url !== null)
          
          if (imageUrls.length < files.length) {
            const failedCount = files.length - imageUrls.length
            imageUploadWarning = `${failedCount} изображений не удалось загрузить. Товар будет создан без них.`
            console.warn(imageUploadWarning)
          }
          
          // Check if bucket doesn't exist (all uploads failed with bucket error)
          if (imageUrls.length === 0 && files.length > 0) {
            const firstError = uploadResults.find(r => r.status === 'rejected' || (r.status === 'fulfilled' && r.value === null))
            if (firstError) {
              imageUploadWarning = 'Изображения не загружены. Убедитесь, что bucket "product-images" создан в Supabase Storage. Товар будет создан без изображений.'
            }
          }
        } catch (err: any) {
          // If entire upload process fails, just continue without images
          console.warn('Image upload process failed:', err)
          imageUploadWarning = 'Не удалось загрузить изображения. Товар будет создан без них.'
        }
      }

      const { error } = await supabase
        .from('products')
        .insert({
          seller_id: user.id,
          name: name.trim(),
          description: description.trim(),
          price: priceNum,
          category: productCategories.find((c) => c.id === categoryId)?.name || '',
          category_id: categoryId || null,
          subcategory_id: subcategoryId || null,
          in_stock: inStock,
          stock_count: stockCount ? parseInt(stockCount) : null,
          images: imageUrls,
        })

      if (error) {
        console.error('Error creating product:', error)
        throw new Error(`Ошибка при создании товара: ${error.message}`)
      }

      // Show warning about images if any, but don't block success
      if (imageUploadWarning) {
        alert(`Товар успешно создан!\n\n${imageUploadWarning}`)
      }

      router.push('/products')
    } catch (error: any) {
      console.error('Error creating product:', error)
      const errorMessage = error?.message || 'Неизвестная ошибка при создании товара'
      alert(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Загрузка...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white pb-20">
      <Navbar />
      <div className="container mx-auto px-4 py-4">
        <div className="max-w-2xl mx-auto">
          <div className="card">
            <h1 className="text-2xl font-bold mb-6">Добавить товар</h1>

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
                  placeholder="Например: Перфоратор Bosch"
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
                  placeholder="Подробное описание товара..."
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
                    min="1"
                    step="1"
                    className="input"
                    placeholder="Например: 1500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Категория и каталог *
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <select
                      value={categoryId}
                      onChange={(e) => {
                        const val = e.target.value
                        setCategoryId(val)
                        setSubcategoryId('')
                      }}
                      required
                      className="input"
                    >
                      <option value="">Выберите категорию</option>
                      {PRODUCT_CATEGORY_SECTIONS.map((section) => {
                        const categories = productCategories.filter((cat) => cat.section === section.id)
                        if (categories.length === 0) return null
                        return (
                          <optgroup key={section.id} label={section.label}>
                            {categories.map((cat) => (
                              <option key={cat.id} value={cat.id}>
                                {cat.name}
                              </option>
                            ))}
                          </optgroup>
                        )
                      })}
                    </select>
                    <select
                      value={subcategoryId}
                      onChange={(e) => setSubcategoryId(e.target.value)}
                      required
                      className="input"
                      disabled={!categoryId}
                    >
                      <option value="">
                        {categoryId ? 'Выберите каталог' : 'Сначала выберите категорию'}
                      </option>
                      {productSubcategories
                        .filter((sub) => !categoryId || sub.category_id === categoryId)
                        .map((sub) => (
                          <option key={sub.id} value={sub.id}>
                            {sub.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Фотографии товара {files.length > 0 && `(${files.length}/10)`}
                </label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileChange}
                  disabled={files.length >= 10}
                  className="input"
                />
                {files.length >= 10 && (
                  <p className="text-xs text-gray-500 mt-1">Достигнут лимит в 10 фотографий</p>
                )}
                {files.length < 10 && (
                  <p className="text-xs text-gray-500 mt-1">Можно добавить еще {10 - files.length} фотографий</p>
                )}
                {previews.length > 0 && (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {previews.map((src, idx) => (
                      <div key={idx} className="relative w-full aspect-square bg-gray-100 border border-gray-200 overflow-hidden group">
                        <img src={src} alt={`preview-${idx}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeImage(idx)}
                          className="absolute top-1 right-1 bg-black/70 hover:bg-black text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Удалить фото"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                        <div className="absolute bottom-1 left-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                          {idx + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
                  {saving ? 'Сохранение...' : 'Добавить товар'}
                </button>
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="btn btn-outline"
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

