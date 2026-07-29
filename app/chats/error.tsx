'use client'

import SegmentError from '@/components/SegmentError'

export default function ChatsError({ reset }: { error: Error; reset: () => void }) {
  return (
    <SegmentError
      title="Не удалось загрузить чаты"
      description="Сообщения временно недоступны. Попробуйте снова."
      homeHref="/chats"
      homeLabel="К чатам"
      reset={reset}
    />
  )
}
