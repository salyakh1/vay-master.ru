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
      <div className="card-glossy overflow-hidden group cursor-pointer h-[400px] flex flex-col !p-0 relative">
        {/* Глянцевый эффект на карточке */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10"></div>
        
        {/* Изображение товара */}
        <div className="w-full h-[200px] bg-bg-secondary relative overflow-hidden rounded-t-[12px] flex-shrink-0 group/image">
          {product.images && product.images.length > 0 ? (
            <>
              <img
                src={product.images[0]}
                alt={product.name}
                className="w-full h-[200px] object-cover transition-all duration-500 group-hover:scale-110 group-hover:brightness-110"
              />
              {/* Блик на изображении */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/0 via-white/20 to-transparent opacity-0 group-hover/image:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
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
        <div className="flex flex-col flex-1 p-4">
          {/* Название и категория */}
          <div className="mb-4">
            <h3 className="font-semibold text-lg mb-1.5 line-clamp-2 text-graphite-secondary leading-tight group-hover:text-brand-accent transition-colors">
              {product.name}
            </h3>
            {product.category_ref && (
              <div className="text-xs text-text-muted">
                {product.category_ref.name}
              </div>
            )}
          </div>

          {/* Цена и количество */}
          <div className="flex items-baseline justify-between mb-4 pt-4 border-t border-border-light/50">
            <div className="text-lg font-semibold text-graphite-secondary bg-gradient-to-r from-graphite-secondary to-graphite-primary bg-clip-text text-transparent">
              {product.price.toLocaleString('ru-RU')} ₽
            </div>
            {product.stock_count !== null && product.stock_count !== undefined && product.stock_count > 0 && (
              <div className="text-xs text-text-secondary bg-gradient-to-br from-bg-secondary to-bg-primary px-2.5 py-1 font-medium rounded-lg shadow-sm border border-border-light/50">
                {product.stock_count} шт
              </div>
            )}
          </div>

          {/* Информация о продавце */}
          <div className="flex items-center gap-2 text-xs text-text-secondary pt-3 border-t border-border-light">
            <div className="w-6 h-6 bg-graphite-primary rounded-full flex items-center justify-center text-white text-[10px] font-semibold flex-shrink-0">
              {seller?.full_name?.[0]?.toUpperCase() || 'П'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-graphite-secondary truncate">
                {seller?.full_name || 'Продавец'}
              </div>
              {seller?.city && (
                <div className="text-text-muted truncate">{seller.city}</div>
              )}
            </div>
          </div>
        </div>
      </div>
  )

  if (currentUser) {
    return (
      <Link href={`/products/${product.id}`}>
        {ProductCardContent}
      </Link>
    )
  }

  return (
    <>
      <div onClick={() => setShowAuthModal(true)} className="cursor-pointer">
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

