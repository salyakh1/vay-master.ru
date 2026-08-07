'use client'

import SegmentError from '@/components/SegmentError'

export default function NewOrderError({ reset }: { error: Error; reset: () => void }) {
  return (
    <SegmentError
      title="Не удалось открыть создание заказа"
      description="Попробуйте снова. Если ошибка повторится — проверьте интернет."
      homeHref="/orders"
      homeLabel="К заказам"
      reset={reset}
    />
  )
}
