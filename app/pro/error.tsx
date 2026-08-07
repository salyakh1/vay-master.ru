'use client'

import SegmentError from '@/components/SegmentError'

export default function ProError({ reset }: { error: Error; reset: () => void }) {
  return (
    <SegmentError
      title="Не удалось открыть PRO"
      description="Страница подписки временно недоступна. Попробуйте снова."
      homeHref="/pro"
      homeLabel="К PRO"
      reset={reset}
    />
  )
}
