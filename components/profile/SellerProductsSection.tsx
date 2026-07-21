'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { FiMapPin, FiPlus, FiShoppingBag } from 'react-icons/fi'
import type { Product } from '@/lib/supabase'

type SellerProductsSectionProps = {
  products: Product[]
  totalCount: number
  isOwnProfile: boolean
  storeAddress?: string | null
  city?: string | null
  hasMap?: boolean
  onShowMap?: () => void
  hasMore?: boolean
  loadMoreRef?: React.RefObject<HTMLDivElement | null>
}

function CompactSellerProductCard({ product }: { product: Product }) {
  const img = product.images?.[0]
  return (
    <Link
      href={`/products/${product.id}`}
      className="bg-white border border-[#e5e7eb] rounded-xl overflow-hidden block active:scale-[0.99] transition-transform"
    >
      <div className="relative h-[90px] bg-[#e8e8e8]">
        {img ? (
          <Image src={img} alt={product.name} fill className="object-cover" sizes="50vw" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#ccc]">
            <FiShoppingBag size={28} />
          </div>
        )}
      </div>
      <div className="p-2">
        <p className="text-[12px] font-medium text-brand-accent mb-0.5">
          {Number(product.price).toLocaleString('ru-RU')} ₽
        </p>
        <p className="text-[10px] text-[#374151] line-clamp-2 leading-snug">{product.name}</p>
      </div>
    </Link>
  )
}

export default function SellerProductsSection({
  products,
  totalCount,
  isOwnProfile,
  storeAddress,
  city,
  hasMap,
  onShowMap,
  hasMore,
  loadMoreRef,
}: SellerProductsSectionProps) {
  const [category, setCategory] = useState<string>('all')
  const [sortPriceAsc, setSortPriceAsc] = useState(true)

  const categories = useMemo(() => {
    const map = new Map<string, number>()
    for (const p of products) {
      const name = (p as any).category_ref?.name || p.category || 'Прочее'
      map.set(name, (map.get(name) || 0) + 1)
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1])
  }, [products])

  const visible = useMemo(() => {
    let list = [...products]
    if (category !== 'all') {
      list = list.filter((p) => {
        const name = (p as any).category_ref?.name || p.category || 'Прочее'
        return name === category
      })
    }
    list.sort((a, b) => (sortPriceAsc ? a.price - b.price : b.price - a.price))
    return list
  }, [products, category, sortPriceAsc])

  const countLabel = totalCount || products.length

  return (
    <div className="bg-white mt-2 px-3.5 pt-3 pb-4">
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <p className="text-[13px] font-medium text-[#111111]">Товары · {countLabel}</p>
        {isOwnProfile && (
          <div className="flex items-center gap-2">
            {hasMap && onShowMap && (
              <button
                type="button"
                onClick={onShowMap}
                className="text-[10px] text-[#6b7280] flex items-center gap-0.5"
              >
                <FiMapPin size={11} />
                Карта
              </button>
            )}
            <Link
              href="/products/new"
              className="text-[11px] font-medium text-brand-accent flex items-center gap-0.5"
            >
              <FiPlus size={12} />
              Добавить
            </Link>
          </div>
        )}
      </div>

      {(storeAddress || city) && (
        <p className="text-[10px] text-[#9ca3af] mb-2.5 flex items-center gap-1">
          <FiMapPin size={10} className="text-brand-accent shrink-0" />
          <span className="truncate">{storeAddress || city}</span>
        </p>
      )}

      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide mb-2.5 -mx-0.5 px-0.5">
        <button
          type="button"
          onClick={() => setCategory('all')}
          className={`flex-shrink-0 text-[10px] font-medium px-2.5 py-1.5 rounded-full ${
            category === 'all'
              ? 'bg-brand-accent text-white'
              : 'bg-[#f4f4f4] text-[#374151]'
          }`}
        >
          Все
        </button>
        {categories.map(([name, count]) => (
          <button
            key={name}
            type="button"
            onClick={() => setCategory(name)}
            className={`flex-shrink-0 text-[10px] px-2.5 py-1.5 rounded-full whitespace-nowrap ${
              category === name
                ? 'bg-brand-accent text-white font-medium'
                : 'bg-[#f4f4f4] text-[#374151]'
            }`}
          >
            {name} ({count})
          </button>
        ))}
      </div>

      <div className="flex justify-end mb-2.5">
        <button
          type="button"
          onClick={() => setSortPriceAsc((v) => !v)}
          className="text-[10px] text-[#6b7280] flex items-center gap-1"
        >
          <span aria-hidden>⇅</span>
          По цене {sortPriceAsc ? '↑' : '↓'}
        </button>
      </div>

      {visible.length === 0 ? (
        <p className="text-center text-[12px] text-[#9ca3af] py-8">Пока нет товаров</p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {visible.map((p) => (
            <CompactSellerProductCard key={p.id} product={p} />
          ))}
        </div>
      )}

      {hasMore && <div ref={loadMoreRef as any} className="h-4" aria-hidden />}
    </div>
  )
}
