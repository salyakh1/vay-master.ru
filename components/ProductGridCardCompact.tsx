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
      <div className="bg-white rounded-[14px] overflow-hidden border border-[#e5e5ea]">
        <div className="relative h-[88px] bg-[#f2f2f7] flex items-center justify-center">
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
        <div className="p-2 pt-2">
          <p className="text-[11px] text-[#1c1c1e] font-semibold mb-0.5 line-clamp-2 leading-snug min-h-[28px]">{product.name}</p>
          {seller?.full_name && (
            <p className="text-[9px] text-[#8e8e93] mb-1 truncate">{seller.full_name}</p>
          )}
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-brand-accent font-extrabold tracking-tight">
              {product.price.toLocaleString('ru-RU')} ₽
            </span>
            <span className="bg-brand-accent text-white w-[26px] h-[26px] rounded-[7px] flex items-center justify-center">
              <FiPlus size={14} strokeWidth={3} />
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}
