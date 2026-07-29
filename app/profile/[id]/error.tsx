'use client'

import SegmentError from '@/components/SegmentError'

export default function ProfileError({ reset }: { error: Error; reset: () => void }) {
  return (
    <SegmentError
      title="Не удалось загрузить профиль"
      description="Проверьте соединение и попробуйте снова."
      homeHref="/search"
      homeLabel="К поиску мастеров"
      reset={reset}
    />
  )
}
