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
      <div className="card-glossy group relative">
        {/* Глянцевый эффект */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10 rounded-[12px]"></div>
        
        <div className="flex items-start justify-between mb-3 relative z-20">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-text-primary mb-2 line-clamp-2 group-hover:text-brand-accent transition-colors">
              {order.title}
            </h3>
            <div className="flex items-center gap-2 text-sm text-text-secondary mb-2">
              <FiClock size={14} className="text-brand-accent/60" />
              <span>{timeDisplay}</span>
            </div>
          </div>
          <span className={`px-3 py-1.5 text-xs font-medium border rounded-lg backdrop-blur-sm shadow-sm ${statusColors[order.status]} transition-all group-hover:shadow-md`}>
            {statusLabels[order.status]}
          </span>
        </div>

        <p className="text-text-primary mb-4 line-clamp-3 leading-relaxed text-base">
          {order.description}
        </p>

        {order.images && order.images.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-4 relative z-20">
            {order.images.slice(0, 3).map((img, idx) => (
              <div key={idx} className="relative overflow-hidden rounded-lg group/image">
                <img
                  src={img}
                  alt={`Order image ${idx + 1}`}
                  className="w-full h-24 object-cover border border-border-light/50 rounded-lg transition-all duration-300 group-hover/image:scale-110 group-hover/image:brightness-110"
                />
                <div className="absolute inset-0 bg-gradient-to-br from-white/0 via-white/20 to-transparent opacity-0 group-hover/image:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
              </div>
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
              <span className="text-xs font-semibold bg-gradient-to-r from-brand-accent to-brand-accent-hover bg-clip-text text-transparent">
                Бюджет: {order.budget.toLocaleString('ru-RU')} ₽
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-border-light/50 relative z-20">
          <div className="flex items-center gap-2">
            {order.client?.avatar_url ? (
              <div className="relative group/avatar">
                <img
                  src={order.client.avatar_url}
                  alt={order.client.full_name}
                  className="w-8 h-8 object-cover border-2 border-white/50 rounded-full shadow-glossy transition-all duration-300 group-hover/avatar:scale-110 group-hover/avatar:border-brand-accent/50"
                />
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/30 to-transparent opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-300"></div>
              </div>
            ) : (
              <div className="w-8 h-8 bg-gradient-to-br from-graphite-primary to-graphite-tertiary flex items-center justify-center text-white text-xs font-semibold border-2 border-white/50 rounded-full shadow-glossy">
                {order.client?.full_name?.[0]?.toUpperCase() || '?'}
              </div>
            )}
            <span className="text-sm font-medium text-text-primary">
              {order.client?.full_name || 'Клиент'}
            </span>
          </div>
          <span className="px-3 py-1 border border-border-light/50 text-xs font-medium rounded-lg bg-gradient-to-br from-bg-secondary to-bg-primary backdrop-blur-sm shadow-sm">
            {order.category}
          </span>
        </div>
      </div>
    </Link>
  )
}

