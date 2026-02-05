'use client'

import Image from 'next/image'
import { PortfolioItem } from '@/lib/supabase'
import { FiImage, FiVideo, FiPlay } from 'react-icons/fi'

interface PortfolioGridProps {
  items: PortfolioItem[]
  onItemClick: (item: PortfolioItem, index: number) => void
}

export default function PortfolioGrid({ items, onItemClick }: PortfolioGridProps) {
  if (items.length === 0) {
    return (
      <div className="card text-center py-12">
        <div className="text-4xl mb-4">📷</div>
        <p className="text-base font-medium text-black mb-2">
          Портфолио пусто
        </p>
        <p className="text-sm text-gray-500">
          Мастер еще не добавил свои работы
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      {items.map((item) => {
        // Получаем первое медиа (фото или видео)
        const firstMedia = item.images.length > 0 
          ? { type: 'image' as const, url: item.images[0] }
          : item.videos.length > 0
          ? { type: 'video' as const, url: item.videos[0] }
          : null

        return (
          <div
            key={item.id}
            onClick={() => onItemClick(item, items.indexOf(item))}
            className="aspect-square bg-gray-100 border border-gray-200 cursor-pointer overflow-hidden relative group"
          >
            {firstMedia ? (
              firstMedia.type === 'image' ? (
                <Image
                  src={firstMedia.url}
                  alt={item.title}
                  fill
                  sizes="(max-width: 768px) 33vw, 200px"
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  unoptimized={!String(firstMedia.url).includes('supabase')}
                />
              ) : (
                <div className="w-full h-full relative">
                  <video
                    src={firstMedia.url}
                    className="w-full h-full object-cover"
                    muted
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <FiPlay size={32} className="text-white" />
                  </div>
                </div>
              )
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <FiImage size={32} />
              </div>
            )}
            {/* Overlay с информацией */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
              <div className="text-white text-center px-2">
                <p className="text-xs font-medium line-clamp-2">{item.title}</p>
                {(item.images.length > 0 || item.videos.length > 0) && (
                  <div className="flex items-center justify-center gap-2 mt-1 text-xs">
                    {item.images.length > 0 && (
                      <span className="flex items-center gap-1">
                        <FiImage size={12} />
                        {item.images.length}
                      </span>
                    )}
                    {item.videos.length > 0 && (
                      <span className="flex items-center gap-1">
                        <FiVideo size={12} />
                        {item.videos.length}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

