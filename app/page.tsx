import { getBannersForPage, getMasterCategoriesWithCounts } from '@/lib/server-data'
import HomeClient from './HomeClient'

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
