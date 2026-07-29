'use client'

import SegmentError from '@/components/SegmentError'

export default function ProductsError({ reset }: { error: Error; reset: () => void }) {
  return (
    <SegmentError
      title="Не удалось загрузить товары"
      description="Каталог временно недоступен. Попробуйте обновить страницу."
      homeHref="/products"
      homeLabel="К товарам"
      reset={reset}
    />
  )
}
