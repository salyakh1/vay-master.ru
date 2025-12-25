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

export interface Specialization {
  id: string
  name: string
  slug: string
}

export interface Service {
  id: string
  specialization_id: string
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
  // Master fields
  services?: string
  service_location?: 'home' | 'workshop' | 'both'
  experience_years?: number
  specialization?: string
  work_schedule?: string
  // Seller fields
  store_address?: string
  work_hours?: string
  delivery_available?: boolean
  delivery_zones?: string
  product_categories?: string
  // Enriched relations
  specializations?: Specialization[]
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

export interface Product {
  id: string
  seller_id: string
  name: string
  description: string
  price: number
  images: string[]
  category?: string
  category_id?: string
  in_stock: boolean
  stock_count?: number
  created_at: string
  seller?: User
  category_ref?: ProductCategory
}

export interface ProductCategory {
  id: string
  section: 'instruments' | 'autoparts' | 'materials'
  name: string
  slug: string
  created_at: string
}

export interface AdBanner {
  id: string
  title: string
  description?: string
  image_url: string
  type: 'image' | 'image_text' | 'image_button' | 'master_promo' | 'product_promo' | 'category_promo'
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

export type OrderStatus = 'new' | 'in_progress' | 'completed' | 'cancelled'
export type ResponseStatus = 'pending' | 'accepted' | 'rejected'

export interface Order {
  id: string
  client_id: string
  title: string
  description: string
  category: string
  location: string
  city?: string
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
  item_id: string
  user_id: string
  content: string
  created_at: string
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

