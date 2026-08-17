import { getBannersForPage, getMasterCategoriesWithCounts } from '@/lib/server-data'
import { getInitialMastersForSearch } from '@/app/search/getInitialSearchData'
import HomeClient from './HomeClient'

/** Баннеры не должны кэшироваться после удаления в админке */
export const dynamic = 'force-dynamic'
export const revalidate = 0

/** Главная: SSR первого экрана — баннеры, категории и мастера. */
export default async function HomePage() {
  const [banners, categoriesData, masters] = await Promise.all([
    getBannersForPage('home', 10),
    getMasterCategoriesWithCounts(),
    getInitialMastersForSearch(),
  ])

  return (
    <HomeClient
      initialBanners={banners}
      initialCategories={categoriesData.categories}
      initialTotalMasters={categoriesData.total_masters}
      initialMasters={masters.items.slice(0, 8) as any}
    />
  )
}
