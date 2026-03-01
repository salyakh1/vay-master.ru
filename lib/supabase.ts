import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env.local file:\n' +
    'NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type UserRole = 'master' | 'seller' | 'client'

export interface Category {
  id: string
  name: string
  slug: string
  image_url?: string | null
  sort_order?: number
}

export interface Subcategory {
  id: string
  category_id: string
  name: string
  slug: string
  image_url?: string | null
  sort_order?: number
}

export interface Service {
  id: string
  subcategory_id: string
  name: string
  slug: string
  sort_order?: number
}

/** @deprecated Use Category + Subcategory. Kept for backward compatibility. */
export interface Specialization {
  id: string
  name: string
  slug: string
}

export interface User {
  id: string
  email: string
  full_name: string
  avatar_url?: string
  cover_photo_url?: string
  role: UserRole
  phone?: string
  city?: string
  description?: string
  created_at: string
  // PRO / подписка
  is_pro?: boolean
  pro_until?: string
  // Пробный период PRO (старт)
  pro_trial_started_at?: string
  // Master fields
  services?: string
  service_location?: 'home' | 'workshop' | 'both'
  experience_years?: number
  specialization?: string
  work_schedule?: string
  master_lat?: number
  master_lng?: number
  service_radius_km?: number
  // Seller fields
  store_address?: string
  seller_lat?: number
  seller_lng?: number
  work_hours?: string
  delivery_available?: boolean
  delivery_zones?: string
  product_categories?: string
  // Rating fields
  master_rating?: number
  master_reviews_count?: number
  seller_rating?: number
  seller_reviews_count?: number
  // Enriched relations (masters: subcategories + services)
  specializations?: Specialization[]
  subcategories?: Subcategory[]
  services_list?: Service[]
}

export interface Post {
  id: string
  user_id: string
  content: string
  images?: string[]
  created_at: string
  updated_at?: string
  likes_count: number
  user?: User
}

export interface PostLike {
  id: string
  post_id: string
  user_id: string
  created_at: string
}

export interface ProductSubcategory {
  id: string
  category_id: string
  name: string
  slug: string
  created_at: string
}

export interface Product {
  id: string
  seller_id: string
  name: string
  description: string
  price: number
  images: string[]
  category?: string
  category_id?: string
  subcategory_id?: string
  in_stock: boolean
  stock_count?: number
  rating?: number
  reviews_count?: number
  created_at: string
  seller?: User
  category_ref?: ProductCategory
  subcategory_ref?: ProductSubcategory
}

export type ProductCategorySection =
  | 'construction'
  | 'exterior'
  | 'engineering'
  | 'finishing'
  | 'tools'
  | 'auto'

export const PRODUCT_CATEGORY_SECTIONS: Array<{
  id: ProductCategorySection
  label: string
}> = [
  { id: 'construction', label: 'Строительство и материалы' },
  { id: 'exterior', label: 'Кровля, фасады, участок' },
  { id: 'engineering', label: 'Инженерия и коммуникации' },
  { id: 'finishing', label: 'Отделка и интерьер' },
  { id: 'tools', label: 'Инструменты и расходники' },
  { id: 'auto', label: 'Автотовары' },
]

export interface ProductCategory {
  id: string
  section: ProductCategorySection
  name: string
  slug: string
  created_at: string
  image_url?: string | null
}

// Типы рекламы
export type AdType = 
  | 'HERO_SPONSORED'      // Верхние промо-блоки
  | 'INLINE_CONTEXT'      // Контекстная реклама между карточками
  | 'SPONSORED_CARD'      // Карточка-реклама в списках
  | 'PROFILE_RELATED'     // Реклама в профиле мастера
  | 'FOOTER_BRAND'        // Логотипы партнёров

export type PricingModel = 'fixed' | 'cpc' | 'cpa'

// Контекст для показа рекламы
export interface AdContext {
  page?: string
  category?: string[]
  keywords?: string[]
  city?: string
  userId?: string
  masterId?: string
  specialization?: string
}

export interface AdBanner {
  id: string
  title: string
  description?: string
  image_url: string
  type: 'image' | 'image_text' | 'image_button' | 'master_promo' | 'product_promo' | 'category_promo'
  ad_type?: AdType // Новый тип рекламы
  target_type?: 'master' | 'product' | 'category' | 'order' | 'external_url' | null
  target_id?: string
  external_url?: string
  pages: string[]
  priority: number
  is_active: boolean
  start_date?: string
  end_date?: string
  duration?: number // Длительность показа в секундах
  views: number
  clicks: number
  created_by?: string
  created_at: string
  updated_at: string
  // Новые поля для контекстной рекламы
  category?: string[]
  keywords?: string[]
  regions?: string[]
  brand_name?: string
  pricing_model?: PricingModel
  price_per_click?: number
  price_per_action?: number
  fixed_price?: number
  impression_limit?: number
  click_limit?: number
  current_impressions?: number
  current_clicks?: number
  affiliate_url?: string
  show_badge?: boolean
  badge_text?: string
  /** Режим отображения Hero: split (текст слева + картинка справа) или full_image (картинка на весь блок) */
  hero_layout?: 'split' | 'full_image'
}

