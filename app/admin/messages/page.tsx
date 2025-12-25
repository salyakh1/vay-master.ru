'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '../../providers'
import { supabase, User } from '@/lib/supabase'
import { FiSend, FiSearch, FiUsers, FiUser, FiCheck } from 'react-icons/fi'

type BroadcastType = 'all' | 'role' | 'individual'

export default function AdminMessagesPage() {
  const { user } = useAuth()
  const [message, setMessage] = useState('')
  const [broadcastType, setBroadcastType] = useState<BroadcastType>('all')
  const [selectedRole, setSelectedRole] = useState<'master' | 'seller' | 'client'>('client')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [selectedUsers, setSelectedUsers] = useState<User[]>([])
  const [sending, setSending] = useState(false)
  const [sentCount, setSentCount] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (searchQuery.trim().length > 2) {
      searchUsers()
    } else {
      setSearchResults([])
    }
  }, [searchQuery])

  const searchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
        .limit(10)

      if (error) throw error
      setSearchResults((data as User[]) || [])
    } catch (error) {
      console.error('Error searching users:', error)
      setSearchResults([])
    }
  }

  const addUser = (user: User) => {
    if (!selectedUsers.find((u) => u.id === user.id)) {
      setSelectedUsers([...selectedUsers, user])
    }
    setSearchQuery('')
    setSearchResults([])
  }

  const removeUser = (userId: string) => {
    setSelectedUsers(selectedUsers.filter((u) => u.id !== userId))
  }

  const sendMessages = async () => {
    if (!message.trim()) {
      setError('Введите текст сообщения')
      return
    }

    if (broadcastType === 'individual' && selectedUsers.length === 0) {
      setError('Выберите хотя бы одного пользователя')
      return
    }

    setSending(true)
    setError(null)
    setSentCount(0)

    try {
      // Получаем токен из Supabase сессии
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Не авторизован')
      }

      const response = await fetch('/api/admin/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          message: message.trim(),
          type: broadcastType,
          role: broadcastType === 'role' ? selectedRole : undefined,
          user_ids: broadcastType === 'individual' ? selectedUsers.map((u) => u.id) : undefined,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Ошибка при отправке сообщений')
      }

      const result = await response.json()
      setSentCount(result.sent_count || 0)
      setMessage('')
      setSelectedUsers([])
      setSearchQuery('')
      alert(`Сообщения успешно отправлены: ${result.sent_count} пользователям`)
    } catch (error: any) {
      console.error('Error sending messages:', error)
      setError(error.message || 'Ошибка при отправке сообщений')
    } finally {
      setSending(false)
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-text-primary mb-2">Писать пользователям</h1>
        <p className="text-text-secondary">Отправка сообщений от имени Администрации VayMaster</p>
      </div>

      <div className="card">
        {/* Тип рассылки */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-3 text-text-primary">Тип рассылки</label>
          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => {
                setBroadcastType('all')
                setSelectedUsers([])
              }}
              className={`p-4 border rounded-lg transition-colors ${
                broadcastType === 'all'
                  ? 'bg-brand-accent text-white border-brand-accent'
                  : 'bg-bg-secondary border-border-color hover:bg-bg-primary'
              }`}
            >
              <FiUsers size={24} className="mx-auto mb-2" />
              <div className="font-medium">Всем</div>
            </button>
            <button
              type="button"
              onClick={() => {
                setBroadcastType('role')
                setSelectedUsers([])
              }}
              className={`p-4 border rounded-lg transition-colors ${
                broadcastType === 'role'
                  ? 'bg-brand-accent text-white border-brand-accent'
                  : 'bg-bg-secondary border-border-color hover:bg-bg-primary'
              }`}
            >
              <FiUser size={24} className="mx-auto mb-2" />
              <div className="font-medium">По ролям</div>
            </button>
            <button
              type="button"
              onClick={() => setBroadcastType('individual')}
              className={`p-4 border rounded-lg transition-colors ${
                broadcastType === 'individual'
                  ? 'bg-brand-accent text-white border-brand-accent'
                  : 'bg-bg-secondary border-border-color hover:bg-bg-primary'
              }`}
            >
              <FiSearch size={24} className="mx-auto mb-2" />
              <div className="font-medium">Индивидуально</div>
            </button>
          </div>
        </div>

        {/* Выбор роли (если выбрано "По ролям") */}
        {broadcastType === 'role' && (
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2 text-text-primary">Выберите роль</label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as 'master' | 'seller' | 'client')}
              className="input w-full"
            >
              <option value="master">Мастера</option>
              <option value="seller">Продавцы</option>
              <option value="client">Клиенты</option>
            </select>
          </div>
        )}

        {/* Поиск пользователей (если выбрано "Индивидуально") */}
        {broadcastType === 'individual' && (
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2 text-text-primary">Поиск пользователя</label>
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary" size={20} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Введите имя или email..."
                className="input pl-10 w-full"
              />
              {searchResults.length > 0 && (
                <div className="absolute z-10 w-full mt-2 bg-white border border-border-color rounded-lg shadow-card max-h-64 overflow-y-auto">
                  {searchResults.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => addUser(user)}
                      className="w-full text-left px-4 py-3 hover:bg-bg-secondary transition-colors"
                    >
                      <div className="font-medium text-text-primary">{user.full_name}</div>
                      <div className="text-sm text-text-secondary">{user.email}</div>
                      <div className="text-xs text-text-secondary">{user.role}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Выбранные пользователи */}
            {selectedUsers.length > 0 && (
              <div className="mt-4">
                <div className="text-sm font-medium mb-2 text-text-primary">
                  Выбрано пользователей: {selectedUsers.length}
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center gap-2 px-3 py-2 bg-bg-secondary rounded-lg"
                    >
                      <span className="text-sm text-text-primary">{user.full_name}</span>
                      <button
                        type="button"
                        onClick={() => removeUser(user.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Текст сообщения */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2 text-text-primary">Текст сообщения</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Введите текст сообщения..."
            className="input w-full min-h-[150px] resize-none"
            disabled={sending}
          />
          <p className="text-xs text-text-secondary mt-2">
            Сообщение будет отправлено от имени: <strong>Администрация VayMaster</strong>
          </p>
        </div>

        {/* Ошибка */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>
        )}

        {/* Кнопка отправки */}
        <button
          type="button"
          onClick={sendMessages}
          disabled={sending || !message.trim()}
          className="btn btn-primary w-full flex items-center justify-center gap-2"
        >
          <FiSend size={18} />
          <span>
            {sending
              ? 'Отправка...'
              : broadcastType === 'all'
                ? 'Отправить всем пользователям'
                : broadcastType === 'role'
                  ? `Отправить ${selectedRole === 'master' ? 'мастерам' : selectedRole === 'seller' ? 'продавцам' : 'клиентам'}`
                  : `Отправить ${selectedUsers.length} пользователям`}
          </span>
        </button>
      </div>
    </div>
  )
}

