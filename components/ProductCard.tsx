'use client'

import { memo, useState } from 'react'
import { Product, User } from '@/lib/supabase'
import { FiShoppingBag, FiStar } from 'react-icons/fi'
import Link from 'next/link'
import Image from 'next/image'
import AuthRequiredModal from './AuthRequiredModal'

interface ProductCardProps {
  product: Product
  currentUser: User | null
}

function ProductCard({ product, currentUser }: ProductCardProps) {
  const seller = product.seller as any
  const [showAuthModal, setShowAuthModal] = useState(false)
  const categoryName = product.category_ref?.name || product.subcategory_ref?.name

  const ProductCardContent = (
    <div className="card-glossy group h-[400px] flex flex-col !p-0 overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10 rounded-[12px]" />
      <div className="w-full h-[200px] bg-gradient-to-br from-graphite-primary to-graphite-tertiary flex items-center justify-center text-white text-2xl font-semibold rounded-t-[12px] flex-shrink-0 overflow-hidden relative group/image">
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
      <div className="flex flex-col items-center text-center p-5 pb-4 relative z-20">
        <h3 className="font-semibold text-base bg-gradient-to-r from-graphite-secondary to-graphite-primary bg-clip-text text-transparent mb-1.5 line-clamp-2 leading-tight group-hover:from-brand-accent group-hover:to-brand-accent-hover transition-all">
          {product.name}
        </h3>
        <div className="text-lg font-bold text-graphite-secondary mb-2.5">
          {product.price.toLocaleString('ru-RU')} ₽
        </div>
        {(product.reviews_count && product.reviews_count > 0) ? (
          <div className="flex items-center gap-1 text-xs text-text-secondary mb-3">
            {product.rating && product.rating > 0 ? (
              <>
                <FiStar size={12} className="fill-brand-accent text-brand-accent" strokeWidth={0} />
                <span className="font-medium">
                  {product.rating.toFixed(1)} ({product.reviews_count} {product.reviews_count === 1 ? 'отзыв' : product.reviews_count < 5 ? 'отзыва' : 'отзывов'})
                </span>
              </>
            ) : (
              <span className="font-medium">
                ({product.reviews_count} {product.reviews_count === 1 ? 'отзыв' : product.reviews_count < 5 ? 'отзыва' : 'отзывов'})
              </span>
            )}
          </div>
        ) : (
          <div className="text-xs text-text-secondary mb-3">Без отзывов</div>
        )}
        <div className="flex flex-wrap items-center justify-center gap-1.5 pt-3 border-t border-border-light/40 w-full px-2">
          {categoryName && (
            <span className="px-1.5 py-0.5 bg-gradient-to-br from-brand-accent/15 to-brand-accent/10 text-brand-accent text-[9px] font-medium rounded border border-brand-accent/30 backdrop-blur-sm shadow-sm transition-all group-hover:border-brand-accent/50 group-hover:shadow-md whitespace-nowrap">
              {categoryName}
            </span>
          )}
          {seller?.full_name && (
            <span className="px-1.5 py-0.5 bg-gradient-to-br from-brand-accent/15 to-brand-accent/10 text-brand-accent text-[9px] font-medium rounded border border-brand-accent/30 backdrop-blur-sm shadow-sm transition-all group-hover:border-brand-accent/50 group-hover:shadow-md whitespace-nowrap">
              {seller.full_name}
            </span>
          )}
        </div>
      </div>
    </div>
  )

  if (currentUser) {
    return (
      <Link href={`/products/${product.id}`} className="block h-full">
        {ProductCardContent}
      </Link>
    )
  }

  return (
    <>
      <div onClick={() => setShowAuthModal(true)} className="cursor-pointer h-full">
        {ProductCardContent}
      </div>
      <AuthRequiredModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        type="product"
      />
    </>
  )
}

export default memo(ProductCard)
