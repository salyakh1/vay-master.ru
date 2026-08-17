import ProductsClient from './ProductsClient'
import { getBannersForPage } from '@/lib/server-data'
import { getInitialProductsForCatalog } from '../search/getInitialSearchData'
import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'Каталог материалов',
  description: 'Инструменты и строительные материалы от продавцов рядом. VayMaster.',
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

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
