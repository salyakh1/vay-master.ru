import SearchClient from './SearchClient'
import { getBannersForPage } from '@/lib/server-data'
import { getInitialMastersForSearch } from './getInitialSearchData'
import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'Поиск мастеров',
  description: 'Найдите мастера рядом: услуги, цены и портфолио. VayMaster — мастера и материалы рядом.',
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

/** Pinch-zoom разрешён (WCAG 1.4.4) — не переопределять на maximumScale: 1. */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
}

type SearchParams = Record<string, string | string[] | undefined>

export default async function SearchPage({
  searchParams,
}: {
  searchParams?: SearchParams
}) {
  const q = typeof searchParams?.q === 'string' ? searchParams.q : ''
  const category = typeof searchParams?.category === 'string' ? searchParams.category : ''

  const [banners, initial] = await Promise.all([
    getBannersForPage('search'),
    getInitialMastersForSearch({ q, category }),
  ])

  return (
    <SearchClient
      initialBanners={banners}
      initialMasters={initial.items}
      initialTotal={initial.total}
    />
  )
}
