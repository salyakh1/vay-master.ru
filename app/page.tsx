import { getBannersForPage, getMasterCategoriesWithCounts } from '@/lib/server-data'
import HomeClient from './HomeClient'

/** Баннеры не должны кэшироваться после удаления в админке */
export const dynamic = 'force-dynamic'
export const revalidate = 0

/** Главная: SSR первого экрана — баннеры и категории мастеров отдаются с сервера для быстрого LCP. */
export default async function HomePage() {
  const [banners, categoriesData] = await Promise.all([
    getBannersForPage('home', 10),
    getMasterCategoriesWithCounts(),
  ])

  return (
    <HomeClient
      initialBanners={banners}
      initialCategories={categoriesData.categories}
      initialTotalMasters={categoriesData.total_masters}
    />
  )
}
