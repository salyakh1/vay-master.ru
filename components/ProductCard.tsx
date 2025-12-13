'use client'

import { Product, User, supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { FiMessageCircle, FiUser } from 'react-icons/fi'
import Link from 'next/link'

interface ProductCardProps {
  product: Product
  currentUser: User
}

export default function ProductCard({ product, currentUser }: ProductCardProps) {
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
    <div className="bg-white border border-gray-200 overflow-hidden transition-all hover:shadow-lg group">
      <Link href={`/products/${product.id}`}>
        <div className="aspect-square bg-gray-50 relative overflow-hidden border-b border-gray-200">
          {product.images && product.images.length > 0 ? (
            <img
              src={product.images[0]}
              alt={product.name}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300 text-5xl">
              🛒
            </div>
          )}
          {!product.in_stock && (
            <div className="absolute top-2 right-2 bg-black/90 text-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider rounded">
              Нет в наличии
            </div>
          )}
        </div>
      </Link>

      <div className="p-3 flex flex-col">
        <Link href={`/products/${product.id}`}>
          <h3 className="font-bold text-sm mb-1.5 hover:text-black cursor-pointer line-clamp-2 text-black leading-tight">
            {product.name}
          </h3>
        </Link>
        
        <p className="text-[11px] text-gray-500 mb-3 line-clamp-2 leading-relaxed min-h-[2.5rem]">
          {product.description}
        </p>

        <div className="flex items-baseline justify-between mb-2">
          <div className="text-xl font-bold text-black">
            {product.price.toLocaleString('ru-RU')} ₽
          </div>
          {product.stock_count !== null && product.stock_count !== undefined && product.stock_count > 0 && (
            <div className="text-[10px] text-gray-400 bg-gray-50 border border-gray-200 px-2 py-0.5 font-medium uppercase tracking-wide rounded">
              {product.stock_count} шт
            </div>
          )}
        </div>

        {product.category_ref && (
          <div className="text-[10px] text-gray-400 mb-2.5 line-clamp-1">
            {product.category_ref.name}
          </div>
        )}

        <div className="flex items-center gap-1.5 mb-3 text-[10px] text-gray-400">
          <Link
            href={`/profile/${seller?.id}`}
            className="hover:text-black transition-colors font-medium line-clamp-1"
          >
            {seller?.full_name || 'Продавец'}
          </Link>
          {seller?.city && <span className="text-gray-300">•</span>}
          {seller?.city && <span className="line-clamp-1">{seller.city}</span>}
        </div>

        <div className="flex gap-2 mt-auto">
          <Link
            href={`/profile/${seller?.id}`}
            className="flex-1 h-9 border border-gray-200 hover:border-black hover:bg-black hover:text-white transition-all flex items-center justify-center rounded"
            title="Профиль продавца"
          >
            <FiUser size={16} />
          </Link>
          <button
            onClick={handleContact}
            className="flex-1 h-9 border border-gray-200 hover:border-black hover:bg-black hover:text-white transition-all flex items-center justify-center rounded"
            title="Написать продавцу"
          >
            <FiMessageCircle size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}

