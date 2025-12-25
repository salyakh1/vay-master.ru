'use client'

import { memo } from 'react'
import { Product, User, supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { FiMessageCircle, FiUser } from 'react-icons/fi'
import Link from 'next/link'

interface ProductCardProps {
  product: Product
  currentUser: User
}

function ProductCard({ product, currentUser }: ProductCardProps) {
  const router = useRouter()
  const seller = product.seller as any

  const handleContact = async () => {
    // Start chat with seller
    try {
      const { data: existingChat } = await supabase
        .from('chats')
        .select('id')
        .or(`and(user1_id.eq.${currentUser.id},user2_id.eq.${seller.id}),and(user1_id.eq.${seller.id},user2_id.eq.${currentUser.id})`)
        .single()

      if (existingChat) {
        router.push(`/chats/${existingChat.id}`)
      } else {
        const { data } = await supabase
          .from('chats')
          .insert({
            user1_id: currentUser.id,
            user2_id: seller.id,
          })
          .select()
          .single()

        if (data) {
          router.push(`/chats/${data.id}`)
        }
      }
    } catch (error) {
      console.error('Error starting chat:', error)
    }
  }

  return (
    <div className="bg-bg-primary overflow-hidden transition-all hover:shadow-card-hover group card">
      <Link href={`/products/${product.id}`}>
        <div className="aspect-square bg-bg-secondary relative overflow-hidden rounded-lg mb-3">
          {product.images && product.images.length > 0 ? (
            <img
              src={product.images[0]}
              alt={product.name}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-text-secondary text-5xl">
              🛒
            </div>
          )}
          {!product.in_stock && (
            <div className="absolute top-2 right-2 bg-text-primary/90 text-white px-2.5 py-1 text-xs font-medium rounded">
              Нет в наличии
            </div>
          )}
        </div>
      </Link>

      <div className="flex flex-col">
        <Link href={`/products/${product.id}`}>
          <h3 className="font-semibold text-base mb-2 hover:text-brand-accent cursor-pointer line-clamp-2 text-text-primary leading-tight">
            {product.name}
          </h3>
        </Link>
        
        <p className="text-sm text-text-secondary mb-3 line-clamp-2 leading-relaxed min-h-[2.5rem]">
          {product.description}
        </p>

        <div className="flex items-baseline justify-between mb-2">
          <div className="text-xl font-semibold text-text-primary">
            {product.price.toLocaleString('ru-RU')} ₽
          </div>
          {product.stock_count !== null && product.stock_count !== undefined && product.stock_count > 0 && (
            <div className="text-xs text-text-secondary bg-bg-secondary px-2 py-1 font-normal rounded">
              {product.stock_count} шт
            </div>
          )}
        </div>

        {product.category_ref && (
          <div className="text-xs text-text-secondary mb-2.5 line-clamp-1">
            {product.category_ref.name}
          </div>
        )}

        <div className="flex items-center gap-1.5 mb-3 text-xs text-text-secondary">
          <Link
            href={`/profile/${seller?.id}`}
            className="hover:text-text-primary transition-colors font-normal line-clamp-1"
          >
            {seller?.full_name || 'Продавец'}
          </Link>
          {seller?.city && <span className="text-border-color">•</span>}
          {seller?.city && <span className="line-clamp-1">{seller.city}</span>}
        </div>

        <div className="flex gap-2 mt-auto">
          <Link
            href={`/profile/${seller?.id}`}
            className="flex-1 h-10 border border-border-color hover:border-brand-accent hover:text-brand-accent transition-all flex items-center justify-center rounded-lg"
            title="Профиль продавца"
          >
            <FiUser size={18} />
          </Link>
          <button
            onClick={handleContact}
            className="flex-1 h-10 border border-border-color hover:border-brand-accent hover:text-brand-accent transition-all flex items-center justify-center rounded-lg"
            title="Написать продавцу"
          >
            <FiMessageCircle size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}

export default memo(ProductCard)

