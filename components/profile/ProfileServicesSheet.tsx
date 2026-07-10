'use client'

import { FiX } from 'react-icons/fi'
import type { Service } from '@/lib/supabase'

type ProfileServicesSheetProps = {
  open: boolean
  services: Service[]
  onClose: () => void
}

export default function ProfileServicesSheet({ open, services, onClose }: ProfileServicesSheetProps) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/45"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-lg bg-white rounded-t-2xl px-3.5 pt-3 pb-6 safe-area-pb"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-9 h-1 bg-[#e5e7eb] rounded-full mx-auto mb-3" aria-hidden />
        <div className="flex items-center justify-between mb-3">
          <p className="text-[14px] font-medium text-[#111111]">Все услуги</p>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#9ca3af] hover:text-[#111] rounded-lg"
            aria-label="Закрыть"
          >
            <FiX size={18} />
          </button>
        </div>
        {services.length === 0 ? (
          <p className="text-[12px] text-[#9ca3af] py-4 text-center">Услуги не указаны</p>
        ) : (
          <ul className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto">
            {services.map((svc, i) => (
              <li
                key={svc.id}
                className={`text-[12px] text-[#111111] py-2 ${
                  i < services.length - 1 ? 'border-b border-[#e5e7eb]' : ''
                }`}
              >
                {svc.name}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export function buildServicesSummary(names: string[]): string {
  const clean = names.filter(Boolean)
  if (clean.length === 0) return 'Услуги не указаны'
  if (clean.length <= 2) return clean.join(', ')
  return `${clean.slice(0, 2).join(', ')} и ещё ${clean.length - 2}`
}
