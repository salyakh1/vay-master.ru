import ProductsClient from './ProductsClient'
import { getBannersForPage } from '@/lib/server-data'
import { getInitialProductsForCatalog } from '../search/getInitialSearchData'
import type { Viewport } from 'next'

/** Pinch-zoom разрешён (WCAG 1.4.4). */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
}

type SearchParams = Record<string, string | string[] | undefined>

export default async function ProductsPage({
  searchParams,
}: {
  searchParams?: SearchParams
}) {
  const q = typeof searchParams?.q === 'string' ? searchParams.q : ''
  const category = typeof searchParams?.category === 'string' ? searchParams.category : ''

  const [banners, initial] = await Promise.all([
    getBannersForPage('products'),
    getInitialProductsForCatalog({ q, category }),
  ])

  return (
    <ProductsClient
      initialBanners={banners}
      initialProducts={initial.items}
      initialTotal={initial.total}
    />
  )
}
