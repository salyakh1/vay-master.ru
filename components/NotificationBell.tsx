'use client'

import { useEffect, useState } from 'react'
import { FiBell } from 'react-icons/fi'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/providers'

export default function NotificationBell() {
  const { user } = useAuth()
  const router = useRouter()
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!user || user.role !== 'master') return

    const fetchCount = async () => {
      try {
        const res = await fetch('/api/notifications/count')
        const data = await res.json()
        setCount(data.count || 0)
      } catch (error) {
        console.error('Error fetching notification count:', error)
      }
    }

    fetchCount()
    // Обновляем каждые 30 секунд
    const interval = setInterval(fetchCount, 30000)
    return () => clearInterval(interval)
  }, [user])

  if (!user || user.role !== 'master') return null

  return (
    <button
      onClick={() => router.push('/orders?filter=my_specializations')}
      className="relative p-2 hover:bg-bg-secondary rounded-md transition-colors"
      title="Уведомления о новых заказах"
    >
      <FiBell size={20} className="text-text-secondary" />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 bg-brand-accent text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  )
}
