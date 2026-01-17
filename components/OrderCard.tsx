'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Order } from '@/lib/supabase'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { FiMapPin, FiClock } from 'react-icons/fi'

interface OrderCardProps {
  order: Order
  variant?: 'list' | 'grid'
  hideClientIdentity?: boolean
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

export default function OrderCard({ order, variant = 'list', hideClientIdentity = false }: OrderCardProps) {
  const router = useRouter()
  const timeAgo = format(new Date(order.created_at), 'd MMMM в HH:mm', { locale: ru })
  const isToday = new Date(order.created_at).toDateString() === new Date().toDateString()
  const isYesterday = new Date(order.created_at).toDateString() === new Date(Date.now() - 86400000).toDateString()
  
  let timeDisplay = timeAgo
  if (isToday) {
    timeDisplay = `Сегодня в ${format(new Date(order.created_at), 'HH:mm', { locale: ru })}`
  } else if (isYesterday) {
    timeDisplay = `Вчера в ${format(new Date(order.created_at), 'HH:mm', { locale: ru })}`
  }

  const isGrid = variant === 'grid'
  
  // Формируем адрес из city и location
  const addressParts: string[] = []
  if ((order as any).city) {
    addressParts.push((order as any).city)
  }
  if (order.location && order.location.trim() && order.location !== 'Метка на карте') {
    addressParts.push(order.location)
  }
  const fullAddress = addressParts.length > 0 ? addressParts.join(', ') : null
  const hasCoordinates = typeof (order as any)?.lat === 'number' && typeof (order as any)?.lng === 'number'
  
  const handleOpenOnMap = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    router.push(`/orders?view=map&focus=${order.id}`)
  }

