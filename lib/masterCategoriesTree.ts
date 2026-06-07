import type { SupabaseClient } from '@supabase/supabase-js'

export type ServiceNode = {
  id: string
  name: string
  slug: string
  sort_order: number
}

export type SubcategoryNode = {
  id: string
  category_id: string
  name: string
  slug: string
  image_url?: string | null
  sort_order: number
  services: ServiceNode[]
}

export type CategoryNode = {
  id: string
  name: string
  slug: string
  image_url?: string | null
  sort_order: number
  subcategories: SubcategoryNode[]
}

type ServiceRow = ServiceNode & { subcategory_id: string }
type SubcategoryRow = Omit<SubcategoryNode, 'services'>

export function buildMasterCategoriesTree(
  cats: CategoryNode[],
  subs: SubcategoryRow[],
  svc: ServiceRow[]
): CategoryNode[] {
  const servicesBySub: Record<string, ServiceNode[]> = {}
  for (const s of svc) {
    const list = servicesBySub[s.subcategory_id] || []
    list.push({ id: s.id, name: s.name, slug: s.slug, sort_order: s.sort_order ?? 0 })
    servicesBySub[s.subcategory_id] = list
  }

  const subsByCat: Record<string, SubcategoryNode[]> = {}
  for (const sub of subs) {
    const list = subsByCat[sub.category_id] || []
    list.push({
      id: sub.id,
      category_id: sub.category_id,
      name: sub.name,
      slug: sub.slug,
      image_url: sub.image_url ?? null,
      sort_order: sub.sort_order ?? 0,
      services: (servicesBySub[sub.id] || []).sort((a, b) => a.sort_order - b.sort_order),
    })
    subsByCat[sub.category_id] = list
  }

  return cats
    .map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      image_url: c.image_url ?? null,
      sort_order: c.sort_order ?? 0,
      subcategories: (subsByCat[c.id] || []).sort((a, b) => a.sort_order - b.sort_order),
    }))
    .sort((a, b) => a.sort_order - b.sort_order)
}

export async function fetchMasterCategoriesTree(client: SupabaseClient): Promise<CategoryNode[]> {
  const [catsRes, subsRes, svcRes] = await Promise.all([
    client.from('categories').select('id, name, slug, image_url, sort_order').order('sort_order').order('name'),
    client
      .from('subcategories')
      .select('id, category_id, name, slug, image_url, sort_order')
      .order('sort_order')
      .order('name'),
    client.from('services').select('id, subcategory_id, name, slug, sort_order').order('sort_order').order('name'),
  ])

  if (catsRes.error) throw catsRes.error
  if (subsRes.error) throw subsRes.error
  if (svcRes.error) throw svcRes.error

  return buildMasterCategoriesTree(
    (catsRes.data || []) as CategoryNode[],
    (subsRes.data || []) as SubcategoryRow[],
    (svcRes.data || []) as ServiceRow[]
  )
}
