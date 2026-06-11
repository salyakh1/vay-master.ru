'use client'

import Link from 'next/link'
import Image from 'next/image'
import { FiPlus, FiShoppingBag } from 'react-icons/fi'
import type { Product } from '@/lib/supabase'

type ProductScrollerCardProps = {
  product: Product & { distance_km?: number }
  badge?: string | null
}

export default function ProductScrollerCard({ product, badge }: ProductScrollerCardProps) {
  const seller = product.seller as { full_name?: string; city?: string; store_address?: string } | undefined
  const img = product.images?.[0]
  const shopLine = seller?.full_name
    ? `${seller.full_name}${product.distance_km != null ? ` · ${product.distance_km} км` : ''}`
    : product.distance_km != null
      ? `${product.distance_km} км`
      : seller?.city || ''

  const autoBadge =
    badge ??
    (product.created_at && Date.now() - new Date(product.created_at).getTime() < 7 * 24 * 60 * 60 * 1000
      ? 'NEW'
      : null)

  return (
    <Link
      href={`/products/${product.id}`}
      className="flex-shrink-0 w-[126px] bg-white rounded-[14px] overflow-hidden border border-[#e5e5ea] scroll-snap-align-start active:scale-[0.98] transition-transform"
    >
      <div className="relative h-[76px] bg-[#f2f2f7] flex items-center justify-center">
        {img ? (
          <Image src={img} alt={product.name} fill className="object-cover" sizes="126px" />
        ) : (
          <FiShoppingBag className="text-[#c7c7cc]" size={26} />
        )}
        {autoBadge && (
          <span className="absolute top-1 left-1 bg-brand-accent text-white text-[7px] font-extrabold px-1 py-0.5 rounded">
            {autoBadge}
          </span>
        )}
      </div>
      <div className="px-2 pt-1.5 pb-2">
        <p className="text-[10px] font-semibold text-[#1c1c1e] leading-snug line-clamp-2 min-h-[26px] mb-0.5">
          {product.name}
        </p>
        {shopLine && (
          <p className="text-[9px] text-[#8e8e93] mb-1 truncate">{shopLine}</p>
        )}
        <div className="flex items-center justify-between gap-1">
          <span className="text-[13px] font-extrabold text-brand-accent tracking-tight">
            {product.price.toLocaleString('ru-RU')} ₽
          </span>
          <span className="w-6 h-6 bg-brand-accent rounded-md flex items-center justify-center text-white shrink-0">
            <FiPlus size={14} strokeWidth={3} />
          </span>
        </div>
      </div>
    </Link>
  )
}
