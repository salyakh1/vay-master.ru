'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { FiShoppingBag } from 'react-icons/fi'

export interface CategoryWithCount {
  id: string
  name: string
  slug: string
  section: string
  products_count: number
}

const PASTEL_BGS = [
  'bg-sky-100',
  'bg-emerald-100',
  'bg-amber-100',
  'bg-violet-100',
  'bg-rose-100',
  'bg-teal-100',
  'bg-pink-100',
  'bg-blue-100',
]

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace('.', ',')} млн`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace('.', ',')} тыс`
  return String(n)
}

export default function CatalogCardsCarousel() {
  const [items, setItems] = useState<CategoryWithCount[]>([])
  const [loading, setLoading] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const res = await fetch('/api/categories/with-counts')
        const data = await res.json().catch(() => ({}))
        if (!active) return
        setItems((data?.categories as CategoryWithCount[]) || [])
      } catch {
        if (!active) return
        setItems([])
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [])

  if (loading) {
    return (
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-graphite-secondary mb-4">Каталог</h2>
        <div className="flex gap-3 overflow-hidden">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="flex-shrink-0 w-[140px] h-[180px] rounded-xl bg-bg-secondary animate-pulse"
              aria-hidden
            />
          ))}
        </div>
      </section>
    )
  }

  if (items.length === 0) return null

  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold text-graphite-secondary mb-4">Каталог</h2>
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto overflow-y-hidden pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide"
      >
        {items.map((cat, index) => {
          const pastel = PASTEL_BGS[index % PASTEL_BGS.length]
          return (
            <Link
              key={cat.id}
              href={`/products?category=${encodeURIComponent(cat.slug)}`}
              className="flex-shrink-0 w-[140px] sm:w-[160px] rounded-xl bg-bg-card border border-border-light shadow-card overflow-hidden hover:shadow-card-hover transition-shadow flex flex-col"
            >
              <div className={`relative flex-1 min-h-[100px] flex items-center justify-center ${pastel}`}>
                <div className="w-14 h-14 rounded-full bg-white/80 flex items-center justify-center shadow-sm">
                  <FiShoppingBag size={24} className="text-graphite-secondary" />
                </div>
                <div className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white/90 text-text-secondary text-xs font-medium">
                  <span>{formatCount(cat.products_count)} товаров</span>
                </div>
              </div>
              <div className="p-3 text-center">
                <span className="text-sm font-medium text-graphite-secondary line-clamp-2">
                  {cat.name}
                </span>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
