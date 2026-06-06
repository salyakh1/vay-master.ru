export type RecommendedMaster = {
  id: string
  full_name: string
  avatar_url?: string | null
  city?: string | null
  master_rating?: number | null
  master_reviews_count?: number | null
}

export type RecommendedProduct = {
  id: string
  name: string
  price: number
  images?: string[] | null
  seller?: {
    id?: string
    full_name?: string | null
    avatar_url?: string | null
  } | null
  category_ref?: {
    name?: string | null
    section?: string | null
  } | null
}
