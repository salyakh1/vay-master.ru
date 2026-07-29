'use client'

import SegmentError from '@/components/SegmentError'

export default function OrdersError({ reset }: { error: Error; reset: () => void }) {
  return (
    <SegmentError
      title="Не удалось загрузить заказ"
      description="Данные заказа временно недоступны. Попробуйте обновить страницу."
      homeHref="/orders"
      homeLabel="К списку заказов"
      reset={reset}
    />
  )
}
