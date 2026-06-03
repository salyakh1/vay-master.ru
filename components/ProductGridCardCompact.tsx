'use client'

import Link from 'next/link'
import Image from 'next/image'
import { FiPlus, FiShoppingBag } from 'react-icons/fi'
import type { Product } from '@/lib/supabase'

export default function ProductGridCardCompact({ product }: { product: Product }) {
  const seller = product.seller as { full_name?: string } | undefined
  const img = product.images?.[0]
  const isNew =
    product.created_at &&
    Date.now() - new Date(product.created_at).getTime() < 7 * 24 * 60 * 60 * 1000

  return (
    <Link href={`/products/${product.id}`} className="block">
      <div className="bg-white rounded-[14px] overflow-hidden border border-[#f0f0f0]">
        <div className="relative h-[90px] bg-[#f5f5f7] flex items-center justify-center">
          {img ? (
            <Image src={img} alt={product.name} fill className="object-cover" sizes="50vw" />
          ) : (
            <FiShoppingBag className="text-[#ccc]" size={28} />
          )}
          {isNew && (
            <span className="absolute top-1.5 left-1.5 bg-brand-accent text-white text-[8px] font-extrabold px-1.5 py-0.5 rounded-md">
              NEW
            </span>
          )}
        </div>
        <div className="p-2">
          <p className="text-[11px] text-[#333] font-semibold mb-1 line-clamp-2 leading-snug">{product.name}</p>
          {seller?.full_name && (
            <p className="text-[9px] text-[#bbb] mb-1.5 truncate">{seller.full_name}</p>
          )}
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-brand-accent font-extrabold">
              {product.price.toLocaleString('ru-RU')} ₽
            </span>
            <span className="bg-brand-accent text-white w-[26px] h-[26px] rounded-lg flex items-center justify-center">
              <FiPlus size={14} strokeWidth={3} />
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}
