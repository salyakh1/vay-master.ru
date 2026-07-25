'use client'

import { FiHeart, FiImage, FiPlay, FiShoppingBag } from 'react-icons/fi'

export type ExploreGridItem = {
  id: string
  kind: 'portfolio' | 'product'
  imageUrl?: string | null
  videoUrl?: string | null
  title?: string
  likesCount?: number
  price?: number
}

interface ExploreMasonryGridProps {
  items: ExploreGridItem[]
  onItemClick: (item: ExploreGridItem, index: number) => void
}

export function formatCompactCount(n: number): string {
  if (n < 1000) return String(n)
  if (n < 1_000_000) {
    const v = n / 1000
    if (v >= 10) return `${Math.round(v)} тыс.`
    const rounded = Math.round(v * 10) / 10
    return `${String(rounded).replace('.', ',')} тыс.`
  }
  const v = n / 1_000_000
  if (v >= 10) return `${Math.round(v)} млн`
  const rounded = Math.round(v * 10) / 10
  return `${String(rounded).replace('.', ',')} млн`
}

export default function ExploreMasonryGrid({ items, onItemClick }: ExploreMasonryGridProps) {
  if (items.length === 0) return null

  return (
    <div className="columns-2 sm:columns-3 gap-2 [&>*]:mb-2 [&>*]:break-inside-avoid">
      {items.map((item, index) => {
        const likesLabel = formatCompactCount(item.likesCount ?? 0)

        return (
          <button
            key={`${item.kind}-${item.id}`}
            type="button"
            onClick={() => onItemClick(item, index)}
            className="block w-full rounded-xl overflow-hidden bg-bg-secondary relative text-left"
          >
            {item.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.imageUrl}
                alt={item.title || (item.kind === 'product' ? 'Товар' : 'Публикация')}
                className="w-full h-auto block"
                loading="lazy"
                draggable={false}
              />
            ) : item.videoUrl ? (
              <div className="relative w-full aspect-[3/4] bg-graphite-primary/10">
                <video src={item.videoUrl} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
                  <span className="w-10 h-10 rounded-full bg-black/45 flex items-center justify-center">
                    <FiPlay size={18} className="text-white ml-0.5" />
                  </span>
                </div>
              </div>
            ) : (
              <div className="w-full aspect-[3/4] flex items-center justify-center bg-bg-secondary text-text-secondary">
                {item.kind === 'product' ? <FiShoppingBag size={28} /> : <FiImage size={28} />}
              </div>
            )}

            {item.kind === 'product' && item.price != null && (
              <span className="absolute top-2 left-2 bg-brand-accent text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                {Number(item.price).toLocaleString('ru-RU')} ₽
              </span>
            )}

            {item.kind === 'portfolio' && (item.likesCount ?? 0) > 0 && (
              <span className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/40 backdrop-blur-sm text-white text-[11px] font-semibold px-2 py-1 rounded-full">
                <FiHeart size={11} className="fill-white" />
                {likesLabel}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
