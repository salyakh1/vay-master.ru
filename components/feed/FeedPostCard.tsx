'use client'

import Image from 'next/image'
import Link from 'next/link'
import { FiHeart, FiMapPin, FiMessageCircle, FiMessageSquare, FiShoppingBag } from 'react-icons/fi'
import { formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'
import PostImageSlider from '@/components/PostImageSlider'
import type { PortfolioComment, PortfolioItem, Product } from '@/lib/supabase'

export type FeedPortfolioItem = PortfolioItem & {
  liked?: boolean
  comments?: PortfolioComment[]
  showComments?: boolean
}

export type FeedProductItem = Product & {
  seller?: {
    id: string
    full_name?: string | null
    avatar_url?: string | null
    role?: string
    city?: string | null
  } | null
}

type PortfolioProps = {
  type: 'portfolio'
  item: FeedPortfolioItem
  commentText: string
  submittingComment: boolean
  onCommentChange: (text: string) => void
  onLike: () => void
  onToggleComments: () => void
  onSubmitComment: () => void
}

type ProductProps = {
  type: 'product'
  item: FeedProductItem
  createdAt: string
}

type Props = PortfolioProps | ProductProps

export default function FeedPostCard(props: Props) {
  if (props.type === 'product') {
    const product = props.item
    const seller = product.seller
    const cover = product.images?.[0]
    return (
      <article
        id={`feed-${product.id}`}
        className="bg-white border-b border-[#efefef]"
        data-feed-key={`product-${product.id}`}
      >
        <div className="flex items-center gap-2.5 px-3.5 py-2.5">
          <Link
            href={`/profile/${seller?.id || ''}`}
            className="relative w-8 h-8 rounded-full overflow-hidden bg-[#0095f6] flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0"
          >
            {seller?.avatar_url ? (
              <Image src={seller.avatar_url} alt="" fill className="object-cover" sizes="32px" />
            ) : (
              seller?.full_name?.[0]?.toUpperCase() || 'П'
            )}
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <Link href={`/profile/${seller?.id || ''}`} className="text-[13px] font-semibold text-[#262626] truncate">
                {seller?.full_name || 'Продавец'}
              </Link>
              <span className="text-[10px] font-semibold text-[#0095f6]">· Товар</span>
            </div>
            <p className="text-[11px] text-[#8e8e8e] truncate">
              {seller?.city ? `${seller.city} · ` : ''}
              {formatDistanceToNow(new Date(props.createdAt), { addSuffix: true, locale: ru })}
            </p>
          </div>
        </div>

        {cover ? (
          <Link href={`/products/${product.id}`} className="relative block w-full aspect-square bg-[#fafafa]">
            <Image src={cover} alt={product.name} fill className="object-cover" sizes="100vw" />
          </Link>
        ) : (
          <div className="w-full aspect-square bg-[#fafafa] flex items-center justify-center text-[#dbdbdb]">
            <FiShoppingBag size={40} />
          </div>
        )}

        <div className="px-3.5 py-2.5">
          <p className="text-[15px] font-bold text-[#262626] mb-0.5">
            {Number(product.price).toLocaleString('ru-RU')} ₽
          </p>
          <p className="text-[13px] text-[#262626] leading-snug">
            <span className="font-semibold mr-1">{seller?.full_name || 'Продавец'}</span>
            {product.name}
          </p>
          <Link
            href={`/products/${product.id}`}
            className="inline-flex items-center gap-1 mt-2 text-[12px] font-semibold text-[#0095f6]"
          >
            Открыть товар →
          </Link>
        </div>
      </article>
    )
  }

  const item = props.item
  const isSeller = item.master?.role === 'seller'

  return (
    <article
      id={`feed-${item.id}`}
      className="bg-white border-b border-[#efefef]"
      data-feed-key={`portfolio-${item.id}`}
    >
      <div className="flex items-center gap-2.5 px-3.5 py-2.5">
        <Link
          href={`/profile/${item.master?.id}`}
          className={`relative w-8 h-8 rounded-full overflow-hidden flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0 ${
            isSeller ? 'bg-[#0095f6]' : 'bg-[#e63946]'
          }`}
        >
          {item.master?.avatar_url ? (
            <Image src={item.master.avatar_url} alt="" fill className="object-cover" sizes="32px" />
          ) : (
            item.master?.full_name?.[0]?.toUpperCase() || 'M'
          )}
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <Link href={`/profile/${item.master?.id}`} className="text-[13px] font-semibold text-[#262626] truncate">
              {item.master?.full_name || 'Мастер'}
            </Link>
            <span className={`text-[10px] font-semibold ${isSeller ? 'text-[#0095f6]' : 'text-[#e63946]'}`}>
              · {isSeller ? 'Продавец' : 'Мастер'}
            </span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-[#8e8e8e] truncate">
            {item.master?.city && (
              <>
                <FiMapPin size={10} />
                <span className="truncate">{item.master.city}</span>
                <span>·</span>
              </>
            )}
            <span>{formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: ru })}</span>
          </div>
        </div>
      </div>

                  {item.images && item.images.length > 0 ? (
                    <div className="relative w-full aspect-square bg-black overflow-hidden">
                      <PostImageSlider
                        images={item.images}
                        alt={item.title || ''}
                        className="absolute inset-0 h-full [&>div]:h-full [&_img]:!h-full [&_img]:!max-h-none [&_img]:!object-cover"
                      />
                    </div>
                  ) : item.videos && item.videos.length > 0 ? (
        <div className="w-full aspect-square bg-black">
          <video src={item.videos[0]} controls className="w-full h-full object-contain" />
        </div>
      ) : null}

      <div className="flex items-center gap-4 px-3.5 pt-2.5">
        <button type="button" onClick={props.onLike} className="flex items-center gap-1.5" aria-label="Нравится">
          <FiHeart
            size={22}
            className={item.liked ? 'fill-[#e63946] text-[#e63946]' : 'text-[#262626]'}
          />
          {(item.likes_count ?? 0) > 0 && (
            <span className="text-[13px] font-semibold text-[#262626]">{item.likes_count}</span>
          )}
        </button>
        <button
          type="button"
          onClick={props.onToggleComments}
          className="flex items-center gap-1.5"
          aria-label="Комментарии"
        >
          <FiMessageCircle size={22} className="text-[#262626]" />
          {(item.comments_count ?? 0) > 0 && (
            <span className="text-[13px] font-semibold text-[#262626]">{item.comments_count}</span>
          )}
        </button>
        <Link href={`/profile/${item.master?.id}`} className="ml-auto text-[#262626]" aria-label="Написать">
          <FiMessageSquare size={22} />
        </Link>
      </div>

      {(item.title || item.description) && (
        <div className="px-3.5 pt-2 pb-1">
          {item.title && <p className="text-[13px] font-semibold text-[#262626] mb-0.5">{item.title}</p>}
          {item.description && (
            <p className="text-[13px] text-[#262626] leading-snug line-clamp-3">
              <span className="font-semibold mr-1">{item.master?.full_name}</span>
              {item.description}
            </p>
          )}
        </div>
      )}

      {item.showComments && (
        <div className="px-3.5 pb-3 pt-1 border-t border-[#fafafa] mt-1">
          {(item.comments ?? []).length === 0 ? (
            <p className="text-[12px] text-[#8e8e8e] mb-2">Комментариев пока нет</p>
          ) : (
            <ul className="space-y-1.5 mb-2">
              {(item.comments ?? []).map((c) => (
                <li key={c.id} className="text-[13px] text-[#262626]">
                  <span className="font-semibold mr-1">{c.user?.full_name || 'Пользователь'}</span>
                  {c.content}
                </li>
              ))}
            </ul>
          )}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={props.commentText}
              onChange={(e) => props.onCommentChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') props.onSubmitComment()
              }}
              placeholder="Добавьте комментарий…"
              className="flex-1 text-[13px] outline-none placeholder:text-[#c7c7c7] min-w-0"
            />
            <button
              type="button"
              disabled={!props.commentText.trim() || props.submittingComment}
              onClick={props.onSubmitComment}
              className="text-[13px] font-semibold text-[#0095f6] disabled:opacity-40"
            >
              Опубликовать
            </button>
          </div>
        </div>
      )}

      <div className="h-2 bg-[#fafafa]" />
    </article>
  )
}
