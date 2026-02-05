'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { FiUser, FiBriefcase } from 'react-icons/fi'

export interface SpecializationWithCount {
  id: string
  name: string
  slug: string
  masters_count: number
  image_url?: string | null
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace('.', ',')} млн`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace('.', ',')} тыс`
  return String(n)
}

interface SpecializationCardsCarouselProps {
  /** Данные с сервера для быстрого LCP (SSR) — при наличии не делаем запрос */
  initialCategories?: SpecializationWithCount[] | null
  initialTotalMasters?: number | null
}

export default function SpecializationCardsCarousel({
  initialCategories = null,
  initialTotalMasters = null,
}: SpecializationCardsCarouselProps = {}) {
  const hasInitial = initialCategories && initialCategories.length > 0
  const [items, setItems] = useState<SpecializationWithCount[]>(hasInitial ? initialCategories : [])
  const [totalMasters, setTotalMasters] = useState<number | null>(hasInitial ? (initialTotalMasters ?? null) : null)
  const [loading, setLoading] = useState(false)
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set())
  const [contentFadedIn, setContentFadedIn] = useState(!!hasInitial)
  const [fetchStarted, setFetchStarted] = useState(!!hasInitial)
  const scrollRef = useRef<HTMLDivElement>(null)
  const sectionRef = useRef<HTMLElement>(null)

  const markImageFailed = (id: string) => {
    setFailedImages((prev) => new Set(prev).add(id))
  }

  // Наблюдатель: запускаем загрузку только когда секция попадает в viewport
  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (fetchStarted) return
        if (!entries[0]?.isIntersecting) return
        setFetchStarted(true)
      },
      { rootMargin: '150px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [fetchStarted])

  useEffect(() => {
    if (!fetchStarted) return
    if (initialCategories && initialCategories.length > 0) return
    let active = true
    setLoading(true)
    fetch('/api/master-categories/with-counts')
      .then((r) => r.json().catch(() => ({})))
      .then((data) => {
        if (!active) return
        setItems((data?.categories as SpecializationWithCount[]) || [])
        setTotalMasters(typeof data?.total_masters === 'number' ? data.total_masters : null)
      })
      .catch(() => { if (active) setItems([]) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [fetchStarted])

  // Плавное появление контента после загрузки
  useEffect(() => {
    if (!loading && items.length > 0) {
      const t = requestAnimationFrame(() => {
        setContentFadedIn(true)
      })
      return () => cancelAnimationFrame(t)
    }
    setContentFadedIn(false)
  }, [loading, items.length])

  const cardWidth = 140
  const imageSize = 140
  const hasContent = !loading && items.length > 0

  return (
    <section ref={sectionRef} className="mb-8 min-h-[220px]">
      <h2 className="text-lg font-semibold text-graphite-secondary mb-4">Готовы помочь</h2>

      {/* Скелетон — до появления в viewport и пока грузим */}
      <div
        className={`flex gap-2 overflow-hidden transition-opacity duration-300 ${
          !fetchStarted || loading ? 'opacity-100' : 'opacity-0 pointer-events-none absolute'
        }`}
        aria-hidden={hasContent}
      >
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="flex-shrink-0 rounded-lg bg-bg-secondary animate-pulse"
            style={{ width: cardWidth, height: imageSize + 56 }}
          />
        ))}
      </div>

      {/* Контент — плавно появляется после загрузки */}
      {hasContent && (
        <div
          ref={scrollRef}
          className={`flex gap-2 overflow-x-auto overflow-y-hidden pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-thin scrollbar-thumb-border-color scrollbar-track-transparent transition-opacity duration-300 ease-out ${
            contentFadedIn ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ scrollbarWidth: 'thin' }}
        >
        {items.map((spec) => (
          <Link
            key={spec.id}
            href={`/search?category=${encodeURIComponent(spec.id)}`}
            className="flex-shrink-0 rounded-lg bg-bg-card border border-border-light shadow-sm overflow-hidden hover:border-border-hover hover:shadow-card transition-all flex flex-col"
            style={{ width: cardWidth }}
          >
            {/* Область картинки — один размер у всех (140×140), индивидуальная картинка без дублирования */}
            <div
              className="relative w-full bg-bg-secondary flex items-center justify-center overflow-hidden"
              style={{ height: imageSize }}
            >
              {!failedImages.has(spec.id) ? (
                spec.image_url ? (
                  <img
                    src={spec.image_url}
                    alt=""
                    width={imageSize}
                    height={imageSize}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover"
                    onError={() => markImageFailed(spec.id)}
                  />
                ) : (
                  <img
                    src={`https://picsum.photos/seed/${encodeURIComponent(spec.slug)}/${imageSize}/${imageSize}`}
                    alt=""
                    width={imageSize}
                    height={imageSize}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover"
                    onError={() => markImageFailed(spec.id)}
                  />
                )
              ) : (
                <FiBriefcase size={28} className="text-text-muted/80" strokeWidth={2} aria-hidden />
              )}
              <div className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded bg-bg-card/95 text-text-muted text-xs font-medium">
                <FiUser size={11} strokeWidth={2} />
                <span>{formatCount(spec.masters_count)}</span>
              </div>
            </div>
            <div className="px-2.5 py-2 border-t border-border-light h-14 flex items-center">
              <span className="text-sm font-medium text-graphite-secondary line-clamp-2 leading-tight w-full">
                {spec.name}
              </span>
            </div>
          </Link>
        ))}
        </div>
      )}

      {hasContent && totalMasters != null && totalMasters > 0 && (
        <p className="mt-2 text-sm text-text-muted transition-opacity duration-300">
          Всего {formatCount(totalMasters)} мастеров на платформе
        </p>
      )}

      {/* Пустой список — не скрываем секцию резко, показываем заголовок и плавно скрываем блок */}
      {!loading && items.length === 0 && (
        <div className="text-sm text-text-muted py-4 transition-opacity duration-300">
          Нет категорий для отображения
        </div>
      )}
    </section>
  )
}
