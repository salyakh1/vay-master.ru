'use client'

import SegmentError from '@/components/SegmentError'

export default function FeedError({ reset }: { error: Error; reset: () => void }) {
  return (
    <SegmentError
      title="Не удалось загрузить ленту"
      description="Попробуйте обновить страницу или зайдите позже."
      homeHref="/feed"
      homeLabel="К ленте"
      reset={reset}
    />
  )
}
