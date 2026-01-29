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

  const ProductCardContent = (
    <div className="relative bg-white rounded-xl overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.08)] border border-black/5 h-full flex flex-col">
      <div className="relative w-full aspect-square bg-[#f2f2f2] overflow-hidden">
        {product.images && product.images.length > 0 ? (
          <Image
            src={product.images[0]}
            alt={product.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-text-secondary bg-[#f2f2f2]">
            <FiShoppingBag size={36} strokeWidth={1.5} />
          </div>
        )}

        {!product.in_stock && (
          <div className="absolute top-2 left-2 bg-black/80 text-white px-2 py-1 text-[11px] font-semibold rounded-md">
            Нет в наличии
          </div>
        )}
      </div>

      <div className="flex flex-col px-3 pb-3 pt-2 flex-1">
        <h3 className="text-[14px] font-medium leading-snug line-clamp-2 text-graphite-secondary min-h-[34px]">
          {product.name}
        </h3>
        <div className="text-[18px] font-bold text-graphite-secondary mt-1">
          {product.price.toLocaleString('ru-RU')} ₽
        </div>

        {(product.reviews_count && product.reviews_count > 0) ? (
          <div className="flex items-center gap-1 text-[12px] text-text-muted mt-1">
            {product.rating && product.rating > 0 && (
              <>
                <FiStar size={12} className="fill-brand-accent text-brand-accent" strokeWidth={0} />
                <span className="font-medium">{product.rating.toFixed(1)}</span>
              </>
            )}
            <span>
              {product.reviews_count} {product.reviews_count === 1 ? 'отзыв' : product.reviews_count < 5 ? 'отзыва' : 'отзывов'}
            </span>
          </div>
        ) : (
          <div className="text-[12px] text-text-muted mt-1">Без отзывов</div>
        )}

        <div className="mt-auto text-[12px] text-[#8a8a8a] leading-snug pt-2">
          <div className="truncate">{seller?.store_address || seller?.city || '—'}</div>
          <div className="truncate">{seller?.full_name || 'Продавец'}</div>
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

