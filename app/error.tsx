'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html lang="ru">
      <body className="min-h-screen bg-[#f2f2f7] flex items-center justify-center px-4">
        <div className="max-w-sm w-full text-center">
          <div className="text-6xl mb-4" aria-hidden>
            ⚠️
          </div>
          <h1 className="text-2xl font-extrabold text-[#1c1c1e] mb-2">Что-то пошло не так</h1>
          <p className="text-sm text-[#8e8e93] mb-6 leading-relaxed">
            Произошла ошибка при загрузке страницы. Попробуйте обновить или вернитесь на главную.
          </p>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={reset}
              className="block w-full bg-brand-accent text-white text-sm font-bold py-3 rounded-xl"
            >
              Попробовать снова
            </button>
            <Link
              href="/"
              className="block w-full bg-white text-brand-accent text-sm font-bold py-3 rounded-xl border border-[#e5e5ea]"
            >
              На главную
            </Link>
            <Link
              href="/search"
              className="block w-full text-[#8e8e93] text-sm font-medium py-2"
            >
              Найти мастера
            </Link>
          </div>
        </div>
      </body>
    </html>
  )
}
