'use client'

import { memo, useState } from 'react'
import { Product, User } from '@/lib/supabase'
import { FiShoppingBag } from 'react-icons/fi'
import Link from 'next/link'
import AuthRequiredModal from './AuthRequiredModal'

interface ProductCardProps {
  product: Product
  currentUser: User | null
}

function ProductCard({ product, currentUser }: ProductCardProps) {
  const seller = product.seller as any
  const [showAuthModal, setShowAuthModal] = useState(false)

  const ProductCardContent = (
      <div className="card-glossy overflow-hidden group cursor-pointer flex flex-col !p-0 relative h-full">
        
        {/* Изображение товара */}
        <div className="w-full aspect-square bg-bg-secondary relative overflow-hidden rounded-t-[12px] flex-shrink-0">
          {product.images && product.images.length > 0 ? (
            <>
              <img
                src={product.images[0]}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-text-secondary text-4xl bg-bg-secondary">
              <FiShoppingBag size={48} strokeWidth={1.5} />
            </div>
          )}
          {!product.in_stock && (
            <div className="absolute top-3 right-3 bg-graphite-primary/95 backdrop-blur-sm text-white px-3 py-1.5 text-xs font-semibold rounded-lg shadow-glossy border border-white/10">
              Нет в наличии
            </div>
          )}
        </div>

        {/* Информация о товаре */}
        <div className="flex flex-col flex-1 p-4 sm:p-5">
          {/* Название и категория */}
          <div className="mb-3">
            <h3 className="font-semibold text-[15px] sm:text-base mb-1.5 line-clamp-2 text-graphite-secondary leading-snug min-h-[42px]">
              {product.name}
            </h3>
            <div className={`text-xs text-text-muted min-h-[16px] ${product.category_ref ? '' : 'opacity-0'}`}>
              {product.category_ref?.name || '—'}
            </div>
          </div>

          {/* Цена и количество */}
          <div className="flex items-baseline justify-between mb-3 pt-3 border-t border-border-light/40">
            <div className="text-base sm:text-lg font-semibold text-graphite-secondary">
              {product.price.toLocaleString('ru-RU')} ₽
            </div>
            {product.stock_count !== null && product.stock_count !== undefined && product.stock_count > 0 && (
              <div className="text-xs text-text-secondary bg-gradient-to-br from-bg-secondary to-bg-primary px-2.5 py-1 font-medium rounded-lg shadow-sm border border-border-light/40">
                {product.stock_count} шт
              </div>
            )}
          </div>

          {/* Информация о продавце */}
          <div className="flex items-center gap-2.5 text-xs text-text-secondary pt-3 border-t border-border-light/40 mt-auto">
            <div className="w-7 h-7 bg-graphite-primary rounded-full overflow-hidden flex items-center justify-center text-white text-[10px] font-semibold flex-shrink-0">
              {seller?.avatar_url ? (
                <img src={seller.avatar_url} alt={seller.full_name} className="w-full h-full object-cover" />
              ) : (
                seller?.full_name?.[0]?.toUpperCase() || 'П'
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-graphite-secondary truncate">
                {seller?.full_name || 'Продавец'}
              </div>
              <div className={`text-text-muted truncate min-h-[16px] ${seller?.city ? '' : 'opacity-0'}`}>
                {seller?.city || '—'}
              </div>
            </div>
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

