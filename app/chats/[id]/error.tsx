'use client'

import SegmentError from '@/components/SegmentError'

export default function ChatDetailError({ reset }: { error: Error; reset: () => void }) {
  return (
    <SegmentError
      title="Не удалось открыть чат"
      description="Сообщения временно недоступны. Попробуйте снова."
      homeHref="/chats"
      homeLabel="К чатам"
      reset={reset}
    />
  )
}
