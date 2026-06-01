'use client'

import { memo } from 'react'
import { Product, User } from '@/lib/supabase'
import { FiShoppingBag, FiStar } from 'react-icons/fi'
import Link from 'next/link'
import Image from 'next/image'

interface ProductCardProps {
  product: Product
  currentUser: User | null
}

function ProductCard({ product, currentUser }: ProductCardProps) {
  const seller = product.seller as { full_name?: string } | undefined
  const categoryName = product.category_ref?.name || product.subcategory_ref?.name

  const ProductCardContent = (
    <div className="card-glossy group h-[320px] flex flex-col !p-0 overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10 rounded-[12px]" />
      <div className="w-full h-[160px] bg-gradient-to-br from-graphite-primary to-graphite-tertiary flex items-center justify-center text-white text-2xl font-semibold rounded-t-[12px] flex-shrink-0 overflow-hidden relative group/image">
        {product.images && product.images.length > 0 ? (
          <>
            <Image
              src={product.images[0]}
              alt={product.name}
              fill
              className="object-cover transition-all duration-500 group-hover/image:scale-110 group-hover/image:brightness-110"
              sizes="(max-width: 768px) 50vw, 400px"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-white/0 via-white/20 to-transparent opacity-0 group-hover/image:opacity-100 transition-opacity duration-500 pointer-events-none" />
          </>
        ) : (
          <FiShoppingBag size={48} strokeWidth={1.5} className="text-white/80" />
        )}
        {!product.in_stock && (
          <div className="absolute top-2 left-2 bg-black/80 text-white px-2 py-1 text-[11px] font-semibold rounded-md z-20">
            Нет в наличии
          </div>
        )}
      </div>
      <div className="flex flex-col items-start text-left p-2.5 pb-1.5 relative z-20 min-h-0 flex-1 overflow-hidden">
        <h3 className="font-bold text-graphite-secondary text-[15px] leading-tight line-clamp-2 mb-0.5 w-full group-hover:text-brand-accent transition-colors">
          {product.name}
        </h3>
        <div className="text-xl font-bold text-brand-accent mb-0.5">
          {product.price.toLocaleString('ru-RU')} ₽
        </div>
        {(product.reviews_count && product.reviews_count > 0) ? (
          <div className="flex items-center gap-1 text-[9px] text-text-muted mb-0.5">
            {product.rating && product.rating > 0 ? (
              <>
                <FiStar size={8} className="fill-brand-accent text-brand-accent flex-shrink-0" strokeWidth={0} />
                <span>{product.rating.toFixed(1)} · {product.reviews_count} {product.reviews_count === 1 ? 'отзыв' : product.reviews_count < 5 ? 'отзыва' : 'отзывов'}</span>
              </>
            ) : (
              <span>{product.reviews_count} {product.reviews_count === 1 ? 'отзыв' : 'отзывов'}</span>
            )}
          </div>
        ) : (
          <div className="text-[9px] text-text-muted mb-0.5">Без отзывов</div>
        )}
        <div className="flex flex-wrap items-center gap-1 pt-1 border-t border-border-light/50 w-full min-h-0 overflow-hidden">
          {categoryName && (
            <span className="min-w-0 max-w-full px-1.5 py-0.5 text-[9px] text-text-secondary bg-bg-secondary rounded border border-border-light truncate inline-block" title={categoryName}>
              {categoryName}
            </span>
          )}
          {seller?.full_name && (
            <span className="min-w-0 max-w-[80px] px-1.5 py-0.5 text-[9px] text-text-secondary bg-bg-secondary rounded border border-border-light truncate inline-block" title={seller.full_name}>
              {seller.full_name}
            </span>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <Link href={`/products/${product.id}`} className="block h-full">
      {ProductCardContent}
    </Link>
  )
}

export default memo(ProductCard)
