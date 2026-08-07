import SearchClient from './SearchClient'
import { getBannersForPage } from '@/lib/server-data'
import { getInitialMastersForSearch } from './getInitialSearchData'
import type { Viewport } from 'next'

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