export interface Chat {
  id: string
  user1_id: string
  user2_id: string
  created_at: string
  updated_at: string
  deleted_by_user_ids?: string[]
}

export interface Message {
  id: string
  chat_id: string
  sender_id: string
  content: string
  image_url?: string
  created_at: string
  read: boolean
}

export type OrderStatus = 'open' | 'new' | 'in_progress' | 'completed' | 'cancelled'
export type ResponseStatus = 'pending' | 'accepted' | 'rejected'

export interface Order {
  id: string
  client_id: string
  title: string
  description: string
  category: string
  location: string
  city?: string
  lat?: number
  lng?: number
  geocoded_at?: string
  geocode_label?: string
  geocode_source?: string
  budget?: number
  images?: string[]
  status: OrderStatus
  selected_master_id?: string
  created_at: string
  updated_at?: string
  client?: User
  selected_master?: User
}

export interface OrderResponse {
  id: string
  order_id: string
  master_id: string
  price?: number
  message: string
  status: ResponseStatus
  created_at: string
  master?: User
  order?: Order
}

export interface Notification {
  id: string
  user_id: string
  type: 'new_order_match' | 'order_response' | 'order_accepted' | 'order_completed' | 'message' | 'system'
  order_id?: string
  title: string
  message: string
  read: boolean
  created_at: string
  order?: Order
}

export interface PortfolioItem {
  id: string
  master_id: string
  title: string
  description?: string
  images: string[]
  videos: string[]
  likes_count: number
  comments_count: number
  created_at: string
  updated_at?: string
  master?: User
}

export interface PortfolioLike {
  id: string
  item_id: string
  user_id: string
  created_at: string
}

export interface PortfolioComment {
  id: string
  portfolio_item_id: string
  user_id: string
  content: string
  created_at: string
  parent_comment_id?: string | null
  user?: User
}

export type ComplaintStatus = 'new' | 'in_progress' | 'resolved' | 'rejected'

export interface Complaint {
  id: string
  complainer_id: string
  reported_user_id: string
  chat_id?: string
  comment: string
  status: ComplaintStatus
  created_at: string
  updated_at?: string
  admin_notes?: string
  complainer?: User
  reported_user?: User
  chat?: Chat
}

// Система отзывов и рейтингов
export interface MasterReview {
  id: string
  master_id: string
  reviewer_id: string
  rating: number // 1-5
  comment?: string
  images?: string[]
  created_at: string
  updated_at?: string
  reviewer?: User
  master?: User
  replies?: ReviewReply[]
}

export interface ProductReview {
  id: string
  product_id: string
  reviewer_id: string
  seller_id: string
  rating: number // 1-5
  comment?: string
  images?: string[]
  created_at: string
  updated_at?: string
  reviewer?: User
  seller?: User
  product?: Product
  replies?: ReviewReply[]
}

export interface SellerReview {
  id: string
  seller_id: string
  reviewer_id: string
  rating: number // 1-5
  comment?: string
  images?: string[]
  created_at: string
  updated_at?: string
  reviewer?: User
  seller?: User
  replies?: ReviewReply[]
}

export interface ProductComment {
  id: string
  product_id: string
  author_id: string
  content: string
  created_at: string
  updated_at?: string
  parent_comment_id?: string // Для ответов на комментарии
  author?: User
  replies?: ProductComment[] // Вложенные комментарии
}

export interface ReviewReply {
  id: string
  review_id: string
  review_type: 'master' | 'product' | 'seller'
  author_id: string
  content: string
  created_at: string
  updated_at?: string
  author?: User
}

export interface Story {
  id: string
  user_id: string
  media: string[] // Массив URL фото/видео (максимум 4 фото или 1 видео)
  media_type: 'photos' | 'video' // Тип медиа
  description?: string // Описание истории
  created_at: string
  expires_at: string
  views_count: number
  is_active: boolean
  user?: User
  viewed_by_user?: boolean // Флаг, просмотрена ли история текущим пользователем
}

export interface StoryView {
  id: string
  story_id: string
  viewer_id: string
  viewed_at: string
}
