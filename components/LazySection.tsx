'use client'

import { useEffect, useState, useRef, ReactNode } from 'react'

interface LazySectionProps {
  children: ReactNode
  /** Минимальная высота плейсхолдера, чтобы не было CLS при появлении контента */
  minHeight?: string
  /** rootMargin для Intersection Observer (например '200px' — загрузить за 200px до появления) */
  rootMargin?: string
}

/**
 * Рендерит children только когда секция попадает в viewport.
 * До этого рендерит плейсхолдер с minHeight, чтобы не было layout shift.
 */
export default function LazySection({ children, minHeight = '400px', rootMargin = '200px' }: LazySectionProps) {
  const [inView, setInView] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setInView(true)
            observer.disconnect()
          }
        })
      },
      { rootMargin, threshold: 0 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [rootMargin])

  if (inView) {
    return <>{children}</>
  }

  return <div ref={ref} style={{ minHeight }} aria-hidden />
}