  return (
    <Link href={`/orders/${order.id}`} className="block h-full">
      <div
        className={`card-glossy group relative h-full ${isGrid ? 'p-0 overflow-hidden' : 'p-5 sm:p-6'}`}
      >
        {/* LIST: header + meta + description */}
        {!isGrid ? (
          <div className="relative z-20">
            {/* Header row */}
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-lg font-semibold text-graphite-secondary leading-snug line-clamp-2">
                {order.title}
              </h3>
              <span
                className={`flex-shrink-0 px-3 py-1.5 text-xs font-semibold border border-border-light/60 rounded-lg ${statusColors[order.status]}`}
              >
                {statusLabels[order.status]}
              </span>
            </div>

            {/* Meta row */}
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-text-secondary">
              <div className="flex items-center gap-2">
                <FiClock size={14} className="text-brand-accent/60" />
                <span>{timeDisplay}</span>
              </div>
              {fullAddress && (
                <div className="flex items-center gap-2">
                  <FiMapPin size={14} className="text-text-muted" />
                  <span className="truncate">{fullAddress}</span>
                </div>
              )}
            </div>
            
            {/* Адрес и кнопка "Открыть на карте" */}
            {fullAddress && (
              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-text-primary">
                    {fullAddress}
                  </div>
                </div>
                {hasCoordinates && (
                  <button
                    onClick={handleOpenOnMap}
                    className="flex-shrink-0 inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-brand-accent hover:text-brand-accent-hover border border-brand-accent/30 hover:border-brand-accent rounded-lg bg-brand-accent/5 hover:bg-brand-accent/10 transition-colors"
                    title="Открыть на карте"
                  >
                    <FiMapPin size={14} />
                    <span>На карте</span>
                  </button>
                )}
              </div>
            )}

            {/* Description */}
            {order.description && (
              <p className="mt-3 text-base text-graphite-secondary/90 leading-relaxed line-clamp-3">
                {order.description}
              </p>
            )}
          </div>
        ) : (
          // GRID: keep compact paddings already used below
          <div className="p-4 relative z-20">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-text-primary mb-2 line-clamp-2">
                  {order.title}
                </h3>
                <div className="flex items-center gap-2 text-xs text-text-secondary">
                  <FiClock size={14} className="text-brand-accent/60" />
                  <span className="truncate">{timeDisplay}</span>
                </div>
              </div>
              <span className={`ml-3 px-3 py-1.5 text-xs font-medium border border-border-light/60 rounded-lg backdrop-blur-sm shadow-sm ${statusColors[order.status]}`}>
                {statusLabels[order.status]}
              </span>
            </div>

            <p className="text-sm text-text-primary mb-3 line-clamp-3 leading-relaxed">
              {order.description}
            </p>
            
            {/* Адрес в grid варианте */}
            {fullAddress && (
              <div className="mb-3 flex items-center gap-2 text-xs text-text-secondary">
                <FiMapPin size={12} className="text-text-muted flex-shrink-0" />
                <span className="truncate">{fullAddress}</span>
                {hasCoordinates && (
                  <button
                    onClick={handleOpenOnMap}
                    className="ml-auto flex-shrink-0 inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-brand-accent hover:text-brand-accent-hover border border-brand-accent/30 hover:border-brand-accent rounded-md bg-brand-accent/5 hover:bg-brand-accent/10 transition-colors"
                    title="Открыть на карте"
                  >
                    <FiMapPin size={12} />
                    <span>Карта</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {order.images && order.images.length > 0 && (
          isGrid ? (
            <div className="px-4 pb-3">
              <div className="w-full aspect-[4/3] overflow-hidden rounded-lg bg-bg-secondary border border-border-light/40">
                <img
                  src={order.images[0]}
                  alt="Order image"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          ) : (
            <div className="mt-4 relative">
              <div className="w-full aspect-[16/9] overflow-hidden rounded-lg bg-bg-secondary border border-border-light/40">
                <img
                  src={order.images[0]}
                  alt="Order image"
                  className="w-full h-full object-cover"
                />
              </div>
              {order.images.length > 1 && (
                <div className="absolute top-3 right-3 bg-black/55 backdrop-blur-sm text-white text-xs font-semibold px-2 py-1 rounded-full">
                  1/{order.images.length}
                </div>
              )}
            </div>
          )
        )}

        {/* LIST: budget chip below media/description (not scattered) */}
        {!isGrid && order.budget && (
          <div className="mt-3">
            <span className="inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-lg bg-brand-accent/10 text-brand-accent border border-brand-accent/20">
              Бюджет: {order.budget.toLocaleString('ru-RU')} ₽
            </span>
          </div>
        )}

        <div className={`${isGrid ? 'px-4 pb-4' : 'mt-4'} flex items-center justify-between pt-4 border-t border-border-light/50 relative z-20`}>
          <div className="flex items-center gap-2">
            {!hideClientIdentity && order.client?.avatar_url ? (
              <div className="relative group/avatar">
                <img
                  src={order.client.avatar_url}
                  alt={order.client.full_name || 'Клиент'}
                  className="w-8 h-8 object-cover border-2 border-white/50 rounded-full shadow-glossy"
                />
              </div>
            ) : (
              <div className="w-8 h-8 bg-gradient-to-br from-graphite-primary to-graphite-tertiary flex items-center justify-center text-white text-xs font-semibold border-2 border-white/50 rounded-full shadow-glossy">
                {hideClientIdentity ? '•' : (order.client?.full_name?.[0]?.toUpperCase() || '?')}
              </div>
            )}
            <span className="text-sm font-medium text-text-primary">
              {hideClientIdentity ? 'Клиент (скрыто)' : (order.client?.full_name || 'Клиент')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {isGrid && order.budget && (
              <span className="px-3 py-1 border border-border-light/50 text-xs font-semibold rounded-lg bg-bg-secondary">
                {order.budget.toLocaleString('ru-RU')} ₽
              </span>
            )}
            <span className="px-3 py-1 border border-border-light/50 text-xs font-medium rounded-lg bg-gradient-to-br from-bg-secondary to-bg-primary backdrop-blur-sm shadow-sm">
              {order.category}
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}

