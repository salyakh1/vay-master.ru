'use client'

import Link from 'next/link'

type SegmentErrorProps = {
  title: string
  description: string
  homeHref?: string
  homeLabel?: string
  reset: () => void
}

export default function SegmentError({
  title,
  description,
  homeHref = '/',
  homeLabel = 'На главную',
  reset,
}: SegmentErrorProps) {
  return (
    <div className="min-h-[50vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-sm w-full text-center">
        <h1 className="text-xl font-extrabold text-[#1c1c1e] mb-2">{title}</h1>
        <p className="text-sm text-[#8e8e93] mb-6 leading-relaxed">{description}</p>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={reset}
            className="block w-full bg-brand-accent text-white text-sm font-bold py-3 rounded-xl"
          >
            Попробовать снова
          </button>
          <Link
            href={homeHref}
            className="block w-full bg-white text-brand-accent text-sm font-bold py-3 rounded-xl border border-[#e5e5ea]"
          >
            {homeLabel}
          </Link>
        </div>
      </div>
    </div>
  )
}
