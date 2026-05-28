// Admin panel utilities
import { supabase } from './supabase'
import { createLogger } from '@/lib/logger'

export type {
  AdminRole,
  AdminRoleRecord,
  AdminAdType,
  Advertisement,
  ContentModeration,
  ContentModerationStatus,
  ContentType,
  MasterVerification,
  RestrictionType,
  SecurityAlert,
  SecurityAlertType,
  SystemSetting,
  UserRestriction,
} from '@/types/db'

import type { AdminRole } from '@/types/db'

const log = createLogger('admin')

export async function isAdmin(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('is_admin', { user_id: userId })

    if (error) {
      log.error('Error checking admin status', error)
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('admin_roles')
        .select('id')
        .eq('user_id', userId)
        .eq('is_active', true)
        .maybeSingle()

      if (fallbackError) {
        log.error('Fallback query also failed', fallbackError)
        return false
      }

      return !!fallbackData
    }

    return !!data
  } catch (err) {
    log.error('Exception in isAdmin', err)
    return false
  }
}

export async function getAdminRole(userId: string): Promise<AdminRole | null> {
  try {
    const { data, error } = await supabase.rpc('get_admin_role', { user_id: userId })

    if (error) {
      log.error('Error getting admin role', error)
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('admin_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('is_active', true)
        .maybeSingle()

      if (fallbackError || !fallbackData) {
        log.error('Fallback query also failed', fallbackError)
        return null
      }

      return fallbackData.role as AdminRole
    }

    return (data as AdminRole) || null
  } catch (err) {
    log.error('Exception in getAdminRole', err)
    return null
  }
}

export async function hasPermission(
  userId: string,
  resource: string,
  action: 'read' | 'write' | 'delete' | 'manage'
): Promise<boolean> {
  const role = await getAdminRole(userId)
  if (!role) return false

  if (role === 'super_admin') return true

  const { data, error } = await supabase
    .from('admin_permissions')
    .select('id')
    .eq('role', role)
    .or(`resource.eq.${resource},resource.eq.all`)
    .or(`action.eq.${action},action.eq.manage`)
    .maybeSingle()

  return !error && !!data
}

export async function logAdminAction(
  adminId: string,
  action: string,
  resourceType: string,
  resourceId?: string,
  details?: Record<string, unknown>,
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

export async function getUserRestrictions(userId: string) {
  const { data, error } = await supabase
    .from('user_restrictions')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) {
    log.error('Error fetching user restrictions', error)
    return []
  }

  return data ?? []
}

export async function isUserRestricted(userId: string): Promise<boolean> {
  const restrictions = await getUserRestrictions(userId)
  return restrictions.length > 0
}
