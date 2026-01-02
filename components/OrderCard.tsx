'use client'

import Link from 'next/link'
import { Order } from '@/lib/supabase'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { FiMapPin, FiClock, FiUser } from 'react-icons/fi'

interface OrderCardProps {
  order: Order
}

const statusLabels: Record<string, string> = {
  open: 'Открыт',
  new: 'Новый',
  in_progress: 'В работе',
  completed: 'Выполнен',
  cancelled: 'Отменен',
}

const statusColors: Record<string, string> = {
  open: 'bg-green-100 text-green-700 border-green-300',
  new: 'bg-bg-primary text-text-primary border-border-color',
  in_progress: 'bg-brand-accent text-white border-brand-accent',
  completed: 'bg-bg-primary text-text-secondary border-border-color',
  cancelled: 'bg-bg-primary text-text-secondary border-border-color',
}

export default function OrderCard({ order }: OrderCardProps) {
  const timeAgo = format(new Date(order.created_at), 'd MMMM в HH:mm', { locale: ru })
  const isToday = new Date(order.created_at).toDateString() === new Date().toDateString()
  const isYesterday = new Date(order.created_at).toDateString() === new Date(Date.now() - 86400000).toDateString()
  
  let timeDisplay = timeAgo
  if (isToday) {
    timeDisplay = `Сегодня в ${format(new Date(order.created_at), 'HH:mm', { locale: ru })}`
  } else if (isYesterday) {
    timeDisplay = `Вчера в ${format(new Date(order.created_at), 'HH:mm', { locale: ru })}`
  }

  return (
    <Link href={`/orders/${order.id}`} className="block">
      <div className="card">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-text-primary mb-2 line-clamp-2">
              {order.title}
            </h3>
            <div className="flex items-center gap-2 text-sm text-text-secondary mb-2">
              <FiClock size={14} />
              <span>{timeDisplay}</span>
            </div>
          </div>
          <span className={`px-3 py-1 text-xs font-medium border rounded-lg ${statusColors[order.status]}`}>
            {statusLabels[order.status]}
          </span>
        </div>

        <p className="text-text-primary mb-4 line-clamp-3 leading-relaxed text-base">
          {order.description}
        </p>

        {order.images && order.images.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-4">
            {order.images.slice(0, 3).map((img, idx) => (
              <img
                key={idx}
                src={img}
                alt={`Order image ${idx + 1}`}
                className="w-full h-24 object-cover border border-border-color rounded-lg"
              />
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-4 text-sm text-text-secondary mb-4">
          {order.location && (
            <div className="flex items-center gap-1">
              <FiMapPin size={16} className="text-text-primary" />
              <span className="font-normal">{order.location}</span>
            </div>
          )}
          {order.budget && (
            <div className="flex items-center gap-1">
              <span className="text-xs text-text-secondary">
                Бюджет: {order.budget.toLocaleString('ru-RU')} ₽
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-border-color">
          <div className="flex items-center gap-2">
            {order.client?.avatar_url ? (
              <img
                src={order.client.avatar_url}
                alt={order.client.full_name}
                className="w-8 h-8 object-cover border border-border-color rounded-full"
              />
            ) : (
              <div className="w-8 h-8 bg-text-primary flex items-center justify-center text-white text-xs font-semibold border border-border-color rounded-full">
                {order.client?.full_name?.[0]?.toUpperCase() || '?'}
              </div>
            )}
            <span className="text-sm font-normal text-text-primary">
              {order.client?.full_name || 'Клиент'}
            </span>
          </div>
          <span className="px-3 py-1 border border-border-color text-xs font-normal rounded-lg bg-bg-secondary">
            {order.category}
          </span>
        </div>
      </div>
    </Link>
  )
}

