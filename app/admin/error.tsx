'use client'

import SegmentError from '@/components/SegmentError'

export default function AdminError({ reset }: { error: Error; reset: () => void }) {
  return (
    <SegmentError
      title="Ошибка админ-панели"
      description="Не удалось загрузить раздел. Попробуйте снова или вернитесь в админку."
      homeHref="/admin"
      homeLabel="В админку"
      reset={reset}
    />
  )
}
