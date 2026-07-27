'use client'

import { FiHeart, FiImage, FiPlay, FiShoppingBag } from 'react-icons/fi'
import { formatCompactCount } from '@/components/ExploreMasonryGrid'

export type InstagramGridItem = {
  key: string
  kind: 'portfolio' | 'product'
  imageUrl?: string | null
  videoUrl?: string | null
  title?: string
  likesCount?: number
  price?: number
}

type Props = {
  items: InstagramGridItem[]
  onItemClick: (item: InstagramGridItem, index: number) => void
}

/** Instagram-style 3-column square grid */
export default function InstagramGrid({ items, onItemClick }: Props) {
  if (items.length === 0) return null

  return (
    <div className="grid grid-cols-3 gap-[1px] bg-[#dbdbdb]">
      {items.map((item, index) => (
        <button
          key={item.key}
          type="button"
          onClick={() => onItemClick(item, index)}
          className="relative aspect-square bg-[#efefef] overflow-hidden active:opacity-90"
        >
          {item.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.imageUrl}
              alt={item.title || ''}
              className="absolute inset-0 w-full h-full object-cover"
              loading="lazy"
              draggable={false}
            />
          ) : item.videoUrl ? (
            <>
              <video
                src={item.videoUrl}
                className="absolute inset-0 w-full h-full object-cover"
                muted
                playsInline
                preload="metadata"
              />
              <span className="absolute top-1.5 right-1.5 text-white drop-shadow">
                <FiPlay size={14} fill="white" />
              </span>
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-[#c7c7c7]">
              {item.kind === 'product' ? <FiShoppingBag size={22} /> : <FiImage size={22} />}
            </div>
          )}

          {item.kind === 'product' && item.price != null && (
            <span className="absolute bottom-1 left-1 bg-black/55 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
              {Number(item.price).toLocaleString('ru-RU')} ₽
            </span>
          )}

          {item.kind === 'portfolio' && (item.likesCount ?? 0) > 0 && (
            <span className="absolute bottom-1 left-1 flex items-center gap-0.5 bg-black/45 text-white text-[9px] font-semibold px-1.5 py-0.5 rounded">
              <FiHeart size={9} className="fill-white" />
              {formatCompactCount(item.likesCount ?? 0)}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
