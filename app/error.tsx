'use client'

import { useEffect } from 'react'
import { createLogger } from '@/lib/logger'

const logger = createLogger('error-boundary')

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    logger.error('Unhandled route error', error)
  }, [error])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
      <p className="text-6xl mb-4">⚙️</p>
      <h1 className="text-2xl font-semibold mb-2">Что-то пошло не так</h1>
      <p className="text-gray-500 mb-6">
        Произошла непредвиденная ошибка. Мы уже работаем над её устранением.
      </p>
      <button
        type="button"
        onClick={reset}
        className="bg-red-500 text-white px-6 py-3 rounded-xl font-medium"
      >
        Попробовать снова
      </button>
    </div>
  )
}
