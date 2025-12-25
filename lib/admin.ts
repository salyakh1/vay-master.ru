// Admin panel types and utilities
import { supabase } from './supabase'

export type AdminRole = 'super_admin' | 'moderator' | 'support'
export type RestrictionType = 'temporary_limit' | 'hidden_from_search' | 'frozen' | 'banned' | 'unreliable_marker'
export type ComplaintType = 'fraud' | 'poor_quality' | 'spam' | 'harassment' | 'no_contact' | 'other'
export type ComplaintStatus = 'new' | 'in_review' | 'resolved' | 'dismissed' | 'escalated'
export type ContentModerationStatus = 'pending' | 'approved' | 'rejected' | 'hidden' | 'flagged'
export type ContentType = 'portfolio_item' | 'product' | 'order' | 'message' | 'avatar' | 'description'
export type AdType = 'banner' | 'master_promotion' | 'product_promotion' | 'search_priority' | 'card_highlight'
export type SecurityAlertType = 'mass_messages' | 'duplicate_texts' | 'suspicious_activity' | 'suspicious_registration' | 'rate_limit_exceeded'

export interface AdminRoleRecord {
  id: string
  user_id: string
  role: AdminRole
  created_at: string
  created_by?: string
  updated_at: string
  updated_by?: string
  is_active: boolean
}

export interface UserRestriction {
  id: string
  user_id: string
  restriction_type: RestrictionType
  reason: string
  expires_at?: string
  created_by: string
  created_at: string
  revoked_at?: string
  revoked_by?: string
  is_active: boolean
}

export interface Complaint {
  id: string
  complainant_id: string
  accused_id: string
  complaint_type: ComplaintType
  title: string
  description: string
  evidence?: any
  order_id?: string
  chat_id?: string
  status: ComplaintStatus
  priority: 'low' | 'normal' | 'high' | 'urgent'
  assigned_to?: string
  resolution?: string
  resolved_at?: string
  resolved_by?: string
  created_at: string
  updated_at: string
  complainant?: any
  accused?: any
}

export interface ContentModeration {
  id: string
  content_type: ContentType
  content_id: string
  user_id: string
  status: ContentModerationStatus
  moderation_reason?: string
  moderated_by?: string
  moderated_at?: string
  created_at: string
  updated_at: string
}

export interface Advertisement {
  id: string
  ad_type: AdType
  target_type: 'master' | 'product' | 'category' | 'global'
  target_id?: string
  title: string
  description?: string
  image_url?: string
  link_url?: string
  is_active: boolean
  start_date?: string
  end_date?: string
  regions?: string[]
  priority: number
  impressions_count: number
  clicks_count: number
  created_by: string
  created_at: string
  updated_at: string
}

export interface SecurityAlert {
  id: string
  alert_type: SecurityAlertType
  user_id?: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  details?: any
  is_resolved: boolean
  resolved_by?: string
  resolved_at?: string
  created_at: string
}

export interface MasterVerification {
  id: string
  master_id: string
  is_verified: boolean
  verification_level?: 'basic' | 'advanced' | 'premium'
  documents?: any
  verified_by?: string
  verified_at?: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface SystemSetting {
  id: string
  key: string
  value: any
  description?: string
  category: 'feature_flags' | 'limits' | 'regions' | 'ab_testing' | 'system'
  updated_by?: string
  updated_at: string
}

// Check if user is admin
// Используем функцию БД через RPC, которая обходит RLS через SECURITY DEFINER
export async function isAdmin(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('is_admin', { user_id: userId })
    
    if (error) {
      console.error('Error checking admin status:', error)
      // Fallback: попробуем прямой запрос (если RPC не работает)
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('admin_roles')
        .select('id')
        .eq('user_id', userId)
        .eq('is_active', true)
        .maybeSingle()
      
      if (fallbackError) {
        console.error('Fallback query also failed:', fallbackError)
        return false
      }
      
      return !!fallbackData
    }
    
    return !!data
  } catch (err) {
    console.error('Exception in isAdmin:', err)
    return false
  }
}

// Get admin role
// Используем функцию БД через RPC, которая обходит RLS через SECURITY DEFINER
export async function getAdminRole(userId: string): Promise<AdminRole | null> {
  try {
    const { data, error } = await supabase.rpc('get_admin_role', { user_id: userId })
    
    if (error) {
      console.error('Error getting admin role:', error)
      // Fallback: попробуем прямой запрос
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('admin_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('is_active', true)
        .maybeSingle()
      
      if (fallbackError || !fallbackData) {
        console.error('Fallback query also failed:', fallbackError)
        return null
      }
      
      return fallbackData.role as AdminRole
    }
    
    return (data as AdminRole) || null
  } catch (err) {
    console.error('Exception in getAdminRole:', err)
    return null
  }
}

// Check permission
export async function hasPermission(
  userId: string,
  resource: string,
  action: 'read' | 'write' | 'delete' | 'manage'
): Promise<boolean> {
  const role = await getAdminRole(userId)
  if (!role) return false

  // Super admin has all permissions
  if (role === 'super_admin') return true

  // Check specific permissions
  const { data, error } = await supabase
    .from('admin_permissions')
    .select('id')
    .eq('role', role)
    .or(`resource.eq.${resource},resource.eq.all`)
    .or(`action.eq.${action},action.eq.manage`)
    .maybeSingle()

  return !error && !!data
}

// Log admin action
export async function logAdminAction(
  adminId: string,
  action: string,
  resourceType: string,
  resourceId?: string,
  details?: any,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await supabase.from('admin_audit_logs').insert({
    admin_id: adminId,
    action,
    resource_type: resourceType,
    resource_id: resourceId,
    details,
    ip_address: ipAddress,
    user_agent: userAgent,
  })
}

// Get user restrictions
export async function getUserRestrictions(userId: string): Promise<UserRestriction[]> {
  const { data, error } = await supabase
    .from('user_restrictions')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching user restrictions:', error)
    return []
  }

  return (data || []) as UserRestriction[]
}

// Check if user is restricted
export async function isUserRestricted(userId: string): Promise<boolean> {
  const restrictions = await getUserRestrictions(userId)
  return restrictions.length > 0
}

