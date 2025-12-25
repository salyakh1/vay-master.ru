'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '../../providers'
import { supabase, User } from '@/lib/supabase'
import { getUserRestrictions, logAdminAction, getAdminRole, type UserRestriction, type AdminRole } from '@/lib/admin'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { FiSearch, FiFilter, FiUser, FiAlertCircle, FiShield, FiTrash2 } from 'react-icons/fi'

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [userRestrictions, setUserRestrictions] = useState<UserRestriction[]>([])
  const [adminRole, setAdminRole] = useState<AdminRole | null>(null)

  useEffect(() => {
    fetchUsers()
    if (currentUser) {
      logAdminAction(currentUser.id, 'view_users', 'users')
      getAdminRole(currentUser.id).then(setAdminRole)
    }
  }, [currentUser, roleFilter])

  const fetchUsers = async () => {
    try {
      let query = supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

      if (roleFilter) {
        query = query.eq('role', roleFilter)
      }

      if (searchQuery) {
        query = query.or(`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`)
      }

      const { data, error } = await query
      if (error) throw error
      setUsers((data || []) as User[])
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUserClick = async (user: User) => {
    setSelectedUser(user)
    const restrictions = await getUserRestrictions(user.id)
    setUserRestrictions(restrictions)
  }

  const handleRestrictUser = async (userId: string, restrictionType: string, reason: string) => {
    if (!currentUser) return

    try {
      await supabase.from('user_restrictions').insert({
        user_id: userId,
        restriction_type: restrictionType,
        reason,
        created_by: currentUser.id,
      })

      await logAdminAction(currentUser.id, 'restrict_user', 'user', userId, {
        restriction_type: restrictionType,
        reason,
      })

      alert('Ограничение применено')
      if (selectedUser) {
        const restrictions = await getUserRestrictions(selectedUser.id)
        setUserRestrictions(restrictions)
      }
    } catch (error) {
      console.error('Error restricting user:', error)
      alert('Ошибка при применении ограничения')
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!currentUser || adminRole !== 'super_admin') {
      alert('Только супер-администратор может удалять пользователей')
      return
    }

    const confirmDelete = window.confirm(
      'ВНИМАНИЕ: Вы собираетесь навсегда удалить этого пользователя и все связанные данные (профиль, публикации, заказы, сообщения и т.д.). Это действие нельзя отменить. Продолжить?'
    )
    if (!confirmDelete) return

    try {
      // Delete all related data first (due to foreign key constraints)
      // Delete portfolio items
      const { data: portfolioItems } = await supabase
        .from('portfolio_items')
        .select('id')
        .eq('master_id', userId)
      
      if (portfolioItems && portfolioItems.length > 0) {
        const portfolioIds = portfolioItems.map((item) => item.id)
        await supabase.from('portfolio_likes').delete().in('item_id', portfolioIds)
        await supabase.from('portfolio_comments').delete().in('item_id', portfolioIds)
        await supabase.from('portfolio_items').delete().eq('master_id', userId)
      }

      // Delete products
      await supabase.from('products').delete().eq('seller_id', userId)

      // Delete orders and order responses
      const { data: orders } = await supabase
        .from('orders')
        .select('id')
        .eq('client_id', userId)
      
      if (orders && orders.length > 0) {
        const orderIds = orders.map((order) => order.id)
        await supabase.from('order_responses').delete().in('order_id', orderIds)
        await supabase.from('orders').delete().eq('client_id', userId)
      }

      await supabase.from('order_responses').delete().eq('master_id', userId)

      // Delete chats and messages
      const { data: chats } = await supabase
        .from('chats')
        .select('id')
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      
      if (chats && chats.length > 0) {
        const chatIds = chats.map((chat) => chat.id)
        await supabase.from('messages').delete().in('chat_id', chatIds)
        await supabase.from('chats').delete().or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      }

      // Delete follows
      await supabase.from('follows').delete().eq('follower_id', userId)
      await supabase.from('follows').delete().eq('following_id', userId)

      // Delete profile specializations and services
      await supabase.from('profile_specializations').delete().eq('profile_id', userId)
      await supabase.from('profile_services').delete().eq('profile_id', userId)

      // Delete admin roles if any
      await supabase.from('admin_roles').delete().eq('user_id', userId)

      // Delete user restrictions
      await supabase.from('user_restrictions').delete().eq('user_id', userId)

      // Finally, delete the profile
      await supabase.from('profiles').delete().eq('id', userId)

      // Note: We cannot delete from auth.users directly via Supabase client
      // This would need to be done via Supabase Admin API or SQL
      // For now, we'll just delete the profile and log the action

      await logAdminAction(currentUser.id, 'delete_user', 'user', userId, {
        deleted_by: currentUser.id,
        note: 'Profile deleted. Auth user deletion requires admin API.',
      })

      alert('Профиль пользователя и все связанные данные успешно удалены. Примечание: удаление из auth.users требует использования Admin API.')
      fetchUsers()
      if (selectedUser?.id === userId) {
        setSelectedUser(null)
      }
    } catch (error) {
      console.error('Error deleting user:', error)
      alert('Ошибка при удалении пользователя: ' + (error instanceof Error ? error.message : String(error)))
    }
  }

  if (loading) {
    return <div className="text-text-secondary">Загрузка...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary mb-2">Пользователи</h1>
        <p className="text-text-secondary">Управление пользователями платформы</p>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary" size={20} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchUsers()}
                placeholder="Поиск по имени, email, телефону..."
                className="input pl-10"
              />
            </div>
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="input md:w-48"
          >
            <option value="">Все роли</option>
            <option value="master">Мастера</option>
            <option value="seller">Продавцы</option>
            <option value="client">Клиенты</option>
          </select>
          <button onClick={fetchUsers} className="btn btn-primary">
            Найти
          </button>
        </div>
      </div>

      {/* Users List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          {users.map((user) => (
            <div
              key={user.id}
              onClick={() => handleUserClick(user)}
              className={`card cursor-pointer transition-colors ${
                selectedUser?.id === user.id ? 'border-brand-accent border-2' : 'hover:shadow-card-hover'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-text-primary rounded-full flex items-center justify-center text-white font-semibold">
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.full_name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    user.full_name[0]?.toUpperCase() || '?'
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-text-primary">{user.full_name}</div>
                  <div className="text-sm text-text-secondary">{user.email}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs px-2 py-1 bg-bg-secondary rounded">
                      {user.role === 'master' ? 'Мастер' : user.role === 'seller' ? 'Продавец' : 'Клиент'}
                    </span>
                    {user.city && <span className="text-xs text-text-secondary">• {user.city}</span>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* User Details */}
        {selectedUser && (
          <div className="card">
            <h2 className="text-lg font-semibold text-text-primary mb-4">Детали пользователя</h2>
            <div className="space-y-4">
              <div>
                <div className="text-sm text-text-secondary mb-1">Имя</div>
                <div className="font-medium text-text-primary">{selectedUser.full_name}</div>
              </div>
              <div>
                <div className="text-sm text-text-secondary mb-1">Email</div>
                <div className="font-medium text-text-primary">{selectedUser.email}</div>
              </div>
              {selectedUser.phone && (
                <div>
                  <div className="text-sm text-text-secondary mb-1">Телефон</div>
                  <div className="font-medium text-text-primary">{selectedUser.phone}</div>
                </div>
              )}
              {selectedUser.city && (
                <div>
                  <div className="text-sm text-text-secondary mb-1">Город</div>
                  <div className="font-medium text-text-primary">{selectedUser.city}</div>
                </div>
              )}
              <div>
                <div className="text-sm text-text-secondary mb-1">Дата регистрации</div>
                <div className="font-medium text-text-primary">
                  {format(new Date(selectedUser.created_at), 'd MMMM yyyy', { locale: ru })}
                </div>
              </div>

              {/* Restrictions */}
              {userRestrictions.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border-color">
                  <div className="text-sm font-semibold text-text-primary mb-2">Ограничения</div>
                  {userRestrictions.map((restriction) => (
                    <div key={restriction.id} className="text-sm text-text-secondary mb-1">
                      <FiAlertCircle className="inline mr-1" size={14} />
                      {restriction.restriction_type} - {restriction.reason}
                    </div>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="mt-4 pt-4 border-t border-border-color space-y-2">
                <button
                  onClick={() => {
                    const reason = prompt('Причина ограничения:')
                    if (reason) {
                      handleRestrictUser(selectedUser.id, 'hidden_from_search', reason)
                    }
                  }}
                  className="w-full btn btn-outline text-sm"
                >
                  Скрыть из поиска
                </button>
                <button
                  onClick={() => {
                    const reason = prompt('Причина блокировки:')
                    if (reason) {
                      handleRestrictUser(selectedUser.id, 'frozen', reason)
                    }
                  }}
                  className="w-full btn btn-outline text-sm"
                >
                  Заморозить аккаунт
                </button>
                {adminRole === 'super_admin' && (
                  <button
                    onClick={() => handleDeleteUser(selectedUser.id)}
                    className="w-full btn btn-outline text-sm text-red-600 border-red-600 hover:bg-red-600 hover:text-white"
                  >
                    <FiTrash2 className="inline mr-2" size={16} />
                    Удалить пользователя навсегда
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}



